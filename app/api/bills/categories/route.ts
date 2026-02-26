import { NextResponse } from 'next/server'
import { BillsStore } from '@/lib/data/bills-store'

export async function GET() {
  return NextResponse.json(BillsStore.categories.filter((c) => c.is_active))
}
