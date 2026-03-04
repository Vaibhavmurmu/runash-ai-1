import { type NextRequest } from "next/server"
import { handleStripeWebhookRequest } from "@/app/api/billing/webhook/_shared"

export async function POST(req: NextRequest) {
  return handleStripeWebhookRequest(req)
}

export const dynamic = "force-dynamic"
