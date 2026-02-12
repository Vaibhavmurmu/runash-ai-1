import { AgentOrchestrationService, type SupportedTool } from "@/services/agent-orchestration-service"

type QueueJob = {
  id: string
  tool: SupportedTool
  payload: Record<string, unknown>
  context: {
    sessionId: string
    messageId: string
    tenantId: string
  }
}

const queue: QueueJob[] = []
let processing = false

async function processQueue() {
  if (processing) return
  processing = true

  while (queue.length > 0) {
    const job = queue.shift()
    if (!job) continue

    try {
      await AgentOrchestrationService.executeToolWithPolicy(job.tool, job.payload, job.context)
    } catch {
      // no-op: execution failures are persisted in tool lineage.
    }
  }

  processing = false
}

export function enqueueToolJob(job: Omit<QueueJob, "id">) {
  const queueJob: QueueJob = {
    ...job,
    id: `job-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }

  queue.push(queueJob)
  void processQueue()

  return queueJob.id
}

export function getQueueDepth() {
  return queue.length
}
