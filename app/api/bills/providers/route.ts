import { NextRequest, NextResponse } from 'next/server'
import { BillsStore } from '@/lib/data/bills-store'

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get('categoryId') || ''
  if (!categoryId) return NextResponse.json({ error: 'categoryId is required' }, { status: 400 })
  return NextResponse.json(BillsStore.getProviders(categoryId))
}
