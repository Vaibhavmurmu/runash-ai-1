import { NextRequest, NextResponse } from "next/server"
import { WalletStore } from "@/lib/data/wallet-store"

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const csvRows = [headers.join(",")]
  rows.forEach((row) => {
    csvRows.push(
      headers
        .map((header) => {
          const value = row[header]
          const text = value == null ? "" : String(value)
          return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
        })
        .join(","),
    )
  })
  return csvRows.join("\n")
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId")
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50")
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0")
  const type = request.nextUrl.searchParams.get("type")
  const search = request.nextUrl.searchParams.get("search")
  const format = request.nextUrl.searchParams.get("format")

  const data = await WalletStore.listActivity(userId, {
    limit: Number.isFinite(limit) ? limit : 50,
    offset: Number.isFinite(offset) ? offset : 0,
    type: type || undefined,
    search: search || undefined,
  })

  if (format === "csv") {
    const csv = toCsv(data)
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="wallet-activity-${Date.now()}.csv"`,
      },
    })
  }

  return NextResponse.json({ success: true, data })
}
