import { neon } from "@/lib/neon/client"
import type { Database } from "@/lib/neon/types"

type BankAccount = Database["public"]["Tables"]["bank_accounts"]["Row"]
type BankAccountInsert = Database["public"]["Tables"]["bank_accounts"]["Insert"]
type UpiId = Database["public"]["Tables"]["upi_ids"]["Row"]
type UpiIdInsert = Database["public"]["Tables"]["upi_ids"]["Insert"]

const ACCOUNT_NUMBER_REGEX = /^\d{9,18}$/
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/
const ACCOUNT_HOLDER_NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,98}[A-Za-z.]$/

export type AddBankAccountInput = {
  userId: string
  bankName: string
  accountNumber: string
  ifscCode?: string | null
  accountHolderName: string
  accountType?: string
  currency?: string
  isPrimary?: boolean
}

export type UpdateBankAccountInput = {
  accountId: string
  userId: string
  bankName?: string
  ifscCode?: string | null
  accountHolderName?: string
  accountType?: string
  currency?: string
  isPrimary?: boolean
  isActive?: boolean
}

export type BankAccountPublic = {
  id: string
  bankName: string
  accountNumberMasked: string
  accountLast4: string
  ifscCode: string | null
  accountHolderName: string
  accountType: string
  currency: string
  isPrimary: boolean
  isActive: boolean
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

type ValidationResult = { valid: true } | { valid: false; message: string }

function normalizeIfsc(ifscCode?: string | null) {
  if (!ifscCode) return null
  return ifscCode.trim().toUpperCase()
}

function normalizeAccountName(accountHolderName: string) {
  return accountHolderName.trim().replace(/\s+/g, " ")
}

function validateBankAccountInput(input: Omit<AddBankAccountInput, "userId">): ValidationResult {
  if (!ACCOUNT_NUMBER_REGEX.test(input.accountNumber)) {
    return { valid: false, message: "Account number must be 9-18 digits." }
  }

  if (input.ifscCode && !IFSC_REGEX.test(input.ifscCode)) {
    return { valid: false, message: "IFSC code format is invalid." }
  }

  const normalizedName = normalizeAccountName(input.accountHolderName)
  if (!ACCOUNT_HOLDER_NAME_REGEX.test(normalizedName)) {
    return {
      valid: false,
      message: "Account holder name must be 3-100 characters and contain letters, spaces, apostrophes, periods, or hyphens.",
    }
  }

  return { valid: true }
}

function maskAccountNumber(accountNumber: string) {
  const trimmed = accountNumber.trim()
  const visibleDigits = trimmed.slice(-4)
  return `${"*".repeat(Math.max(0, trimmed.length - 4))}${visibleDigits}`
}

function toPublicBankAccount(account: BankAccount): BankAccountPublic {
  return {
    id: account.id,
    bankName: account.bank_name,
    accountNumberMasked: maskAccountNumber(account.account_number),
    accountLast4: account.account_number.slice(-4),
    ifscCode: account.ifsc_code,
    accountHolderName: account.account_holder_name,
    accountType: account.account_type,
    currency: account.currency,
    isPrimary: account.is_primary,
    isActive: account.is_active,
    archivedAt: account.archived_at,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  }
}

async function ensurePrimaryAccountInvariant(userId: string) {
  const { data, error } = await neon
    .from("bank_accounts")
    .select("id", { count: "exact", head: false })
    .eq("user_id", userId)
    .eq("is_active", true)
    .eq("is_primary", true)

  if (error) throw error

  if (!data.length) {
    throw new Error("At least one active primary bank account is required.")
  }
}

export class BankService {
  static async getBankAccounts(userId: string): Promise<{ data: BankAccountPublic[] | null; error: unknown }> {
    try {
      const { data, error } = await neon
        .from("bank_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("is_active", { ascending: false })
        .order("is_primary", { ascending: false })

      if (error) throw error
      return { data: data.map(toPublicBankAccount), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async addBankAccount(input: AddBankAccountInput): Promise<{ data: BankAccountPublic | null; error: unknown }> {
    try {
      const normalizedAccount = {
        bankName: input.bankName.trim(),
        accountNumber: input.accountNumber.trim(),
        ifscCode: normalizeIfsc(input.ifscCode),
        accountHolderName: normalizeAccountName(input.accountHolderName),
        accountType: input.accountType?.trim() || "savings",
        currency: input.currency?.trim().toUpperCase() || "INR",
        isPrimary: Boolean(input.isPrimary),
      }

      const validation = validateBankAccountInput(normalizedAccount)
      if (!validation.valid) {
        throw new Error(validation.message)
      }

      const { data: existingActivePrimary, error: existingActivePrimaryError } = await neon
        .from("bank_accounts")
        .select("id")
        .eq("user_id", input.userId)
        .eq("is_primary", true)
        .eq("is_active", true)

      if (existingActivePrimaryError) throw existingActivePrimaryError

      const shouldSetPrimary = normalizedAccount.isPrimary || existingActivePrimary.length === 0
      const account: BankAccountInsert = {
        user_id: input.userId,
        bank_name: normalizedAccount.bankName,
        account_number: normalizedAccount.accountNumber,
        ifsc_code: normalizedAccount.ifscCode,
        account_holder_name: normalizedAccount.accountHolderName,
        account_type: normalizedAccount.accountType,
        currency: normalizedAccount.currency,
        is_primary: shouldSetPrimary,
        is_active: true,
        archived_at: null,
        balance: 0,
      }

      if (account.is_primary) {
        await neon
          .from("bank_accounts")
          .update({ is_primary: false })
          .eq("user_id", account.user_id)
          .eq("is_active", true)
      }

      const { data, error } = await neon.from("bank_accounts").insert(account).select().single()

      if (error) throw error
      return { data: toPublicBankAccount(data), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateBankAccount(input: UpdateBankAccountInput): Promise<{ data: BankAccountPublic | null; error: unknown }> {
    try {
      const { data: existing, error: existingError } = await neon
        .from("bank_accounts")
        .select("*")
        .eq("id", input.accountId)
        .eq("user_id", input.userId)
        .single()

      if (existingError || !existing) {
        return { data: null, error: new Error("Bank account not found") }
      }

      const updates: Database["public"]["Tables"]["bank_accounts"]["Update"] = {}

      if (input.bankName !== undefined) {
        const bankName = input.bankName.trim()
        if (!bankName) {
          return { data: null, error: new Error("Bank name is required.") }
        }
        updates.bank_name = bankName
      }

      if (input.accountHolderName !== undefined) {
        const normalizedName = normalizeAccountName(input.accountHolderName)
        if (!ACCOUNT_HOLDER_NAME_REGEX.test(normalizedName)) {
          return {
            data: null,
            error: new Error(
              "Account holder name must be 3-100 characters and contain letters, spaces, apostrophes, periods, or hyphens.",
            ),
          }
        }
        updates.account_holder_name = normalizedName
      }

      if (input.ifscCode !== undefined) {
        const normalizedIfsc = normalizeIfsc(input.ifscCode)
        if (normalizedIfsc && !IFSC_REGEX.test(normalizedIfsc)) {
          return { data: null, error: new Error("IFSC code format is invalid.") }
        }
        updates.ifsc_code = normalizedIfsc
      }

      if (input.accountType !== undefined) {
        updates.account_type = input.accountType.trim() || "savings"
      }

      if (input.currency !== undefined) {
        updates.currency = input.currency.trim().toUpperCase() || "INR"
      }

      const isActiveUpdateRequested = input.isActive !== undefined
      if (isActiveUpdateRequested) {
        updates.is_active = input.isActive
        updates.archived_at = input.isActive ? null : new Date().toISOString()
      }

      if (input.isPrimary !== undefined) {
        updates.is_primary = input.isPrimary
      }

      const resultingActive = updates.is_active ?? existing.is_active
      const resultingPrimary = updates.is_primary ?? existing.is_primary

      if (existing.is_active && existing.is_primary && (resultingActive === false || resultingPrimary === false)) {
        const { data: alternatePrimary, error: alternatePrimaryError } = await neon
          .from("bank_accounts")
          .select("id")
          .eq("user_id", input.userId)
          .eq("is_active", true)
          .eq("is_primary", true)
          .neq("id", input.accountId)
          .limit(1)

        if (alternatePrimaryError) throw alternatePrimaryError

        if (!alternatePrimary.length) {
          if (resultingActive === false) {
            const { data: fallbackActive, error: fallbackActiveError } = await neon
              .from("bank_accounts")
              .select("id")
              .eq("user_id", input.userId)
              .eq("is_active", true)
              .neq("id", input.accountId)
              .order("created_at", { ascending: true })
              .limit(1)

            if (fallbackActiveError) throw fallbackActiveError
            if (!fallbackActive.length) {
              return { data: null, error: new Error("Cannot archive the last active primary bank account.") }
            }

            await neon
              .from("bank_accounts")
              .update({ is_primary: true })
              .eq("id", fallbackActive[0].id)
              .eq("user_id", input.userId)
          } else {
            return { data: null, error: new Error("Cannot unset primary without assigning another active primary account.") }
          }
        }
      }

      if (updates.is_primary) {
        await neon
          .from("bank_accounts")
          .update({ is_primary: false })
          .eq("user_id", input.userId)
          .eq("is_active", true)
          .neq("id", input.accountId)
      }

      const { data, error } = await neon
        .from("bank_accounts")
        .update(updates)
        .eq("id", input.accountId)
        .eq("user_id", input.userId)
        .select()
        .single()

      if (error || !data) throw error ?? new Error("Failed to update bank account")

      if (data.is_active && data.is_primary) {
        await ensurePrimaryAccountInvariant(input.userId)
      }

      return { data: toPublicBankAccount(data), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async archiveBankAccount(accountId: string, userId: string): Promise<{ data: BankAccountPublic | null; error: unknown }> {
    return this.updateBankAccount({ accountId, userId, isActive: false, isPrimary: false })
  }

  static async getUpiIds(userId: string): Promise<{ data: UpiId[] | null; error: unknown }> {
    try {
      const { data, error } = await neon
        .from("upi_ids")
        .select(`
          *,
          bank_account:bank_accounts(bank_name, account_number)
        `)
        .eq("user_id", userId)
        .order("is_primary", { ascending: false })

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async addUpiId(upiId: UpiIdInsert): Promise<{ data: UpiId | null; error: unknown }> {
    try {
      const { data: existing } = await neon.from("upi_ids").select("id").eq("upi_id", upiId.upi_id).single()

      if (existing) {
        throw new Error("UPI ID already exists")
      }

      if (upiId.is_primary) {
        await neon.from("upi_ids").update({ is_primary: false }).eq("user_id", upiId.user_id)
      }

      const { data, error } = await neon.from("upi_ids").insert(upiId).select().single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async checkBalance(accountId: string): Promise<{ data: number | null; error: unknown }> {
    try {
      const { data, error } = await neon.from("bank_accounts").select("balance").eq("id", accountId).single()

      if (error) throw error
      return { data: data.balance, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateBalance(accountId: string, newBalance: number): Promise<{ error: unknown }> {
    try {
      const { error } = await neon.from("bank_accounts").update({ balance: newBalance }).eq("id", accountId)

      return { error }
    } catch (error) {
      return { error }
    }
  }
}

export const bankAccountValidation = {
  accountNumberRegex: ACCOUNT_NUMBER_REGEX,
  ifscRegex: IFSC_REGEX,
  accountHolderNameRegex: ACCOUNT_HOLDER_NAME_REGEX,
  validateInput: validateBankAccountInput,
  normalizeIfsc,
  normalizeAccountName,
}
