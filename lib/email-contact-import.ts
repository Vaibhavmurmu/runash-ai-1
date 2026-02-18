import { EmailContactManager, type EmailContactImportSummary, type EmailContactStatus } from "@/lib/email-contacts"

interface ParsedCsvRow {
  email: string
  name?: string
  status?: string
  tags?: string
  metadata?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function splitCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]

    if (char === '"') {
      const nextChar = line[i + 1]
      if (inQuotes && nextChar === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
      continue
    }

    current += char
  }

  result.push(current.trim())
  return result
}

export function parseContactsCsv(csv: string): ParsedCsvRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) {
    return []
  }

  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase())

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ""
    })

    return {
      email: row.email || "",
      name: row.name || undefined,
      status: row.status || undefined,
      tags: row.tags || undefined,
      metadata: row.metadata || undefined,
    }
  })
}

function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email.trim())
}

function parseTags(tags?: string): string[] {
  if (!tags) return []
  return tags
    .split("|")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
}

function parseMetadata(metadata?: string): Record<string, unknown> {
  if (!metadata) return {}

  try {
    const parsed = JSON.parse(metadata)
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

export async function importEmailContacts(data: {
  csvText: string
  source?: string
  defaultStatus?: EmailContactStatus
  updateExisting?: boolean
}): Promise<EmailContactImportSummary> {
  const rows = parseContactsCsv(data.csvText)
  const seenEmails = new Set<string>()

  const summary: EmailContactImportSummary = {
    total_rows: rows.length,
    created_count: 0,
    updated_count: 0,
    duplicate_count: 0,
    invalid_count: 0,
    errors: [],
  }

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    const line = i + 2
    const email = row.email.trim().toLowerCase()

    if (!email || !isValidEmail(email)) {
      summary.invalid_count += 1
      summary.errors.push(`Line ${line}: invalid email '${row.email}'`)
      continue
    }

    if (seenEmails.has(email)) {
      summary.duplicate_count += 1
      continue
    }

    seenEmails.add(email)

    const statusCandidate = (row.status || data.defaultStatus || "subscribed").toLowerCase()
    const status = EmailContactManager.isValidStatus(statusCandidate) ? statusCandidate : "subscribed"

    const payload = {
      email,
      name: row.name,
      status,
      metadata: parseMetadata(row.metadata),
      source: data.source || "csv_import",
      tags: parseTags(row.tags),
    }

    try {
      const created = await EmailContactManager.createContact(payload)
      if (created) {
        summary.created_count += 1
        continue
      }

      if (!data.updateExisting) {
        summary.duplicate_count += 1
        continue
      }

      const existing = await EmailContactManager.getContacts({ search: email, limit: 1, offset: 0 })
      const exact = existing.contacts.find((contact) => contact.email === email)

      if (!exact) {
        summary.duplicate_count += 1
        continue
      }

      await EmailContactManager.updateContact(exact.id, payload)
      summary.updated_count += 1
    } catch (error) {
      summary.invalid_count += 1
      summary.errors.push(`Line ${line}: ${(error as Error).message}`)
    }
  }

  return summary
}
