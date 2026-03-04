export type TenantGuardOptions = {
  allowLegacyNullOrganization?: boolean
}

export type TenantBoundaryEvaluation = {
  allowed: boolean
  shouldMigrateLegacyOrganization: boolean
}

export function evaluateTenantBoundaryAccess(
  sessionOrganizationId: number | null | undefined,
  resourceOrganizationId: number | null | undefined,
  options: TenantGuardOptions = {},
): TenantBoundaryEvaluation {
  const allowLegacyNullOrganization = options.allowLegacyNullOrganization ?? true

  if (!sessionOrganizationId) {
    return {
      allowed: resourceOrganizationId == null,
      shouldMigrateLegacyOrganization: false,
    }
  }

  if (resourceOrganizationId === sessionOrganizationId) {
    return { allowed: true, shouldMigrateLegacyOrganization: false }
  }

  if (allowLegacyNullOrganization && resourceOrganizationId == null) {
    return { allowed: true, shouldMigrateLegacyOrganization: true }
  }

  return { allowed: false, shouldMigrateLegacyOrganization: false }
}

export function buildTenantScopePredicate(
  columnName: string,
  sessionOrganizationId: number | null | undefined,
  parameterIndex: number,
  options: TenantGuardOptions = {},
): { predicate: string; values: number[] } {
  const allowLegacyNullOrganization = options.allowLegacyNullOrganization ?? true

  if (!sessionOrganizationId) {
    return { predicate: `${columnName} IS NULL`, values: [] }
  }

  const organizationParam = `$${parameterIndex}`
  if (allowLegacyNullOrganization) {
    return {
      predicate: `(${columnName} = ${organizationParam} OR ${columnName} IS NULL)`,
      values: [sessionOrganizationId],
    }
  }

  return {
    predicate: `${columnName} = ${organizationParam}`,
    values: [sessionOrganizationId],
  }
}
