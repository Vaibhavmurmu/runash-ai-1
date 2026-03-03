import assert from "node:assert/strict"
import test from "node:test"
import { handleGetRecording } from "./[id]/recording-detail-route-handler"

test("GET /api/recordings/[id] maps canonical file_url and ownership", async () => {
  const response = await handleGetRecording(
    new Request("http://localhost/api/recordings/rec_1") as never,
    { id: "rec_1" },
    {
      getSession: async () => ({ user: { id: "user_1" } }),
      getRecording: async () => ({
        id: "rec_1",
        stream_id: "stream_1",
        file_url: "cloud://recordings/stream_1/rec_1.mp4",
        thumbnail_url: null,
        duration: 180,
        file_size: 2048,
        created_at: "2026-02-28T00:00:00.000Z",
        view_count: 2,
        user_id: "user_1",
        privacy: "private",
      }),
      getSignedDownloadUrl: async (key) => `https://signed.example/${key}`,
    },
  )

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.recording.recordingUrl, "cloud://recordings/stream_1/rec_1.mp4")
  assert.equal(payload.recording.fileSize, 2048)
  assert.equal(payload.recording.isPublic, false)
})
