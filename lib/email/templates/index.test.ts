import assert from "node:assert/strict"
import test from "node:test"

import { buildEmailTemplatePreviews } from "./fixtures"
import { listEmailTemplates, renderEmailTemplate } from "./index"

test("email template catalog includes all required categories", () => {
  const categories = new Set(listEmailTemplates().map((template) => template.category))
  assert.deepEqual([...categories].sort(), ["auth", "billing", "marketing", "support", "transactional"])
})

test("each template renders html and plain-text fallback", () => {
  for (const template of listEmailTemplates()) {
    const output = renderEmailTemplate(template.id, {})
    assert.ok(output.html.includes("<!doctype html>"))
    assert.ok(output.text.length > 20)
    assert.equal(output.id, template.id)
  }
})

test("preview fixtures cover all templates", () => {
  const previews = buildEmailTemplatePreviews()
  assert.equal(previews.length, listEmailTemplates().length)
  assert.ok(previews.every((item) => item.preview.subject.length > 0))
})
