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

export type BankAccountPublic = {
  id: string
  bankName: string
  accountNumberMasked: string
  accountLast4: string
  ifscCode: string | null
  accountType: string
  currency: string
  isPrimary: boolean
  isActive: boolean
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
    accountType: account.account_type,
    currency: account.currency,
    isPrimary: account.is_primary,
    isActive: account.is_active,
    createdAt: account.created_at,
    updatedAt: account.updated_at,
  }
}

export class BankService {
  static async getBankAccounts(userId: string): Promise<{ data: BankAccountPublic[] | null; error: any }> {
    try {
      const { data, error } = await neon
        .from("bank_accounts")
        .select("*")
        .eq("user_id", userId)
        .order("is_primary", { ascending: false })

      if (error) throw error
      return { data: data.map(toPublicBankAccount), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async addBankAccount(input: AddBankAccountInput): Promise<{ data: BankAccountPublic | null; error: any }> {
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

      const account: BankAccountInsert = {
        user_id: input.userId,
        bank_name: normalizedAccount.bankName,
        account_number: normalizedAccount.accountNumber,
        ifsc_code: normalizedAccount.ifscCode,
        account_holder_name: normalizedAccount.accountHolderName,
        account_type: normalizedAccount.accountType,
        currency: normalizedAccount.currency,
        is_primary: normalizedAccount.isPrimary,
        is_active: true,
        balance: 0,
      }

      // If this is set as primary, update other accounts
      if (account.is_primary) {
        await neon.from("bank_accounts").update({ is_primary: false }).eq("user_id", account.user_id)
      }

      const { data, error } = await neon.from("bank_accounts").insert(account).select().single()

      if (error) throw error
      return { data: toPublicBankAccount(data), error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateBankAccount(accountId: string, updates: Partial<BankAccount>): Promise<{ error: any }> {
    try {
      // If setting as primary, update other accounts
      if (updates.is_primary) {
        const { data: account } = await neon.from("bank_accounts").select("user_id").eq("id", accountId).single()

        if (account) {
          await neon.from("bank_accounts").update({ is_primary: false }).eq("user_id", account.user_id)
        }
      }

      const { error } = await neon.from("bank_accounts").update(updates).eq("id", accountId)

      return { error }
    } catch (error) {
      return { error }
    }
  }

  static async getUpiIds(userId: string): Promise<{ data: UpiId[] | null; error: any }> {
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

  static async addUpiId(upiId: UpiIdInsert): Promise<{ data: UpiId | null; error: any }> {
    try {
      // Check if UPI ID already exists
      const { data: existing } = await neon.from("upi_ids").select("id").eq("upi_id", upiId.upi_id).single()

      if (existing) {
        throw new Error("UPI ID already exists")
      }

      // If this is set as primary, update other UPI IDs
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

  static async checkBalance(accountId: string): Promise<{ data: number | null; error: any }> {
    try {
      const { data, error } = await neon.from("bank_accounts").select("balance").eq("id", accountId).single()

      if (error) throw error
      return { data: data.balance, error: null }
    } catch (error) {
      return { data: null, error }
    }
  }

  static async updateBalance(accountId: string, newBalance: number): Promise<{ error: any }> {
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
