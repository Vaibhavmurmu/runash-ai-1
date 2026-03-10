import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

test("editor mobile chat sheet restores focus when toggled", () => {
  const source = read("components/dashboard/workspace/editor-workspace.tsx")

  assert.match(source, /mobileChatSheetContentRef/)
  assert.match(source, /mobileChatReturnFocusRef/)
  assert.match(source, /mobileChatSheetContentRef\.current\?\.focus\(\)/)
  assert.match(source, /mobileChatReturnFocusRef\.current\?\.focus\(\)/)
})

test("runash chat mobile drawers restore focus when opening and closing", () => {
  const source = read("components/dashboard/workspace/chat-workspace.tsx")

  assert.match(source, /mobileDrawerReturnFocusRef/)
  assert.match(source, /mobileLeftDrawerRef/)
  assert.match(source, /mobileRightDrawerRef/)
  assert.match(source, /mobileLeftDrawerRef\.current\?\.focus\(\)/)
  assert.match(source, /mobileRightDrawerRef\.current\?\.focus\(\)/)
  assert.match(source, /mobileDrawerReturnFocusRef\.current\?\.focus\(\)/)
})
