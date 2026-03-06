export type ContractValidationIssue = {
  path: string
  message: string
  code: string
}

export type ContractErrorShape = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
