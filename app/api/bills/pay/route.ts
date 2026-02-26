import { NextRequest, NextResponse } from 'next/server'
import { BillsStore } from '@/lib/data/bills-store'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.userBillId || typeof body?.billAmount !== 'number') {
    return NextResponse.json({ error: 'userBillId and billAmount are required' }, { status: 400 })
  }

  const userId = typeof body.userId === 'string' && body.userId ? body.userId : 'anonymous'
  const payment = BillsStore.addPayment({
    userId,
    userBillId: body.userBillId,
    billAmount: body.billAmount,
    convenienceFee: typeof body.convenienceFee === 'number' ? body.convenienceFee : 2.5,
  })

  return NextResponse.json({ data: payment })
}
