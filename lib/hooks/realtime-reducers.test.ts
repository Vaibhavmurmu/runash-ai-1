import assert from "node:assert/strict"
import test from "node:test"
import {
  initialAlertsRealtimeState,
  initialAutomationRealtimeState,
  initialChatRealtimeState,
  initialEditorJobsRealtimeState,
  initialStreamsRealtimeState,
  reduceAlertsRealtime,
  reduceAutomationRealtime,
  reduceChatRealtime,
  reduceEditorJobsRealtime,
  reduceStreamsRealtime,
} from "@/lib/hooks/realtime-reducers"
import type { RealtimeEventEnvelope } from "@/lib/hooks/use-realtime-client"

function event<TPayload>(input: Partial<RealtimeEventEnvelope<TPayload>>): RealtimeEventEnvelope<TPayload> {
  return {
    channel: "streams",
    type: "noop",
    payload: {} as TPayload,
    occurredAt: 1,
    requestId: "req-1",
    ...input,
  }
}

test("reduceStreamsRealtime upserts and removes items with request trace", () => {
  const inserted = reduceStreamsRealtime(
    initialStreamsRealtimeState,
    event({
      channel: "streams",
      type: "stream.updated",
      payload: { id: "s1", status: "live", viewerCount: 99 },
      requestId: "req-stream-1",
      occurredAt: 10,
    }),
  )

  assert.equal(inserted.byId.s1.status, "live")
  assert.equal(inserted.ids[0], "s1")
  assert.equal(inserted.lastRequestId, "req-stream-1")

  const removed = reduceStreamsRealtime(
    inserted,
    event({
      channel: "streams",
      type: "stream.deleted",
      payload: { id: "s1" },
      requestId: "req-stream-2",
      occurredAt: 20,
    }),
  )

  assert.equal(removed.ids.length, 0)
  assert.equal(removed.byId.s1, undefined)
  assert.equal(removed.lastRequestId, "req-stream-2")
})

test("reduceAlertsRealtime deduplicates and dismisses alerts", () => {
  const first = reduceAlertsRealtime(
    initialAlertsRealtimeState,
    event({
      channel: "alerts",
      type: "alert.created",
      payload: { id: "a1", message: "hello", severity: "warning", createdAt: "2026-01-01" },
      requestId: "req-alert-1",
      occurredAt: 11,
    }),
  )

  const duplicated = reduceAlertsRealtime(
    first,
    event({
      channel: "alerts",
      type: "alert.created",
      payload: { id: "a1", message: "hello", severity: "warning", createdAt: "2026-01-01" },
      requestId: "req-alert-2",
      occurredAt: 12,
    }),
  )

  assert.equal(duplicated.items.length, 1)
  assert.equal(duplicated.lastRequestId, "req-alert-2")

  const dismissed = reduceAlertsRealtime(
    duplicated,
    event({ channel: "alerts", type: "alert.dismissed", payload: { id: "a1" }, occurredAt: 13 }),
  )

  assert.equal(dismissed.items.length, 0)
})

test("reduceChatRealtime keeps per stream bounded history", () => {
  const next = reduceChatRealtime(
    initialChatRealtimeState,
    event({
      channel: "chat",
      type: "chat.message.created",
      payload: { id: "m1", streamId: "stream-1", message: "yo", createdAt: "2026-01-01" },
      requestId: "req-chat-1",
      occurredAt: 15,
    }),
  )

  assert.equal(next.byStreamId["stream-1"][0]?.id, "m1")
  assert.equal(next.lastRequestId, "req-chat-1")
})

test("reduceAutomationRealtime and reduceEditorJobsRealtime track lifecycle changes", () => {
  const automation = reduceAutomationRealtime(
    initialAutomationRealtimeState,
    event({
      channel: "automation",
      type: "automation.job.updated",
      payload: { id: "job-1", status: "running", progress: 50 },
      requestId: "req-auto-1",
      occurredAt: 20,
    }),
  )

  assert.equal(automation.jobs["job-1"].status, "running")

  const automationRemoved = reduceAutomationRealtime(
    automation,
    event({ channel: "automation", type: "automation.job.deleted", payload: { id: "job-1" } }),
  )
  assert.equal(automationRemoved.jobs["job-1"], undefined)

  const editor = reduceEditorJobsRealtime(
    initialEditorJobsRealtimeState,
    event({
      channel: "editor-jobs",
      type: "editor.job.updated",
      payload: { id: "editor-1", status: "completed", progress: 100 },
      requestId: "req-editor-1",
      occurredAt: 21,
    }),
  )
  assert.equal(editor.jobs["editor-1"].status, "completed")

  const editorRemoved = reduceEditorJobsRealtime(
    editor,
    event({ channel: "editor-jobs", type: "editor.job.deleted", payload: { id: "editor-1" } }),
  )
  assert.equal(editorRemoved.jobs["editor-1"], undefined)
})
