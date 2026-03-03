import assert from "node:assert/strict"
import test from "node:test"
import { handleGetRecordings } from "./recordings-route-handler"

test("GET /api/recordings uses getUserRecordings and maps file_url payload", async () => {
  const response = await handleGetRecordings(new Request("http://localhost/api/recordings") as never, {
    getSession: async () => ({ user: { id: "user_1" } }),
    getRecordings: async () => {
      throw new Error("should not call getRecordings without streamId")
    },
    getUserRecordings: async () => [
      {
        id: "rec_1",
        stream_id: "stream_1",
        file_url: "cloud://recordings/stream_1/rec_1.mp4",
        thumbnail_url: "thumb.png",
        duration: 120,
        file_size: 1024,
        created_at: "2026-02-28T00:00:00.000Z",
        view_count: 4,
        user_id: "user_1",
        privacy: "public",
      },
    ],
    getSignedDownloadUrl: async (key) => `https://signed.example/${key}`,
  })

  const payload = await response.json()
  assert.equal(response.status, 200)
  assert.equal(payload.recordings.length, 1)
  assert.equal(payload.recordings[0].recordingUrl, "cloud://recordings/stream_1/rec_1.mp4")
  assert.equal(payload.recordings[0].streamId, "stream_1")
  assert.equal(payload.recordings[0].isPublic, true)
  assert.equal(payload.recordings[0].playbackUrl, "https://signed.example/stream_1/rec_1.mp4")
})
