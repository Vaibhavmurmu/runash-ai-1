export type ArPlatform = "webxr" | "quick_look" | "scene_viewer"

export interface ArCapabilities {
  webxr: boolean
  quickLook: boolean
  sceneViewer: boolean
  supported: boolean
  hint: string
  userAgent: string
}

export async function detectArCapabilities(): Promise<ArCapabilities> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return {
      webxr: false,
      quickLook: false,
      sceneViewer: false,
      supported: false,
      hint: "AR detection is available on supported devices after page load.",
      userAgent: "server",
    }
  }

  const ua = navigator.userAgent
  const isiOS = /iPhone|iPad|iPod/i.test(ua)
  const isAndroid = /Android/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|CriOS|Edg/i.test(ua)

  let webxr = false
  try {
    webxr = Boolean(navigator.xr && (await navigator.xr.isSessionSupported("immersive-ar")))
  } catch {
    webxr = false
  }

  const quickLook = isiOS && isSafari
  const sceneViewer = isAndroid
  const supported = webxr || quickLook || sceneViewer

  const hint = supported
    ? webxr
      ? "WebXR AR is supported on this device/browser."
      : quickLook
        ? "Use Apple Quick Look (Safari on iOS/iPadOS) for AR placement."
        : "Use Google Scene Viewer on Android for AR placement."
    : "AR is not available on this device/browser. Use 3D preview or media images instead."

  return {
    webxr,
    quickLook,
    sceneViewer,
    supported,
    hint,
    userAgent: ua,
  }
}

export function getArLaunchUrl(modelUrl: string, capabilities: ArCapabilities): string | null {
  if (capabilities.quickLook) {
    return `${modelUrl}#allowsContentScaling=1&quicklook=1`
  }
  if (capabilities.sceneViewer) {
    return `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(modelUrl)}&mode=ar_only#Intent;scheme=https;package=com.google.android.googlequicksearchbox;end;`
  }
  if (capabilities.webxr) {
    return modelUrl
  }
  return null
}

