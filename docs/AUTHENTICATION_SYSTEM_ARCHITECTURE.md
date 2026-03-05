# Comprehensive User Authentication System Architecture

## Executive Summary

This document outlines the complete authentication system architecture for RunAsh AI, leveraging Neon PostgreSQL with Better Auth framework. The system provides enterprise-grade security, scalability, and flexibility with support for multiple authentication methods, role-based access control, session management, and multi-factor authentication.

---

## 1. Architecture Overview

### 1.1 System Components

The authentication system consists of seven primary layers:

**Layer 1: Authentication Methods**
- Email/Password authentication with bcrypt hashing
- OAuth 2.0 providers (Google, GitHub, and generic providers)
- Magic Link authentication
- Passkey/WebAuthn support
- Phone OTP (SMS-based verification)
- Email OTP (code-based verification)
- SSO/SAML (Enterprise)
- Sign In With Ethereum (SIWE)

**Layer 2: Session Management**
- Secure session tokens stored in Neon
- HTTP-only cookies with domain and path restrictions
- Session expiration with configurable TTL
- Multi-session support (multiple devices)
- Session switching capability
- Automatic session cleanup

**Layer 3: Email Verification & Recovery**
- Email verification on signup (required for email/password)
- Configurable verification token expiration
- Resend verification email capability
- Password reset via secure tokens
- Forgot password flow with email delivery

**Layer 4: Multi-Factor Authentication (2FA)**
- TOTP (Time-based One-Time Password) via authenticator apps
- Email-based 2FA
- SMS-based 2FA
- Backup codes for account recovery
- 2FA enforcement policies

**Layer 5: Authorization & Access Control**
- Role-based access control (RBAC)
- Permission-based access control
- Organization-based multi-tenancy
- Member roles (admin, member, guest)
- Fine-grained permission evaluation

**Layer 6: Account Management**
- Account linking (connect multiple providers)
- Email change with verification
- Password management
- Anonymous account conversion
- Account unlinking

**Layer 7: Security & Monitoring**
- Rate limiting on authentication endpoints
- CAPTCHA integration for signup/login
- IP-based security analysis
- Session hardening (IP address tracking)
- Audit logging for authentication events

---

## 2. Database Schema Architecture (Neon)

### 2.1 Core Tables

**users table**
```
Schema: neon_auth
- id (UUID, PK)
- email (VARCHAR, unique)
- emailVerified (BOOLEAN)
- emailVerifiedAt (TIMESTAMP)
- name (VARCHAR)
- image (TEXT)
- role (VARCHAR) - 'user', 'admin', 'moderator'
- banned (BOOLEAN)
- banReason (TEXT)
- banExpires (TIMESTAMP)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

**sessions table**
```
Schema: neon_auth
- id (UUID, PK)
- userId (UUID, FK)
- token (TEXT, indexed)
- expiresAt (TIMESTAMP, indexed)
- ipAddress (INET)
- userAgent (TEXT)
- activeOrganizationId (TEXT)
- impersonatedBy (TEXT)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

**accounts table**
```
Schema: neon_auth
- id (UUID, PK)
- userId (UUID, FK, indexed)
- accountId (VARCHAR)
- providerId (VARCHAR) - 'google', 'github', 'ethereum'
- providerAccountId (VARCHAR, indexed)
- password (TEXT) - bcrypt hash for email/password auth
- accessToken (TEXT)
- refreshToken (TEXT)
- idToken (TEXT)
- accessTokenExpiresAt (TIMESTAMP)
- refreshTokenExpiresAt (TIMESTAMP)
- scope (TEXT)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

**verification table**
```
Schema: neon_auth
- id (UUID, PK)
- identifier (VARCHAR, indexed) - email or userId
- value (TEXT) - verification token
- expiresAt (TIMESTAMP, indexed)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

**organization table**
```
Schema: neon_auth
- id (UUID, PK)
- name (VARCHAR)
- slug (VARCHAR, unique)
- logo (TEXT)
- metadata (JSONB)
- createdAt (TIMESTAMP)
```

**member table**
```
Schema: neon_auth
- id (UUID, PK)
- organizationId (UUID, FK, indexed)
- userId (UUID, FK, indexed)
- role (VARCHAR) - 'admin', 'member'
- createdAt (TIMESTAMP)
```

**invitation table**
```
Schema: neon_auth
- id (UUID, PK)
- email (VARCHAR, indexed)
- organizationId (UUID, FK)
- inviterId (UUID, FK)
- role (VARCHAR)
- expiresAt (TIMESTAMP, indexed)
- status (VARCHAR)
- createdAt (TIMESTAMP)
```

### 2.2 Supporting Tables (Public Schema)

**user_2fa_settings**
```
- id (INTEGER, PK)
- userId (INTEGER, FK)
- isEnabled (BOOLEAN)
- totpEnabled (BOOLEAN)
- emailEnabled (BOOLEAN)
- smsEnabled (BOOLEAN)
- totpSecret (VARCHAR)
- backupCodesGenerated (TIMESTAMP)
- backupCodesUsed (INTEGER)
- createdAt (TIMESTAMP)
- updatedAt (TIMESTAMP)
```

**user_2fa_backup_codes**
```
- id (INTEGER, PK)
- userId (INTEGER, FK)
- code (VARCHAR, unique)
- isActive (BOOLEAN)
- usedAt (TIMESTAMP)
- createdAt (TIMESTAMP)
```

**password_reset_tokens**
```
- id (INTEGER, PK)
- userId (INTEGER, FK)
- token (VARCHAR, unique)
- expiresAt (TIMESTAMP)
- used (BOOLEAN)
- createdAt (TIMESTAMP)
```

**email_verification_tokens**
```
- id (INTEGER, PK)
- userId (INTEGER, FK)
- token (VARCHAR, unique)
- expiresAt (TIMESTAMP)
- used (BOOLEAN)
- createdAt (TIMESTAMP)
```

**otp_codes**
```
- id (INTEGER, PK)
- userId (INTEGER, FK)
- email (VARCHAR)
- phone (VARCHAR)
- code (VARCHAR)
- type (VARCHAR) - 'email', 'sms'
- purpose (VARCHAR) - 'verification', 'login', '2fa'
- isActive (BOOLEAN)
- attempts (INTEGER)
- maxAttempts (INTEGER)
- expiresAt (TIMESTAMP)
- usedAt (TIMESTAMP)
- ipAddress (INET)
- userAgent (TEXT)
- createdAt (TIMESTAMP)
```

**passkey_credentials**
```
- id (INTEGER, PK)
- userId (INTEGER, FK)
- credentialId (TEXT, unique)
- publicKey (BYTEA)
- counter (BIGINT)
- transports (TEXT[])
- backupEligible (BOOLEAN)
- backupState (BOOLEAN)
- deviceType (VARCHAR)
- name (VARCHAR)
- isActive (BOOLEAN)
- lastUsedAt (TIMESTAMP)
- createdAt (TIMESTAMP)
```

**passkey_challenges**
```
- id (INTEGER, PK)
- userId (INTEGER, FK)
- challenge (TEXT)
- type (VARCHAR) - 'registration', 'authentication'
- expiresAt (TIMESTAMP)
- createdAt (TIMESTAMP)
```

**user_activity**
```
- id (INTEGER, PK)
- userId (INTEGER, FK)
- action (VARCHAR) - 'login', 'logout', 'password_change'
- resourceType (VARCHAR)
- resourceId (VARCHAR)
- ipAddress (INET)
- userAgent (TEXT)
- metadata (JSONB)
- createdAt (TIMESTAMP)
```

---

## 3. Authentication Flows

### 3.1 Email/Password Registration Flow

**Request Path:** `POST /api/auth/register`

**Data Flow:**
1. User submits email and password
2. System validates input (email format, password strength)
3. CAPTCHA verification (if enabled)
4. Check for existing email in database
5. Generate bcrypt hash of password
6. Create user record in `neon_auth.users`
7. Create account record in `neon_auth.accounts` with hashed password
8. Generate email verification token
9. Store verification token in `neon_auth.verification`
10. Send verification email with callback URL
11. Return success response with account creation confirmation
12. User clicks email link, which calls `POST /api/auth/verify-email`
13. Verification token validated and marked as used
14. User can now log in

**Security Considerations:**
- Password strength validated (minimum 8 characters, mixed case, numbers, symbols)
- Bcrypt with cost factor of 12 (2^12 iterations)
- Rate limiting: 5 attempts per email per hour
- CAPTCHA prevents automated registration
- Email verification required before login
- Verification token expires in 24 hours

**Error Handling:**
- Email already exists → return 409 Conflict
- Weak password → return 400 Bad Request with requirements
- CAPTCHA failed → return 400 Bad Request
- Email delivery failure → notify admin, allow resend

### 3.2 Login Flow

**Request Path:** `POST /api/auth/sign-in`

**Data Flow:**
1. User submits email and password (or OAuth code, magic link, etc.)
2. Email/password path:
   - Find user by email in `neon_auth.users`
   - Verify password against stored bcrypt hash
   - Check if email is verified (if required)
   - Check if user is banned (banExpires check)
3. On successful auth:
   - Generate secure session token (32 bytes, base64 URL-safe)
   - Create session record in `neon_auth.sessions`
   - Store session token in HTTP-only cookie (secure, sameSite=Strict)
   - Log login event to `user_activity`
   - Record authentication metric
4. Return session response with user data

**Session Token Generation:**
- Algorithm: random 32-byte buffer
- Format: base64url encoded
- Storage: hashed SHA-256 in database for security
- Expiration: configurable (default 7 days)
- IP Binding: optional session hardening tracks login IP

**Security Considerations:**
- Rate limiting: 10 failed attempts per email per 15 minutes → IP blacklist
- Account lockout: automatic after 5 consecutive failures (1 hour cooldown)
- Password comparison: timing-safe comparison (bcrypt)
- Session token: never exposed in URL, only HTTP-only cookie
- CSRF protection: token validation in middleware
- IP tracking: log IP address for security analysis

**Error Handling:**
- Invalid credentials → return 401 Unauthorized (generic message)
- User banned → return 403 Forbidden with ban reason
- Account locked → return 429 Too Many Requests
- Rate limited → return 429 Too Many Requests

### 3.3 Password Recovery Flow

**Request Path:** `POST /api/auth/forgot-password` → `POST /api/auth/reset-password`

**Data Flow:**

**Step 1: Forgot Password Request**
1. User submits email address
2. System finds user by email
3. Generate secure password reset token
4. Store token in `password_reset_tokens` table
5. Set expiration (24 hours)
6. Send password reset email with reset link
7. Return success response (generic, doesn't reveal if user exists)

**Step 2: Password Reset**
1. User clicks reset link with token
2. Validate token exists and hasn't expired
3. Check token hasn't been used (one-time use)
4. User submits new password
5. Validate password strength
6. Hash new password with bcrypt
7. Update password in `neon_auth.accounts` table
8. Mark reset token as used
9. Invalidate all existing sessions (force re-login)
10. Return success response

**Security Considerations:**
- Rate limiting: 3 reset requests per email per hour
- Token expiration: 24 hours
- One-time use: token marked used immediately
- Constant-time comparison: prevent timing attacks
- All sessions invalidated: ensures single session after reset
- Generic response: doesn't reveal if email exists
- Logged: all reset requests tracked in audit log

**Error Handling:**
- Token expired → return 400 Bad Request
- Token invalid → return 400 Bad Request
- Weak password → return 400 Bad Request with requirements
- Rate limited → return 429 Too Many Requests

### 3.4 Email Verification Flow

**Request Path:** `POST /api/auth/resend-verification` or `/api/auth/verify-email`

**Data Flow:**

**Initial Verification (from signup):**
1. User receives email with verification link
2. User clicks link, browser calls `/api/auth/verify-email?token=...`
3. Validate token in `neon_auth.verification` table
4. Check token hasn't expired (24 hours default)
5. Mark user's `emailVerified` = true in database
6. Mark verification token as used
7. Auto-signin user if configured
8. Redirect to email verified success page

**Resend Verification:**
1. User requests resend from login page
2. System validates email exists
3. Check rate limit: max 3 resends per email per day
4. Delete previous unused verification tokens
5. Generate new verification token
6. Send verification email
7. Return success response

**Security Considerations:**
- Rate limiting: 3 resends per email per 24 hours
- Token expiration: 24 hours
- One verification per user active: old tokens invalidated on resend
- Logged: all verification attempts tracked
- Generic response: doesn't reveal user status

---

## 4. Multi-Factor Authentication (2FA) Architecture

### 4.1 2FA Methods

**TOTP (Time-based One-Time Password)**
- Authenticator apps: Google Authenticator, Authy, Microsoft Authenticator
- Secret stored encrypted in `user_2fa_settings.totpSecret`
- 6-digit codes, 30-second window
- Verification allows ±1 time window (60-second tolerance)
- Backup codes generated during setup (10 codes)

**Email 2FA**
- OTP sent to registered email
- 6-digit code, 15-minute expiration
- Rate limited: max 3 resends per code
- Tracked in `otp_codes` table

**SMS 2FA**
- OTP sent via SMS
- 6-digit code, 15-minute expiration
- Phone number verified separately before enabling
- Third-party provider: Twilio/AWS SNS

**Backup Codes**
- 10 codes generated and displayed once during setup
- User downloads/prints codes for safe storage
- Each code single-use, tracked in `user_2fa_backup_codes`
- Emergency use when primary method unavailable

### 4.2 2FA Setup Flow

**Request Path:** `POST /api/auth/2fa/setup`

**Data Flow:**
1. User requests 2FA setup
2. System requires full authentication (session validation)
3. For TOTP:
   - Generate random 32-byte secret
   - Encode as base32 for QR code generation
   - Return QR code and manual entry code
   - User scans code or enters manually
4. User confirms 2FA by entering 6-digit code from authenticator
5. System verifies code against secret
6. Generate 10 backup codes (secure random)
7. Store TOTP secret encrypted in database
8. Store backup codes hashed with salts
9. Log 2FA setup event
10. Return confirmation with backup codes

**Security Considerations:**
- Requires active session: authenticated user only
- TOTP secret stored encrypted at-rest
- Backup codes hashed, never stored in plaintext
- One-time display: codes not retrievable after setup
- User must save/print codes
- Setup can be reset from account settings (requires 2FA)

### 4.3 2FA Verification Flow

**Request Path:** `POST /api/auth/2fa/verify`

**Data Flow:**

**During Login (if 2FA enabled):**
1. User logs in with email/password
2. System verifies credentials, but doesn't create session yet
3. Return response indicating 2FA required
4. User receives OTP (TOTP from app, or email/SMS)
5. User submits 2FA code
6. System validates:
   - For TOTP: verify code against stored secret (±1 window)
   - For email OTP: verify code matches stored OTP, check expiration
   - For SMS OTP: verify code matches stored OTP, check expiration
   - For backup code: verify code unused, mark as used
7. On successful validation:
   - Create session record
   - Log 2FA verification event
   - Return session token
8. User authenticated and logged in

**2FA Disable (requires 2FA):**
1. User requests disable
2. System validates active session and current 2FA code
3. Set `user_2fa_settings.isEnabled = false`
4. Remove TOTP secret and backup codes
5. Log 2FA disable event

**Security Considerations:**
- Rate limiting: 5 failed 2FA attempts → session invalidation
- Time window: TOTP accepts codes within ±30 seconds
- Code expiration: OTP expires after 15 minutes
- Backup codes: one-time use, tracked
- Attempt tracking: failed attempts logged with IP/user-agent
- Account recovery: backup codes provide emergency access

---

## 5. OAuth 2.0 Provider Integration

### 5.1 Supported Providers

**Built-in Providers:**
- Google (via OAuth2 + OpenID Connect)
- GitHub (via OAuth2)
- Ethereum (SIWE - Sign In With Ethereum)

**Generic OAuth Providers:**
- Framework supports custom OAuth2 providers
- Configurable via environment variables
- Required fields: client_id, client_secret, authorize_url, token_url, userinfo_url

### 5.2 Google OAuth Flow

**Configuration:**
- Client ID: Google Cloud Console project
- Client Secret: secure credential
- Redirect URI: `https://yourdomain.com/api/auth/callback/google`
- Scopes: `openid email profile`

**Data Flow:**

1. **User clicks "Sign in with Google"**
   - Frontend redirects to: `https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=...&scope=openid+email+profile`

2. **User authenticates with Google**
   - Google verifies credentials
   - Google redirects back to app: `/api/auth/callback/google?code=...&state=...`

3. **Backend exchanges code for tokens**
   - POST request to Google's token endpoint
   - Exchange authorization code for access token + ID token
   - Validate ID token signature (JWT verification)
   - Extract user information from ID token

4. **User account linking/creation**
   - Check if email exists in `neon_auth.users`
   - If new user:
     - Create user record
     - Set `emailVerified = true` (Google verified email)
   - Create or update account in `neon_auth.accounts` with provider info
   - Store: `providerId = 'google'`, `accountId = google_sub_claim`

5. **Session creation**
   - Create session token
   - Store in HTTP-only cookie
   - Return user to authenticated state

**Security Considerations:**
- PKCE (Proof Key for Code Exchange): used for enhanced security
- State parameter: prevents CSRF attacks
- JWT verification: ID token signature validated against Google's JWKS
- HTTPS only: all OAuth redirects over HTTPS
- Nonce validation: optional additional protection
- Rate limiting: OAuth callback endpoint rate-limited

### 5.3 Account Linking

**Scenario:** User with email/password account wants to link Google

**Request Path:** `POST /api/auth/account/link-oauth`

**Data Flow:**
1. User authenticates with existing email/password
2. User initiates Google OAuth flow
3. Google redirects back with authorization code
4. System verifies user session still active
5. Exchange OAuth code for tokens
6. Extract provider ID (google_sub_claim)
7. Check if this provider already linked to different user → error
8. Link provider account to current user:
   - Create account record in `neon_auth.accounts`
   - Set `userId` to current user
   - Store provider info
9. Log account linking event
10. Return success

**Security Considerations:**
- Requires active session: user must be logged in
- Prevents duplicate linking: one provider ID per user
- Session validation: additional verification
- Audit logged: all linking tracked

---

## 6. Session Management Architecture

### 6.1 Session Lifecycle

**Creation:**
1. After successful authentication (any method)
2. Generate 32-byte secure random token
3. Hash token with SHA-256 (store hash, not raw token)
4. Create session record:
   - `userId`: from authenticated user
   - `token`: hashed token value
   - `expiresAt`: current time + TTL (default 7 days)
   - `ipAddress`: from request (optional session hardening)
   - `userAgent`: from request (session verification)
   - `createdAt`: current timestamp
5. Return token in HTTP-only cookie

**Validation (on each request):**
1. Extract session token from HTTP-only cookie
2. Hash token with SHA-256
3. Query `neon_auth.sessions` for matching hashed token
4. Verify:
   - Token exists
   - Not expired (`expiresAt > now()`)
   - User not banned
   - If session hardening enabled: IP address matches
5. Load user data from `neon_auth.users`
6. Cache session in memory (optional, with TTL)
7. Proceed with request

**Refresh:**
- Automatic: session TTL extended on each successful request
- Manual: `POST /api/auth/refresh` returns new session token
- Token rotation: new token issued on refresh, old token invalidated

**Invalidation:**
1. **Explicit logout**: `POST /api/auth/sign-out`
   - Delete session record
   - Clear HTTP-only cookie
   - Log logout event

2. **Password change**: all sessions except current invalidated
   - Query all sessions for user
   - Delete old sessions
   - Return new session token

3. **Account ban**: all sessions deleted
   - Query all sessions
   - Delete all records
   - User forced to login after ban removed

4. **Session expiration**: automatic cleanup
   - Database cleanup job: delete sessions where `expiresAt < now()`
   - Run hourly

### 6.2 Multi-Device Session Support

**Feature:** User can maintain multiple active sessions (phone, laptop, tablet)

**Data Flow:**
1. User logs in on Device A → Session A created
2. User logs in on Device B → Session B created
3. Both sessions remain active
4. User can switch between devices
5. User can view all active sessions: `GET /api/auth/sessions`
6. User can revoke specific session: `DELETE /api/auth/sessions/{sessionId}`
7. User can revoke all other sessions: `POST /api/auth/sessions/revoke-others`

**Session Management Endpoint:**
```
GET /api/auth/sessions → List all active sessions
DELETE /api/auth/sessions/{sessionId} → Revoke specific session
POST /api/auth/sessions/revoke-others → Revoke all except current
```

**Session Display Information:**
- Device name/type
- Browser/OS
- IP address
- Last activity
- Created date
- Location (optional, from IP geolocation)

**Security Considerations:**
- Each session has independent token
- Session revocation immediate (no cache delay)
- IP changes tracked but don't auto-invalidate (for mobile networks)
- User notified of new session creation (email)

---

## 7. Security Architecture

### 7.1 Password Security

**Storage:**
- Algorithm: bcrypt
- Cost factor: 12 (2^12 = 4,096 iterations)
- Salt: automatically generated per password
- Hash length: 60 characters

**Validation:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@#$%^&*!-)
- Not in common password list (checked against compromised password database)
- Not same as email or username

**Rotation Policy:**
- No forced expiration (modern best practice)
- Changed when user initiates password reset
- Changed when password breach detected
- Admin can force change for security incidents

### 7.2 Rate Limiting

**Login Endpoint:**
- 10 failed attempts per email per 15 minutes
- After threshold: account locked for 1 hour
- IP-based: 50 failed attempts per IP per hour → temporary IP blacklist
- Logged: all attempts tracked for analysis

**Password Reset:**
- 3 reset requests per email per hour
- 5 resets per email per 24 hours

**Verification Email Resend:**
- 3 resends per email per 24 hours

**2FA Verification:**
- 5 failed attempts per session → session invalidated, must login again
- Backup code attempts: 3 failed per 15 minutes

**OTP Codes:**
- 3 verification attempts per code
- 5 resends per code per day

### 7.3 CAPTCHA Integration

**Trigger Points:**
- Registration form (if enabled)
- Login after failed attempts
- Password reset request
- Email verification resend

**Provider:**
- hCaptcha (privacy-focused alternative to reCAPTCHA)
- Integration via environment variables
- Server-side validation on each request

**Configuration:**
```
CAPTCHA_ENABLED=true
CAPTCHA_PROVIDER=hcaptcha
CAPTCHA_SECRET_KEY=...
CAPTCHA_SITE_KEY=...
```

### 7.4 Email Security

**Verification Links:**
- Format: `https://yourdomain.com/auth/verify-email?token=...&expires=...`
- Token: 32-byte secure random
- Link expires: 24 hours
- HTTPS only: no unencrypted email links

**Transactional Email Service:**
- Provider: SendGrid/AWS SES/Custom SMTP
- SPF/DKIM/DMARC configured for domain
- Email headers include anti-phishing markers
- Unsubscribe link included (though auth emails not unsubscribeable)

**Sensitive Information:**
- Never send passwords via email
- Never send full tokens in email (use click-through links)
- Temporary exposure: tokens only valid 24 hours

### 7.5 API Security

**HTTPS/TLS:**
- All authentication endpoints require HTTPS
- HTTP requests rejected with 400 Bad Request
- TLS 1.2 minimum

**Headers:**
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
Content-Security-Policy: default-src 'self'
```

**CORS Configuration:**
- Whitelist allowed origins
- No credentials via CORS
- Preflight requests handled

**CSRF Protection:**
- SameSite cookies: Strict mode
- CSRF tokens for state-changing operations
- Double-submit cookie pattern

### 7.6 Session Hardening

**Optional Enhanced Security:**

1. **IP Binding:**
   - Store session creation IP
   - Verify request IP matches
   - Allow small IP changes (network switching)
   - Alert on major IP changes

2. **User-Agent Verification:**
   - Store session creation user-agent
   - Verify user-agent matches
   - Warn on changes

3. **Geo-blocking:**
   - Detect login location from IP
   - Alert user of unusual locations
   - Optional: require additional verification

4. **Device Fingerprinting:**
   - Collect device characteristics
   - Detect compromised sessions
   - Not used for authentication (privacy concern)

---

## 8. Authorization Architecture

### 8.1 Role-Based Access Control (RBAC)

**Built-in Roles:**
- `user` (default): regular user
- `moderator`: content moderation capabilities
- `admin`: full system access

**Role-to-Permission Mapping:**

| Role | Permissions |
|------|-------------|
| user | read own profile, create content, manage own content |
| moderator | user permissions + moderate content, view reports |
| admin | all permissions, user management, system settings |

### 8.2 Organization-Based Multi-Tenancy

**Model:**
- User can belong to multiple organizations
- Each organization has members with roles
- Default role for new members: `member`
- Admin role provides org-level management

**Tables:**
- `organization`: org metadata
- `member`: user-org relationships with roles
- `invitation`: pending invitations to organization

**Active Organization:**
- User selects active organization on login
- Stored in `neon_auth.sessions.activeOrganizationId`
- API endpoints scoped to active organization
- Switching organization: `POST /api/auth/sessions/switch`

### 8.3 Permission Evaluation

**Flow:**
1. Request arrives with authenticated session
2. Extract userId and activeOrganizationId
3. Query user role:
   - For global: `neon_auth.users.role`
   - For organization: `neon_auth.member.role` where organizationId matches
4. Evaluate permission:
   - Load permission set for role
   - Check if requested permission in set
   - Check resource ownership (optional)
5. Return 403 Forbidden if denied

**Permission Examples:**
- `auth:manage-users`: system-wide user management
- `content:create`: create new content
- `content:edit-own`: edit own content
- `content:edit-all`: edit any content
- `reports:view`: view moderation reports
- `org:settings`: manage organization settings

---

## 9. Data Flow Diagrams

### 9.1 Login Flow

```
User Agent                  Backend                    Database
   |                           |                            |
   |-- POST /sign-in --------->|                            |
   |    {email, password}       |                            |
   |                           |-- Query user by email ---->|
   |                           |<-- User record ------------|
   |                           |                            |
   |                           |-- Verify password -------->|
   |                           |<-- Hash matches -----------|
   |                           |                            |
   |                           |-- Generate session ------->|
   |                           |<-- Session created --------|
   |                           |                            |
   |<-- Set-Cookie: token -----|                            |
   |<-- {user, session} -------|                            |
   |                           |                            |

Session Token Flow:
1. Generate: crypto.randomBytes(32) → base64url
2. Hash: SHA-256(token) → database storage
3. Store: HTTP-only, Secure, SameSite=Strict cookie
4. On Request: Extract cookie → Hash → Query database
```

### 9.2 2FA Setup Flow

```
User Agent                  Backend                    Database
   |                           |                            |
   |-- POST /2fa/setup ------->|                            |
   |    {session_token}         |                            |
   |                           |-- Validate session ------->|
   |                           |<-- Valid ------------|
   |                           |                            |
   |                           |-- Generate TOTP secret ----|
   |                           |<-- Secret generated -------|
   |                           |                            |
   |<-- {QR_code, secret} -----|                            |
   |                           |                            |
   |-- POST /2fa/setup ------->|                            |
   |    {token, code}           |                            |
   |                           |-- Verify TOTP code --------|
   |                           |<-- Code valid ------------|
   |                           |                            |
   |                           |-- Generate backup codes ->|
   |                           |-- Store encrypted secrets->|
   |                           |<-- Setup complete --------|
   |                           |                            |
   |<-- {backup_codes} --------|                            |
```

### 9.3 OAuth Callback Flow

```
User Agent                Backend               OAuth Provider
   |                        |                           |
   |-- Click "Sign with X" -|                           |
   |                        |-- Redirect to provider -->|
   |<-- Redirect to X ------|                           |
   |                        |                           |
   |-- Auth with provider ---                          |
   |  (off screen)          |                           |
   |                        |<-- Redirect back --------|
   |                        |     with code             |
   |<-- Redirect from X ----|                           |
   |                        |                           |
   |-- Follow redirect ---->|                           |
   |  /callback?code=...    |                           |
   |                        |-- Exchange code -------->|
   |                        |<-- Access token --------|
   |                        |                           |
   |                        |-- Get user info -------->|
   |                        |<-- User data ----------|
   |                        |                           |
   |                        |-- Create/Link account --->|
   |                        |<-- Session created -------|
   |<-- Set-Cookie + redirect
```

---

## 10. Scalability Considerations

### 10.1 Database Optimization

**Indexing Strategy:**
- `neon_auth.sessions.token` (hashed): frequently queried on each request
- `neon_auth.sessions.expiresAt`: cleanup queries
- `neon_auth.users.email`: login queries
- `neon_auth.accounts.providerId`: OAuth lookups
- `neon_auth.verification.identifier`: verification lookups
- `public.otp_codes.code`: OTP validation

**Connection Pooling:**
- Use PgBouncer or Neon's built-in connection pooling
- Pool size: cores × 2-4
- Idle timeout: 10 minutes
- Total timeout: 30 seconds

**Query Optimization:**
- Prepared statements: prevent SQL injection, improve performance
- Batch operations: use upsert for account linking
- Pagination: for session/activity listings

### 10.2 Caching Strategy

**In-Memory Session Cache (Optional):**
- Cache active sessions in Redis
- TTL: 5-10 minutes
- Invalidate on logout/password change
- Fallback to database if cache miss

**Email Cache:**
- Cache email delivery provider rate limits
- Prevent duplicate sends
- TTL: 30 seconds

**OTP Cache:**
- Store recent OTP attempts to prevent brute force
- TTL: 15 minutes

### 10.3 Load Balancing

**Stateless Authentication:**
- Session tokens enable load balancing across servers
- No sticky sessions required
- Any server can validate any session token

**Database Replication:**
- Use Neon's read replicas for `GET /api/auth/sessions`
- Write operations to primary
- Read-heavy operations to replicas

### 10.4 Monitoring & Observability

**Metrics:**
- Login success/failure rate
- Average login response time
- 2FA adoption rate
- Session creation/destruction rate
- Failed authentication attempts (per email, per IP)
- Password reset request rate

**Logging:**
- All authentication events logged
- Include: userId (anonymized), action, result, IP, user-agent
- Alert on: brute force attempts, unusual patterns

**Alerting Thresholds:**
- Failed login rate > 100/minute
- New provider registrations > 50/hour
- Session creation spike (DDoS indicator)
- Database connection pool exhaustion

---

## 11. Production Deployment Checklist

### Environment Variables
```
# Core Auth
BETTER_AUTH_SECRET=<secure-random-string-64-chars>
BETTER_AUTH_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Email Service
EMAIL_PROVIDER=sendgrid|aws-ses|smtp
SENDGRID_API_KEY=...
SMTP_HOST=...
SMTP_PORT=...
SMTP_USER=...
SMTP_PASS=...

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# CAPTCHA
CAPTCHA_ENABLED=true
CAPTCHA_SECRET_KEY=...
CAPTCHA_SITE_KEY=...

# 2FA SMS (optional)
SMS_PROVIDER=twilio|aws-sns
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_FROM_PHONE=...

# Database
DATABASE_URL=postgresql://user:password@host/database

# Security
SESSION_TTL_DAYS=7
PASSWORD_RESET_TOKEN_EXPIRES_HOURS=24
EMAIL_VERIFICATION_TOKEN_EXPIRES_HOURS=24
```

### Pre-Deployment

- [ ] Database migrations applied
- [ ] All environment variables configured
- [ ] Email service tested (send test email)
- [ ] OAuth provider credentials verified
- [ ] CAPTCHA keys tested
- [ ] Database backups enabled
- [ ] Monitoring/alerting configured
- [ ] Rate limiting thresholds tuned
- [ ] HTTPS certificate configured
- [ ] Firewall rules configured

### Post-Deployment

- [ ] Test registration flow end-to-end
- [ ] Test login flow
- [ ] Test password reset
- [ ] Test 2FA setup and verification
- [ ] Test OAuth providers
- [ ] Verify email sending works
- [ ] Load test authentication endpoints
- [ ] Review logs for errors
- [ ] Monitor database performance
- [ ] Verify backups working

---

## 12. Security Incident Response

### Incident Types & Actions

**Brute Force Attack:**
- Detection: > 10 failed attempts per email in 15 minutes
- Response: Lock account for 1 hour
- User notification: Email alert with suspicious activity warning
- Admin alert: Dashboard alert with IP information
- Remediation: User can unlock via email or admin

**Credential Breach:**
- Detection: External notification or user report
- Response: Force password reset for affected users
- User notification: Urgent security email
- Admin action: Review user activity logs
- Remediation: Audit connected OAuth accounts

**Suspicious Login:**
- Detection: New location, new device, unusual time
- Response: Require 2FA verification
- User notification: Email alert with login details
- Option: Deny login and send password reset email
- User action: Verify and allow or revoke session

**Session Hijacking:**
- Detection: Same session from different IP/user-agent
- Response: Invalidate session
- User notification: Email alert with suspicious activity
- User action: Login again
- Prevention: Session hardening (IP/user-agent binding)

---

## 13. Compliance & Standards

### Standards Implemented
- **OAuth 2.0**: RFC 6749 compliant
- **OpenID Connect**: Authorization Code Flow
- **TOTP**: RFC 6238
- **PASSK

EY**: WebAuthn W3C standard
- **SAML 2.0**: Enterprise SSO

### Regulations Supported
- **GDPR**: Data export, deletion, privacy
- **CCPA**: Consent management
- **SOC 2**: Audit logging, access controls
- **PCI-DSS**: Payment data isolation (if applicable)

### Security Standards
- **NIST SP 800-63B**: Digital identity guidelines
- **CWE Top 25**: Common security flaws avoided
- **OWASP Top 10**: Web security best practices

---

## Conclusion

This authentication architecture provides a comprehensive, secure, and scalable solution for user identity management. The multi-layered approach supports diverse authentication methods while maintaining security best practices throughout. Regular security audits, monitoring, and updates are essential for maintaining production reliability and security posture.

For implementation questions or security concerns, refer to the Better Auth documentation, Neon security guidelines, and OWASP authentication checklists.
