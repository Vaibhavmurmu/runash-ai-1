import { NextRequest, NextResponse } from 'next/server'
import { BillsStore } from '@/lib/data/bills-store'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.providerId || !body?.consumerNumber) {
    return NextResponse.json({ error: 'providerId and consumerNumber are required' }, { status: 400 })
  }
  return NextResponse.json({ data: BillsStore.fetchBillDetails(body.providerId, body.consumerNumber) })
}
