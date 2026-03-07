export type MediaAssetKind = "video" | "audio" | "image"
export type MediaAssetStatus = "initiated" | "uploaded" | "processing" | "ready" | "failed"

export type MediaVariantType =
  | "source"
  | "hls_manifest"
  | "dash_manifest"
  | "mp4_1080p"
  | "mp4_720p"
  | "mp4_480p"
  | "audio_preview"
  | "poster"
  | "waveform"

export interface VariantMetadata {
  width?: number | null
  height?: number | null
  bitrateKbps?: number | null
  durationSeconds?: number | null
  codecVideo?: string | null
  codecAudio?: string | null
  frameRate?: number | null
  channels?: number | null
  sampleRate?: number | null
}
