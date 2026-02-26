import {
  createWalletCard,
  createWalletLinkSession,
  listWalletActivity,
  listWalletCards,
  listWalletSubscriptions,
  logWalletCheckout,
  removeWalletCard,
  setWalletDefaultCard,
  updateWalletSubscriptionStatus,
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
  }) {
    return createWalletCard({ ...input, userId: resolveUser(input.userId) })
  },
  async setDefaultCard(userId: string, cardId: string) {
    return setWalletDefaultCard(resolveUser(userId), cardId)
  },
  async removeCard(userId: string, cardId: string) {
    return removeWalletCard(resolveUser(userId), cardId)
  },
  async listActivity(userId?: string | null) {
    return listWalletActivity(resolveUser(userId))
  },
  async listSubscriptions(userId?: string | null) {
    return listWalletSubscriptions(resolveUser(userId))
  },
  async updateSubscription(userId: string, subscriptionId: string, status: "active" | "paused" | "canceled") {
    return updateWalletSubscriptionStatus(resolveUser(userId), subscriptionId, status)
  },
  async createLinkSession(input: { userId?: string | null; email: string }) {
    return createWalletLinkSession({ userId: resolveUser(input.userId), email: input.email })
  },
  async verifyLinkSession(sessionId: string, code: string) {
    return verifyWalletLinkSession(sessionId, code)
  },
  async logCheckout(input: { userId?: string | null; amount: number; currency: string; description: string }) {
    return logWalletCheckout({ ...input, userId: resolveUser(input.userId) })
  },
}
