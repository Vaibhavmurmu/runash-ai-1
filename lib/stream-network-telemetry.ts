import { z } from "zod"

export const NETWORK_TELEMETRY_RETENTION_DAYS = 30

export const streamNetworkMetricSchema = z.object({
  bitrateKbps: z.number().finite().min(0).max(200_000),
  rttMs: z.number().finite().min(0).max(10_000),
  packetLossPct: z.number().finite().min(0).max(100),
  droppedFrames: z.number().int().min(0).max(500_000),
  reconnects: z.number().int().min(0).max(10_000),
  sampledAt: z.coerce.date().optional(),
})

export type StreamNetworkMetricInput = z.infer<typeof streamNetworkMetricSchema>
export type StreamHealthState = "excellent" | "good" | "fair" | "poor"

export function deriveStreamHealthState(input: Omit<StreamNetworkMetricInput, "sampledAt">): StreamHealthState {
  if (input.bitrateKbps < 1_200 || input.rttMs > 350 || input.packetLossPct > 5 || input.reconnects > 3) return "poor"
  if (input.bitrateKbps < 2_500 || input.rttMs > 220 || input.packetLossPct > 2.5 || input.reconnects > 1) return "fair"
  if (input.bitrateKbps < 4_000 || input.rttMs > 120 || input.packetLossPct > 1 || input.droppedFrames > 120) return "good"
  return "excellent"
}

export function calculateHealthScore(state: StreamHealthState) {
  switch (state) {
    case "excellent":
      return 95
    case "good":
      return 82
    case "fair":
      return 64
    default:
      return 38
  }
}
