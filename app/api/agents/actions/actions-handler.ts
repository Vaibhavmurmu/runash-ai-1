export type ActionDecision = {
  requiresConfirmation: boolean
  status: "approved" | "rejected"
}

export function resolveActionDecision(input: { requiresConfirmation: boolean; confirmedByUser: boolean }): ActionDecision {
  if (input.requiresConfirmation && !input.confirmedByUser) {
    return { requiresConfirmation: true, status: "rejected" }
  }

  return {
    requiresConfirmation: input.requiresConfirmation,
    status: "approved",
  }
}
