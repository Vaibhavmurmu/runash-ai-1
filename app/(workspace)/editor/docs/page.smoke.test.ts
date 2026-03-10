import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("editor docs route smoke: heading, quick start marker, and primary CTA", () => {
  const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8")

  assert.match(source, /export\s+const\s+metadata\s*:\s*Metadata/)
  assert.match(source, /Editor Documentation/)
  assert.match(source, /title: "Quick Start"/)
  assert.match(source, /title: "Create your first project"/)
  assert.match(source, /<Link href="\/editor">\s*Get Started in Editor/)
})
