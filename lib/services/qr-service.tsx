"use client"

import { QrCode, Smartphone, Wifi, User, Globe } from "lucide-react"
import QRCode from "qrcode"

export interface UPIData {
  payeeAddress: string
  payeeName?: string
  amount?: number
  currency?: string
  transactionNote?: string
  transactionRef?: string
  merchantCode?: string
  url?: string
}

export interface QRCodeData {
  type: "UPI" | "URL" | "TEXT" | "WIFI" | "CONTACT"
  data: any
  rawData: string
}

export interface QRScanResult {
  data: string
  timestamp: Date
  format?: string
  parsedData?: QRCodeData
}

type QRHistoryPersistenceMode = "local_storage" | "memory_ephemeral"

type QRScanInput = string | Blob | File | ImageData | HTMLImageElement | HTMLCanvasElement | HTMLVideoElement

const QR_SCAN_ERRORS = {
  unreadableInput: "UNREADABLE_QR_INPUT",
  noCodeFound: "QR_CODE_NOT_FOUND",
  unsupportedEnvironment: "QR_SCANNER_NOT_SUPPORTED",
  invalidPayload: "INVALID_QR_PAYLOAD",
} as const

export interface QRGenerateOptions {
  size?: number
  errorCorrectionLevel?: "L" | "M" | "Q" | "H"
  margin?: number
  color?: {
    dark?: string
    light?: string
  }
}

export class QrService {
  private static instance: QrService
  private scanHistory: QRScanResult[] = []
  private readonly maxHistoryEntries = 100
  private readonly scanHistoryStorageKey = "runash.qr.scanHistory"
  private readonly historyPersistenceMode: QRHistoryPersistenceMode

  private constructor() {
    this.historyPersistenceMode = this.canUseLocalStorage() ? "local_storage" : "memory_ephemeral"
    this.scanHistory = this.loadPersistedHistory()
  }

  static getInstance(): QrService {
    if (!QrService.instance) {
      QrService.instance = new QrService()
    }
    return QrService.instance
  }

  /**
   * Parse UPI QR code data
   */
  parseUPIData(qrData: string): UPIData | null {
    return this.parseUPIDataWithValidation(qrData).data
  }

  private parseUPIDataWithValidation(qrData: string): { data: UPIData | null } {
    try {
      const normalized = qrData.trim()
      if (!normalized.toLowerCase().startsWith("upi://pay?")) {
        return { data: null }
      }

      const url = new URL(normalized)
      if (url.protocol.toLowerCase() !== "upi:" || url.hostname.toLowerCase() !== "pay") {
        return { data: null }
      }

      const params = url.searchParams
      const payeeAddress = params.get("pa")?.trim() || ""

      if (!this.validateUPIId(payeeAddress)) {
        return { data: null }
      }

      const rawAmount = params.get("am")
      const parsedAmount = rawAmount ? Number.parseFloat(rawAmount) : undefined

      if (rawAmount && (!Number.isFinite(parsedAmount) || parsedAmount <= 0)) {
        return { data: null }
      }

      const currency = (params.get("cu") || "INR").toUpperCase()
      if (!/^[A-Z]{3}$/.test(currency)) {
        return { data: null }
      }

      return {
        data: {
          payeeAddress,
          payeeName: params.get("pn") || undefined,
          amount: parsedAmount,
          currency,
          transactionNote: params.get("tn") || undefined,
          transactionRef: params.get("tr") || undefined,
          merchantCode: params.get("mc") || undefined,
          url: normalized,
        },
      }
    } catch {
      return { data: null }
    }
  }

  private isValidDecodedPayload(payload: string): boolean {
    if (!payload || typeof payload !== "string") {
      return false
    }

    const isUPIPayload = payload.trim().toLowerCase().startsWith("upi://pay?")
    if (!isUPIPayload) {
      return true
    }

    return Boolean(this.parseUPIDataWithValidation(payload).data)
  }

  /**
   * Generate UPI QR code data string
   */
  generateUPIData(data: UPIData): string {
    const params = new URLSearchParams()

    params.set("pa", data.payeeAddress)
    if (data.payeeName) params.set("pn", data.payeeName)
    if (data.amount) params.set("am", data.amount.toString())
    if (data.currency) params.set("cu", data.currency)
    if (data.transactionNote) params.set("tn", data.transactionNote)
    if (data.transactionRef) params.set("tr", data.transactionRef)
    if (data.merchantCode) params.set("mc", data.merchantCode)

    return `upi://pay?${params.toString()}`
  }

  /**
   * Parse any QR code data and determine its type
   */
  parseQRData(qrData: string): QRCodeData {
    const lowerData = qrData.toLowerCase()

    // UPI Payment
    if (lowerData.startsWith("upi://pay?")) {
      const upiData = this.parseUPIData(qrData)
      return {
        type: "UPI",
        data: upiData,
        rawData: qrData,
      }
    }

    // URL
    if (lowerData.startsWith("http://") || lowerData.startsWith("https://")) {
      return {
        type: "URL",
        data: { url: qrData },
        rawData: qrData,
      }
    }

    // WiFi
    if (lowerData.startsWith("wifi:")) {
      const wifiData = this.parseWiFiData(qrData)
      return {
        type: "WIFI",
        data: wifiData,
        rawData: qrData,
      }
    }

    // Contact (vCard)
    if (lowerData.startsWith("begin:vcard")) {
      const contactData = this.parseContactData(qrData)
      return {
        type: "CONTACT",
        data: contactData,
        rawData: qrData,
      }
    }

    // Default to text
    return {
      type: "TEXT",
      data: { text: qrData },
      rawData: qrData,
    }
  }

  /**
   * Parse WiFi QR code data
   */
  private parseWiFiData(qrData: string) {
    const match = qrData.match(/WIFI:T:([^;]*);S:([^;]*);P:([^;]*);H:([^;]*);?/)
    if (match) {
      return {
        type: match[1],
        ssid: match[2],
        password: match[3],
        hidden: match[4] === "true",
      }
    }
    return { raw: qrData }
  }

  /**
   * Parse contact (vCard) QR code data
   */
  private parseContactData(qrData: string) {
    const lines = qrData.split("\n")
    const contact: any = {}

    lines.forEach((line) => {
      if (line.startsWith("FN:")) contact.name = line.substring(3)
      if (line.startsWith("TEL:")) contact.phone = line.substring(4)
      if (line.startsWith("EMAIL:")) contact.email = line.substring(6)
      if (line.startsWith("ORG:")) contact.organization = line.substring(4)
    })

    return contact
  }

  /**
   * Get icon for QR code type
   */
  getQRIcon(type: QRCodeData["type"]) {
    switch (type) {
      case "UPI":
        return Smartphone
      case "URL":
        return Globe
      case "WIFI":
        return Wifi
      case "CONTACT":
        return User
      default:
        return QrCode
    }
  }

  /**
   * Get display title for QR code type
   */
  getQRTitle(data: QRCodeData): string {
    switch (data.type) {
      case "UPI":
        return data.data?.payeeName || data.data?.payeeAddress || "UPI Payment"
      case "URL":
        return "Website Link"
      case "WIFI":
        return `WiFi: ${data.data?.ssid || "Network"}`
      case "CONTACT":
        return data.data?.name || "Contact"
      default:
        return "QR Code"
    }
  }

  /**
   * Get display description for QR code type
   */
  getQRDescription(data: QRCodeData): string {
    switch (data.type) {
      case "UPI":
        const amount = data.data?.amount
        return amount ? `₹${amount.toLocaleString("en-IN")}` : "Tap to pay"
      case "URL":
        return data.data?.url || ""
      case "WIFI":
        return "Tap to connect"
      case "CONTACT":
        return data.data?.phone || data.data?.email || "Contact information"
      default:
        return data.rawData.length > 50 ? data.rawData.substring(0, 50) + "..." : data.rawData
    }
  }

  /**
   * Validate UPI ID format with comprehensive rules
   */
  validateUPIId(upiId: string): boolean {
    if (!upiId || typeof upiId !== "string") {
      return false
    }

    // Trim whitespace
    upiId = upiId.trim()

    // Must contain exactly one @ symbol
    const atCount = (upiId.match(/@/g) || []).length
    if (atCount !== 1) {
      return false
    }

    const [username, domain] = upiId.split("@")

    // Both parts must exist and not be empty
    if (!username || !domain) {
      return false
    }

    // Username validation
    if (!this.validateUPIUsername(username)) {
      return false
    }

    // Domain validation
    if (!this.validateUPIDomain(domain)) {
      return false
    }

    return true
  }

  /**
   * Validate UPI username part
   */
  private validateUPIUsername(username: string): boolean {
    // Cannot be empty
    if (!username) return false

    // Cannot start or end with dot
    if (username.startsWith(".") || username.endsWith(".")) return false

    // Can only contain letters, numbers, dots, underscores, and hyphens
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) return false

    // Cannot have consecutive dots
    if (username.includes("..")) return false

    return true
  }

  /**
   * Validate UPI domain part
   */
  private validateUPIDomain(domain: string): boolean {
    // Cannot be empty
    if (!domain) return false

    // Cannot start or end with dot or hyphen
    if (domain.startsWith(".") || domain.endsWith(".") || domain.startsWith("-") || domain.endsWith("-")) return false

    // Can only contain letters, numbers, dots, and hyphens
    if (!/^[a-zA-Z0-9.-]+$/.test(domain)) return false

    // Cannot have consecutive dots
    if (domain.includes("..")) return false

    // Must contain at least one letter (not just numbers and symbols)
    if (!/[a-zA-Z]/.test(domain)) return false

    return true
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency = "INR"): string {
    if (currency === "INR") {
      return `₹${amount.toLocaleString("en-IN")}`
    }
    return `${amount.toLocaleString()} ${currency}`
  }

  /**
   * Generate QR code for payment request
   */
  generatePaymentQR(data: {
    upiId: string
    name?: string
    amount?: number
    note?: string
  }): string {
    const upiData: UPIData = {
      payeeAddress: data.upiId,
      payeeName: data.name,
      amount: data.amount,
      currency: "INR",
      transactionNote: data.note,
      transactionRef: `TXN${Date.now()}`,
    }

    return this.generateUPIData(upiData)
  }

  /**
   * Generate QR code data URL using qrcode encoder
   */
  async generateQR(data: string, options?: QRGenerateOptions): Promise<string> {
    return QRCode.toDataURL(data, {
      width: options?.size ?? 256,
      errorCorrectionLevel: options?.errorCorrectionLevel ?? "M",
      margin: options?.margin ?? 1,
      color: {
        dark: options?.color?.dark ?? "#000000",
        light: options?.color?.light ?? "#FFFFFF",
      },
    })
  }

  /**
   * Generate UPI QR code
   */
  async generateUPIQR(
    upiId: string,
    amount?: number,
    name?: string,
    note?: string,
    options?: QRGenerateOptions,
  ): Promise<string> {
    const upiData = this.generatePaymentQR({ upiId, name, amount, note })
    return this.generateQR(upiData, options)
  }

  /**
   * Scan QR code from image/camera input using BarcodeDetector
   */
  async scanQR(imageData?: QRScanInput): Promise<QRScanResult> {
    const source = await this.resolveImageSource(imageData)
    if (!source) {
      throw new Error(QR_SCAN_ERRORS.unreadableInput)
    }

    const detectorConstructor = globalThis.BarcodeDetector as
      | (new (options?: { formats?: string[] }) => { detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string; format?: string }>> })
      | undefined

    if (!detectorConstructor) {
      throw new Error(QR_SCAN_ERRORS.unsupportedEnvironment)
    }

    const detector = new detectorConstructor({ formats: ["qr_code"] })
    const codes = await detector.detect(source)
    const detectedCode = codes.find((code) => typeof code.rawValue === "string" && code.rawValue.length > 0)

    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
      source.close()
    }

    if (!detectedCode?.rawValue) {
      throw new Error(QR_SCAN_ERRORS.noCodeFound)
    }

    if (!this.isValidDecodedPayload(detectedCode.rawValue)) {
      throw new Error(QR_SCAN_ERRORS.invalidPayload)
    }

    const result: QRScanResult = {
      data: detectedCode.rawValue,
      timestamp: new Date(),
      format: detectedCode.format,
      parsedData: this.parseQRData(detectedCode.rawValue),
    }

    this.appendToHistory(result)
    return result
  }

  private async resolveImageSource(imageData?: QRScanInput): Promise<ImageBitmapSource | null> {
    if (!imageData) {
      return null
    }

    if (typeof imageData === "string") {
      try {
        const response = await fetch(imageData)
        if (!response.ok) {
          return null
        }

        const blob = await response.blob()
        return createImageBitmap(blob)
      } catch {
        return null
      }
    }

    if (imageData instanceof Blob || imageData instanceof File) {
      try {
        return await createImageBitmap(imageData)
      } catch {
        return null
      }
    }

    return imageData
  }

  /**
   * Get scan history
   */
  getScanHistory(): QRScanResult[] {
    return [...this.scanHistory]
  }

  getScanHistoryPersistenceMode(): QRHistoryPersistenceMode {
    return this.historyPersistenceMode
  }

  /**
   * Clear scan history
   */
  clearHistory(): void {
    this.scanHistory = []
    this.persistHistory()
  }

  private appendToHistory(result: QRScanResult): void {
    this.scanHistory = [result, ...this.scanHistory].slice(0, this.maxHistoryEntries)
    this.persistHistory()
  }

  private canUseLocalStorage(): boolean {
    return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
  }

  private loadPersistedHistory(): QRScanResult[] {
    if (!this.canUseLocalStorage()) {
      return []
    }

    try {
      const raw = window.localStorage.getItem(this.scanHistoryStorageKey)
      if (!raw) {
        return []
      }

      const parsed = JSON.parse(raw) as Array<QRScanResult & { timestamp: string }>
      return parsed
        .map((entry) => ({
          ...entry,
          timestamp: new Date(entry.timestamp),
        }))
        .filter((entry) => !Number.isNaN(entry.timestamp.getTime()))
        .slice(0, this.maxHistoryEntries)
    } catch {
      return []
    }
  }

  private persistHistory(): void {
    if (!this.canUseLocalStorage()) {
      return
    }

    try {
      window.localStorage.setItem(this.scanHistoryStorageKey, JSON.stringify(this.scanHistory))
    } catch {
      // Best effort persistence; in-memory history still works when storage quota/privacy constraints apply.
    }
  }

  // Static methods for backward compatibility
  static parseUPIData = (qrData: string) => QrService.getInstance().parseUPIData(qrData)
  static generateUPIData = (data: UPIData) => QrService.getInstance().generateUPIData(data)
  static parseQRData = (qrData: string) => QrService.getInstance().parseQRData(qrData)
  static getQRIcon = (type: QRCodeData["type"]) => QrService.getInstance().getQRIcon(type)
  static getQRTitle = (data: QRCodeData) => QrService.getInstance().getQRTitle(data)
  static getQRDescription = (data: QRCodeData) => QrService.getInstance().getQRDescription(data)
  static isValidUPIId = (upiId: string) => QrService.getInstance().validateUPIId(upiId)
  static formatAmount = (amount: number, currency?: string) => QrService.getInstance().formatAmount(amount, currency)
  static generatePaymentQR = (data: { upiId: string; name?: string; amount?: number; note?: string }) =>
    QrService.getInstance().generatePaymentQR(data)
}

// React Hook for QR Service
export function useQRService() {
  const qrService = QrService.getInstance()

  return {
    // Service methods
    parseUPIData: qrService.parseUPIData.bind(qrService),
    generateUPIData: qrService.generateUPIData.bind(qrService),
    parseQRData: qrService.parseQRData.bind(qrService),
    getQRIcon: qrService.getQRIcon.bind(qrService),
    getQRTitle: qrService.getQRTitle.bind(qrService),
    getQRDescription: qrService.getQRDescription.bind(qrService),
    validateUPIId: qrService.validateUPIId.bind(qrService),
    formatAmount: qrService.formatAmount.bind(qrService),
    generatePaymentQR: qrService.generatePaymentQR.bind(qrService),
    generateQR: qrService.generateQR.bind(qrService),
    generateUPIQR: qrService.generateUPIQR.bind(qrService),
    scanQR: qrService.scanQR.bind(qrService),
    getScanHistory: qrService.getScanHistory.bind(qrService),
    clearHistory: qrService.clearHistory.bind(qrService),
    getScanHistoryPersistenceMode: qrService.getScanHistoryPersistenceMode.bind(qrService),
  }
}

// Named exports for individual functions
export const parseUPIData = QrService.parseUPIData
export const generateUPIData = QrService.generateUPIData
export const parseQRData = QrService.parseQRData
export const getQRIcon = QrService.getQRIcon
export const getQRTitle = QrService.getQRTitle
export const getQRDescription = QrService.getQRDescription
export const isValidUPIId = QrService.isValidUPIId
export const formatAmount = QrService.formatAmount
export const generatePaymentQR = QrService.generatePaymentQR
export const qrScanErrors = QR_SCAN_ERRORS

// Default export
export default QrService
