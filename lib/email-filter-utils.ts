export class FilterValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "FilterValidationError"
  }
}

export class SafeWhereBuilder {
  private readonly conditions: string[] = []
  private readonly params: unknown[] = []

  addEquals(column: string, value: unknown): this {
    if (value === undefined || value === null) return this
    this.params.push(value)
    this.conditions.push(`${column} = $${this.params.length}`)
    return this
  }

  addIlikeContains(column: string, value: string | undefined): this {
    if (!value) return this
    this.params.push(`%${value}%`)
    this.conditions.push(`${column} ILIKE $${this.params.length}`)
    return this
  }

  addAnyIlikeContains(columns: string[], value: string | undefined): this {
    if (!value) return this
    this.params.push(`%${value}%`)
    const placeholder = `$${this.params.length}`
    const compound = columns.map((column) => `${column} ILIKE ${placeholder}`).join(" OR ")
    this.conditions.push(`(${compound})`)
    return this
  }

  addGte(column: string, value: Date | undefined): this {
    if (!value) return this
    this.params.push(value.toISOString())
    this.conditions.push(`${column} >= $${this.params.length}`)
    return this
  }

  addLte(column: string, value: Date | undefined): this {
    if (!value) return this
    this.params.push(value.toISOString())
    this.conditions.push(`${column} <= $${this.params.length}`)
    return this
  }

  addRaw(condition: string): this {
    this.conditions.push(condition)
    return this
  }

  build(baseCondition = "1=1"): { whereClause: string; params: unknown[] } {
    const allConditions = [baseCondition, ...this.conditions]
    return {
      whereClause: `WHERE ${allConditions.join(" AND ")}`,
      params: this.params,
    }
  }
}

export function parseOptionalInteger(
  value: string | null | undefined,
  fieldName: string,
  options?: { min?: number; max?: number },
): number | undefined {
  if (value === null || value === undefined || value.trim() === "") {
    return undefined
  }

  if (!/^-?\d+$/.test(value.trim())) {
    throw new FilterValidationError(`${fieldName} must be an integer`)
  }

  const parsed = Number.parseInt(value, 10)

  if (options?.min !== undefined && parsed < options.min) {
    throw new FilterValidationError(`${fieldName} must be >= ${options.min}`)
  }

  if (options?.max !== undefined && parsed > options.max) {
    throw new FilterValidationError(`${fieldName} must be <= ${options.max}`)
  }

  return parsed
}

export function parseOptionalBoolean(value: string | null | undefined, fieldName: string): boolean | undefined {
  if (value === null || value === undefined || value.trim() === "") {
    return undefined
  }

  if (value === "true") return true
  if (value === "false") return false
  throw new FilterValidationError(`${fieldName} must be either 'true' or 'false'`)
}

export function parseOptionalDate(value: string | null | undefined, fieldName: string): Date | undefined {
  if (value === null || value === undefined || value.trim() === "") {
    return undefined
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    throw new FilterValidationError(`${fieldName} must be a valid date`)
  }

  return parsed
}

export function validateDateRange(dateFrom?: Date, dateTo?: Date): void {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new FilterValidationError("date_from must be before or equal to date_to")
  }
}

export function normalizePagination(
  limit: number | undefined,
  offset: number | undefined,
  options: { defaultLimit: number; maxLimit: number; defaultOffset?: number },
): { limit: number; offset: number } {
  const resolvedLimit = limit ?? options.defaultLimit
  const resolvedOffset = offset ?? options.defaultOffset ?? 0

  if (!Number.isInteger(resolvedLimit) || resolvedLimit <= 0) {
    throw new FilterValidationError("limit must be a positive integer")
  }

  if (resolvedLimit > options.maxLimit) {
    throw new FilterValidationError(`limit must be <= ${options.maxLimit}`)
  }

  if (!Number.isInteger(resolvedOffset) || resolvedOffset < 0) {
    throw new FilterValidationError("offset must be a non-negative integer")
  }

  return { limit: resolvedLimit, offset: resolvedOffset }
}
