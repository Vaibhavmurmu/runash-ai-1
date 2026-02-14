import { type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { CloudStorage } from "@/lib/cloud-storage"
import { Database } from "@/lib/database"
import { logApiEvent } from "@/lib/api/logging"
import { respondError, respondSuccess } from "@/lib/api/envelope"

const ROUTE = "/api/recordings/upload"

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const streamId = formData.get("streamId") as string
    const duration = Number.parseInt(formData.get("duration") as string)

    if (!file || !streamId) {
      return respondError(
        req,
        { code: "VALIDATION_FAILED", message: "Missing required fields" },
        { status: 400, requestId },
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const fileUrl = await CloudStorage.uploadRecording(streamId, buffer)

    const recording = await Database.createRecording({
      stream_id: streamId,
      file_url: fileUrl,
      duration: duration,
      file_size: buffer.length,
    })

    return respondSuccess(req, { recording }, { requestId })
  } catch (error) {
    logApiEvent("error", "recordings.upload.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "upload-recording", code: "RECORDING_UPLOAD_FAILED" },
      error,
    })

    return respondError(
      req,
      { code: "RECORDING_UPLOAD_FAILED", message: "Unable to upload recording. Please try again." },
      { status: 500, requestId },
    )
  }
}
