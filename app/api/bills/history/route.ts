import { NextRequest, NextResponse } from 'next/server'
import { BillsStore } from '@/lib/data/bills-store'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') || ''
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

  const bills = BillsStore.getUserBills(userId)
  const billById = new Map(bills.map((b) => [b.id, b]))

  const rows = BillsStore.getPayments(userId).map((payment) => {
    const bill = billById.get(payment.user_bill_id)
    const provider = bill ? BillsStore.getProviderById(bill.provider_id) : null
    return {
      ...payment,
      user_bill: bill
        ? {
            nickname: bill.nickname,
            consumer_number: bill.consumer_number,
            provider,
          }
        : null,
    }
  })

  return NextResponse.json(rows)
}
