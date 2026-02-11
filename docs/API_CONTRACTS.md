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

## Logging & Redaction

Structured API logs include:

- `timestamp`
- `level`
- `event`
- `requestId`
- route and method metadata

Sensitive payload fields in auth/payment/chat context are redacted before logging, including keys such as `password`, `token`, `secret`, `authorization`, `cookie`, `card`, `cvv`, `payment`, `otp`, `message`, `content`, and `prompt`.

## Agent APIs (`/api/agents/*`)

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
  - `tools?: ("catalog_lookup"|"inventory_health"|"checkout_preview")[]`

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
