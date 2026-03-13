import { type NextRequest } from "next/server"
import { z } from "zod"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { BankService, bankAccountValidation } from "@/lib/services/bank-services"

const updateBankAccountSchema = z
  .object({
    bankName: z.string().min(1).optional(),
    ifscCode: z.string().nullable().optional(),
    accountHolderName: z.string().min(1).optional(),
    accountType: z.string().min(1).optional(),
    currency: z.string().min(1).optional(),
    isPrimary: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .strict()

function parseBodyForValidation(body: z.infer<typeof updateBankAccountSchema>) {
  if (body.ifscCode !== undefined) {
    const normalizedIfsc = bankAccountValidation.normalizeIfsc(body.ifscCode)
    if (normalizedIfsc && !bankAccountValidation.ifscRegex.test(normalizedIfsc)) {
      return { ok: false as const, message: "IFSC code format is invalid." }
    }
  }

  if (body.accountHolderName !== undefined) {
    const normalizedName = bankAccountValidation.normalizeAccountName(body.accountHolderName)
    if (!bankAccountValidation.accountHolderNameRegex.test(normalizedName)) {
      return {
        ok: false as const,
        message: "Account holder name must be 3-100 characters and contain letters, spaces, apostrophes, periods, or hyphens.",
      }
    }
  }

  return { ok: true as const }
}

export async function PATCH(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, {
    customerId: access.sessionUser.userId,
    organizationId: access.sessionUser.organizationId,
  })
  if (scopeError) return scopeError

  const body = await request.json().catch(() => ({}))
  const parsed = updateBankAccountSchema.safeParse(body)

  if (!parsed.success) {
    return respondError(request, { code: "INVALID_BANK_ACCOUNT_UPDATE", message: "Invalid bank account update payload" }, { status: 400 })
  }

  const validation = parseBodyForValidation(parsed.data)
  if (!validation.ok) {
    return respondError(request, { code: "INVALID_BANK_ACCOUNT_UPDATE", message: validation.message }, { status: 400 })
  }

  const result = await BankService.updateBankAccount({
    accountId: params.id,
    userId: access.sessionUser.userId,
    ...parsed.data,
  })

  if (result.error || !result.data) {
    const message = result.error instanceof Error ? result.error.message : "Unable to update bank account"
    const status = message === "Bank account not found" ? 404 : 400
    return respondError(request, { code: "BANK_ACCOUNT_UPDATE_FAILED", message }, { status })
  }

  return respondSuccess(request, result.data)
}

export async function DELETE(request: NextRequest, { params: routeParamsPromise }: { params: Promise<{ id: string }> }) {
  const params = await routeParamsPromise
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, {
    customerId: access.sessionUser.userId,
    organizationId: access.sessionUser.organizationId,
  })
  if (scopeError) return scopeError

  const result = await BankService.archiveBankAccount(params.id, access.sessionUser.userId)

  if (result.error || !result.data) {
    const message = result.error instanceof Error ? result.error.message : "Unable to archive bank account"
    const status = message === "Bank account not found" ? 404 : 400
    return respondError(request, { code: "BANK_ACCOUNT_ARCHIVE_FAILED", message }, { status })
  }

  return respondSuccess(request, { archived: true, account: result.data })
}
