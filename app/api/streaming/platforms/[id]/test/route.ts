import { type NextRequest, NextResponse } from "next/server"
import { Database } from "@/lib/database"
import { logAudit, withRateLimit } from "@/lib/api-utils"
import type { PlatformTestDiagnosticStatus, PlatformTestResult } from "@/lib/streaming-platform-test"
import { getServerAuthSession } from "@/lib/auth/session"

const STREAM_TEST_RATE_LIMIT = 10
const STREAM_TEST_RATE_WINDOW_MS = 5 * 60 * 1000
const STREAM_VALIDATION_TIMEOUT_MS = 5000

interface StreamingPlatformRow {
  id: string
  name: string
  platform_type: string
  rtmp_url: string
  stream_key: string
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerAuthSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const rateLimit = await withRateLimit(req, STREAM_TEST_RATE_LIMIT, STREAM_TEST_RATE_WINDOW_MS)
    if (!rateLimit.allowed) {
      await logAudit(session.user.id, "stream_platform_test_rate_limited", "streaming_platform", {
        platformId: params.id,
        retryAfter: rateLimit.retryAfter,
      })

      return NextResponse.json(
        {
          status: "failed",
          success: false,
          message: "Too many connection tests. Please wait before trying again.",
          actionableRemediation: [
            "Wait for the cooldown period and retry.",
            "Run one test after each credential update.",
          ],
          diagnostics: {
            network: "unknown",
            auth: "unknown",
            endpoint: "unknown",
          },
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfter ?? 60),
          },
        },
      )
    }

    const platformRows = (await Database.query(
      `SELECT id, name, platform_type, rtmp_url, stream_key
       FROM streaming_platforms
       WHERE id = $1 AND user_id = $2`,
      [params.id, session.user.id],
    )) as StreamingPlatformRow[]

    const platform = platformRows[0]
    if (!platform) {
      return NextResponse.json({ error: "Platform not found" }, { status: 404 })
    }

    const streamValidation = await validateStreamingEndpoint(platform)

    await logAudit(session.user.id, "stream_platform_test_executed", "streaming_platform", {
      platformId: params.id,
      platformType: platform.platform_type,
      status: streamValidation.status,
      diagnostics: streamValidation.diagnostics,
    })

    return NextResponse.json(streamValidation)
  } catch (error) {
    console.error("Platform test error:", error)
    return NextResponse.json(
      {
        status: "failed",
        success: false,
        message: "Failed to run streaming endpoint test",
        actionableRemediation: [
          "Validate your RTMP server accessibility from the current network.",
          "Re-check stream key and URL format.",
          "Retry after a short delay.",
        ],
        diagnostics: {
          network: "failed",
          auth: "unknown",
          endpoint: "failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 },
    )
  }
}

async function validateStreamingEndpoint(platform: StreamingPlatformRow): Promise<PlatformTestResult> {
  const diagnostics: PlatformTestResult["diagnostics"] = {
    network: "unknown",
    auth: "unknown",
    endpoint: "unknown",
  }

  if (!platform.rtmp_url?.trim()) {
    return buildFailureResult(
      "Missing RTMP endpoint URL.",
      diagnostics,
      ["Provide a valid RTMP endpoint URL from your streaming provider."],
      "failed",
    )
  }

  if (!platform.stream_key?.trim()) {
    return buildFailureResult(
      "Missing stream key.",
      diagnostics,
      ["Provide a valid stream key before running the connection test."],
      "failed",
    )
  }

  const parsedUrl = parseStreamingUrl(platform.rtmp_url)
  if (!parsedUrl.ok) {
    diagnostics.endpoint = "failed"
    return buildFailureResult(parsedUrl.message, diagnostics, [parsedUrl.remediation], "failed")
  }

  diagnostics.endpoint = "pass"

  const networkProbe = await probeNetworkConnectivity(platform.rtmp_url)
  diagnostics.network = networkProbe.status

  if (networkProbe.status === "failed") {
    return buildFailureResult(
      "Unable to reach streaming endpoint.",
      diagnostics,
      ["Check firewall/security group settings.", "Verify DNS and host availability.", "Confirm RTMP port is open."],
      "failed",
    )
  }

  if (platform.stream_key.length < 8) {
    diagnostics.auth = "failed"
    return buildFailureResult(
      "Stream key appears invalid (too short).",
      diagnostics,
      ["Use the full stream key provided by the platform."],
      "failed",
    )
  }

  diagnostics.auth = "pass"

  return {
    status: "healthy",
    success: true,
    message: "Streaming endpoint configuration looks valid.",
    diagnostics,
    actionableRemediation: ["Run an end-to-end publish test from your encoder before going live."],
  }
}

function parseStreamingUrl(rawUrl: string): { ok: true } | { ok: false; message: string; remediation: string } {
  const allowedProtocols = new Set(["rtmp:", "rtmps:"])

  try {
    const parsed = new URL(rawUrl)

    if (!allowedProtocols.has(parsed.protocol)) {
      return {
        ok: false,
        message: "Unsupported streaming URL protocol.",
        remediation: "Use an rtmp:// or rtmps:// endpoint URL.",
      }
    }

    if (!parsed.hostname) {
      return {
        ok: false,
        message: "Streaming URL is missing a hostname.",
        remediation: "Provide a complete endpoint URL including hostname.",
      }
    }

    return { ok: true }
  } catch {
    return {
      ok: false,
      message: "Streaming URL is not a valid URL.",
      remediation: "Re-check endpoint URL formatting.",
    }
  }
}

async function probeNetworkConnectivity(rtmpUrl: string): Promise<{ status: PlatformTestDiagnosticStatus; latencyMs?: number }> {
  const start = Date.now()

  try {
    const parsed = new URL(rtmpUrl)
    const abortController = new AbortController()
    const timeout = setTimeout(() => abortController.abort(), STREAM_VALIDATION_TIMEOUT_MS)

    const probeUrl = `https://${parsed.hostname}`

    await fetch(probeUrl, {
      method: "HEAD",
      signal: abortController.signal,
      cache: "no-store",
    })

    clearTimeout(timeout)

    return {
      status: "pass",
      latencyMs: Date.now() - start,
    }
  } catch {
    return {
      status: "failed",
      latencyMs: Date.now() - start,
    }
  }
}

function buildFailureResult(
  message: string,
  diagnostics: PlatformTestResult["diagnostics"],
  remediation: string[],
  status: PlatformTestResult["status"],
): PlatformTestResult {
  return {
    status,
    success: false,
    message,
    diagnostics,
    actionableRemediation: remediation,
  }
}
