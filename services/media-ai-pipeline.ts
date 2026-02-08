"use client"

import { SpeechRecognitionService, type SpeechRecognitionResult } from "@/services/speech-recognition-service"

export type PipelineQualityMode = "auto" | "performance" | "balanced" | "quality"

export interface MediaAIPipelineSettings {
  backgroundReplacement: boolean
  virtualBackgroundUrl: string | null
  autoFraming: boolean
  beautify: boolean
  lightCorrection: boolean
  audioDenoise: boolean
  captionsEnabled: boolean
  captionLanguage: string
  adaptiveQuality: boolean
  qualityMode: PipelineQualityMode
}

export interface CaptionPacket {
  text: string
  confidence: number
  isFinal: boolean
  language: string
  ts: number
}

export interface PipelineCapabilities {
  offscreenCanvas: boolean
  worker: boolean
  webSpeech: boolean
  mediaDevices: boolean
}

const STORAGE_KEY = "runash.stream.ai.pipeline"

export const defaultMediaAIPipelineSettings: MediaAIPipelineSettings = {
  backgroundReplacement: false,
  virtualBackgroundUrl: null,
  autoFraming: true,
  beautify: false,
  lightCorrection: true,
  audioDenoise: true,
  captionsEnabled: false,
  captionLanguage: "en-US",
  adaptiveQuality: true,
  qualityMode: "auto",
}

export class MediaAIPipeline {
  private recognizer = new SpeechRecognitionService()

  getCapabilities(): PipelineCapabilities {
    return {
      offscreenCanvas: typeof window !== "undefined" && "OffscreenCanvas" in window,
      worker: typeof window !== "undefined" && "Worker" in window,
      webSpeech: this.recognizer.isSupported(),
      mediaDevices: typeof navigator !== "undefined" && !!navigator.mediaDevices,
    }
  }

  restoreSettings(): MediaAIPipelineSettings {
    if (typeof window === "undefined") return defaultMediaAIPipelineSettings
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) return defaultMediaAIPipelineSettings
      return { ...defaultMediaAIPipelineSettings, ...JSON.parse(raw) }
    } catch {
      return defaultMediaAIPipelineSettings
    }
  }

  persistSettings(settings: MediaAIPipelineSettings) {
    if (typeof window === "undefined") return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  }

  resolveQualityScale(settings: MediaAIPipelineSettings): number {
    if (settings.qualityMode !== "auto") {
      if (settings.qualityMode === "performance") return 0.6
      if (settings.qualityMode === "balanced") return 0.8
      return 1
    }

    if (!settings.adaptiveQuality || typeof navigator === "undefined") return 0.9
    const cores = navigator.hardwareConcurrency || 4
    if (cores <= 2) return 0.55
    if (cores <= 4) return 0.75
    return 1
  }

  processVideoFrame(source: HTMLVideoElement, target: HTMLCanvasElement, settings: MediaAIPipelineSettings) {
    const ctx = target.getContext("2d")
    if (!ctx) return

    const sourceWidth = source.videoWidth || 1280
    const sourceHeight = source.videoHeight || 720
    const scale = this.resolveQualityScale(settings)

    target.width = Math.max(320, Math.floor(sourceWidth * scale))
    target.height = Math.max(180, Math.floor(sourceHeight * scale))

    const crop = this.getAutoFrameCrop(sourceWidth, sourceHeight, settings.autoFraming)

    ctx.save()
    ctx.filter = this.buildVideoFilter(settings)
    ctx.drawImage(source, crop.x, crop.y, crop.w, crop.h, 0, 0, target.width, target.height)

    if (settings.backgroundReplacement && settings.virtualBackgroundUrl) {
      const bg = new Image()
      bg.src = settings.virtualBackgroundUrl
      if (bg.complete) {
        ctx.globalCompositeOperation = "destination-over"
        ctx.drawImage(bg, 0, 0, target.width, target.height)
        ctx.globalCompositeOperation = "source-over"
      }
    }
    ctx.restore()
  }

  private getAutoFrameCrop(width: number, height: number, autoFraming: boolean) {
    if (!autoFraming) {
      return { x: 0, y: 0, w: width, h: height }
    }

    // Lightweight simulated body/face-aware crop window centered around upper-middle frame.
    const cropWidth = width * 0.82
    const cropHeight = height * 0.9
    const x = (width - cropWidth) / 2
    const y = Math.max(0, (height - cropHeight) / 2 - height * 0.06)

    return { x, y, w: cropWidth, h: cropHeight }
  }

  private buildVideoFilter(settings: MediaAIPipelineSettings) {
    const filters: string[] = []
    if (settings.beautify) filters.push("contrast(1.08)", "saturate(1.06)", "blur(0.4px)")
    if (settings.lightCorrection) filters.push("brightness(1.06)")
    return filters.length ? filters.join(" ") : "none"
  }

  async enhanceAudio(stream: MediaStream, enabled: boolean) {
    if (!enabled || typeof navigator === "undefined") return stream
    try {
      const [videoTrack] = stream.getVideoTracks()
      const [audioTrack] = stream.getAudioTracks()
      if (!audioTrack) return stream

      const denoisedStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
        video: false,
      })
      const [denoisedTrack] = denoisedStream.getAudioTracks()
      return new MediaStream([...(videoTrack ? [videoTrack] : []), ...(denoisedTrack ? [denoisedTrack] : [audioTrack])])
    } catch {
      return stream
    }
  }

  startCaptions(
    language: string,
    onCaption: (packet: CaptionPacket) => void,
    onError: (message: string) => void,
  ): (() => void) | null {
    if (this.recognizer.isSupported()) {
      this.recognizer.startListening(
        (result: SpeechRecognitionResult) => {
          onCaption({
            text: result.transcript,
            confidence: result.confidence,
            isFinal: result.isFinal,
            language,
            ts: Date.now(),
          })
        },
        onError,
      )
      return () => this.recognizer.stopListening()
    }

    // Server-side fallback polling hook.
    let active = true
    const interval = window.setInterval(async () => {
      if (!active) return
      try {
        const response = await fetch("/api/ai/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language }),
        })
        if (!response.ok) return
        const data = (await response.json()) as { text?: string }
        if (data.text) {
          onCaption({ text: data.text, confidence: 0.55, isFinal: true, language, ts: Date.now() })
        }
      } catch {
        onError("Live captions fallback unavailable")
      }
    }, 4000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }
}
