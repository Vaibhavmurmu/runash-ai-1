import { NextRequest } from "next/server"
import { handleStreamEventsGet } from "./route-handler"

export async function GET(request: NextRequest) {
  return handleStreamEventsGet(request)
}
