import { NextRequest, NextResponse } from 'next/server'
import { BillsStore } from '@/lib/data/bills-store'

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId') || ''
  if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  const rows = BillsStore.getUserBills(userId).map((row) => ({ ...row, provider: BillsStore.getProviderById(row.provider_id) }))
  return NextResponse.json(rows)
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  if (!body?.user_id || !body?.provider_id || !body?.consumer_number) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const created = BillsStore.addUserBill(body)
  return NextResponse.json(created)
}
