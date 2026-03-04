import { type NextRequest } from "next/server"
import { getSql } from "@/lib/db/neon"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { requireSellerSessionUserId } from "@/app/api/seller/_auth"

type SellerSettingsPayload = {
  businessName?: string
  businessType?: string
  description?: string
  businessHours?: string
  deliveryRadius?: string
  minimumOrder?: string
  returnPolicy?: string
  paymentMethods?: string[]
  shippingOptions?: string[]
  certifications?: string[]
}

type SellerSettingsRow = {
  business_name: string | null
  business_type: string | null
  description: string | null
  business_hours: string | null
  delivery_radius: string | null
  minimum_order: string | null
  return_policy: string | null
  payment_methods: string[] | null
  shipping_options: string[] | null
  certifications: string[] | null
}

const defaultSettings: Required<SellerSettingsPayload> = {
  businessName: "",
  businessType: "organic-farm",
  description: "",
  businessHours: "",
  deliveryRadius: "",
  minimumOrder: "",
  returnPolicy: "",
  paymentMethods: ["credit_card"],
  shippingOptions: ["local_delivery"],
  certifications: [],
}

const fromStructuredRow = (row: SellerSettingsRow): SellerSettingsPayload => ({
  businessName: row.business_name ?? undefined,
  businessType: row.business_type ?? undefined,
  description: row.description ?? undefined,
  businessHours: row.business_hours ?? undefined,
  deliveryRadius: row.delivery_radius ?? undefined,
  minimumOrder: row.minimum_order ?? undefined,
  returnPolicy: row.return_policy ?? undefined,
  paymentMethods: row.payment_methods ?? undefined,
  shippingOptions: row.shipping_options ?? undefined,
  certifications: row.certifications ?? undefined,
})

const parseLegacySellerSettings = (bio: unknown): SellerSettingsPayload | undefined => {
  if (!bio) return undefined

  try {
    const parsedBio = typeof bio === "string" ? JSON.parse(bio) : bio
    if (!parsedBio || typeof parsedBio !== "object" || !("sellerSettings" in parsedBio)) return undefined

    return parsedBio.sellerSettings as SellerSettingsPayload
  } catch {
    return undefined
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const sql = getSql()

    const [userRow] = await sql/* sql */`
      SELECT id, name, bio
      FROM public.users
      WHERE id = ${userId}
        AND role = 'seller'
      LIMIT 1
    `

    if (!userRow) {
      return respondError(request, { code: "SELLER_NOT_FOUND", message: "Seller not found" }, { status: 404, legacy: { error: "Seller not found" } })
    }

    const [structured] = await sql/* sql */`
      SELECT business_name, business_type, description, business_hours, delivery_radius, minimum_order, return_policy, payment_methods, shipping_options, certifications
      FROM public.seller_settings
      WHERE user_id = ${userId}
      LIMIT 1
    `

    const legacySettings = parseLegacySellerSettings(userRow.bio)
    const settings = {
      ...defaultSettings,
      ...(legacySettings || {}),
      ...(structured ? fromStructuredRow(structured as SellerSettingsRow) : {}),
      businessName: structured?.business_name || legacySettings?.businessName || userRow.name || defaultSettings.businessName,
    }

    return respondSuccess(request, settings, { legacy: settings })
  } catch {
    return respondError(request, { code: "SELLER_SETTINGS_READ_FAILED", message: "Failed to load seller settings" }, { status: 500, legacy: { error: "Failed to load seller settings" } })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const payload = (await request.json()) as SellerSettingsPayload
    const sql = getSql()

    const [userRow] = await sql/* sql */`
      SELECT id, name, bio
      FROM public.users
      WHERE id = ${userId}
        AND role = 'seller'
      LIMIT 1
    `

    if (!userRow) {
      return respondError(request, { code: "SELLER_NOT_FOUND", message: "Seller not found" }, { status: 404, legacy: { error: "Seller not found" } })
    }

    const [structured] = await sql/* sql */`
      SELECT business_name, business_type, description, business_hours, delivery_radius, minimum_order, return_policy, payment_methods, shipping_options, certifications
      FROM public.seller_settings
      WHERE user_id = ${userId}
      LIMIT 1
    `

    const legacySettings = parseLegacySellerSettings(userRow.bio)

    const mergedSettings = {
      ...defaultSettings,
      ...(legacySettings || {}),
      ...(structured ? fromStructuredRow(structured as SellerSettingsRow) : {}),
      ...payload,
      businessName: payload.businessName ?? structured?.business_name ?? legacySettings?.businessName ?? userRow.name ?? defaultSettings.businessName,
    }

    const [updated] = await sql/* sql */`
      INSERT INTO public.seller_settings (
        user_id,
        business_name,
        business_type,
        description,
        business_hours,
        delivery_radius,
        minimum_order,
        return_policy,
        payment_methods,
        shipping_options,
        certifications,
        updated_at
      )
      VALUES (
        ${userId},
        ${mergedSettings.businessName},
        ${mergedSettings.businessType},
        ${mergedSettings.description},
        ${mergedSettings.businessHours},
        ${mergedSettings.deliveryRadius},
        ${mergedSettings.minimumOrder},
        ${mergedSettings.returnPolicy},
        ${mergedSettings.paymentMethods},
        ${mergedSettings.shippingOptions},
        ${mergedSettings.certifications},
        NOW()
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        business_name = EXCLUDED.business_name,
        business_type = EXCLUDED.business_type,
        description = EXCLUDED.description,
        business_hours = EXCLUDED.business_hours,
        delivery_radius = EXCLUDED.delivery_radius,
        minimum_order = EXCLUDED.minimum_order,
        return_policy = EXCLUDED.return_policy,
        payment_methods = EXCLUDED.payment_methods,
        shipping_options = EXCLUDED.shipping_options,
        certifications = EXCLUDED.certifications,
        updated_at = NOW()
      RETURNING user_id
    `

    if (!updated) {
      return respondError(request, { code: "SELLER_SETTINGS_UPDATE_FAILED", message: "Unable to update seller settings" }, { status: 500, legacy: { error: "Unable to update seller settings" } })
    }

    return respondSuccess(request, mergedSettings, { legacy: mergedSettings })
  } catch {
    return respondError(request, { code: "SELLER_SETTINGS_UPDATE_FAILED", message: "Failed to update seller settings" }, { status: 500, legacy: { error: "Failed to update seller settings" } })
  }
}
