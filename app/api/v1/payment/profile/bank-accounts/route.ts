import { type NextRequest } from "next/server"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { ensureCustomerScopedAccess, requireBillingActionAccess } from "@/lib/billing-auth"
import { BankService, bankAccountValidation } from "@/lib/services/bank-services"

type AddBankAccountBody = {
  bankName?: string
  accountNumber?: string
  ifscCode?: string | null
  accountHolderName?: string
  accountType?: string
  currency?: string
  isPrimary?: boolean
}

function parseAddBankAccountBody(body: AddBankAccountBody) {
  const bankName = String(body.bankName ?? "").trim()
  const accountNumber = String(body.accountNumber ?? "").trim()
  const accountHolderName = String(body.accountHolderName ?? "").trim()
  const accountType = String(body.accountType ?? "savings").trim() || "savings"
  const currency = String(body.currency ?? "INR").trim().toUpperCase() || "INR"
  const ifscCode = bankAccountValidation.normalizeIfsc(body.ifscCode)

  if (!bankName) {
    return { ok: false as const, message: "Bank name is required." }
  }

  const validation = bankAccountValidation.validateInput({
    bankName,
    accountNumber,
    ifscCode,
    accountHolderName,
    accountType,
    currency,
    isPrimary: Boolean(body.isPrimary),
  })

  if (!validation.valid) {
    return { ok: false as const, message: validation.message }
  }

  return {
    ok: true as const,
    data: {
      bankName,
      accountNumber,
      ifscCode,
      accountHolderName: bankAccountValidation.normalizeAccountName(accountHolderName),
      accountType,
      currency,
      isPrimary: Boolean(body.isPrimary),
    },
  }
}

export async function GET(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, {
    customerId: access.sessionUser.userId,
    organizationId: access.sessionUser.organizationId,
  })
  if (scopeError) return scopeError

  const result = await BankService.getBankAccounts(access.sessionUser.userId)
  if (result.error) {
    return respondError(request, { code: "BANK_ACCOUNTS_FETCH_FAILED", message: "Failed to fetch bank accounts" }, { status: 500 })
  }

  return respondSuccess(request, result.data)
}

export async function POST(request: NextRequest) {
  const access = await requireBillingActionAccess("billing:operate")
  if ("response" in access) return access.response

  const scopeError = ensureCustomerScopedAccess(access.sessionUser, {
    customerId: access.sessionUser.userId,
    organizationId: access.sessionUser.organizationId,
  })
  if (scopeError) return scopeError

  const body = (await request.json().catch(() => ({}))) as AddBankAccountBody
  const parsed = parseAddBankAccountBody(body)

  if (!parsed.ok) {
    return respondError(
      request,
      { code: "INVALID_BANK_ACCOUNT_PAYLOAD", message: parsed.message },
      { status: 400 },
    )
  }

  const result = await BankService.addBankAccount({
    userId: access.sessionUser.userId,
    ...parsed.data,
  })

  if (result.error || !result.data) {
    const message = result.error instanceof Error ? result.error.message : "Unable to add bank account"
    return respondError(request, { code: "BANK_ACCOUNT_CREATE_FAILED", message }, { status: 400 })
  }

  return respondSuccess(request, result.data, { status: 201 })
}
