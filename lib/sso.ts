import { randomBytes } from "crypto"
import { assertDatabaseConfigured, sql } from "./db"

assertDatabaseConfigured("lib/sso.ts")

export interface SSOOrganization {
  id: number
  name: string
  domain: string
  slug: string
  sso_enabled: boolean
  auto_provision: boolean
  default_role: string
  created_at: Date
  updated_at: Date
  created_by?: number
  is_active: boolean
}

export interface SSOProvider {
  id: number
  organization_id: number
  provider_type: "saml" | "oidc" | "oauth"
  provider_name: string
  client_id?: string
  client_secret?: string
  issuer_url?: string
  authorization_url?: string
  token_url?: string
  userinfo_url?: string
  jwks_uri?: string
  saml_sso_url?: string
  saml_entity_id?: string
  saml_certificate?: string
  saml_signature_algorithm?: string
  attribute_mapping?: Record<string, string>
  scopes?: string[]
  is_active: boolean
  created_at: Date
  updated_at: Date
}

export interface SSOUserMapping {
  id: number
  user_id: number
  organization_id: number
  provider_id: number
  external_id: string
  external_email: string
  external_attributes?: Record<string, any>
  last_login_at?: Date
  created_at: Date
  updated_at: Date
}

// Get organization by domain
export async function getOrganizationByDomain(domain: string): Promise<SSOOrganization | null> {
  try {
    const result = await sql`
      SELECT * FROM sso_organizations 
      WHERE domain = ${domain} AND is_active = true
    `

    return result.length > 0 ? (result[0] as SSOOrganization) : null
  } catch (error) {
    console.error("Error getting organization by domain:", error)
    return null
  }
}

// Get organization by slug
export async function getOrganizationBySlug(slug: string): Promise<SSOOrganization | null> {
  try {
    const result = await sql`
      SELECT * FROM sso_organizations 
      WHERE slug = ${slug} AND is_active = true
    `

    return result.length > 0 ? (result[0] as SSOOrganization) : null
  } catch (error) {
    console.error("Error getting organization by slug:", error)
    return null
  }
}

// Get SSO provider for organization
export async function getSSOProvider(
  organizationId: number,
  providerType?: "saml" | "oidc" | "oauth",
): Promise<SSOProvider | null> {
  try {
    let query = sql`
      SELECT * FROM sso_providers 
      WHERE organization_id = ${organizationId} AND is_active = true
    `

    if (providerType) {
      query = sql`
        SELECT * FROM sso_providers 
        WHERE organization_id = ${organizationId} 
          AND provider_type = ${providerType} 
          AND is_active = true
      `
    }

    const result = await query
    return result.length > 0 ? (result[0] as SSOProvider) : null
  } catch (error) {
    console.error("Error getting SSO provider:", error)
    return null
  }
}

// Create or update SSO organization
export async function createSSOOrganization(
  name: string,
  domain: string,
  slug: string,
  createdBy: number,
  options: {
    ssoEnabled?: boolean
    autoProvision?: boolean
    defaultRole?: string
  } = {},
): Promise<SSOOrganization | null> {
  try {
    const result = await sql`
      INSERT INTO sso_organizations (
        name, domain, slug, sso_enabled, auto_provision, default_role, created_by
      ) VALUES (
        ${name}, 
        ${domain}, 
        ${slug}, 
        ${options.ssoEnabled || false}, 
        ${options.autoProvision !== false}, 
        ${options.defaultRole || "user"}, 
        ${createdBy}
      )
      ON CONFLICT (domain) 
      DO UPDATE SET 
        name = ${name},
        slug = ${slug},
        sso_enabled = ${options.ssoEnabled || false},
        auto_provision = ${options.autoProvision !== false},
        default_role = ${options.defaultRole || "user"},
        updated_at = NOW()
      RETURNING *
    `

    return result.length > 0 ? (result[0] as SSOOrganization) : null
  } catch (error) {
    console.error("Error creating SSO organization:", error)
    return null
  }
}

// Create or update SSO provider
export async function createSSOProvider(
  organizationId: number,
  providerType: "saml" | "oidc" | "oauth",
  providerName: string,
  config: Partial<SSOProvider>,
): Promise<SSOProvider | null> {
  try {
    const result = await sql`
      INSERT INTO sso_providers (
        organization_id, provider_type, provider_name, client_id, client_secret,
        issuer_url, authorization_url, token_url, userinfo_url, jwks_uri,
        saml_sso_url, saml_entity_id, saml_certificate, saml_signature_algorithm,
        attribute_mapping, scopes
      ) VALUES (
        ${organizationId}, ${providerType}, ${providerName}, ${config.client_id || null},
        ${config.client_secret || null}, ${config.issuer_url || null}, ${config.authorization_url || null},
        ${config.token_url || null}, ${config.userinfo_url || null}, ${config.jwks_uri || null},
        ${config.saml_sso_url || null}, ${config.saml_entity_id || null}, ${config.saml_certificate || null},
        ${config.saml_signature_algorithm || "RSA-SHA256"}, ${JSON.stringify(config.attribute_mapping) || null},
        ${config.scopes || null}
      )
      ON CONFLICT (organization_id, provider_type)
      DO UPDATE SET 
        provider_name = ${providerName},
        client_id = ${config.client_id || null},
        client_secret = ${config.client_secret || null},
        issuer_url = ${config.issuer_url || null},
        authorization_url = ${config.authorization_url || null},
        token_url = ${config.token_url || null},
        userinfo_url = ${config.userinfo_url || null},
        jwks_uri = ${config.jwks_uri || null},
        saml_sso_url = ${config.saml_sso_url || null},
        saml_entity_id = ${config.saml_entity_id || null},
        saml_certificate = ${config.saml_certificate || null},
        saml_signature_algorithm = ${config.saml_signature_algorithm || "RSA-SHA256"},
        attribute_mapping = ${JSON.stringify(config.attribute_mapping) || null},
        scopes = ${config.scopes || null},
        updated_at = NOW()
      RETURNING *
    `

    return result.length > 0 ? (result[0] as SSOProvider) : null
  } catch (error) {
    console.error("Error creating SSO provider:", error)
    return null
  }
}

// Create or update SSO user mapping
export async function createSSOUserMapping(
  userId: number,
  organizationId: number,
  providerId: number,
  externalId: string,
  externalEmail: string,
  externalAttributes?: Record<string, any>,
): Promise<SSOUserMapping | null> {
  try {
    const result = await sql`
      INSERT INTO sso_user_mappings (
        user_id, organization_id, provider_id, external_id, external_email, external_attributes
      ) VALUES (
        ${userId}, ${organizationId}, ${providerId}, ${externalId}, ${externalEmail}, 
        ${JSON.stringify(externalAttributes) || null}
      )
      ON CONFLICT (user_id, organization_id)
      DO UPDATE SET 
        provider_id = ${providerId},
        external_id = ${externalId},
        external_email = ${externalEmail},
        external_attributes = ${JSON.stringify(externalAttributes) || null},
        last_login_at = NOW(),
        updated_at = NOW()
      RETURNING *
    `

    return result.length > 0 ? (result[0] as SSOUserMapping) : null
  } catch (error) {
    console.error("Error creating SSO user mapping:", error)
    return null
  }
}

// Provision SSO user
export async function provisionSSOUser(
  email: string,
  organizationId: number,
  providerId: number,
  externalId: string,
  attributes: Record<string, any> = {},
): Promise<{ user: any; isNew: boolean } | null> {
  try {
    const organization = await sql`
      SELECT * FROM sso_organizations WHERE id = ${organizationId}
    `

    if (organization.length === 0) {
      throw new Error("Organization not found")
    }

    const org = organization[0]

    // Check if user already exists
    let user = await sql`
      SELECT * FROM users WHERE email = ${email}
    `

    let isNew = false

    if (user.length === 0 && org.auto_provision) {
      // Create new user
      const newUser = await sql`
        INSERT INTO users (
          email, name, role, provider, is_sso_user, sso_organization_id, email_verified
        ) VALUES (
          ${email}, 
          ${attributes.name || attributes.displayName || email.split("@")[0]}, 
          ${org.default_role}, 
          'sso', 
          true, 
          ${organizationId}, 
          true
        )
        RETURNING *
      `

      user = newUser
      isNew = true
    } else if (user.length === 0) {
      throw new Error("User auto-provisioning is disabled")
    }

    const userData = user[0]

    // Create or update SSO mapping
    await createSSOUserMapping(userData.id, organizationId, providerId, externalId, email, attributes)

    // Update user's SSO organization if not set
    if (!userData.sso_organization_id) {
      await sql`
        UPDATE users 
        SET sso_organization_id = ${organizationId}, is_sso_user = true
        WHERE id = ${userData.id}
      `
    }

    return { user: userData, isNew }
  } catch (error) {
    console.error("Error provisioning SSO user:", error)
    return null
  }
}

// Log SSO login attempt
export async function logSSOLoginAttempt(
  organizationId: number,
  providerId: number,
  success: boolean,
  options: {
    userId?: number
    externalId?: string
    email?: string
    errorMessage?: string
    ipAddress?: string
    userAgent?: string
  } = {},
): Promise<void> {
  try {
    await sql`
      INSERT INTO sso_login_attempts (
        organization_id, provider_id, user_id, external_id, email, success, 
        error_message, ip_address, user_agent
      ) VALUES (
        ${organizationId}, ${providerId}, ${options.userId || null}, ${options.externalId || null},
        ${options.email || null}, ${success}, ${options.errorMessage || null}, 
        ${options.ipAddress || null}, ${options.userAgent || null}
      )
    `
  } catch (error) {
    console.error("Error logging SSO login attempt:", error)
  }
}

// Generate domain verification token
export async function generateDomainVerification(
  organizationId: number,
  domain: string,
  method: "dns" | "file" | "email" = "dns",
): Promise<{ token: string; expiresAt: Date } | null> {
  try {
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await sql`
      INSERT INTO domain_verifications (
        organization_id, domain, verification_token, verification_method, expires_at
      ) VALUES (
        ${organizationId}, ${domain}, ${token}, ${method}, ${expiresAt}
      )
      ON CONFLICT (organization_id, domain)
      DO UPDATE SET 
        verification_token = ${token},
        verification_method = ${method},
        expires_at = ${expiresAt},
        is_verified = false
    `

    return { token, expiresAt }
  } catch (error) {
    console.error("Error generating domain verification:", error)
    return null
  }
}

// Verify domain ownership
export async function verifyDomainOwnership(organizationId: number, domain: string, token: string): Promise<boolean> {
  try {
    const result = await sql`
      UPDATE domain_verifications 
      SET is_verified = true, verified_at = NOW()
      WHERE organization_id = ${organizationId} 
        AND domain = ${domain} 
        AND verification_token = ${token}
        AND expires_at > NOW()
        AND is_verified = false
    `

    if (result.length > 0) {
      // Update organization domain as verified
      await sql`
        UPDATE sso_organizations 
        SET updated_at = NOW()
        WHERE id = ${organizationId} AND domain = ${domain}
      `

      return true
    }

    return false
  } catch (error) {
    console.error("Error verifying domain ownership:", error)
    return false
  }
}

// Get SSO configuration for domain
export async function getSSOConfigForDomain(domain: string): Promise<{
  organization: SSOOrganization
  provider: SSOProvider
} | null> {
  try {
    const result = await sql`
      SELECT 
        o.*,
        p.id as provider_id,
        p.provider_type,
        p.provider_name,
        p.client_id,
        p.issuer_url,
        p.authorization_url,
        p.saml_sso_url,
        p.saml_entity_id
      FROM sso_organizations o
      JOIN sso_providers p ON o.id = p.organization_id
      WHERE o.domain = ${domain} 
        AND o.sso_enabled = true 
        AND o.is_active = true 
        AND p.is_active = true
    `

    if (result.length === 0) {
      return null
    }

    const row = result[0]
    return {
      organization: {
        id: row.id,
        name: row.name,
        domain: row.domain,
        slug: row.slug,
        sso_enabled: row.sso_enabled,
        auto_provision: row.auto_provision,
        default_role: row.default_role,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        is_active: row.is_active,
      },
      provider: {
        id: row.provider_id,
        organization_id: row.id,
        provider_type: row.provider_type,
        provider_name: row.provider_name,
        client_id: row.client_id,
        issuer_url: row.issuer_url,
        authorization_url: row.authorization_url,
        saml_sso_url: row.saml_sso_url,
        saml_entity_id: row.saml_entity_id,
      } as SSOProvider,
    }
  } catch (error) {
    console.error("Error getting SSO config for domain:", error)
    return null
  }
}

// Check if email domain has SSO enabled
export async function checkEmailDomainSSO(email: string): Promise<{
  hasSSO: boolean
  organization?: SSOOrganization
  provider?: SSOProvider
  ssoUrl?: string
}> {
  try {
    const domain = email.split("@")[1]
    if (!domain) {
      return { hasSSO: false }
    }

    const config = await getSSOConfigForDomain(domain)
    if (!config) {
      return { hasSSO: false }
    }

    let ssoUrl = ""
    if (config.provider.provider_type === "saml" && config.provider.saml_sso_url) {
      ssoUrl = config.provider.saml_sso_url
    } else if (config.provider.provider_type === "oidc" && config.provider.authorization_url) {
      ssoUrl = config.provider.authorization_url
    }

    return {
      hasSSO: true,
      organization: config.organization,
      provider: config.provider,
      ssoUrl,
    }
  } catch (error) {
    console.error("Error checking email domain SSO:", error)
    return { hasSSO: false }
  }
}
