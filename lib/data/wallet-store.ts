import {
  createWalletLinkSessionWithProvider,
  getWalletLinkSessionById,
  createWalletCard,
  createWalletLinkSession,
  listWalletActivity,
  listWalletCards,
  listWalletSubscriptions,
  logWalletCheckout,
  removeWalletCard,
  setWalletDefaultCard,
  updateWalletCardLifecycle,
  listWalletTransactions,
  updateWalletSubscriptionStatus,
  updateWalletLinkSessionProviderStatus,
  verifyWalletLinkSession,
} from "@/lib/repositories/wallet"

const seededUser = "demo-user"

function resolveUser(userId?: string | null) {
  return userId && userId.trim() ? userId : seededUser
}

export const WalletStore = {
  resolveUser,
  async listCards(userId?: string | null) {
    return listWalletCards(resolveUser(userId))
  },
  async addCard(input: {
    userId?: string | null
    holderName: string
    cardNumber: string
    expMonth: number
    expYear: number
    brand?: string
    billingAddress?: string
    setDefault?: boolean
    setBackup?: boolean
  }) {
    return createWalletCard({ ...input, userId: resolveUser(input.userId) })
  },
  async setDefaultCard(userId: string, cardId: string) {
    return setWalletDefaultCard(resolveUser(userId), cardId)
  },
  async removeCard(userId: string, cardId: string) {
    return removeWalletCard(resolveUser(userId), cardId)
  },
  async lifecycleCard(userId: string, cardId: string, input: { setDefault?: boolean; setBackup?: boolean; disable?: boolean }) {
    return updateWalletCardLifecycle(resolveUser(userId), cardId, input)
  },
  async listActivity(userId?: string | null, input?: { limit?: number; offset?: number; search?: string; type?: string }) {
    return listWalletActivity(resolveUser(userId), input)
  },
  async listTransactions(userId?: string | null, input?: { limit?: number; offset?: number; status?: "succeeded" | "failed" | null; search?: string }) {
    return listWalletTransactions(resolveUser(userId), input)
  },
  async listSubscriptions(
    userId?: string | null,
    input?: { limit?: number; offset?: number; status?: "active" | "paused" | "canceled" | null; search?: string },
  ) {
    return listWalletSubscriptions(resolveUser(userId), input)
  },
  async updateSubscription(
    userId: string,
    subscriptionId: string,
    input: {
      status?: "active" | "paused" | "canceled"
      plan?: string
      reason?: string
      eventType: "plan_changed" | "paused" | "canceled" | "reactivated"
    },
  ) {
    return updateWalletSubscriptionStatus(resolveUser(userId), subscriptionId, input)
  },
  async createLinkSession(input: { userId?: string | null; email: string }) {
    return createWalletLinkSession({ userId: resolveUser(input.userId), email: input.email })
  },
  async createLinkSessionWithProvider(input: {
    userId?: string | null
    email: string
    provider: "stripe_link"
    providerSessionId: string
    providerCustomerId?: string | null
    providerRequestId?: string | null
    maskedPhone: string
  }) {
    return createWalletLinkSessionWithProvider({
      userId: resolveUser(input.userId),
      email: input.email,
      provider: input.provider,
      providerSessionId: input.providerSessionId,
      providerCustomerId: input.providerCustomerId,
      providerRequestId: input.providerRequestId,
      maskedPhone: input.maskedPhone,
    })
  },
  async getLinkSessionById(sessionId: string) {
    return getWalletLinkSessionById(sessionId)
  },
  async updateLinkSessionProviderStatus(input: {
    sessionId?: string
    providerSessionId?: string
    status: "pending" | "verified" | "failed" | "expired"
    reason?: string | null
    providerRequestId?: string | null
  }) {
    return updateWalletLinkSessionProviderStatus(input)
  },
  async getLinkAutofillForSession(sessionId: string) {
    const session = await getWalletLinkSessionById(sessionId)
    if (!session) {
      return { defaultCard: null, autofill: null }
    }

    const cards = await listWalletCards(session.userId)
    const defaultCard = cards.find((card) => card.isDefault) || cards[0] || null

    return {
      defaultCard,
      autofill: defaultCard
        ? {
            email: session.email,
            paymentMethod: `${defaultCard.brand.toUpperCase()} •••• ${defaultCard.last4}`,
            billingAddress: defaultCard.billingAddress || "Saved billing address",
          }
        : null,
    }
  },
  async verifyLinkSession(sessionId: string, code: string) {
    return verifyWalletLinkSession(sessionId, code)
  },
  async logCheckout(input: { userId?: string | null; amount: number; currency: string; description: string }) {
    return logWalletCheckout({ ...input, userId: resolveUser(input.userId) })
  },
}
