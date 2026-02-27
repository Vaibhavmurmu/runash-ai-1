export function shouldTreatDuplicateAsProcessed(status: string | null | undefined) {
  return status === "processed"
}
