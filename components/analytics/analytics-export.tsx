"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileSpreadsheet, FileText, ImageIcon } from "lucide-react"
import type { AnalyticsApiResponse, AnalyticsFilters } from "@/types/analytics"

interface AnalyticsExportProps {
  filters?: Partial<AnalyticsFilters>
}

type ExportRow = Record<string, string | number | null>
type AnalyticsFetchState = "idle" | "loading" | "success" | "empty" | "error"

const filenameSafe = (s: string) => s.replace(/[^a-z0-9._-]/gi, "-")

export function AnalyticsExport({ filters }: AnalyticsExportProps) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [fetchState, setFetchState] = useState<AnalyticsFetchState>("idle")
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchedData, setFetchedData] = useState<ExportRow[]>([])
  const [cachedSnapshot, setCachedSnapshot] = useState<ExportRow[]>([])
  const printableRef = useRef<HTMLDivElement | null>(null)

  const serializedFilters = useMemo(() => JSON.stringify(filters ?? {}), [filters])

  const cacheKey = useMemo(() => `analytics-export-cache:${serializedFilters}`, [serializedFilters])

  function readCachedSnapshot() {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem(cacheKey)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ExportRow[]) : []
    } catch {
      return []
    }
  }

  function writeCachedSnapshot(rows: ExportRow[]) {
    if (typeof window === "undefined") return
    try {
      localStorage.setItem(cacheKey, JSON.stringify(rows))
    } catch {
      // ignore local storage write failures
    }
  }

  const loadAnalytics = async () => {
    setFetchState("loading")
    setFetchError(null)
    setFetchedData([])

    const cached = readCachedSnapshot()
    setCachedSnapshot(cached)

    const params = new URLSearchParams()
    Object.entries(filters || {}).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return
      if (Array.isArray(v)) {
        if (v.length > 0) params.set(k, v.join(","))
        return
      }
      if (typeof v === "object") params.set(k, JSON.stringify(v))
      else params.set(k, String(v))
    })

    const res = await fetch(`/api/analytics?${params.toString()}`, { credentials: "include" })
    const body = (await res.json().catch(() => null)) as AnalyticsApiResponse | null

    if (!res.ok) {
      const explicitMessage =
        body && typeof body === "object" && "error" in body && body.error && typeof body.error.message === "string"
          ? body.error.message
          : `Analytics API request failed (${res.status}).`
      throw new Error(explicitMessage)
    }

    const rows = extractExportRows(body)
    setFetchedData(rows)
    setFetchState(rows.length ? "success" : "empty")
    if (rows.length > 0) {
      writeCachedSnapshot(rows)
      setCachedSnapshot(rows)
    }
  }

  useEffect(() => {
    let isCancelled = false

    loadAnalytics().catch((err) => {
      if (!isCancelled) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load analytics data for export."
        setFetchState("error")
        setFetchError(errorMessage)
      }
    })

    return () => {
      isCancelled = true
    }
  }, [filters, serializedFilters])

  function extractExportRows(payload: AnalyticsApiResponse | null): ExportRow[] {
    if (!payload || typeof payload !== "object") return []

    if (Array.isArray(payload)) {
      return payload.filter((row) => !!row && typeof row === "object") as ExportRow[]
    }

    if ("success" in payload) {
      if (!payload.success) {
        throw new Error(payload.error?.message || "Analytics API returned an error.")
      }
      const dailyRows = Array.isArray(payload.data?.daily) ? payload.data.daily : []
      return dailyRows.filter((row) => !!row && typeof row === "object") as ExportRow[]
    }

    const maybeDaily = "daily" in payload && Array.isArray(payload.daily) ? payload.daily : []
    return maybeDaily.filter((row) => !!row && typeof row === "object") as ExportRow[]
  }

  function csvFromArray(data: ExportRow[]) {
    if (!data || data.length === 0) return ""
    const keys = Array.from(Object.keys(data[0]))
    const lines = [keys.join(",")]
    for (const row of data) {
      const vals = keys.map((k) => {
        const v = row[k]
        if (v === null || v === undefined) return ""
        const s = String(v)
        if (s.includes(",") || s.includes('"') || s.includes("\n")) {
          return '"' + s.replace(/"/g, '""') + '"'
        }
        return s
      })
      lines.push(vals.join(","))
    }
    return lines.join("\n")
  }

  function downloadBlob(data: BlobPart, mime: string, suggestedName: string) {
    const blob = new Blob([data], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = suggestedName
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }

  async function exportCSV(data: ExportRow[]) {
    const csv = csvFromArray(data)
    if (!csv) throw new Error("No data to export")
    const nameParts = ["analytics", filters?.period?.label || "all", new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")]
    const name = filenameSafe(nameParts.join("-")) + ".csv"
    downloadBlob(csv, "text/csv;charset=utf-8;", name)
  }

  async function exportJSON(data: ExportRow[]) {
    const text = JSON.stringify({ filters: filters ?? {}, generatedAt: new Date().toISOString(), data }, null, 2)
    const nameParts = ["analytics", filters?.period?.label || "all", new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")]
    const name = filenameSafe(nameParts.join("-")) + ".json"
    downloadBlob(text, "application/json", name)
  }

  async function exportPDF(data: ExportRow[]) {
    const html = buildPrintableHtml(data)
    const win = window.open("", "_blank", "noopener,noreferrer")
    if (!win) {
      alert("Could not open a new window for PDF export. Please allow popups or try another format.")
      return
    }
    win.document.write(html)
    win.document.close()
    setTimeout(() => {
      win.focus()
      try {
        win.print()
      } catch {
        // ignore print block errors
      }
    }, 500)
  }

  async function exportImage(data: ExportRow[]) {
    const printable = printableRef.current
    if (!printable) {
      alert("Printable area not available for image export.")
      return
    }

    printable.innerHTML = ""
    const html = buildPrintableHtml(data)
    const win = window.open("", "_blank", "noopener,noreferrer")
    if (!win) {
      alert("Could not open a new window for image export. Please allow popups or try another format.")
      return
    }

    win.document.write(html)
    win.document.close()
    alert("Image export opened in a new tab. Use browser screenshot or Save As tools to capture the report image.")
  }

  function buildPrintableHtmlInner(data: ExportRow[]) {
    const cols = data.length ? Object.keys(data[0]) : []
    const head = `
      <style>
      body{ font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial; padding: 16px; color: #111827; }
      table{ border-collapse: collapse; width: 100%; }
      th, td{ padding: 8px 10px; border: 1px solid #e5e7eb; text-align: left; }
      th{ background: #f3f4f6; font-weight: 600; }
      caption{ font-weight:700; margin-bottom:8px; text-align:left; }
      </style>
    `
    const caption = `Analytics export — ${filters?.period?.label || "all periods"} — generated ${new Date().toLocaleString()}`
    const thead = `<thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`
    const tbody = `<tbody>${data
      .map(
        (r) =>
          `<tr>${cols
            .map((c) => `<td>${escapeHtml(String(r[c] ?? ""))}</td>`)
            .join("")}</tr>`,
      )
      .join("")}</tbody>`
    return `${head}<caption>${escapeHtml(caption)}</caption><table>${thead}${tbody}</table>`
  }

  function buildPrintableHtml(data: ExportRow[]) {
    return `<!doctype html><html><head><meta charset="utf-8"><title>Analytics export</title>${buildPrintableHtmlInner(
      data,
    )}</head><body style="margin:0;padding:16px;">${buildPrintableHtmlInner(data)}</body></html>`
  }

  function escapeHtml(s: string) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;")
  }

  async function handleExport(format: "csv" | "json" | "pdf" | "image") {
    const exportData = fetchState === "success" ? fetchedData : fetchState === "error" ? cachedSnapshot : []

    if (exportData.length === 0) {
      const messageByState: Record<Exclude<AnalyticsFetchState, "success">, string> = {
        idle: "Analytics data is not ready yet.",
        loading: "Analytics data is still loading. Please wait.",
        empty: "No analytics data available for the selected filters.",
        error: fetchError || "Cannot export because analytics data failed to load and no cached snapshot is available.",
      }
      alert(messageByState[fetchState])
      return
    }

    setExporting(format)
    try {
      if (format === "csv") await exportCSV(exportData)
      else if (format === "json") await exportJSON(exportData)
      else if (format === "pdf") await exportPDF(exportData)
      else if (format === "image") await exportImage(exportData)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      alert(`Export failed: ${message}`)
    } finally {
      setExporting(null)
    }
  }

  const exportDisabled = !!exporting || (fetchState !== "success" && cachedSnapshot.length === 0)

  return (
    <>
      <div ref={printableRef} style={{ position: "fixed", left: -9999, top: -9999, width: 1200 }} aria-hidden />

      <div className="flex flex-col items-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={exportDisabled} aria-label="Export analytics">
              <Download className="h-4 w-4 mr-2" />
              {exporting ? `Exporting ${exporting.toUpperCase()}...` : "Export"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem disabled={exportDisabled} onClick={() => handleExport("csv")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem disabled={exportDisabled} onClick={() => handleExport("json")}>
              <FileText className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem disabled={exportDisabled} onClick={() => handleExport("pdf")}>
              <FileText className="h-4 w-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem disabled={exportDisabled} onClick={() => handleExport("image")}>
              <ImageIcon className="h-4 w-4 mr-2" />
              Export as Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {fetchState === "loading" && <p className="text-xs text-muted-foreground">Loading analytics data for export…</p>}
        {fetchState === "empty" && <p className="text-xs text-muted-foreground">No analytics data found for current filters.</p>}
        {fetchState === "error" && (
          <div className="space-y-1 text-right" role="alert">
            <p className="text-xs text-red-600">Unable to load analytics for export: {fetchError}</p>
            <div className="flex items-center justify-end gap-2">
              {cachedSnapshot.length > 0 && (
                <p className="text-xs text-muted-foreground">Using last successful snapshot ({cachedSnapshot.length} rows).</p>
              )}
              <Button variant="outline" size="sm" onClick={() => void loadAnalytics()} disabled={fetchState === "loading"}>
                Retry
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
