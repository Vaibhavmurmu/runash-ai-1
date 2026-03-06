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
  assert.match(source, /if \(canSend \|\| value\.trim\(\)\) \{\s*handleSubmit\(\)/)
  assert.match(source, /attachmentPreviews\.length === 0[\s\S]*!isBusy[\s\S]*!isHardLimitExceeded[\s\S]*!disabled[\s\S]*!value\.trim\(\)/)
  assert.doesNotMatch(source, /if \(event\.key === "Enter" && event\.shiftKey\)\s*\{\s*event\.preventDefault\(\)/)
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
