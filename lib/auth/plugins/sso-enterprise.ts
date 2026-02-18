import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export type EnterpriseProviderType = "oidc" | "oauth2" | "saml2"

export interface EnterpriseProviderConfig {
  organizationId: number
  providerType: EnterpriseProviderType
  providerName: string
  issuerUrl?: string
  authorizationUrl?: string
  tokenUrl?: string
  userInfoUrl?: string
  jwksUri?: string
  clientId?: string
  clientSecret?: string
  samlSsoUrl?: string
  samlEntityId?: string
  samlCertificate?: string
  scopes?: string[]
  attributeMapping?: Record<string, string>
  orgMappings?: Record<string, string>
}

export async function upsertEnterpriseProviderConfig(config: EnterpriseProviderConfig) {
  const providerType = config.providerType === "oauth2" ? "oauth" : config.providerType === "saml2" ? "saml" : "oidc"

  const provider = await sql`
    INSERT INTO sso_providers (
      organization_id,
      provider_type,
      provider_name,
      issuer_url,
      authorization_url,
      token_url,
      userinfo_url,
      jwks_uri,
      client_id,
      client_secret,
      saml_sso_url,
      saml_entity_id,
      saml_certificate,
      attribute_mapping,
      scopes,
      is_active
    ) VALUES (
      ${config.organizationId},
      ${providerType},
      ${config.providerName},
      ${config.issuerUrl ?? null},
      ${config.authorizationUrl ?? null},
      ${config.tokenUrl ?? null},
      ${config.userInfoUrl ?? null},
      ${config.jwksUri ?? null},
      ${config.clientId ?? null},
      ${config.clientSecret ?? null},
      ${config.samlSsoUrl ?? null},
      ${config.samlEntityId ?? null},
      ${config.samlCertificate ?? null},
      ${config.attributeMapping ? JSON.stringify(config.attributeMapping) : null},
      ${config.scopes ?? null},
      true
    )
    ON CONFLICT (organization_id, provider_type)
    DO UPDATE SET
      provider_name = EXCLUDED.provider_name,
      issuer_url = EXCLUDED.issuer_url,
      authorization_url = EXCLUDED.authorization_url,
      token_url = EXCLUDED.token_url,
      userinfo_url = EXCLUDED.userinfo_url,
      jwks_uri = EXCLUDED.jwks_uri,
      client_id = EXCLUDED.client_id,
      client_secret = EXCLUDED.client_secret,
      saml_sso_url = EXCLUDED.saml_sso_url,
      saml_entity_id = EXCLUDED.saml_entity_id,
      saml_certificate = EXCLUDED.saml_certificate,
      attribute_mapping = EXCLUDED.attribute_mapping,
      scopes = EXCLUDED.scopes,
      is_active = true,
      updated_at = NOW()
    RETURNING id, organization_id, provider_type, provider_name
  `

  if (config.orgMappings && Object.keys(config.orgMappings).length > 0) {
    const mappingEntries = Object.entries(config.orgMappings)
    for (const [mappingKey, mappingValue] of mappingEntries) {
      await sql`
        INSERT INTO sso_organization_mappings (organization_id, mapping_key, mapping_value)
        VALUES (${config.organizationId}, ${mappingKey}, ${mappingValue})
        ON CONFLICT (organization_id, mapping_key)
        DO UPDATE SET
          mapping_value = EXCLUDED.mapping_value,
          updated_at = NOW()
      `
    }
  }

  return provider[0]
}

export async function listEnterpriseProviderConfigs() {
  return sql`
    SELECT
      p.id,
      p.organization_id,
      p.provider_type,
      p.provider_name,
      p.issuer_url,
      p.authorization_url,
      p.token_url,
      p.userinfo_url,
      p.jwks_uri,
      p.saml_sso_url,
      p.saml_entity_id,
      p.scopes,
      p.attribute_mapping,
      p.updated_at,
      COALESCE(
        jsonb_object_agg(m.mapping_key, m.mapping_value) FILTER (WHERE m.mapping_key IS NOT NULL),
        '{}'::jsonb
      ) AS org_mappings
    FROM sso_providers p
    LEFT JOIN sso_organization_mappings m ON m.organization_id = p.organization_id
    WHERE p.is_active = true
    GROUP BY p.id
    ORDER BY p.updated_at DESC
  `
}
