# API Response Contract & Error Code Catalog

## Standard JSON Envelope

All non-streaming chat/session endpoints now return the same top-level contract:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "requestId": "7e65f15f-f4fa-4f1d-9f3f-15df9f2a61ce"
}
```

Error responses use the same shape:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "title must be a non-empty string"
  },
  "requestId": "7e65f15f-f4fa-4f1d-9f3f-15df9f2a61ce"
}
```

### Streaming note

`POST /api/chat` remains a streaming response for backward compatibility. It emits `x-request-id` headers and returns JSON envelope responses for error conditions.

## Request/Correlation IDs

- Request IDs are resolved from `x-request-id` or `x-correlation-id` headers when present.
- If neither header is supplied, the API generates a UUID request ID.
- The same request ID is returned in the response body (`requestId`) and `x-request-id` response header.

## Chat & Session Endpoint Examples

### `GET /api/chat?streamId=stream-7&limit=2&offset=0`

```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "m-1",
        "streamId": "stream-7",
        "message": "Hello",
        "timestamp": "2025-01-01T00:00:00.000Z"
      }
    ],
    "pagination": {
      "limit": 2,
      "offset": 0,
      "nextOffset": 1,
      "hasMore": false,
      "cursor": null,
      "nextCursor": "2025-01-01T00:00:00.000Z"
    }
  },
  "error": null,
  "requestId": "1d6f7394-4109-432f-8a4f-f61aa45c88f0"
}
```

### `POST /api/sessions`

```json
{
  "title": "Support follow-up"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "s-1700000000000",
    "title": "Support follow-up",
    "created_at": "2026-01-01T00:00:00.000Z"
  },
  "error": null,
  "requestId": "5dd7d2c2-b06f-4be9-82d6-398056de6c9f"
}
```

## Error Code Catalog (Chat/Session)

| Code | HTTP status | Endpoint(s) | Meaning |
| --- | --- | --- | --- |
| `UNAUTHORIZED` | 401 | `GET/POST /api/chat` | User session/auth is missing. |
| `STREAM_ID_REQUIRED` | 400 | `GET /api/chat` | `streamId` query parameter was missing or empty. |
| `INVALID_PAGINATION` | 400 | `GET /api/chat` | `limit` or `offset` query values are invalid. |
| `INVALID_REQUEST` | 400 | `POST /api/chat`, `POST /api/sessions` | Payload failed schema validation. |
| `INTERNAL_ERROR` | 500 | `GET/POST /api/chat` | Unexpected internal chat handler failure. |
| `SESSIONS_LIST_FAILED` | 500 | `GET /api/sessions` | Session listing failed unexpectedly. |
| `SESSION_CREATE_FAILED` | 500 | `POST /api/sessions` | Session creation failed unexpectedly. |
| `SESSION_NOT_FOUND` | 404 | `GET /api/sessions/recent` | No recent session exists for the user context. |
| `SESSION_RECENT_FETCH_FAILED` | 500 | `GET /api/sessions/recent` | Recent session lookup failed unexpectedly. |
| `SESSION_ID_REQUIRED` | 400 | `GET /api/messages/session/:id` | Session id path parameter is required. |
| `INVALID_LIMIT` | 400 | `GET /api/messages/session/:id` | `limit` query parameter is invalid. |
| `SESSION_MESSAGES_FETCH_FAILED` | 500 | `GET /api/messages/session/:id` | Session messages query failed unexpectedly. |



## Stream Schedule API (`/api/streams/schedule`)

### Auth & identity behavior
- `GET /api/streams/schedule` and `POST /api/streams/schedule` require a valid server auth session (`getServerAuthSession`).
- Schedules are always scoped and stored by `session.user.id`.
- Unauthenticated requests return `401` with `{ "error": "Unauthorized" }`.
- `x-user-id` header identity override and `demo-user` fallback are not accepted.

### Development-only fallback (disabled by default)
- For local development only, a fallback identity can be enabled when **all** of the following are true:
  - `NODE_ENV=development`
  - `ENABLE_DEV_SCHEDULE_USER_FALLBACK=true`
  - `DEV_SCHEDULE_FALLBACK_USER_ID=<non-empty-user-id>`
- If any of the above conditions are not met, unauthenticated requests remain `401`.

## Upload API (`/api/upload`)

### `POST /api/upload`
- Auth required (NextAuth session).
- Multipart fields:
  - `file` (required)
  - `projectId` (optional, defaults to `default`)
  - `privacy` (`private` default, `public` optional)
- Validation:
  - Content-Type allowlist: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `video/mp4`, `video/webm`
  - Max file size: 25 MB
- Storage behavior:
  - Files are stored in cloud storage under user+project namespace.
  - Metadata is persisted in `uploaded_files` for later list/delete/share workflows.
- Response:
  - `file`: persisted metadata (`id`, `ownerId`, `projectId`, `mimeType`, `size`, `privacy`, `createdAt`)
  - `access`: signed URL and TTL based on privacy policy (private short-lived, public longer-lived)

### Upload migration note

- Apply DB migration script: `scripts/013-uploaded-files-schema.sql` before using `/api/upload` in production.


## Billing APIs (`/api/billing/*`)

The billing endpoints below support a normalized envelope and legacy compatibility fields to keep existing pages working during migration.

### Envelope shape

```json
{
  "success": true,
  "data": { "...": "endpoint payload" },
  "error": null,
  "requestId": "req_123"
}
```

For compatibility, selected top-level fields (for example `plans`, `subscription`, `invoices`, `invoice`) are also included outside `data`.

### `GET /api/billing/plans`
- `data`: `{ plans: SubscriptionPlan[] }`
- legacy-compatible: top-level `plans`

### `POST /api/billing/subscription/cancel`
- Request body: `{ "immediately"?: boolean, "confirm"?: true }`
- `data`: `{ subscription: UserSubscription }`
- legacy-compatible: top-level `subscription`

### `POST /api/billing/subscription/reactivate`
- `data`: `{ subscription: UserSubscription }`
- legacy-compatible: top-level `subscription`

### `GET /api/billing/invoices?limit=<n>&offset=<n>`
- `data`: `{ invoices: Invoice[], total: number, limit: number, offset: number }`
- legacy-compatible: top-level `invoices`, `total`, `limit`, `offset`

### `GET /api/billing/invoices/:id`
- `data`: `{ invoice: Invoice }`
- legacy-compatible: top-level `invoice`

### `GET /api/billing/invoices/:id/download`
- Default behavior: HTTP redirect to invoice PDF/hosted URL.
- Optional compatibility mode: `?redirect=false` returns JSON envelope:
  - `data`: `{ invoiceId: string, downloadUrl: string }`
  - legacy-compatible: top-level `invoice_id`, `download_url`

### Error codes
- `PLAN_NOT_FOUND` (`404`)
- `SUBSCRIPTION_NOT_FOUND` (`404`)
- `SUBSCRIPTION_NOT_CANCELING` (`404`)
- `INVOICE_NOT_FOUND` (`404`)
- `INVOICE_DOWNLOAD_NOT_AVAILABLE` (`404`)
- `BILLING_*_FAILED` (`500`) for unexpected failures

## Logging & Redaction

Structured API logs include:

- `timestamp`
- `level`
- `event`
- `requestId`
- route and method metadata

Sensitive payload fields in auth/payment/chat context are redacted before logging, including keys such as `password`, `token`, `secret`, `authorization`, `cookie`, `card`, `cvv`, `payment`, `otp`, `message`, `content`, and `prompt`.

## Admin Email Broadcast Queue (`/api/admin/email-broadcasts/*`)

- `POST /api/admin/email-broadcasts` and `PUT /api/admin/email-broadcasts/:id` now enqueue send jobs automatically when `scheduled_at` is provided.
- `POST /api/admin/email-broadcasts/:id/send` remains a manual trigger, but it now writes into the same queue path as scheduled jobs.
- Queue workers can be run through `POST /api/admin/email-broadcasts/worker`.
- Delivery is processed in batches with retry/backoff and idempotency key headers (`X-Idempotency-Key`) to reduce duplicate sends.
- Realtime progress is emitted through `/api/email/realtime` as `broadcast_progress` events in the SSE `event` envelope.

## Agent APIs (`/api/agents/*`)

### Payment Protocol Orchestration (`v1`)

`POST /api/v1/protocol/orchestrate`

Request payload (`application/json`):

```json
{
  "protocolVersion": "v1",
  "intentId": "pi_123",
  "actionType": "payment.capture",
  "actionPayload": {
    "amount": 999,
    "currency": "USD"
  },
  "requestedBy": "user_456",
  "userConfirmed": true,
  "verifierSet": ["risk-engine", "policy-engine"],
  "approvals": ["risk-engine", "policy-engine"]
}
```

Success response (`decision=approved`):

```json
{
  "success": true,
  "data": {
    "decision": "approved",
    "intentLock": {
      "protocolVersion": "v1",
      "intentId": "pi_123",
      "lockId": "lock_001",
      "actionType": "payment.capture",
      "riskLevel": "high",
      "requiredConfirmations": 1,
      "metadata": {
        "requestedBy": "user_456"
      },
      "createdAt": "2026-02-14T04:20:00.000Z"
    },
    "consensusVerification": {
      "protocolVersion": "v1",
      "intentId": "pi_123",
      "lockId": "lock_001",
      "verifierSet": ["risk-engine", "policy-engine"],
      "approvals": ["risk-engine", "policy-engine"],
      "deterministicChecks": [
        {
          "checkId": "policy.no_prompt_injection",
          "passed": true
        }
      ],
      "verifiedAt": "2026-02-14T04:20:00.030Z"
    },
    "release": {
      "protocolVersion": "v1",
      "intentId": "pi_123",
      "lockId": "lock_001",
      "releasedBy": "user_456",
      "releaseDecision": "approved",
      "releaseReason": "All deterministic policy checks passed.",
      "releasedAt": "2026-02-14T04:20:00.050Z"
    }
  },
  "error": null,
  "requestId": "req_abc"
}
```

Blocked response (`decision=blocked`):

```json
{
  "success": false,
  "data": {
    "decision": "blocked"
  },
  "error": {
    "code": "POLICY_CHECK_FAILED",
    "message": "Deterministic policy checks failed. Release is blocked.",
    "details": {
      "failedChecks": [
        {
          "checkId": "policy.min_consensus",
          "passed": false,
          "reason": "consensus approvals are invalid"
        }
      ]
    }
  },
  "requestId": "req_abc"
}
```

Confirmation-required response (`decision=requires_confirmation`):

```json
{
  "success": false,
  "data": {
    "decision": "requires_confirmation"
  },
  "error": {
    "code": "USER_CONFIRMATION_REQUIRED",
    "message": "Explicit user confirmation is required for high-risk payment actions."
  },
  "requestId": "req_abc"
}
```

### `POST /api/agents/chat`
- Auth required (NextAuth session).
- Streams SSE events with event names:
  - `token`: incremental model token payload.
  - `tool_start`: tool execution starts (`status: tool-running`).
  - `tool_result`: tool output or queued job metadata.
  - `final`: terminal state payload (`completed` with final content).
  - `error`: terminal failure payload.
- Request body:
  - `sessionId?: string`
  - `title?: string`
  - `message: string`
  - `tools?: ("catalog_lookup"|"inventory_health"|"checkout_preview"|"web_search"|"initiate_link_checkout")[]`
  - `toolPayloads?: Record<string, Record<string, unknown>>` (optional per-tool payload overrides; required for `initiate_link_checkout`)

### `GET /api/agents/sessions/:id`
- Auth required.
- Returns normalized history + session state (`messages`, `tool_calls`, `tool_results`, `actions`, `feedback`) with pagination counters.

### `POST /api/agents/actions`
- Auth required.
- Explicit action approval endpoint.
- High-risk action types (payment/account impacting) require `confirmedByUser=true`; otherwise `409` with audit record.

### `POST /api/agents/feedback`
- Auth required.
- Accepts quality/safety signals with bounded score (`1-5`).

## Grocery APIs (`/api/grocery/*`)

### Product Catalog

#### `GET /api/grocery/products`
Supports filtering and pagination query params:
- `category`, `search`, `organic`/`isOrganic`, `locallySourced`/`isFreshProduce`
- `minPrice`, `maxPrice`, `sortBy` (`name|price|rating`), `sortOrder` (`asc|desc`)
- `page`, `limit`, `format=chat`

Response fields remain backward-compatible with prior catalog responses (`products`, `totalProducts`, `totalPages`, `currentPage`, `categories`, `filters`).

#### `POST /api/grocery/products`
- **Mode 1 (legacy compatibility):** `{ "productId": "<id>", "quantity": 1 }` adds to the caller cart.
- **Mode 2 (new product create):** requires auth (`x-user-id`) and role `admin`/`seller` via `x-user-role`; validates product payload.

#### `GET /api/grocery/products/:id`
Returns one product by id.

#### `PATCH|PUT /api/grocery/products/:id`
Requires auth + role `admin`/`seller`. Validates partial payload and updates the record.

#### `DELETE /api/grocery/products/:id`
Requires auth + role `admin`/`seller`. Deletes a product.

### Cart APIs

All cart routes require `x-user-id`.

#### `GET /api/grocery/cart`
Lists cart items with product snapshots and derived subtotal.

#### `POST /api/grocery/cart/add`
Adds quantity to an existing item (or inserts one). Enforces inventory and product order limits atomically.

#### `PATCH /api/grocery/cart/:productId`
Sets quantity for a product in cart. Enforces inventory/order limits atomically.

#### `DELETE /api/grocery/cart/:productId`
Removes the product from the user cart.

### Grocery migration notes

- Cart storage moved from in-memory placeholder behavior to database-backed records in `grocery_cart_items`.
- Existing product list response shape is preserved.
- Legacy `POST /api/grocery/products` add-to-cart payload is still accepted for backward compatibility.
- Apply DB migration script: `scripts/012-grocery-cart-schema.sql` before using new cart endpoints in production.

## Payment & Billing API (`/api/v1`) Contract Examples

All payment and billing endpoints below return the standard envelope (`success`, `data`, `error`, `requestId`, optional `meta`).

### `POST /api/v1/payment/create-intent`

```json
{
  "amount": 499,
  "currency": "INR",
  "paymentMethodId": "stripe-card",
  "metadata": {
    "orderId": "ord_123"
  }
}
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "pi_123",
    "amount": 499,
    "currency": "INR",
    "status": "pending",
    "paymentMethod": "stripe-card"
  },
  "error": null,
  "requestId": "req_123"
}
```

### `POST /api/v1/payment/confirm`

```json
{
  "intentId": "pi_123"
}
```

### `GET /api/v1/payment/methods?currency=INR`

Response data is an array of enabled methods for the requested currency.

### `GET /api/v1/billing/subscription`

Response `data` is either `null` (no active subscription) or the customer-owned subscription record + `plan` object.

### `POST /api/v1/billing/checkout`

```json
{
  "priceId": "price_abc",
  "mode": "subscription",
  "success_url": "https://example.com/success",
  "cancel_url": "https://example.com/cancel"
}
```

### `POST /api/v1/billing/portal`

```json
{
  "return_url": "https://example.com/settings/billing"
}
```

### `GET /api/v1/billing/usage?plan=starter&period=2026-02`

Returns customer-owned usage totals, limits, and utilization for the requested period.

### `POST /api/v1/billing/usage` (authenticated ingestion)

Supports both:
- legacy metric increment payloads (`metric`, `amount`, optional `period`), and
- single usage-event ingestion payloads (`eventId`, token counts, `deltaMs`, `pricingModel`, optional resolver fields/metadata).

Usage-event ingestion is idempotent by `eventId` and returns duplicate-safe outcomes.

### `PUT /api/v1/billing/usage` (authenticated batch ingestion)

```json
{
  "events": [
    {
      "eventId": "evt_123",
      "customerId": "cus_123",
      "subscriptionId": "sub_123",
      "promptTokens": 100,
      "completionTokens": 240,
      "deltaMs": 950,
      "resolverId": "res_1",
      "resolverType": "custom",
      "metadata": { "tenant": "alpha" },
      "pricingModel": {
        "strategy": "hybrid",
        "promptTokenRate": 0.000001,
        "completionTokenRate": 0.000002,
        "millisecondRate": 0.0000005
      }
    }
  ]
}
```

Batch ingestion applies the same idempotency guarantees as single ingestion and returns per-event duplicate/ingested status details.

### `GET /api/v1/billing/invoices?limit=10&offset=0`

Returns paginated, customer-owned invoices and aggregated line items.

### Backward compatibility aliases

Legacy paths remain active as aliases to v1 handlers:
- `/api/payment/*` → `/api/v1/payment/*`
- `/api/billing/*` → `/api/v1/billing/*`


## Admin API contracts (`/api/admin/*`)

### Standardized auth/system error responses

Admin routes that rely on `requireAdminAuthorization` and `respondInternalServerError` now share the same 401/403/500 response contract:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Unauthorized"
  },
  "requestId": "req_123"
}
```

`error.code` values:
- `UNAUTHORIZED` for 401
- `FORBIDDEN` for 403
- `INTERNAL_ERROR` for 500

### Monitoring list endpoints

The following list endpoints support pagination with `page` and `limit`, plus filtering/search:

- `GET /api/admin/audit-logs`
  - filters: `entityType`, `action`, `actorUserId`
  - search: `search` (matches action/entity type/entity id)
- `GET /api/admin/sessions`
  - filters: `userId`, `isActive`, `deviceName`
  - search: `search` (matches device id/name, user agent, IP)
- `GET /api/admin/security/events`
  - filters: `action`, `adminId`
  - search: `search` (matches action, target id, details)

### Operator actions endpoint

`POST /api/admin/operations` supports operational actions for operator/admin workflows:

Request body:

```json
{
  "action": "cache.clear"
}
```

Allowed actions:
- `cache.clear`
- `jobs.cleanup`
- `service.restart_hook` (uses `restartUrl` or `OPERATIONS_RESTART_HOOK_URL`)

Success response:

```json
{
  "success": true,
  "action": "cache.clear"
}
```

## Editor Projects API (`/api/editor/projects`)

### `GET /api/editor/projects`
- Auth required.
- Returns projects owned by the authenticated user, sorted by `updatedAt` descending.

### `POST /api/editor/projects`
- Auth required.
- Request:
  - `title` (required, 1-150 chars)
  - `description` (optional)
  - `selectedModel` (optional)
  - `timeline` (optional: `duration`, `fps`, `tracks[]`)
  - `settings` / `metadata` (optional JSON objects)
- Response: `201` with created `project`.

### `GET /api/editor/projects/:id`
- Auth required.
- Returns one editor project scoped to current user.
- `404` if not found.

### `PATCH /api/editor/projects/:id`
- Auth required.
- Supports partial updates for:
  - `title`, `description`, `status`, `selectedModel`, `timeline`, `settings`, `metadata`
- Requires at least one update field; returns `400` on invalid payload.

### `DELETE /api/editor/projects/:id`
- Auth required.
- Soft response contract: `{ "success": true }` when deletion succeeds.
- `404` when the project does not exist for current user.

### Migration note
- Apply `scripts/sql/2026-02-19_create_editor_projects.sql` before using editor project endpoints in production.




## Recording Edits API (`/api/recordings/edit`)

### `POST /api/recordings/edit`
- Auth required.
- Writes edit jobs to `recording_edits` (not `streams`) to keep recording-edit metadata isolated from stream contracts.
- Request (strict schema):
  - `originalId` (required string)
  - `title` (required, trimmed, max 160)
  - `startTime` / `endTime` (required ISO datetime with timezone, `endTime > startTime`, max span 12h)
  - `filters` (optional object, defaults `{}`)
  - `audioLevel` (required number, range `0..2`)
  - `exportSettings` (optional object, defaults `{}`)
- Response success: `{ "success": true, "editId": "...", "message": "Video edit queued for processing" }`
- Response errors:
  - `401` unauthorized
  - `400` invalid payload with `details[]`
  - `500` persistence failure

### Transaction behavior

- The route executes the recording edit insert inside an explicit DB transaction (`BEGIN` / `COMMIT`, rollback on failure).


- The route executes the recording edit insert inside an explicit DB transaction (`BEGIN` / `COMMIT`, rollback on failure).

- The route executes the recording edit insert inside an explicit DB transaction (`BEGIN` / `COMMIT`, rollback on fail


## Stream Interactions API (`/api/streams/:id/*`)

These endpoints power live interactivity for polls, Q&A, reactions, member-only mode, and pinned message references.

### `GET /api/streams/:id/interactions`
Returns a combined snapshot:
- `state`: `{ pinnedMessageId, reactionsEnabled, memberOnly, activePollId, activeQASessionId, updatedAt }`
- `polls`: poll history for stream
- `qaSessions`: Q&A session history
- `questions`: submitted questions list

### `PATCH /api/streams/:id/interactions`
Auth required.

Payload (all optional):
```json
{
  "reactionsEnabled": true,
  "memberOnly": false,
  "pinnedMessageId": "chat-message-id-or-null"
}
```

### Poll endpoints
- `GET /api/streams/:id/polls`
- `POST /api/streams/:id/polls` (auth required)
  - payload: `{ "question": string, "options": string[] }`
  - option count: 2-6
- `POST /api/streams/:id/polls/:pollId/vote`
  - payload: `{ "optionId": string }`
- `POST /api/streams/:id/polls/:pollId/end` (auth required)

### Q&A endpoints
- `GET /api/streams/:id/qa`
- `POST /api/streams/:id/qa` (auth required)
  - payload: `{ "prompt": string }`
- `POST /api/streams/:id/qa/:sessionId/end` (auth required)
- `GET /api/streams/:id/qa/questions`
- `POST /api/streams/:id/qa/questions`
  - payload: `{ "username"?: string, "text": string }`
- `PATCH /api/streams/:id/qa/questions/:questionId` (auth required)
  - payload: `{ "selected": boolean }`

### Storage behavior
- Uses Upstash Redis when `KV_REST_API_URL` and `KV_REST_API_TOKEN` are configured.
- Falls back to in-memory store when KV is unavailable (development convenience only).


## Studio Realtime Delivery & Polling Fallback

The Streaming Studio runtime uses a **hybrid read model** for live state consistency:

- **Primary transport:** realtime channel events for low-latency updates (viewer count, health, interaction deltas).
- **Fallback transport:** polling snapshots for continuity and drift correction.

### Realtime behavior contract

1. Mutation endpoints (`create/start/end`, interactions writes) remain API-driven and authoritative.
2. Realtime events are treated as non-authoritative deltas unless reconciled with API snapshots.
3. Clients must tolerate duplicate/reordered events and apply idempotent reducers.
4. On realtime channel health degradation, clients MUST degrade to polling-only until channel health is restored.

### Incident rollback contract

If production stability is impacted by realtime transport:
- Disable realtime channel delivery (feature flag/config switch).
- Keep Studio operational with polling-only reads against existing REST endpoints.
- Re-enable realtime only after mitigation + canary verification.

### API-level checks (recommended)

- `GET /api/streams/:id/health` returns healthy status during live session.
- `GET /api/streams/:id/metrics/realtime` returns monotonic/non-negative counters.
- `GET /api/streams/:id/interactions` snapshot remains queryable while realtime channel is disabled.

## Dashboard Live Control Visibility Defaults

`/api/dashboard/streams/live-control/:id` now supports `visibility.creatorAge` as the default visibility resolver input:

- `creatorAge` between 13 and 17 => default visibility resolves to `private`.
- `creatorAge` 18 and above => default visibility resolves to `public`.
- explicit visibility, when set, still overrides default resolution.

Example update payload:

```json
{
  "visibility": {
    "creatorAge": 16,
    "explicitVisibility": null
  }
}
```

## Chat Contract Canonicalization (2026-02)

### Canonical request fields

Applicable to `POST /api/chat`, `POST /api/agents/chat`, and `POST /api/mobile/chat`:

- `clientRequestId` (string, optional): idempotency key supplied by client. If repeated, server returns previously accepted message/result when available.
- `attachments` (array, optional): metadata-only references, max 3-4 items depending on endpoint.
  - `name` (required)
  - `type` (required)
  - `size` (required, positive, max 8MB)
  - `url`, `checksum`, `width`, `height`, `id` (optional)
- `retry` (object, optional for streaming endpoints):
  - `mode`: `none | auto | manual`
  - `maxAttempts`: `0..3`

### Canonical error codes

| Code | Meaning |
| --- | --- |
| `AUTH_REQUIRED` | Auth/session missing for endpoint requiring identity. |
| `RATE_LIMITED` | Adaptive throttle/rate limit exceeded. |
| `INVALID_ATTACHMENT` | Attachment metadata failed validation. |
| `PROVIDER_TIMEOUT` | Upstream AI provider timed out. |
| `INVALID_REQUEST` | Payload schema validation failure. |

### `POST /api/mobile/chat` example

Request:

```json
{
  "platform": "youtube",
  "username": "creator_mod",
  "message": "Pinned message for checkout",
  "clientRequestId": "mob-req-20260228-00041",
  "attachments": [
    {
      "name": "promo.png",
      "type": "image/png",
      "size": 140231,
      "url": "https://cdn.runash.in/chat/promo.png",
      "checksum": "sha256:abc123"
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "message": {
      "id": "c4a2...",
      "platform": "youtube",
      "username": "creator_mod",
      "message": "Pinned message for checkout",
      "timestamp": "2026-02-28T08:01:44.311Z",
      "cursor": "mc_1882",
      "clientRequestId": "mob-req-20260228-00041"
    },
    "deduped": false
  },
  "error": null,
  "requestId": "req_..."
}
```

### Mobile chat cursor guarantees

- `/api/mobile/chat` and `/api/mobile/chat/stream` use a monotonic cursor: `mc_<cursor_seq>`.
- Cursor progression is based on `mobile_chat_messages.cursor_seq` (bigserial), not wall-clock timestamps.
- History and stream polling both query with `cursor_seq > last_seen`, ensuring stable ordering and no duplicate/skip due to same timestamp values.

### `POST /api/agents/chat` idempotent replay behavior

When `clientRequestId` is repeated for the same session and a completed assistant message exists, endpoint returns a non-stream replay response:

```json
{
  "deduped": true,
  "requestId": "req_...",
  "sessionId": "as_...",
  "messageId": "am_...",
  "content": "Previously generated assistant response"
}
```

Attachment metadata is persisted and linked to the originating user message for auditability.
