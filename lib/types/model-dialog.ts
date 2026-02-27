export type ModelDialogTriggerSource =
  | "chat"
  | "editor"
  | "seller"
  | "store"
  | "streaming";

export type ModelDialogMode = "preview" | "configure" | "execute";

export type ModelDialogGenerationMode =
  | "generic"
  | "image-generation"
  | "video-generation"
  | "live-stream-assist"
  | "previous-live-optimization"
  | "live-view"
  | "previous-live-view"
  | "video-on-demand"
  | "live-streaming"
  | "stream"
  | "scheduling";

export interface ModelDialogModeContext {
  datasetId?: string;
  librarySource?: string;
  filters?: string;
  snapshotTime?: string;
}

export interface ModelDialogIdentity {
  modelId: string;
  provider: string;
  displayName: string;
}

export interface ModelDialogPayload {
  prompt?: string;
  context?: string;
  sourceModule?: ModelDialogTriggerSource | "dashboard";
  mediaAssetId?: string;
  assetId?: string;
  productId?: string;
  streamId?: string;
  recordingId?: string;
  generationMode?: ModelDialogGenerationMode;
  liveViewContext?: ModelDialogModeContext;
  previousLiveViewContext?: ModelDialogModeContext;
  videoOnDemandContext?: ModelDialogModeContext;
  liveStreamingContext?: ModelDialogModeContext;
  streamContext?: ModelDialogModeContext;
  schedulingContext?: ModelDialogModeContext;
}

export interface ModelDialogContract {
  triggerSource: ModelDialogTriggerSource;
  mode: ModelDialogMode;
  model: ModelDialogIdentity;
  payload?: ModelDialogPayload;
}

export type ModelExecutionState = "idle" | "queued" | "running" | "partial-output" | "completed" | "failed";

export type ModelDialogErrorCode =
  | "USAGE_LIMIT_REACHED"
  | "PLAN_UPGRADE_REQUIRED"
  | "RATE_LIMITED"
  | "MODEL_DIALOG_INVALID_REQUEST"
  | "MODEL_DIALOG_INVALID_STREAM_REQUEST"
  | "MODEL_DIALOG_INTERNAL_ERROR"
  | "MODEL_DIALOG_STREAM_INTERNAL_ERROR"
  | "MODEL_DIALOG_EXECUTION_FAILED";

export interface ModelDialogSseEvent {
  requestId: string;
  state: Exclude<ModelExecutionState, "idle">;
  message: string;
  chunk?: string;
  elapsedMs: number;
  timestamp: string;
  errorCode?: ModelDialogErrorCode;
  errorMessage?: string;
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
