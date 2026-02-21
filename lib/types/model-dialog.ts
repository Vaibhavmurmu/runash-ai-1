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
