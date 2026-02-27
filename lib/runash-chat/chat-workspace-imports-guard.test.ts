import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

test("chat workspace declares RunAshChatCommandCenter import exactly once", () => {
  const file = readFileSync(join(process.cwd(), "components/dashboard/workspace/chat-workspace.tsx"), "utf8")
  const occurrences = (file.match(/RunAshChatCommandCenter/g) ?? []).length

  // 1 import + 1 JSX usage
  assert.equal(occurrences, 2)

  const importOccurrences = (file.match(/import \{ RunAshChatCommandCenter \}/g) ?? []).length
  assert.equal(importOccurrences, 1)

  assert.equal(file.includes("import { RunAshChatFeatureGrid }"), false)
  assert.equal(file.includes("import { RunAshChatTaskBoard }"), false)
})
