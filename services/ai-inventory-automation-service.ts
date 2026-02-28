import { getSql } from "@/lib/db/neon"

export type InventoryAutomationRecommendationType = "low_stock_prediction" | "reorder_recommendation" | "fulfillment_priority"
export type InventoryAutomationRecommendationStatus = "pending" | "approved" | "applied" | "dismissed"

export type InventoryRecommendationRow = {
  id: string
  user_id: number
  product_id: number | null
  recommendation_type: InventoryAutomationRecommendationType
  recommendation_title: string
  recommendation_payload: Record<string, unknown>
  confidence_score: number
  status: InventoryAutomationRecommendationStatus
  approved_by: number | null
  approved_at: string | null
  applied_at: string | null
  created_at: string
  updated_at: string
}

type ProductInventorySnapshot = {
  id: number
  name: string
  stock: number
  sales: number
  row_version: number
}

type RecalculationOptions = {
  initiatedBy?: number | null
  reason?: string
}

function computeVelocityPerDay(product: ProductInventorySnapshot) {
  const baseline = Number(product.sales) / 30
  return Number.isFinite(baseline) && baseline > 0 ? baseline : 0.25
}

function toConfidence(stock: number, daysToStockout: number) {
  if (stock <= 0 || daysToStockout <= 2) return 0.95
  if (daysToStockout <= 5) return 0.87
  if (daysToStockout <= 10) return 0.78
  return 0.65
}

export async function recalculateInventoryRecommendations(
  userId: number,
  options: RecalculationOptions = {},
): Promise<{ generated: number; recommendations: InventoryRecommendationRow[] }> {
  const sql = getSql()

  const products = (await sql/* sql */`
    SELECT id, name, stock, sales, row_version
    FROM public.products
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
    LIMIT 500
  `) as ProductInventorySnapshot[]

  const generatedRecommendations: Array<{
    productId: number | null
    type: InventoryAutomationRecommendationType
    title: string
    payload: Record<string, unknown>
    confidence: number
  }> = []

  for (const product of products) {
    const velocity = computeVelocityPerDay(product)
    const daysToStockout = Number((Number(product.stock) / Math.max(velocity, 0.1)).toFixed(1))

    if (product.stock <= 12 || daysToStockout <= 7) {
      generatedRecommendations.push({
        productId: product.id,
        type: "low_stock_prediction",
        title: `Low-stock risk for ${product.name}`,
        payload: {
          productName: product.name,
          currentStock: Number(product.stock),
          daysToStockout,
          estimatedDailyVelocity: Number(velocity.toFixed(2)),
          threshold: 12,
        },
        confidence: toConfidence(Number(product.stock), daysToStockout),
      })

      const reorderQty = Math.max(Math.ceil(velocity * 14) - Number(product.stock), 0)
      if (reorderQty > 0) {
        generatedRecommendations.push({
          productId: product.id,
          type: "reorder_recommendation",
          title: `Reorder ${product.name}`,
          payload: {
            productName: product.name,
            currentStock: Number(product.stock),
            suggestedReorderQty: reorderQty,
            suggestedCoverageDays: 14,
            estimatedDailyVelocity: Number(velocity.toFixed(2)),
            rowVersion: Number(product.row_version),
          },
          confidence: Math.max(0.72, toConfidence(Number(product.stock), daysToStockout) - 0.03),
        })
      }
    }

    const priorityScore = Number((Number(product.sales) * 0.6 + Math.max(0, 20 - Number(product.stock)) * 0.4).toFixed(2))
    if (priorityScore >= 25) {
      generatedRecommendations.push({
        productId: product.id,
        type: "fulfillment_priority",
        title: `Prioritize fulfillment for ${product.name}`,
        payload: {
          productName: product.name,
          currentStock: Number(product.stock),
          salesSignal: Number(product.sales),
          priorityScore,
          reason: "High demand with constrained inventory. Prioritize packing and dispatch.",
        },
        confidence: Math.min(0.94, 0.7 + Math.min(priorityScore / 120, 0.24)),
      })
    }
  }

  await sql/* sql */`
    UPDATE public.inventory_automation_recommendations
    SET status = 'dismissed', updated_at = NOW()
    WHERE user_id = ${userId}
      AND status IN ('pending', 'approved')
  `

  const inserted: InventoryRecommendationRow[] = []
  for (const recommendation of generatedRecommendations.slice(0, 100)) {
    const [row] = (await sql/* sql */`
      INSERT INTO public.inventory_automation_recommendations (
        user_id,
        product_id,
        recommendation_type,
        recommendation_title,
        recommendation_payload,
        confidence_score,
        status
      )
      VALUES (
        ${userId},
        ${recommendation.productId},
        ${recommendation.type},
        ${recommendation.title},
        ${JSON.stringify(recommendation.payload)},
        ${recommendation.confidence},
        'pending'
      )
      RETURNING id, user_id, product_id, recommendation_type, recommendation_title, recommendation_payload,
                confidence_score, status, approved_by, approved_at, applied_at, created_at, updated_at
    `) as InventoryRecommendationRow[]
    inserted.push(row)
  }

  await sql/* sql */`
    INSERT INTO public.inventory_automation_execution_logs (
      user_id,
      action,
      action_payload,
      recommendation_count,
      triggered_by
    )
    VALUES (
      ${userId},
      'forecast_recalculation',
      ${JSON.stringify({ reason: options.reason ?? "manual", generated: inserted.length })},
      ${inserted.length},
      ${options.initiatedBy ?? null}
    )
  `

  return {
    generated: inserted.length,
    recommendations: inserted,
  }
}

export async function listInventoryRecommendations(userId: number) {
  const sql = getSql()
  return (await sql/* sql */`
    SELECT id, user_id, product_id, recommendation_type, recommendation_title, recommendation_payload,
           confidence_score, status, approved_by, approved_at, applied_at, created_at, updated_at
    FROM public.inventory_automation_recommendations
    WHERE user_id = ${userId}
      AND status IN ('pending', 'approved', 'applied')
    ORDER BY created_at DESC
    LIMIT 120
  `) as InventoryRecommendationRow[]
}

export async function approveInventoryRecommendation(userId: number, recommendationId: string, actorUserId: number) {
  const sql = getSql()
  const [recommendation] = (await sql/* sql */`
    SELECT id, user_id, product_id, recommendation_type, recommendation_payload, status
    FROM public.inventory_automation_recommendations
    WHERE id = ${recommendationId}
      AND user_id = ${userId}
    LIMIT 1
  `) as Array<{
    id: string
    user_id: number
    product_id: number | null
    recommendation_type: InventoryAutomationRecommendationType
    recommendation_payload: Record<string, unknown>
    status: InventoryAutomationRecommendationStatus
  }>

  if (!recommendation) {
    return { ok: false as const, code: "NOT_FOUND" as const }
  }

  if (recommendation.status === "applied") {
    return { ok: false as const, code: "ALREADY_APPLIED" as const }
  }

  if (recommendation.recommendation_type === "reorder_recommendation" && recommendation.product_id) {
    const reorderQty = Number(recommendation.recommendation_payload?.suggestedReorderQty ?? 0)
    if (reorderQty > 0) {
      await sql/* sql */`
        UPDATE public.products
        SET stock = stock + ${reorderQty}, row_version = row_version + 1, updated_at = NOW()
        WHERE id = ${recommendation.product_id}
          AND user_id = ${userId}
      `
    }
  }

  const [updated] = (await sql/* sql */`
    UPDATE public.inventory_automation_recommendations
    SET
      status = 'applied',
      approved_by = ${actorUserId},
      approved_at = NOW(),
      applied_at = NOW(),
      updated_at = NOW()
    WHERE id = ${recommendationId}
      AND user_id = ${userId}
    RETURNING id, user_id, product_id, recommendation_type, recommendation_title, recommendation_payload,
              confidence_score, status, approved_by, approved_at, applied_at, created_at, updated_at
  `) as InventoryRecommendationRow[]

  await sql/* sql */`
    INSERT INTO public.inventory_automation_execution_logs (
      user_id,
      recommendation_id,
      action,
      action_payload,
      recommendation_count,
      triggered_by
    )
    VALUES (
      ${userId},
      ${recommendationId},
      'recommendation_applied',
      ${JSON.stringify({ type: recommendation.recommendation_type, productId: recommendation.product_id })},
      1,
      ${actorUserId}
    )
  `

  return { ok: true as const, recommendation: updated }
}
