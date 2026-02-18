import { v4 as uuidv4 } from "uuid"
import cron from "node-cron"
import path from "path"
import { readSchedulesFromDisk, writeSchedulesToDisk, getLatestLive, getDashboardData } from "./data-source"
import { sendReportEmail } from "./emails"
import { writeFileSync } from "fs"

/**
 * Scheduler module
 *
 * - load schedules from data/schedules.json
 * - allow add/list/remove schedules via functions
 * - schedule cron jobs on server start to generate & deliver reports
 *
 * NOTE: node-cron runs in-process. Deploy to a server / container where the
 * process is long-running (not ephemeral serverless lambdas).
 */

type Schedule = {
  id: string
  name: string
  frequency: "hourly" | "daily" | "weekly" | "monthly"
  recipients?: string
  format?: "CSV" | "PDF" | "Excel"
  nextRun?: string
  createdAt: string
}

const SCHEDULES = (global as any).__schedules || new Map<string, { schedule: Schedule; task: cron.ScheduledTask | null }>()
if (!(global as any).__schedules) (global as any).__schedules = SCHEDULES

function freqToCron(freq: Schedule["frequency"]) {
  switch (freq) {
    case "hourly":
      return "0 * * * *"
    case "daily":
      return "0 0 * * *" // midnight server time
    case "weekly":
      return "0 0 * * 0" // Sunday midnight
    case "monthly":
      return "0 0 1 * *" // first day of month
    default:
      return null
  }
}

function scheduleAll() {
  const persisted = readSchedulesFromDisk()
  persisted.forEach((s: Schedule) => {
    scheduleOne(s)
  })
}

function scheduleOne(s: Schedule) {
  const cronExpr = freqToCron(s.frequency)
  if (!cronExpr) return
  // Unschedule existing task if present
  const existing = SCHEDULES.get(s.id)
  if (existing && existing.task) existing.task.stop()

  const task = cron.schedule(cronExpr, async () => {
    try {
      await runReport(s)
    } catch (err) {
      console.error("Scheduled report failed", err)
    }
  })
  SCHEDULES.set(s.id, { schedule: s, task })
}

async function runReport(s: Schedule) {
  // Generate CSV using server-side data source
  const data = await getDashboardData()
  const rows = [["date", "viewers", "followers", "revenue"], ...data.overview.map((r) => [r.date, String(r.viewers), String(r.followers), String(r.revenue)])]
  const csv = rows.map((r) => r.join(",")).join("\n")
  const filename = `${s.name.replace(/\s+/g, "_")}_${Date.now()}.csv`

  // write to disk (optional)
  const outPath = path.join(process.cwd(), "data", "reports")
  try {
    writeFileSync(path.join(outPath, filename), csv)
  } catch {
    // ignore write failures (folder might not exist)
  }

  // Send email to recipients (comma-separated)
  if (s.recipients) {
    const to = s.recipients.split(",").map((x) => x.trim())
    try {
      await sendReportEmail({
        to,
        subject: `Scheduled Analytics Report: ${s.name}`,
        text: `Attached report: ${s.name}`,
        attachments: [{ filename, content: Buffer.from(csv, "utf-8"), contentType: "text/csv" }],
      })
      console.log("Sent scheduled report", s.name, "to", s.recipients)
    } catch (err) {
      console.error("Failed to send scheduled report via email", err)
    }
  } else {
    console.log("Scheduled report generated but no recipients configured:", filename)
  }
}

export async function addSchedule({ name, frequency, recipients, format }: { name: string; frequency: Schedule["frequency"] | string; recipients?: string; format?: string }) {
  const id = uuidv4()
  const s: Schedule = {
    id,
    name,
    frequency: frequency as any,
    recipients,
    format: (format as any) || "CSV",
    nextRun: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
    createdAt: new Date().toISOString(),
  }
  const persisted = readSchedulesFromDisk()
  persisted.unshift(s)
  writeSchedulesToDisk(persisted)
  scheduleOne(s)
  return s
}

export async function listSchedules() {
  return readSchedulesFromDisk()
}

export async function removeSchedule(id: string) {
  const persisted = readSchedulesFromDisk()
  const filtered = persisted.filter((p: any) => p.id !== id)
  writeSchedulesToDisk(filtered)
  const entry = SCHEDULES.get(id)
  if (entry && entry.task) entry.task.stop()
  SCHEDULES.delete(id)
  return true
}

// schedule persisted schedules now (on import)
scheduleAll()
