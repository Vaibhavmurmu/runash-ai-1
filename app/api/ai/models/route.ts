import { NextResponse } from "next/server"
import { listModelCatalog } from "@/lib/ai/provider-registry"

export async function GET() {
  return NextResponse.json(
    {
      models: listModelCatalog(),
      defaultModel: "gpt-4o-mini",
    },
    { status: 200 },
  )
}
