"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Loader2, Server, AlertTriangle, CheckCircle2, Network } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface TurnTestResult {
  server: string
  protocol: string
  success: boolean
  latency: number | null
  error?: string
  failureType?: "auth" | "connectivity"
  telemetryTags?: string[]
}

interface TurnCredentialApiResponse {
  iceServers: RTCIceServer[]
  ttl: number
  issuedAt: number
  expiresAt: number
}

interface TurnTestServer {
  url: string
  protocol: string
}

const TURN_AUTH_FAILURE_TAG = "turn_auth_failure"
const TURN_CONNECTIVITY_FAILURE_TAG = "turn_connectivity_failure"

function emitDiagnosticsTelemetry(event: string, tags: string[], metadata: Record<string, unknown>) {
  console.info("TURN diagnostics telemetry", {
    event,
    tags,
    metadata,
  })
}

function getServerLabel(serverUrl: string) {
  return serverUrl.replace(/^turns?:/i, "").split("?")[0]
}

export function TurnServerDiagnostics() {
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [results, setResults] = useState<TurnTestResult[]>([])

  const [testServers, setTestServers] = useState<TurnTestServer[]>([])

  const runDiagnostics = async () => {
    setIsRunning(true)
    setProgress(0)
    setResults([])

    const newResults: TurnTestResult[] = []

    let turnIceServer: RTCIceServer
    let fetchedServers: TurnTestServer[]
    try {
      const credentialPayload = await fetchTurnCredentials()
      turnIceServer = credentialPayload.iceServer
      fetchedServers = credentialPayload.testServers
      setTestServers(fetchedServers)
    } catch (error) {
      const failureMessage = getCredentialFailureMessage(error)
      const authFailureResult: TurnTestResult[] = testServers.map((server) => ({
        server: server.url,
        protocol: server.protocol,
        success: false,
        latency: null,
        failureType: "auth",
        telemetryTags: [TURN_AUTH_FAILURE_TAG],
        error: failureMessage,
      }))

      setResults(authFailureResult)
      setProgress(100)
      setIsRunning(false)

      emitDiagnosticsTelemetry("turn_credentials_fetch_failed", [TURN_AUTH_FAILURE_TAG], {
        reason: failureMessage,
        serverCount: testServers.length,
      })

      toast({
        title: "TURN Credentials Unavailable",
        description: "Could not fetch secure TURN credentials. Please sign in again or retry shortly.",
        variant: "destructive",
      })

      return
    }

    for (let i = 0; i < fetchedServers.length; i++) {
      const server = fetchedServers[i]
      setProgress(Math.round((i / fetchedServers.length) * 100))

      try {
        const result = await testTurnServer(turnIceServer, server.url, server.protocol)
        newResults.push(result)
      } catch (error) {
        emitDiagnosticsTelemetry("turn_connectivity_test_unhandled_error", [TURN_CONNECTIVITY_FAILURE_TAG], {
          protocol: server.protocol,
          message: error instanceof Error ? error.message : "unknown",
        })
        newResults.push({
          server: server.url,
          protocol: server.protocol,
          success: false,
          latency: null,
          failureType: "connectivity",
          telemetryTags: [TURN_CONNECTIVITY_FAILURE_TAG],
          error: "TURN connectivity test failed unexpectedly",
        })
      }

      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    setResults(newResults)
    setProgress(100)
    setIsRunning(false)

    const successCount = newResults.filter((r) => r.success).length
    if (successCount === 0) {
      toast({
        title: "TURN Server Test Failed",
        description: "All TURN servers are unreachable. NAT traversal may not work properly.",
        variant: "destructive",
      })
    } else if (successCount < fetchedServers.length) {
      toast({
        title: "Some TURN Servers Available",
        description: `${successCount} of ${fetchedServers.length} TURN servers are working.`,
      })
    } else {
      toast({
        title: "All TURN Servers Available",
        description: "TURN server connectivity is excellent.",
      })
    }
  }

  const fetchTurnCredentials = async (): Promise<{ iceServer: RTCIceServer; testServers: TurnTestServer[] }> => {
    const response = await fetch("/api/turn-credentials", {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("auth_required")
      }

      if (response.status === 429) {
        throw new Error("rate_limited")
      }

      throw new Error("credential_request_failed")
    }

    const payload = (await response.json()) as TurnCredentialApiResponse
    const relayTurnServer = payload.iceServers.find((server) => {
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
      return urls.some((url) => String(url).startsWith("turn"))
    })

    if (!relayTurnServer?.username || !relayTurnServer?.credential) {
      throw new Error("credential_payload_invalid")
    }

    const urls = Array.isArray(relayTurnServer.urls) ? relayTurnServer.urls : [relayTurnServer.urls]
    const servers = urls
      .filter(Boolean)
      .map((url) => String(url))
      .map((url) => ({
        url,
        protocol: url.startsWith("turns:") ? "TLS" : url.includes("transport=tcp") ? "TCP" : "UDP",
      }))

    if (servers.length === 0) {
      throw new Error("credential_payload_invalid")
    }

    return { iceServer: relayTurnServer, testServers: servers }
  }

  const getCredentialFailureMessage = (error: unknown) => {
    if (error instanceof Error) {
      if (error.message === "auth_required") {
        return "Authentication required to fetch TURN credentials"
      }
      if (error.message === "rate_limited") {
        return "TURN credential request is temporarily rate-limited"
      }
    }

    return "Secure TURN credentials are unavailable"
  }

  const testTurnServer = async (
    turnServer: RTCIceServer,
    serverUrl: string,
    protocol: string,
  ): Promise<TurnTestResult> => {
    return new Promise((resolve, reject) => {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [
            {
              urls: serverUrl,
              username: turnServer.username,
              credential: turnServer.credential,
            },
          ],
          iceTransportPolicy: "relay", // Force TURN usage
        })

        const startTime = performance.now()
        let candidateFound = false
        let timeout: NodeJS.Timeout

        pc.onicecandidate = (event) => {
          if (event.candidate && event.candidate.type === "relay") {
            candidateFound = true
            const latency = performance.now() - startTime

            clearTimeout(timeout)
            pc.close()

            resolve({
              server: serverUrl,
              protocol,
              success: true,
              latency,
            })
          }
        }

        pc.onicecandidateerror = (event: any) => {
          // Only fail if this is for our TURN server
          if (event.url && event.url.includes(serverUrl)) {
            clearTimeout(timeout)
            pc.close()

            resolve({
              server: serverUrl,
              protocol,
              success: false,
              latency: null,
              failureType: "connectivity",
              telemetryTags: [TURN_CONNECTIVITY_FAILURE_TAG],
              error: "TURN server connectivity failed",
            })

            emitDiagnosticsTelemetry("turn_connectivity_test_failed", [TURN_CONNECTIVITY_FAILURE_TAG], {
              protocol,
              errorCode: typeof event.errorCode === "number" ? event.errorCode : "unknown",
            })
          }
        }

        // Set a timeout for the test
        timeout = setTimeout(() => {
          pc.close()
          if (!candidateFound) {
            resolve({
              server: serverUrl,
              protocol,
              success: false,
              latency: null,
              failureType: "connectivity",
              telemetryTags: [TURN_CONNECTIVITY_FAILURE_TAG],
              error: "Timeout waiting for relay candidate",
            })

            emitDiagnosticsTelemetry("turn_connectivity_test_timeout", [TURN_CONNECTIVITY_FAILURE_TAG], {
              protocol,
              timeoutMs: 5000,
            })
          }
        }, 5000)

        // Create a data channel to trigger ICE gathering
        pc.createDataChannel("turnTest")

        // Create an offer to start the ICE gathering process
        pc.createOffer()
          .then((offer) => pc.setLocalDescription(offer))
          .catch((error) => {
            clearTimeout(timeout)
            pc.close()
            reject(error)
          })
      } catch (error) {
        reject(error)
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Network className="h-5 w-5 text-purple-500" />
            TURN Server Diagnostics
          </CardTitle>
          <Button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <Server className="h-4 w-4 mr-2" />
                Test TURN Servers
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isRunning && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span>Testing TURN servers...</span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {results.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Test Results</h3>

            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    result.success
                      ? "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                      : "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}

                    <div>
                      <div className="text-sm font-medium">{getServerLabel(result.server)}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Badge variant="outline" className="text-xs h-5 px-1">
                          {result.protocol}
                        </Badge>
                        {result.error && <span className="text-red-500">{result.error}</span>}
                      </div>
                    </div>
                  </div>

                  {result.success && result.latency && (
                    <div className="text-sm font-medium">{Math.round(result.latency)} ms</div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground pt-2">
              {results.filter((r) => r.success).length} of {results.length} TURN servers available
            </div>
          </div>
        )}

        {!isRunning && results.length === 0 && (
          <div className="text-center py-8">
            <Server className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">TURN Server Testing</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Test connectivity to TURN servers to ensure reliable NAT traversal for WebRTC connections.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
