import { type NextRequest } from "next/server"
import { handleRegister } from "./register-route-handler"

export async function POST(request: NextRequest) {
  return handleRegister(request)
}
