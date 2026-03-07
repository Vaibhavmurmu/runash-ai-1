import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

test("chat workspace empty state keeps starter prompt visibility and quick-start actions", () => {
  const source = read("components/dashboard/workspace/chat-workspace.tsx")

  assert.ok(source.includes("showComposerEmptyState ? ("))
  assert.match(source, />\s*Start faster with one clear action\./)
  assert.match(source, /Start a prompt, upload a screenshot, or run a starter task\./)
  assert.match(source, /title="Starter prompts"/)
  assert.match(source, /emptyMessage="Starter prompts are unavailable right now\."/)
  assert.match(source, /No chats yet\. Start a prompt, upload a screenshot, or run a starter task\./)
  assert.match(source, />\s*Start prompt\s*</)
  assert.match(source, />\s*Upload screenshot\s*</)
  assert.match(source, />\s*Run starter task\s*</)
})
