import { logApiEvent } from "@/lib/api/logging"

export type LinkProviderErrorCode =
  | "LINK_SESSION_FAILED"
  | "LINK_VERIFICATION_FAILED"
  | "LINK_SAVE_FAILED"
  | "LINK_PROVIDER_UNAVAILABLE"

export class LinkProviderError extends Error {
  constructor(
    public readonly code: LinkProviderErrorCode,
    message: string,
    public readonly status = 502,
    public readonly providerRequestId?: string | null,
  ) {
    super(message)
  }
}

const PROVIDER_STATUS_BY_CODE: Record<LinkProviderErrorCode, number> = {
  LINK_SESSION_FAILED: 502,
  LINK_VERIFICATION_FAILED: 502,
  LINK_SAVE_FAILED: 502,
  LINK_PROVIDER_UNAVAILABLE: 503,
}

type CreateLinkSessionInput = {
  email: string
  userId?: string | null
  requestId: string
}

type SaveLinkPaymentInput = {
  email: string
  holderName: string
  cardNumber: string
  expMonth: number
  expYear: number
  billingAddress?: string
  brand?: string
  requestId: string
}

export type LinkProviderSession = {
  provider: "stripe_link"
  providerSessionId: string
  providerCustomerId: string | null
  maskedPhone: string
  providerRequestId: string | null
}

export type LinkVerificationState = "pending" | "verified" | "failed" | "expired"

export type LinkProviderVerification = {
  status: LinkVerificationState
  reason?: string
  providerRequestId: string | null
}

export type LinkProviderSavedPayment = {
  providerPaymentMethodId: string
  providerRequestId: string | null
  brand: string
  last4: string
}

const USER_SAFE_MESSAGES: Record<LinkProviderErrorCode, string> = {
  LINK_SESSION_FAILED: "Unable to start Link verification right now. Please try again.",
  LINK_VERIFICATION_FAILED: "We could not verify your Link status yet. Please retry in a moment.",
  LINK_SAVE_FAILED: "Unable to save payment details right now. Please try again.",
  LINK_PROVIDER_UNAVAILABLE: "Payment provider is currently unavailable. Please try again shortly.",
}

function toProviderError(code: LinkProviderErrorCode, _cause: unknown, providerRequestId?: string | null): LinkProviderError {
  return new LinkProviderError(code, USER_SAFE_MESSAGES[code], PROVIDER_STATUS_BY_CODE[code], providerRequestId)
}

export function toUserSafeProviderError(error: unknown): {
  code: LinkProviderErrorCode
  message: string
  providerRequestId: string | null
  status: number
  retryable: boolean
} {
  if (error instanceof LinkProviderError) {
    return {
      code: error.code,
      message: USER_SAFE_MESSAGES[error.code],
      providerRequestId: error.providerRequestId ?? null,
      status: error.status,
      retryable: error.status >= 500,
    }
  }

  return {
    code: "LINK_PROVIDER_UNAVAILABLE",
    message: USER_SAFE_MESSAGES.LINK_PROVIDER_UNAVAILABLE,
    providerRequestId: null,
    status: 503,
    retryable: true,
  }
}

function isTestOnlyMockEnabled() {
  return process.env.NODE_ENV === "test" && process.env.LINK_PROVIDER_ENABLE_MOCK === "true"
}

function isMockFailure(operation: "session" | "verify" | "save") {
  return process.env.LINK_PROVIDER_MOCK_FAIL_OP === operation
}

type StripeLikeClient = {
  customers: {
    create: (input: { email: string; metadata: Record<string, string> }) => Promise<{ id: string; lastResponse?: { requestId?: string } }>
  }
  setupIntents: {
    create: (input: unknown) => Promise<{ id: string; status?: string; lastResponse?: { requestId?: string } }>
    retrieve: (providerSessionId: string) => Promise<{ status: string; lastResponse?: { requestId?: string } }>
  }
  tokens: {
    create: (input: unknown) => Promise<{ id: string; lastResponse?: { requestId?: string } }>
  }
  paymentMethods: {
    create: (input: unknown) => Promise<{ id: string; card?: { brand?: string }; lastResponse?: { requestId?: string } }>
    attach: (paymentMethodId: string, input: unknown) => Promise<void>
  }
}

function createMockStripeClient(): StripeLikeClient {
  return {
    customers: {
      async create() {
        if (isMockFailure("session") || isMockFailure("save")) {
          throw new Error("mock_customer_create_failed")
        }
        return { id: "cus_mock_123", lastResponse: { requestId: "req_mock_customer" } }
      },
    },
    setupIntents: {
      async create() {
        if (isMockFailure("session")) {
          throw new Error("mock_setup_intent_create_failed")
        }
        return { id: "seti_mock_123", status: "requires_action", lastResponse: { requestId: "req_mock_setup_intent" } }
      },
      async retrieve(providerSessionId: string) {
        if (isMockFailure("verify")) {
          throw new Error("mock_setup_intent_retrieve_failed")
        }

        if (providerSessionId.includes("succeeded")) {
          return { status: "succeeded", lastResponse: { requestId: "req_mock_verify" } }
        }

        return { status: "requires_payment_method", lastResponse: { requestId: "req_mock_verify" } }
      },
    },
    tokens: {
      async create() {
        if (isMockFailure("save")) {
          throw new Error("mock_token_create_failed")
        }
        return { id: "tok_mock_123", lastResponse: { requestId: "req_mock_token" } }
      },
    },
    paymentMethods: {
      async create() {
        if (isMockFailure("save")) {
          throw new Error("mock_payment_method_create_failed")
        }
        return { id: "pm_mock_123", card: { brand: "visa" }, lastResponse: { requestId: "req_mock_payment_method" } }
      },
      async attach() {
        if (isMockFailure("save")) {
          throw new Error("mock_payment_method_attach_failed")
        }
      },
    },
  }
}

async function createStripeClient(): Promise<StripeLikeClient> {
  const secretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY

  if (isTestOnlyMockEnabled()) {
    return createMockStripeClient()
  }

  if (!secretKey) {
    throw toProviderError("LINK_PROVIDER_UNAVAILABLE", new Error("stripe_not_configured"))
  }

  if (process.env.LINK_PROVIDER_ENABLE_MOCK === "true") {
    throw toProviderError("LINK_PROVIDER_UNAVAILABLE", new Error("link_provider_mock_not_allowed"))
  }

  const Stripe = (await import("stripe")).default
  return new Stripe(secretKey, { apiVersion: "2026-01-28.clover" }) as unknown as StripeLikeClient
}

function maskPhoneFallback() {
  return "*** *** 3421"
}

export async function createLinkProviderSession(input: CreateLinkSessionInput): Promise<LinkProviderSession> {
  logApiEvent("info", "payments.link.provider.session.create.started", { route: "payments/link/provider", requestId: input.requestId, details: { correlationId: input.requestId, provider: "stripe_link" } })
  const stripe = await createStripeClient()

  try {
    const customer = await stripe.customers.create({
      email: input.email,
      metadata: {
        runash_user_id: input.userId ?? "demo-user",
        runash_request_id: input.requestId,
      },
    })

    const setupIntent = await stripe.setupIntents.create({
      customer: customer.id,
      payment_method_types: ["card"],
      payment_method_options: { card: { request_three_d_secure: "automatic" } },
      usage: "off_session",
      metadata: {
        runash_link_mode: "instant_checkout",
        runash_request_id: input.requestId,
      },
    })

    const providerResponse = {
      provider: "stripe_link",
      providerSessionId: setupIntent.id,
      providerCustomerId: customer.id,
      maskedPhone: maskPhoneFallback(),
      providerRequestId: setupIntent.lastResponse?.requestId ?? customer.lastResponse?.requestId ?? null,
    }
    logApiEvent("info", "payments.link.provider.session.create.completed", { route: "payments/link/provider", requestId: input.requestId, details: { correlationId: input.requestId, providerRequestId: providerResponse.providerRequestId } })
    return providerResponse
  } catch (error) {
    throw toProviderError("LINK_SESSION_FAILED", error)
  }
}

export async function fetchLinkVerificationFromProvider(providerSessionId: string): Promise<LinkProviderVerification> {
  const stripe = await createStripeClient()

  try {
    const setupIntent = await stripe.setupIntents.retrieve(providerSessionId)
    const status = setupIntent.status

    if (status === "succeeded") return { status: "verified", providerRequestId: setupIntent.lastResponse?.requestId ?? null }
    if (status === "requires_payment_method") {
      return {
        status: "failed",
        reason: "payment_method_required",
        providerRequestId: setupIntent.lastResponse?.requestId ?? null,
      }
    }

    if (status === "canceled") return { status: "failed", reason: "canceled", providerRequestId: setupIntent.lastResponse?.requestId ?? null }
    return { status: "pending", providerRequestId: setupIntent.lastResponse?.requestId ?? null }
  } catch (error) {
    throw toProviderError("LINK_VERIFICATION_FAILED", error)
  }
}

export async function saveLinkPaymentMethodViaProvider(input: SaveLinkPaymentInput): Promise<LinkProviderSavedPayment> {
  logApiEvent("info", "payments.link.provider.save.started", { route: "payments/link/provider", requestId: input.requestId, details: { correlationId: input.requestId, provider: "stripe_link" } })
  const stripe = await createStripeClient()
  const sanitizedNumber = input.cardNumber.replace(/\D/g, "")
  const last4 = sanitizedNumber.slice(-4)

  try {
    const customer = await stripe.customers.create({
      email: input.email,
      metadata: {
        runash_request_id: input.requestId,
        runash_link_mode: "instant_checkout",
      },
    })

    const token = await stripe.tokens.create({
      card: {
        number: sanitizedNumber,
        exp_month: input.expMonth,
        exp_year: input.expYear,
        name: input.holderName,
        address_line1: input.billingAddress,
      },
    })

    const paymentMethod = await stripe.paymentMethods.create({
      type: "card",
      card: {
        token: token.id,
      },
      billing_details: {
        email: input.email,
        name: input.holderName,
        address: input.billingAddress
          ? {
              line1: input.billingAddress,
            }
          : undefined,
      },
      metadata: {
        runash_request_id: input.requestId,
        runash_link_mode: "instant_checkout",
      },
    })

    await stripe.paymentMethods.attach(paymentMethod.id, {
      customer: customer.id,
    })

    return {
      providerPaymentMethodId: paymentMethod.id,
      providerRequestId:
        paymentMethod.lastResponse?.requestId ?? token.lastResponse?.requestId ?? customer.lastResponse?.requestId ?? null,
      brand: paymentMethod.card?.brand ?? input.brand ?? "card",
      last4,
    }
  } catch (error) {
    throw toProviderError("LINK_SAVE_FAILED", error)
  }
}
