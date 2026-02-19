import assert from "node:assert/strict"
import test from "node:test"

import { handleCreateRecordingEdit } from "./edit-route-handler.ts"

function createValidPayload() {
  return {
    originalId: "stream_123",
    title: "Edited take",
    startTime: "2026-02-21T10:00:00.000Z",
    endTime: "2026-02-21T10:10:00.000Z",
    filters: { contrast: 1.1 },
    audioLevel: 1,
    exportSettings: { format: "mp4", resolution: "1080p" },
  }
}

test("POST /api/recordings/edit returns 401 when unauthorized", async () => {
  const response = await handleCreateRecordingEdit(
    new Request("http://localhost/api/recordings/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createValidPayload()),
    }),
    {
      getSession: async () => null,
      sql: async () => [],
    },
  )

  const payload = await response.json()

  assert.equal(response.status, 401)
  assert.equal(payload.success, false)
  assert.equal(payload.error, "Unauthorized")
})

test("POST /api/recordings/edit returns 400 when validation fails", async () => {
  const invalidPayload = {
    ...createValidPayload(),
    title: "",
    endTime: "2026-02-21T09:59:00.000Z",
  }

  const response = await handleCreateRecordingEdit(
    new Request("http://localhost/api/recordings/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidPayload),
    }),
    {
      getSession: async () => ({ user: { id: "user_1" } }),
      sql: async () => {
        throw new Error("SQL should not be called for invalid payload")
      },
    },
  )

  const payload = await response.json()

  assert.equal(response.status, 400)
  assert.equal(payload.success, false)
  assert.equal(payload.error, "Invalid recording edit payload")
  assert.equal(Array.isArray(payload.details), true)
  assert.equal(payload.details.length >= 1, true)
})

test("POST /api/recordings/edit persists edit and returns typed success payload", async () => {
  const queries: string[] = []

  const response = await handleCreateRecordingEdit(
    new Request("http://localhost/api/recordings/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createValidPayload()),
    }),
    {
      getSession: async () => ({ user: { id: "user_1" } }),
      sql: async (parts) => {
        const query = parts.join("${}").trim()
        queries.push(query)

        if (query === "BEGIN" || query === "COMMIT") {
          return []
        }

        if (query.includes("INSERT INTO recording_edits")) {
          return [{ id: "edit_1" }]
        }

        throw new Error(`Unexpected query: ${query}`)
      },
    },
  )

  const payload = await response.json()

  assert.equal(response.status, 200)
  assert.equal(payload.success, true)
  assert.equal(payload.editId, "edit_1")
  assert.equal(payload.message, "Video edit queued for processing")
  assert.deepEqual(queries, ["BEGIN", queries[1], "COMMIT"])
  assert.equal(queries[1].includes("INSERT INTO recording_edits"), true)
})
