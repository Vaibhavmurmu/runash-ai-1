import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { registerSchema } from "@/lib/validations/auth"
import { rateLimit } from "@/lib/rate-limit"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiRouteError } from "@/lib/api/logging"
import { AUTH_ENDPOINT_RATE_LIMITS } from "@/lib/auth-security-config"
import { recordAuthMetric } from "@/lib/auth-observability"
import { sql } from "@/lib/db"
import { applyAuthCaptchaMiddleware } from "@/lib/auth/captcha-middleware"

type RegisterInput = {
  email: string
  password: string
  name: string
  username: string
}

type SignUpResponse = {
  token?: string | null
  user?: {
    id?: string
    email?: string
    name?: string
    emailVerified?: boolean
  }
  error?: {
    code?: string
    status?: number
    message?: string
  }
}

type RegisterHandlerDependencies = {
  enforceRateLimit: typeof rateLimit
  applyCaptcha: typeof applyAuthCaptchaMiddleware
  signUpEmail: (args: { headers: Headers; body: Record<string, unknown> }) => Promise<SignUpResponse>
  findExistingUsername: (username: string) => Promise<{ id: string | number; email?: string | null; username?: string | null } | null>
}

const defaultDependencies: RegisterHandlerDependencies = {
  enforceRateLimit: rateLimit,
  applyCaptcha: applyAuthCaptchaMiddleware,
  signUpEmail: (args) => auth.api.signUpEmail(args) as Promise<SignUpResponse>,
  findExistingUsername: async (username) => {
    const [existingUser] = await sql`
      SELECT id, email, username
      FROM users
      WHERE username = ${username}
      LIMIT 1
    `

    return existingUser ?? null
  },
}

function extractAuthError(result: SignUpResponse | null | undefined): { status: number; code?: string; message: string } | null {
  if (!result || typeof result !== "object" || !result.error) {
    return null
  }

  const fallbackMessage = "Unable to create account. Please try again."
  return {
    status: Number.isInteger(result.error.status) ? Number(result.error.status) : 400,
    code: result.error.code,
    message: result.error.message ?? fallbackMessage,
  }
}

function mapSignUpPayload(signUpResult: SignUpResponse, input: RegisterInput) {
  const user = signUpResult.user

  return {
    id: user?.id ?? "",
    email: user?.email ?? input.email,
    name: user?.name ?? input.name,
    username: input.username,
    emailVerified: Boolean(user?.emailVerified),
  }
}

export async function handleRegister(
  request: NextRequest,
  dependencies: RegisterHandlerDependencies = defaultDependencies,
): Promise<Response> {
  try {
    const rateLimitResult = await dependencies.enforceRateLimit(
      request,
      "register",
      AUTH_ENDPOINT_RATE_LIMITS.register.limit,
      AUTH_ENDPOINT_RATE_LIMITS.register.windowMs,
    )

    if (!rateLimitResult.success) {
      recordAuthMetric("auth.rate_limited", { endpoint: "register" })
      return respondError(
        request,
        {
          code: "RATE_LIMITED",
          message: "Too many registration attempts. Please try again later.",
        },
        { status: 429, legacy: { message: "Too many registration attempts. Please try again later." } },
      )
    }

    const body = await request.json()

    const captchaFailure = await dependencies.applyCaptcha(request, {
      endpoint: "register",
      action: "sign-up",
      body,
      identifier: typeof body?.email === "string" ? body.email : undefined,
    })
    if (captchaFailure) {
      return captchaFailure
    }

    const validationResult = registerSchema.safeParse(body)
    if (!validationResult.success) {
      return respondError(
        request,
        {
          code: "VALIDATION_FAILED",
          message: "Validation failed",
          details: validationResult.error.flatten().fieldErrors,
        },
        {
          status: 400,
          legacy: {
            message: "Validation failed",
            errors: validationResult.error.flatten().fieldErrors,
          },
        },
      )
    }

    const { email, password, name, username } = validationResult.data

    const existingUsernameUser = await dependencies.findExistingUsername(username)
    if (existingUsernameUser) {
      return respondError(
        request,
        {
          code: "USER_EXISTS",
          message: "User with this username already exists",
          details: { field: "username" },
        },
        { status: 409, legacy: { message: "User with this username already exists" } },
      )
    }

    const signUpResult = await dependencies.signUpEmail({
      headers: request.headers,
      body: {
        email,
        password,
        name,
      },
    })

    const authError = extractAuthError(signUpResult)
    if (authError) {
      const isDuplicateEmail = authError.status === 422 || /already exists|another email/i.test(authError.message)
      if (isDuplicateEmail) {
        return respondError(
          request,
          {
            code: "USER_EXISTS",
            message: "User with this email already exists",
            details: { field: "email" },
          },
          { status: 409, legacy: { message: "User with this email already exists" } },
        )
      }

      return respondError(
        request,
        {
          code: authError.code ?? "AUTH_SIGNUP_FAILED",
          message: authError.message,
        },
        { status: authError.status >= 400 ? authError.status : 400, legacy: { message: authError.message } },
      )
    }

    const createdUser = mapSignUpPayload(signUpResult, { email, password, name, username })
    const verificationRequired = signUpResult.token == null || !createdUser.emailVerified
    const message = verificationRequired
      ? "User created successfully. Please check your email to verify your account."
      : "User created successfully."

    return respondSuccess(
      request,
      {
        message,
        user: createdUser,
      },
      {
        status: 201,
        legacy: {
          message,
          user: createdUser,
        },
      },
    )
  } catch (error) {
    recordAuthMetric("auth.suspicious_activity", { endpoint: "register", reason: "error" })
    logApiRouteError(request, "auth.register.failed", error, { errorCode: "AUTH_REGISTER_FAILED" })
    return respondError(
      request,
      { code: "INTERNAL_ERROR", message: "Internal server error" },
      { status: 500, legacy: { message: "Internal server error" } },
    )
  }
}

export async function handleRegisterRequest(request: Request, dependencies?: RegisterHandlerDependencies): Promise<Response> {
  return handleRegister(request as NextRequest, dependencies)
}
