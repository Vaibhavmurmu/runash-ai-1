// Legacy compatibility + helpers for charts
export const revenue = 0

import { queryOne } from "@/lib/db"

export async function getRevenueTotals(userId?: string): Promise<number> {
  try {
    if (userId) {
      const row = await queryOne<{ total: number }>(
        `select coalesce(sum(total_revenue),0) as total from streams where user_id=$1`,
        [userId],
      )
      return row?.total ?? 0
    }
    const row = await queryOne<{ total: number }>(`select coalesce(sum(total_revenue),0) as total from streams`, [])
    return row?.total ?? 0
  } catch {
    return 0
  }
}
