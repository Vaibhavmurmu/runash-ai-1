import { type NextRequest, NextResponse } from "next/server"
import { persistTaxComputation, type TaxComputation } from "@/lib/services/tax-service"

function mapStripeInvoiceTax(invoice: Record<string, any>): TaxComputation {
  const subtotal = Number(invoice.subtotal ?? 0) / 100
  const total = Number(invoice.total ?? invoice.amount_paid ?? 0) / 100
  const totalTaxAmount = Number(invoice.total_taxes?.[0]?.amount ?? invoice.tax ?? 0) / 100

  const countryCode = String(invoice.customer_address?.country || invoice.account_country || "UN").toUpperCase()
  const stateCode = invoice.customer_address?.state ? String(invoice.customer_address.state).toUpperCase() : null

  const lineItems = Array.isArray(invoice.total_taxes)
    ? invoice.total_taxes.map((tax: Record<string, any>) => ({
        jurisdictionLevel: stateCode ? "state" as const : "country" as const,
        jurisdictionCode: stateCode ?? countryCode,
        taxType: String(tax.taxability_reason || "tax"),
        taxName: String(tax.tax_rate_details?.display_name || tax.tax_rate_details?.tax_type || "Tax"),
        ratePercent: Number(tax.tax_rate_details?.percentage_decimal ?? tax.tax_rate_details?.percentage ?? 0),
        taxableAmount: subtotal,
        taxAmount: Number(tax.amount ?? 0) / 100,
        metadata: {
          stripe_tax_rate: tax.tax_rate,
          source: "stripe_invoice",
        },
      }))
    : []

  return {
    countryCode,
    stateCode,
    taxableAmount: subtotal,
    totalTaxAmount,
    totalAmount: total,
    lineItems,
    jurisdictionDetails: {
      source: "stripe_invoice",
      city: invoice.customer_address?.city ?? null,
      postalCode: invoice.customer_address?.postal_code ?? null,
      taxAutomatic: Boolean(invoice.automatic_tax?.enabled),
    },
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ ok: true, skipped: "No STRIPE_WEBHOOK_SECRET set" })

  const sig = req.headers.get("stripe-signature") || ""
  const raw = await req.text()
  const { default: Stripe } = await import("stripe")
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY || "", {
    apiVersion: "2024-06-20",
  })

  let event: any
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret)
  } catch (err: any) {
    return NextResponse.json({ error: `Invalid signature: ${err?.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Record<string, any>
        const taxComputation = mapStripeInvoiceTax(invoice)
        await persistTaxComputation({
          sourceType: "invoice",
          sourceId: String(invoice.id),
          currency: String(invoice.currency || "usd").toUpperCase(),
          computation: taxComputation,
        })

        const paymentIntentId = invoice.payment_intent ? String(invoice.payment_intent) : null
        if (paymentIntentId) {
          await persistTaxComputation({
            sourceType: "transaction",
            sourceId: paymentIntentId,
            currency: String(invoice.currency || "usd").toUpperCase(),
            computation: taxComputation,
          })
        }
        break
      }
      case "invoice.payment_failed":
        // TODO: dunning workflow, notify user
        break
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        // TODO: sync plan and limits to your DB
        break
      default:
        break
    }
  } catch {
    return NextResponse.json({ error: "Processing error" }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

export const dynamic = "force-dynamic"
