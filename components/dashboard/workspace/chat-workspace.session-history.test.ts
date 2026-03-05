import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

test("chat workspace exposes resilient session-history states and recovery actions", () => {
  const source = read("components/dashboard/workspace/chat-workspace.tsx")

  assert.match(source, /loadingMessage="Loading session history\.\.\."/)
  assert.match(source, /errorMessage="Unable to sync session history\. Please retry in a moment\."/)
  assert.match(source, />\s*Retry history sync\s*</)
  assert.match(source, /aria-label=\{leftDrawerOpen \? "Hide history" : "Show history"\}/)
  assert.match(source, /aria-label="Close session history"/)
})
