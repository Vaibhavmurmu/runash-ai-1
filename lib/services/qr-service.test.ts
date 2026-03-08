import assert from "node:assert/strict"
import test from "node:test"
import { QrService, qrScanErrors } from "./qr-service"

const SAMPLE_UPI_PAYLOAD = "upi://pay?pa=merchant@upi&pn=RunAsh%20Store&am=149.99&cu=INR&tn=Order%20Payment"

test("generateQR + scanQR round-trip decodes a scannable payload", async () => {
  const service = QrService.getInstance()
  const originalBarcodeDetector = globalThis.BarcodeDetector
  const originalCreateImageBitmap = globalThis.createImageBitmap
  const originalFetch = globalThis.fetch

  let detectedPayload: string | undefined

  globalThis.fetch = async () =>
    ({
      ok: true,
      blob: async () => new Blob(["round-trip"]),
    }) as Response

  globalThis.createImageBitmap = async () => ({ source: "image" }) as ImageBitmap

  class BarcodeDetectorMock {
    async detect() {
      return [{ rawValue: detectedPayload, format: "qr_code" }]
    }
  }

  globalThis.BarcodeDetector = BarcodeDetectorMock as unknown as typeof BarcodeDetector

  try {
    const dataUrl = await service.generateQR(SAMPLE_UPI_PAYLOAD)
    assert.ok(dataUrl.startsWith("data:image/png;base64,"))

    detectedPayload = SAMPLE_UPI_PAYLOAD
    const scanned = await service.scanQR(dataUrl)

    assert.equal(scanned.data, SAMPLE_UPI_PAYLOAD)
    assert.equal(scanned.parsedData?.type, "UPI")
    assert.equal(scanned.parsedData?.data?.payeeAddress, "merchant@upi")
  } finally {
    globalThis.BarcodeDetector = originalBarcodeDetector
    globalThis.createImageBitmap = originalCreateImageBitmap
    globalThis.fetch = originalFetch
  }
})

test("scanQR returns deterministic errors for unreadable input and no code found", async () => {
  const service = QrService.getInstance()
  const originalBarcodeDetector = globalThis.BarcodeDetector
  const originalCreateImageBitmap = globalThis.createImageBitmap
  const originalFetch = globalThis.fetch

  globalThis.fetch = async () => ({ ok: false }) as Response
  globalThis.createImageBitmap = async () => ({ source: "image" }) as ImageBitmap

  class BarcodeDetectorMock {
    async detect() {
      return []
    }
  }

  globalThis.BarcodeDetector = BarcodeDetectorMock as unknown as typeof BarcodeDetector

  try {
    await assert.rejects(() => service.scanQR("https://example.com/not-found.png"), {
      message: qrScanErrors.unreadableInput,
    })

    await assert.rejects(() => service.scanQR(new Blob(["empty"])), {
      message: qrScanErrors.noCodeFound,
    })
  } finally {
    globalThis.BarcodeDetector = originalBarcodeDetector
    globalThis.createImageBitmap = originalCreateImageBitmap
    globalThis.fetch = originalFetch
  }
})

test("parseUPIData handles payload edge-cases without changing existing parser behavior", () => {
  const service = QrService.getInstance()

  const invalidScheme = service.parseUPIData("http://example.com")
  assert.equal(invalidScheme, null)

  const missingPayee = service.parseUPIData("upi://pay?pn=NoPayee")
  assert.equal(missingPayee?.payeeAddress, "")
  assert.equal(missingPayee?.currency, "INR")

  const invalidAmount = service.parseUPIData("upi://pay?pa=merchant@upi&am=nan")
  assert.ok(Number.isNaN(invalidAmount?.amount))

  const validPayload = service.parseUPIData(SAMPLE_UPI_PAYLOAD)
  assert.equal(validPayload?.payeeAddress, "merchant@upi")
  assert.equal(validPayload?.amount, 149.99)
  assert.equal(validPayload?.currency, "INR")
})
