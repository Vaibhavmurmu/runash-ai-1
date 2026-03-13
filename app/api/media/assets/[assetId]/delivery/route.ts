import { NextResponse, type NextRequest } from "next/server"
import { requireEditorUser } from "@/app/api/editor/_lib"
import { sql } from "@/lib/db"
import { buildSignedCdnUrl } from "@/lib/media/cdn-signing"

export async function GET(request: NextRequest, context: { params: Promise<{ assetId: string }> }) {
  const params = await context.params
  const auth = await requireEditorUser(request)
  if ("error" in auth) return auth.error

  const [asset] = await sql`SELECT * FROM media_assets WHERE id=${params.assetId} AND owner_id=${auth.userId}`
  if (!asset) return NextResponse.json({ error: "Asset not found" }, { status: 404 })

  const variants = await sql`
    SELECT *
    FROM media_variants
    WHERE asset_id=${params.assetId} AND owner_id=${auth.userId} AND status='ready'
    ORDER BY created_at
  `

  const signedVariants = variants.map((variant: Record<string, unknown>) => {
    const variantType = String(variant.variant_type)
    const kind = variantType.includes("manifest") ? "manifest" : "binary"
    const signed = buildSignedCdnUrl(String(variant.cdn_path), kind)

    return {
      ...variant,
      delivery: signed,
    }
  })

  return NextResponse.json({
    asset,
    delivery: {
      signedAt: new Date().toISOString(),
      variants: signedVariants,
    },
  })
}
