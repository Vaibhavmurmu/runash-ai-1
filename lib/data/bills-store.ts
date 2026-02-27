type BillCategory = { id: string; name: string; icon: string; is_active: boolean }
type BillProvider = { id: string; category_id: string; name: string; code: string; is_active: boolean }
type UserBill = {
  id: string
  user_id: string
  provider_id: string
  nickname?: string | null
  consumer_number: string
  consumer_name?: string | null
  is_favorite?: boolean
  is_autopay_enabled?: boolean
  autopay_amount_limit?: number | null
  reminder_days?: number
  last_bill_amount?: number | null
  next_due_date?: string | null
  last_bill_date?: string | null
}
type BillPayment = {
  id: string
  user_id: string
  user_bill_id: string
  status: 'success' | 'failed' | 'pending'
  total_amount: number
  convenience_fee: number
  transaction_id: string
  created_at: string
}

const categories: BillCategory[] = [
  { id: 'electricity', name: 'Electricity', icon: 'zap', is_active: true },
  { id: 'water', name: 'Water', icon: 'droplets', is_active: true },
  { id: 'gas', name: 'Gas', icon: 'flame', is_active: true },
  { id: 'mobile', name: 'Mobile', icon: 'smartphone', is_active: true },
  { id: 'broadband', name: 'Broadband', icon: 'wifi', is_active: true },
  { id: 'dth', name: 'DTH', icon: 'tv', is_active: true },
]

const providers: BillProvider[] = [
  { id: 'bses', category_id: 'electricity', name: 'BSES', code: 'BSES', is_active: true },
  { id: 'jvvnl', category_id: 'electricity', name: 'JVVNL', code: 'JVVNL', is_active: true },
  { id: 'airtel', category_id: 'mobile', name: 'Airtel', code: 'AIRTEL', is_active: true },
  { id: 'jio', category_id: 'mobile', name: 'Jio', code: 'JIO', is_active: true },
]

const userBills = new Map<string, UserBill[]>()
const payments = new Map<string, BillPayment[]>()

function id(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const BillsStore = {
  categories,
  getProviders(categoryId: string) {
    return providers.filter((p) => p.category_id === categoryId && p.is_active)
  },
  getUserBills(userId: string) {
    return userBills.get(userId) || []
  },
  addUserBill(input: Omit<UserBill, 'id'>) {
    const row: UserBill = { ...input, id: id('bill') }
    const existing = userBills.get(input.user_id) || []
    userBills.set(input.user_id, [row, ...existing])
    return row
  },
  fetchBillDetails(providerId: string, consumerNumber: string) {
    return {
      consumerName: `Consumer ${consumerNumber.slice(-4)}`,
      billAmount: Math.max(100, Math.round((Number(consumerNumber.slice(-3)) || 500) * 1.3)),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      billDate: new Date().toISOString(),
      billNumber: id(`inv_${providerId}`),
      billingAddress: 'RunAsh Smart District',
    }
  },
  addPayment(input: { userId: string; userBillId: string; billAmount: number; convenienceFee: number }) {
    const row: BillPayment = {
      id: id('pay'),
      user_id: input.userId,
      user_bill_id: input.userBillId,
      total_amount: Number((input.billAmount + input.convenienceFee).toFixed(2)),
      convenience_fee: input.convenienceFee,
      status: 'success',
      transaction_id: id('TXN').toUpperCase(),
      created_at: new Date().toISOString(),
    }
    const existing = payments.get(input.userId) || []
    payments.set(input.userId, [row, ...existing])

    const bills = userBills.get(input.userId) || []
    const idx = bills.findIndex((b) => b.id === input.userBillId)
    if (idx >= 0) {
      bills[idx] = {
        ...bills[idx],
        last_bill_amount: input.billAmount,
        last_bill_date: row.created_at,
      }
      userBills.set(input.userId, bills)
    }

    return row
  },
  getPayments(userId: string) {
    return payments.get(userId) || []
  },
  getProviderById(providerId: string) {
    return providers.find((p) => p.id === providerId) || null
  },
}
