import { writeFileSync, readFileSync, existsSync } from "fs"
import path from "path"
import { streamEmitter } from "./stream-emitter"
import { getDashboardDataFromSql } from "@/lib/services/analytics-dashboard"

/**
 * Data provenance notes:
 * - Dashboard analytics are loaded from SQL-backed aggregates in lib/services/analytics-dashboard.
 * - No synthetic or random fallback generation is used in this module.
 */
export async function getDashboardData(userId?: string) {
  return getDashboardDataFromSql({ userId })
}

const SCHEDULE_FILE = path.resolve(process.cwd(), "data", "schedules.json")

export function readSchedulesFromDisk() {
  try {
    if (!existsSync(SCHEDULE_FILE)) {
      writeFileSync(SCHEDULE_FILE, JSON.stringify([]))
      return []
    }
    const raw = readFileSync(SCHEDULE_FILE, "utf-8")
    return JSON.parse(raw)
  } catch (err) {
    console.error("readSchedulesFromDisk", err)
    return []
  }
}

export function writeSchedulesToDisk(schedules: any[]) {
  try {
    writeFileSync(SCHEDULE_FILE, JSON.stringify(schedules, null, 2), "utf-8")
  } catch (err) {
    console.error("writeSchedulesToDisk", err)
  }
}

export function getLatestLive() {
  return streamEmitter.getLatest()
}
