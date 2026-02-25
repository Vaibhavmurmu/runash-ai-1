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

export async function GET(request: NextRequest) {
  try {
    const userId = await requireSellerSessionUserId(request)
    if (userId instanceof Response) return userId

    const sql = getSql()

    const [row] = await sql/* sql */`
      SELECT id, name, bio, role
      FROM public.users
      WHERE id = ${userId}
        AND role = 'seller'
      LIMIT 1
    `

    if (!row) {
      return respondError(request, { code: "SELLER_NOT_FOUND", message: "Seller not found" }, { status: 404, legacy: { error: "Seller not found" } })
    }

    let parsedBio: Record<string, unknown> = {}
    if (row.bio) {
      try {
        parsedBio = typeof row.bio === "string" ? JSON.parse(row.bio) : row.bio
      } catch {
        parsedBio = {}
      }
    }

    const sellerSettings = parsedBio && typeof parsedBio === "object" && "sellerSettings" in parsedBio ? (parsedBio.sellerSettings as SellerSettingsPayload) : undefined

    const settings = {
      ...defaultSettings,
      ...(sellerSettings || {}),
      businessName: sellerSettings?.businessName || row.name || defaultSettings.businessName,
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

    const [row] = await sql/* sql */`
      SELECT id, bio
      FROM public.users
      WHERE id = ${userId}
        AND role = 'seller'
      LIMIT 1
    `

    if (!row) {
      return respondError(request, { code: "SELLER_NOT_FOUND", message: "Seller not found" }, { status: 404, legacy: { error: "Seller not found" } })
    }

    let parsedBio: Record<string, unknown> = {}
    if (row.bio) {
      try {
        parsedBio = typeof row.bio === "string" ? JSON.parse(row.bio) : row.bio
      } catch {
        parsedBio = {}
      }
    }

    const sellerSettings = parsedBio && typeof parsedBio === "object" && "sellerSettings" in parsedBio ? (parsedBio.sellerSettings as SellerSettingsPayload) : undefined

    const mergedSettings = {
      ...defaultSettings,
      ...(sellerSettings || {}),
      ...payload,
    }

    const mergedBio = {
      ...parsedBio,
      sellerSettings: mergedSettings,
    }

    const [updated] = await sql/* sql */`
      UPDATE public.users
      SET bio = ${JSON.stringify(mergedBio)}, updated_at = NOW()
      WHERE id = ${userId}
        AND role = 'seller'
      RETURNING id
    `

    if (!updated) {
      return respondError(request, { code: "SELLER_SETTINGS_UPDATE_FAILED", message: "Unable to update seller settings" }, { status: 500, legacy: { error: "Unable to update seller settings" } })
    }

    return respondSuccess(request, mergedSettings, { legacy: mergedSettings })
  } catch {
    return respondError(request, { code: "SELLER_SETTINGS_UPDATE_FAILED", message: "Failed to update seller settings" }, { status: 500, legacy: { error: "Failed to update seller settings" } })
  }
}
