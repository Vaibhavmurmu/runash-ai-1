import { NextResponse } from "next/server"
import { Database } from "@/lib/database"

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const stream = await Database.updateStream(params.id, {
    status: "live",
    start_time: new Date().toISOString(),
  } as never)
  return NextResponse.json({ session: stream })
}
