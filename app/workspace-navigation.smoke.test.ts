import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

test("standalone editor and runash chat routes share workspace chrome contract", () => {
  const editorPage = read("app/editor/page.tsx")
  const chatShell = read("app/dashboard/chat/_shared-chat-page.tsx")

  assert.match(editorPage, /StandaloneWorkspacePageChrome/)
  assert.match(chatShell, /StandaloneWorkspacePageChrome/)
  assert.match(editorPage, /breadcrumbs=\{\[/)
  assert.match(chatShell, /breadcrumbs=\{\[/)
  assert.match(editorPage, /keyboardShortcutHints=\{\[/)
  assert.match(chatShell, /keyboardShortcutHints=\{\[/)
})

test("workspace routes expose header navigation transitions between editor and runash chat", () => {
  const editorPage = read("app/editor/page.tsx")
  const chatShell = read("app/dashboard/chat/_shared-chat-page.tsx")

  assert.match(editorPage, /href: "\/runashchat"/)
  assert.match(chatShell, /href: "\/editor"/)
})
