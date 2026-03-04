export const BillClient = {
  getBillCategories: async () => {
    const res = await fetch('/api/bills/categories')
    const data = await res.json()
    return res.ok ? { data, error: null } : { data: null, error: data?.error || 'Failed' }
  },
  getBillProviders: async (categoryId: string) => {
    const res = await fetch(`/api/bills/providers?categoryId=${encodeURIComponent(categoryId)}`)
    const data = await res.json()
    return res.ok ? { data, error: null } : { data: null, error: data?.error || 'Failed' }
  },
  getUserBills: async (userId: string) => {
    const res = await fetch(`/api/bills/user?userId=${encodeURIComponent(userId)}`)
    const data = await res.json()
    return res.ok ? { data, error: null } : { data: null, error: data?.error || 'Failed' }
  },
  addUserBill: async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/bills/user', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    return res.ok ? { data, error: null } : { data: null, error: data?.error || 'Failed' }
  },
  fetchBillDetails: async (providerId: string, consumerNumber: string) => {
    const res = await fetch('/api/bills/fetch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ providerId, consumerNumber }) })
    const data = await res.json()
    return res.ok ? { data: data?.data, error: null } : { data: null, error: data?.error || 'Failed' }
  },
  payBill: async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/bills/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    return res.ok ? { data: data?.data, error: null } : { data: null, error: data?.error || 'Failed' }
  },
  getBillPaymentHistory: async (userId: string) => {
    const res = await fetch(`/api/bills/history?userId=${encodeURIComponent(userId)}`)
    const data = await res.json()
    return res.ok ? { data, error: null } : { data: null, error: data?.error || 'Failed' }
  },
}
