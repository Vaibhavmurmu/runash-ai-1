import { WorkflowAuditRecord } from "@/types/workflow-kit"

const auditRecords: WorkflowAuditRecord[] = []

export function writeWorkflowAuditRecord(record: WorkflowAuditRecord) {
  auditRecords.push(record)
}

export function listWorkflowAuditRecords(executionId?: string) {
  if (!executionId) return [...auditRecords]
  return auditRecords.filter((record) => record.executionId === executionId)
}

export function clearWorkflowAuditRecords() {
  auditRecords.length = 0
}
