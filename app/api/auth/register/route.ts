import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { defaultRegisterHandlerDependencies, handleRegister } from "./register-route-handler"

export async function POST(request: NextRequest): Promise<Response> {
  return handleRegister(request, {
    ...defaultRegisterHandlerDependencies,
    signUpEmail: (args) => auth.api.signUpEmail(args) as ReturnType<typeof defaultRegisterHandlerDependencies.signUpEmail>,
  })
}
