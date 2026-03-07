import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

test("chat composer keeps predictable Enter/Shift+Enter behavior across attachments and retries", () => {
  const source = read("components/chat/runash-chat-composer.tsx")

  assert.match(source, /if \(event\.key === "Enter" && !event\.shiftKey\)/)
  assert.match(source, /if \(\(event\.metaKey \|\| event\.ctrlKey\) && event\.shiftKey && event\.key\.toLowerCase\(\) === "p"\)/)
  assert.match(source, /if \(canSend \|\| value\.trim\(\)\) \{\s*handleSubmit\(\)/)
  assert.match(source, /<span>Enter to send • Shift\+Enter newline • Controls are keyboard accessible\.<\/span>/)
  assert.match(source, /attachmentPreviews\.length === 0[\s\S]*!isBusy[\s\S]*!isHardLimitExceeded[\s\S]*!disabled[\s\S]*!value\.trim\(\)/)
  assert.doesNotMatch(source, /if \(event\.key === "Enter" && event\.shiftKey\)\s*\{\s*event\.preventDefault\(\)/)
})

test("chat composer send availability transitions track disabled, busy, and attachment upload states", () => {
  const source = read("components/chat/runash-chat-composer.tsx")

  assert.match(source, /const hasFailedAttachment = attachmentPreviews\.some\(\(item\) => item\.uploadState === "failed"\)/)
  assert.match(source, /const hasUploadingAttachment = attachmentPreviews\.some\(\(item\) => item\.uploadState === "uploading"\)/)
  assert.match(source, /const isBusy = isStreaming \|\| streamState === "stopping" \|\| isEnhancing \|\| hasUploadingAttachment/)
  assert.match(source, /const canSend = !disabled && !isBusy && !isHardLimitExceeded && !hasFailedAttachment && Boolean\(value\.trim\(\)\)/)
  assert.match(source, /disabled=\{!canSend\}/)
  assert.match(source, /disabled=\{disabled \|\| streamState === "stopping"\}/)
  assert.match(source, /streamState === "stopping"\s*\?\s*"Stopping\.\.\."/)
  assert.match(source, /: isStreaming\s*\?\s*"Sending\.\.\."/)
})

test("chat composer action buttons expose labels and visible keyboard focus styles", () => {
  const source = read("components/chat/runash-chat-composer.tsx")

  assert.match(source, /aria-label="Attach image"/)
  assert.match(source, /onPaste=\{handlePaste\}/)
  assert.match(source, /aria-label="Retry previous request"/)
  assert.match(source, /aria-label="Stop generating response"/)
  assert.match(source, /aria-label="Send prompt"/)
  assert.match(source, /focus-visible:ring-orange-300/)
})


test("chat composer exposes attachment retry/remove actions with stable handlers", () => {
  const source = read("components/chat/runash-chat-composer.tsx")

  assert.match(source, /attachment\.uploadState === "failed" && onRetryAttachment/)
  assert.match(source, /\{attachment\.uploadState === "failed" \? "Failed" : attachment\.uploadState === "uploading" \? "Uploading" : "Ready"\}/)
  assert.match(source, /onClick=\{\(\) => onRetryAttachment\(attachment\.id\)\}/)
  assert.match(source, /\{onRemoveAttachment \? \(/)
  assert.match(source, /onClick=\{\(\) => onRemoveAttachment\(attachment\.id\)\}/)
  assert.match(source, /disabled=\{disabled \|\| isBusy\}/)
  assert.match(source, /Recovery: remove files that exceed limits and retry attach, paste, or drop\./)
})

test("chat composer keeps retry and stop controls wired to flow state", () => {
  const source = read("components/chat/runash-chat-composer.tsx")

  assert.match(source, /isRetryableFailure && onRetry/)
  assert.match(source, /aria-label="Retry previous request"/)
  assert.match(source, /aria-label="Stop generating response"/)
  assert.match(source, /streamState === "sending" \|\| streamState === "streaming"/)
})
