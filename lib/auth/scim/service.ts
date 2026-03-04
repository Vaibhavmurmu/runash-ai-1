import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

type ScimType = "User" | "Group"

async function writeAudit(
  organizationId: number,
  resourceType: ScimType,
  action: string,
  resourceExternalId?: string,
  metadata?: Record<string, unknown>,
) {
  await sql`
    INSERT INTO scim_audit_trails (
      organization_id,
      resource_type,
      resource_external_id,
      action,
      actor,
      metadata
    ) VALUES (
      ${organizationId},
      ${resourceType},
      ${resourceExternalId ?? null},
      ${action},
      'scim-api',
      ${metadata ? JSON.stringify(metadata) : null}
    )
  `
}

export async function upsertScimResource(organizationId: number, resourceType: ScimType, externalId: string, payload: unknown) {
  const rows = await sql`
    INSERT INTO scim_resources (
      organization_id,
      resource_type,
      external_id,
      display_name,
      payload,
      active
    ) VALUES (
      ${organizationId},
      ${resourceType},
      ${externalId},
      ${typeof payload === 'object' && payload && 'displayName' in (payload as Record<string, unknown>)
        ? String((payload as Record<string, unknown>).displayName)
        : null},
      ${JSON.stringify(payload)},
      true
    )
    ON CONFLICT (organization_id, resource_type, external_id)
    DO UPDATE SET
      payload = EXCLUDED.payload,
      display_name = EXCLUDED.display_name,
      active = true,
      updated_at = NOW()
    RETURNING *
  `

  await writeAudit(organizationId, resourceType, "upsert", externalId)
  return rows[0]
}

export async function deactivateScimResource(organizationId: number, resourceType: ScimType, externalId: string) {
  const rows = await sql`
    UPDATE scim_resources
    SET active = false, updated_at = NOW()
    WHERE organization_id = ${organizationId}
      AND resource_type = ${resourceType}
      AND external_id = ${externalId}
    RETURNING *
  `

  await writeAudit(organizationId, resourceType, "deprovision", externalId)
  return rows[0] ?? null
}

export async function listScimResources(organizationId: number, resourceType: ScimType) {
  return sql`
    SELECT *
    FROM scim_resources
    WHERE organization_id = ${organizationId}
      AND resource_type = ${resourceType}
    ORDER BY updated_at DESC
  `
}
