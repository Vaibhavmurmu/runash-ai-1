import assert from "node:assert/strict"
import test from "node:test"
import { QrService, qrScanErrors } from "./qr-service"

const SAMPLE_UPI_PAYLOAD = "upi://pay?pa=merchant@upi&pn=RunAsh%20Store&am=149.99&cu=INR&tn=Order%20Payment"

test("generateQR + scanQR decodes valid UPI and stores scan history", async () => {
  const service = QrService.getInstance()
  service.clearHistory()

  const globalAny = globalThis as any
  const originalBarcodeDetector = globalAny.BarcodeDetector
  const originalCreateImageBitmap = globalAny.createImageBitmap
  const originalFetch = globalAny.fetch

  let detectedPayload: string | undefined

  globalThis.fetch = async () =>
    ({
      ok: true,
      blob: async () => new Blob(["round-trip"]),
    }) as Response

  globalAny.createImageBitmap = async () => ({ source: "image" }) as unknown as ImageBitmap

  class BarcodeDetectorMock {
    async detect() {
      return [{ rawValue: detectedPayload, format: "qr_code" }]
    }
  }

  globalAny.BarcodeDetector = BarcodeDetectorMock as any

  try {
    const dataUrl = await service.generateQR(SAMPLE_UPI_PAYLOAD)
    assert.ok(dataUrl.startsWith("data:image/png;base64,"))

    detectedPayload = SAMPLE_UPI_PAYLOAD
    const scanned = await service.scanQR(dataUrl)

    assert.equal(scanned.data, SAMPLE_UPI_PAYLOAD)
    assert.equal(scanned.parsedData?.type, "UPI")
    assert.equal(scanned.parsedData?.data?.payeeAddress, "merchant@upi")

    const history = service.getScanHistory()
    assert.equal(history.length, 1)
    assert.equal(history[0]?.data, SAMPLE_UPI_PAYLOAD)
    assert.equal(service.getScanHistoryPersistenceMode(), "memory_ephemeral")
  } finally {
    globalAny.BarcodeDetector = originalBarcodeDetector
    globalAny.createImageBitmap = originalCreateImageBitmap
    globalAny.fetch = originalFetch
    service.clearHistory()
  }
})

test("scanQR decodes non-UPI QR payloads as generic types", async () => {
  const service = QrService.getInstance()

  const originalBarcodeDetector = globalAny.BarcodeDetector
  const originalCreateImageBitmap = globalAny.createImageBitmap

  globalAny.createImageBitmap = async () => ({ source: "image" }) as unknown as ImageBitmap

  class BarcodeDetectorMock {
    async detect() {
      return [{ rawValue: "https://runash.in/pay", format: "qr_code" }]
    }
  }

  globalAny.BarcodeDetector = BarcodeDetectorMock as any

  try {
    const scanned = await service.scanQR(new Blob(["non-upi"]))
    assert.equal(scanned.parsedData?.type, "URL")
    assert.equal(scanned.parsedData?.data?.url, "https://runash.in/pay")
  } finally {
    globalAny.BarcodeDetector = originalBarcodeDetector
    globalAny.createImageBitmap = originalCreateImageBitmap
  }
})

test("scanQR returns deterministic errors for unreadable image inputs", async () => {
  const service = QrService.getInstance()
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => ({ ok: false }) as Response

  try {
    await assert.rejects(() => service.scanQR("https://example.com/missing.png"), {
      message: qrScanErrors.unreadableInput,
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test("scanQR returns deterministic decode failure when QR cannot be decoded", async () => {
  const service = QrService.getInstance()
  const originalBarcodeDetector = globalAny.BarcodeDetector
  const originalCreateImageBitmap = globalAny.createImageBitmap

  globalAny.createImageBitmap = async () => ({ source: "image" }) as unknown as ImageBitmap

  class BarcodeDetectorMock {
    async detect() {
      return []
    }
  }

  globalAny.BarcodeDetector = BarcodeDetectorMock as any

  try {
    await assert.rejects(() => service.scanQR(new Blob(["empty"])), {
      message: qrScanErrors.noCodeFound,
    })
  } finally {
    globalAny.BarcodeDetector = originalBarcodeDetector
    globalAny.createImageBitmap = originalCreateImageBitmap
  }
})

test("parseUPIData strictly validates malformed UPI payloads", () => {
  const service = QrService.getInstance()

  assert.equal(service.parseUPIData("http://example.com"), null)
  assert.equal(service.parseUPIData("upi://pay?pn=NoPayee"), null)
  assert.equal(service.parseUPIData("upi://pay?pa=merchant@upi&am=nan"), null)
  assert.equal(service.parseUPIData("upi://pay?pa=merchant@upi&cu=RUPEE"), null)

  const validPayload = service.parseUPIData(SAMPLE_UPI_PAYLOAD)
  assert.equal(validPayload?.payeeAddress, "merchant@upi")
  assert.equal(validPayload?.amount, 149.99)
  assert.equal(validPayload?.currency, "INR")
})

