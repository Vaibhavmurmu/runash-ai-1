# Editor UI Architecture Note (Current Implemented Behavior)

This document reflects the current editor UX behavior as implemented in:

- `components/editor/left-sidebar.tsx`
- `components/editor/right-panel.tsx`
- `components/editor/main-canvas.tsx`
- `components/dashboard/workspace/editor-workspace.tsx`

## 1) Editor tabs and tool surfaces

### Left sidebar tabs

The left tool rail renders these tools in this exact order:

1. `Generate`
2. `Edit`
3. `Chat`
4. `Layers`
5. `Stream`

Behavior details:

- `Chat` is a toggle action (`onChatToggle`) and does not switch the right panel tab.
- Non-chat tools switch the active right panel tab and explicitly close chat.
- On mobile:
  - A top "Tools" sheet provides the full list.
  - A floating bottom quick bar shows only the first four tools (`Generate`, `Edit`, `Chat`, `Layers`).

### Right panel tab routing

The right panel supports exactly these tab IDs:

- `generate` → `GeneratePanel`
- `edit` → `EditPanel`
- `layers` → `LayersPanel`
- `stream` → `StreamPanel`

If an invalid tab is provided, it resolves to `generate`.

Responsive behavior:

- Desktop (`lg` and up): persistent right sidebar (`w-80`, `xl:w-96`, `2xl:w-[28rem]`).
- Narrow viewports (`max-width: 1023px`): floating settings button opens a right-side sheet containing the active panel.

## 2) Generation settings (exact implemented fields)

The **Generate** panel exposes these settings and bindings:

- `Prompt` (`generationConfig.prompt`) — textarea, required by validation.
- `Negative prompt` (`generationConfig.negativePrompt`) — textarea.
- `Aspect ratio` (`generationConfig.aspectRatio`) — select from model `supportedAspectRatios`.
- `Resolution` (`generationConfig.resolution`) — select from model `supportedResolutions`.
- `FPS` (`generationConfig.fps`) — numeric input constrained by model `fpsRange`.
- `Duration` (`generationConfig.durationPreset`) — preset select from model `durationPresetOptions`; selecting a preset also updates `durationSeconds` to the preset seconds.
- `Seed` (`generationConfig.seed`) — numeric integer input, min `0`.
- `Quality mode` (`generationConfig.qualityMode`) — select with exactly two values: `quality` or `speed`.

Validation behavior:

- Validation combines model-aware validation (`validateGenerationConfig`) and payload schema validation (`validateVideoGenerationPayload`).
- On invalid settings, generation is blocked and the user sees toast: **"Validation required"** with guidance to fix settings before enqueueing.

## 3) Media upload and timeline insertion flow

Current upload flow (`handleUploadMedia`) is:

1. User clicks **Upload media** (accepts `image/*,video/*`) and picks one file.
2. Client initializes upload via `initMediaUploadV1`.
3. File is PUT to the signed upload URL returned by init.
4. Client finalizes upload via `finalizeMediaUploadV1` (video duration is measured from browser metadata when possible).
5. Asset is persisted into the project via `POST /api/editor/projects/:projectId/assets`.
6. A new timeline segment is inserted on track `activeTimeline.tracks[0]` if that track exists.

Insertion behavior:

- Segment type is `video` when MIME starts with `video`, otherwise `image`.
- Insertion duration strategy:
  - Video uses first available positive duration from metadata candidates (`video_metadata`), else falls back (`video_fallback`).
  - Image uses image fallback duration (`image_fallback`, default 3s).
- Insertion placement strategy:
  - If playhead time is valid and overlap rules allow, segment inserts at playhead (`insertionSource: "playhead"`).
  - If overlap is disallowed and playhead would overlap existing segments, it appends at track end (`insertionSource: "track_end"`).
  - If no valid playhead, it appends at track end.
- Timeline duration grows to at least the inserted segment end.
- Upload metadata stores insertion info (`source`, `durationStrategy`, request/insert timestamps) in segment metadata.

On success, the editor updates the local project/timeline state and clears upload-in-progress.

## 4) Save and autosave behavior

### Manual save

Manual save (`saveProject`) runs when save is triggered from the top bar:

1. `PUT /api/v1/editor/projects/:projectId/timeline` with active timeline payload.
2. `PATCH /api/editor/projects/:projectId` with `If-Match` version header and metadata merge (`selectedModel`, `generationConfig`).

Outcomes:

- Success: project state refreshes, dirty flag clears, toast **"Project saved"**.
- Version conflict (`409`): latest project is loaded (if returned), then save fails with collaborator conflict message.
- Any other error: toast **"Save failed"** and unsaved changes remain dirty.

### Autosave

- Any timeline mutation marks the editor as dirty (`isDirty = true`).
- A debounced autosave runs after 1000ms when dirty and project exists.
- Autosave uses the same `saveProject` path as manual save.

## 5) Generation job states and user-facing behavior

When generation starts:

- A render job is created via `createRenderJobV1`.
- User sees toast **"Generation queued"**.
- UI displays status badge/progress in timeline section and full-screen generation overlay while active.

State handling:

- Preferred path: realtime SSE stream (`/api/realtime/stream`) updates job status/progress/stage.
- Fallback path: polling `/api/editor/render-jobs/:jobId` (up to 30 attempts).
- Success: toast **"Generation completed"**.
- Failure: toast **"Generation failed"**.
- Long-running fallback: toast **"Generation queued"** with "Check back shortly" message.

Generation history panel supports:

- **Cancel** for `queued`, `processing`, `retrying`.
- **Retry** for `failed`, `canceled`.

## 6) First 10 minutes quickstart (realistic path)

1. Open `/editor` and wait for project load.
2. If prompted, complete or skip onboarding.
3. If no project exists, create one in the Create Project modal.
4. In left rail, open **Generate**.
5. Pick a model and set: prompt, aspect ratio, resolution, FPS, duration preset.
6. Click canvas timeline to place playhead.
7. Upload one image or video via **Upload media**.
8. Confirm segment appears in timeline (name = file name).
9. Click **Generate Video**.
10. Watch status move from queued/processing to completed in timeline + generation history.

## 7) Troubleshooting

### Project load/save failed

Symptoms:

- Toast: **"Editor load failed"** (load path).
- Toast: **"Save failed"** (manual/autosave path).

Checks:

- Verify project API availability:
  - `GET /api/editor/projects`
  - `GET /api/editor/projects/:projectId`
  - `PUT /api/v1/editor/projects/:projectId/timeline`
  - `PATCH /api/editor/projects/:projectId`
- If save conflict occurred, reload/accept latest and re-apply edits.

### Upload failed

Symptoms:

- Toast: **"Upload failed"**.

Checks:

- Confirm init/finalize APIs succeed (`initMediaUploadV1`, signed upload PUT, `finalizeMediaUploadV1`).
- Verify project asset persistence endpoint succeeds:
  - `POST /api/editor/projects/:projectId/assets`
- Confirm timeline has at least one track (`activeTimeline.tracks[0]`) so insertion can occur.

### Generation validation required

Symptoms:

- Toast: **"Validation required"** and generation does not queue.

Checks:

- Required prompt is non-empty.
- FPS is within selected model range.
- Aspect ratio/resolution are from selected model supported lists.
- Duration preset is valid for selected model.
- Seed is a non-negative integer.
- Quality mode is either `quality` or `speed`.

### Generation queued / processing / failed

Symptoms:

- Status badge shows `Queued`, `Processing…`, or `Failed`.

Checks:

- Confirm realtime handshake + SSE stream are reachable (`/api/realtime/handshake`, `/api/realtime/stream`).
- If SSE is unavailable, ensure polling endpoint works: `GET /api/editor/render-jobs/:jobId`.
- Use generation history actions:
  - `Cancel` stuck queued/processing jobs.
  - `Retry` failed/canceled jobs.

## Related specs

- `docs/RESPONSIVE_LAYOUT_SPEC.md`
- `docs/realtime/editor-streaming-events.md`
