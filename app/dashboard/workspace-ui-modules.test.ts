import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8")
}

const targetPages = [
  "app/dashboard/templates/page.tsx",
  "app/dashboard/design-system/page.tsx",
  "app/dashboard/members/page.tsx",
  "app/dashboard/connections/page.tsx",
]

test("workspace pages include all shared status states", () => {
  for (const pagePath of targetPages) {
    const source = read(pagePath)
    assert.match(source, /kind=\"loading\"/, `${pagePath} should include loading state`)
    assert.match(source, /kind=\"empty\"/, `${pagePath} should include empty state`)
    assert.match(source, /kind=\"error\"/, `${pagePath} should include error state`)
    assert.match(source, /kind=\"success\"/, `${pagePath} should include success state`)
  }
})

test("shared primitives enforce accessible action labels and stable keyboard order", () => {
  const source = read("components/dashboard/workspace/common/page-primitives.tsx")

  assert.match(source, /aria-label=\{action\.ariaLabel \?\? action\.label\}/)
  assert.match(source, /aria-label=\{item\.ariaLabel \?\? item\.cta\}/)

  const buttonIndex = source.indexOf("<Button asChild")
  const linkIndex = source.indexOf("<Link href={item.href}")
  assert.ok(buttonIndex >= 0 && linkIndex > buttonIndex, "link should be nested inside button wrapper for predictable focus order")
})

test("style guide includes explicit accessibility checklist items", () => {
  const source = read("app/dashboard/documentation/workspace-ui-style-guide/page.tsx")

  assert.match(source, /Keyboard flow:/)
  assert.match(source, /Labels:/)
  assert.match(source, /Focus order:/)
})
