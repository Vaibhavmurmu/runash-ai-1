export type ModelDialogTriggerSource =
  | "chat"
  | "editor"
  | "seller"
  | "store"
  | "streaming";

export type ModelDialogMode = "preview" | "configure" | "execute";

export interface ModelDialogIdentity {
  modelId: string;
  provider: string;
  displayName: string;
}

export interface ModelDialogPayload {
  prompt?: string;
  mediaAssetId?: string;
  productId?: string;
  streamId?: string;
}

export interface ModelDialogContract {
  triggerSource: ModelDialogTriggerSource;
  mode: ModelDialogMode;
  model: ModelDialogIdentity;
  payload?: ModelDialogPayload;
}

export type ModelExecutionState = "idle" | "queued" | "running" | "partial-output" | "completed" | "failed";

export interface ModelDialogSseEvent {
  requestId: string;
  state: Exclude<ModelExecutionState, "idle">;
  message: string;
  chunk?: string;
  elapsedMs: number;
  timestamp: string;
}

export interface ModelDialogRunHistoryItem {
  id: string;
  modelId: string;
  sourceModule: ModelDialogTriggerSource | "dashboard";
  inputSummary: string;
  status: Exclude<ModelExecutionState, "idle">;
  createdAt: string;
  updatedAt: string;
}
