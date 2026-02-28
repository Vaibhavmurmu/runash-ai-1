import type { NextApiRequest, NextApiResponse } from "next"
import { addSchedule, listSchedules, removeSchedule, processDueScheduledJobs } from "@/lib/scheduler"

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method === "GET") {
      const schedules = await listSchedules()
      return res.status(200).json(schedules)
    }

    if (req.method === "POST") {
      const { name, frequency, recipients, format, jobType } = req.body
      if (!name || !frequency) return res.status(400).json({ error: "name and frequency required" })
      const created = await addSchedule({ name, frequency, recipients, format, jobType })
      return res.status(201).json(created)
    }

    if (req.method === "DELETE") {
      const { id } = req.query
      if (!id || typeof id !== "string") return res.status(400).json({ error: "id required" })
      const removed = await removeSchedule(id)
      return res.status(200).json({ removed })
    }

    if (req.method === "PATCH") {
      const result = await processDueScheduledJobs({ workerId: "api-trigger" })
      return res.status(200).json(result)
    }

    res.setHeader("Allow", "GET, POST, DELETE, PATCH")
    return res.status(405).end("Method Not Allowed")
  } catch (err) {
    console.error("schedules api error", err)
    res.status(500).json({ error: "internal error" })
  }
}
