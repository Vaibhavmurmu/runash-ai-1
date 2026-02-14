import { type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { respondError, respondSuccess } from "@/lib/api/envelope"
import { logApiEvent } from "@/lib/api/logging"
import { EnhancedCloudStorage } from "@/lib/enhanced-cloud-storage"

const ROUTE = "/api/storage"

export async function GET(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const { searchParams } = new URL(req.url)
    const action = searchParams.get("action")
    const prefix = searchParams.get("prefix")
    const maxKeys = Number.parseInt(searchParams.get("maxKeys") || "100")
    const continuationToken = searchParams.get("continuationToken") || undefined
    const storage = EnhancedCloudStorage.getInstance()

    switch (action) {
      case "list": {
        const userPrefix = `users/${session.user.id}/${prefix || ""}`
        const result = await storage.listFiles(userPrefix, maxKeys, continuationToken)
        return respondSuccess(req, result, { requestId })
      }
      case "stats": {
        const stats = await storage.getStorageStats(session.user.id)
        return respondSuccess(req, stats, { requestId })
      }
      default:
        return respondError(req, { code: "INVALID_ACTION", message: "Invalid action" }, { status: 400, requestId })
    }
  } catch (error) {
    logApiEvent("error", "storage.read.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "storage-read", code: "STORAGE_READ_FAILED" },
      error,
    })

    return respondError(
      req,
      { code: "STORAGE_READ_FAILED", message: "Unable to load storage data. Please retry." },
      { status: 500, requestId },
    )
  }
}

export async function POST(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const formData = await req.formData()
    const action = formData.get("action") as string
    const storage = EnhancedCloudStorage.getInstance()

    switch (action) {
      case "upload": {
        const file = formData.get("file") as File
        const folder = (formData.get("folder") as string) || ""

        if (!file) {
          return respondError(req, { code: "MISSING_FILE", message: "No file provided" }, { status: 400, requestId })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const key = `users/${session.user.id}/${folder}/${Date.now()}-${file.name}`
        const url = await storage.uploadFile(key, buffer, file.type, {
          originalName: file.name,
          uploadedBy: session.user.id,
          uploadedAt: new Date().toISOString(),
        })

        return respondSuccess(req, { url, key, size: buffer.length }, { requestId })
      }

      case "presigned-url": {
        const fileName = formData.get("fileName") as string
        const contentType = formData.get("contentType") as string
        const folderPath = (formData.get("folder") as string) || ""

        if (!fileName || !contentType) {
          return respondError(
            req,
            { code: "VALIDATION_FAILED", message: "fileName and contentType required" },
            { status: 400, requestId },
          )
        }

        const uploadKey = `users/${session.user.id}/${folderPath}/${Date.now()}-${fileName}`
        const presignedUrl = await storage.generatePresignedUploadUrl(uploadKey, contentType)
        return respondSuccess(req, { presignedUrl, key: uploadKey }, { requestId })
      }

      default:
        return respondError(req, { code: "INVALID_ACTION", message: "Invalid action" }, { status: 400, requestId })
    }
  } catch (error) {
    logApiEvent("error", "storage.upload.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "storage-upload", code: "STORAGE_UPLOAD_FAILED" },
      error,
    })

    return respondError(
      req,
      { code: "STORAGE_UPLOAD_FAILED", message: "Unable to complete upload. Please retry." },
      { status: 500, requestId },
    )
  }
}

export async function DELETE(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const { keys } = await req.json()
    if (!Array.isArray(keys)) {
      return respondError(req, { code: "VALIDATION_FAILED", message: "Keys must be an array" }, { status: 400, requestId })
    }

    const userKeys = keys.filter((key) => key.startsWith(`users/${session.user.id}/`))
    const storage = EnhancedCloudStorage.getInstance()
    const result = await storage.deleteFiles(userKeys)

    return respondSuccess(req, result, { requestId })
  } catch (error) {
    logApiEvent("error", "storage.delete.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "storage-delete", code: "STORAGE_DELETE_FAILED" },
      error,
    })

    return respondError(
      req,
      { code: "STORAGE_DELETE_FAILED", message: "Unable to delete files right now." },
      { status: 500, requestId },
    )
  }
}

export async function PATCH(req: NextRequest) {
  const requestId = req.headers.get("x-request-id") ?? crypto.randomUUID()

  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return respondError(req, { code: "AUTH_UNAUTHORIZED", message: "Unauthorized" }, { status: 401, requestId })
    }

    const { action, sourceKey, destinationKey } = await req.json()
    if (!sourceKey.startsWith(`users/${session.user.id}/`) || !destinationKey.startsWith(`users/${session.user.id}/`)) {
      return respondError(req, { code: "FORBIDDEN_FILE_ACCESS", message: "Unauthorized file access" }, { status: 403, requestId })
    }

    const storage = EnhancedCloudStorage.getInstance()
    switch (action) {
      case "move":
        await storage.moveFile(sourceKey, destinationKey)
        return respondSuccess(req, { success: true }, { requestId })
      case "copy":
        await storage.copyFile(sourceKey, destinationKey)
        return respondSuccess(req, { success: true }, { requestId })
      default:
        return respondError(req, { code: "INVALID_ACTION", message: "Invalid action" }, { status: 400, requestId })
    }
  } catch (error) {
    logApiEvent("error", "storage.operation.failed", {
      requestId,
      route: ROUTE,
      method: req.method,
      details: { operation: "storage-operation", code: "STORAGE_OPERATION_FAILED" },
      error,
    })

    return respondError(
      req,
      { code: "STORAGE_OPERATION_FAILED", message: "Unable to complete storage operation." },
      { status: 500, requestId },
    )
  }
}
