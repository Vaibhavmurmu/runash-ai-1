# Unified Realtime Gateway: Editor + Live Stream

Schema version: `1.0`

## Channel namespaces

- `editor:{projectId}`
- `stream:{sessionId}`

## Handshake + auth

1. Client calls `POST /api/realtime/handshake` with requested channels.
2. Server authenticates current user session and performs per-channel authorization checks:
   - `editor:{projectId}` requires project ownership.
   - `stream:{sessionId}` requires live-stream session ownership.
3. Server returns a short-lived signed token containing authorized channels.
4. Client subscribes via `GET /api/realtime/stream?token=<token>&cursor=<lastCursor?>`.

## Envelope

```json
{
  "schemaVersion": "1.0",
  "cursor": "42",
  "channel": "editor:proj_123",
  "type": "render_job.updated",
  "sentAt": "2026-03-06T09:00:00.000Z",
  "payload": {}
}
```

## Typed events

### `session.state_changed`

Channel: `stream:{sessionId}`

```json
{
  "sessionId": "ls_123",
  "previousStatus": "starting",
  "status": "live",
  "occurredAt": "2026-03-06T09:00:00.000Z",
  "actorUserId": 42,
  "reason": null
}
```

### `render_job.updated`

Channel: `editor:{projectId}`

```json
{
  "projectId": "proj_123",
  "jobId": "job_456",
  "status": "processing",
  "progress": 62,
  "stage": "compositing",
  "updatedAt": "2026-03-06T09:00:07.000Z"
}
```

### `timeline.mutated`

Channel: `editor:{projectId}`

```json
{
  "projectId": "proj_123",
  "timelineId": "tl_1",
  "mutation": "updated",
  "actorUserId": "user_22",
  "occurredAt": "2026-03-06T09:00:11.000Z"
}
```

### `timeline.lock_changed`

Channel: `editor:{projectId}`

```json
{
  "projectId": "proj_123",
  "timelineId": "tl_1",
  "lockOwnerUserId": "user_22",
  "revision": 9,
  "occurredAt": "2026-03-06T09:00:13.000Z"
}
```

### `collaborator.presence`

Channel: `editor:{projectId}`

```json
{
  "projectId": "proj_123",
  "userId": "user_77",
  "state": "join",
  "occurredAt": "2026-03-06T09:00:15.000Z"
}
```

## Reconnect + resume semantics

- `cursor` is monotonically increasing and emitted as SSE `id`.
- On reconnect, pass `cursor` query param to replay missed events from per-channel event history.
- If cursor is too old and falls outside retained history, server streams from current retained head.

## Versioning rules

- Patch-level, additive payload fields do **not** require a schema version bump.
- Removing/renaming fields or changing field meaning requires a new `schemaVersion`.
- Clients should ignore unknown fields and unknown event types for forward compatibility.
