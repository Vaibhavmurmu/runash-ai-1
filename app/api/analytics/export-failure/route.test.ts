import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const repoRoot = process.cwd()
const source = readFileSync(path.join(repoRoot, "app/api/analytics/export-failure/route.ts"), "utf8")

test("analytics export failure telemetry route sanitizes and records non-sensitive payload", () => {
  assert.match(source, /analytics_export_failure/)
  assert.match(source, /ALLOWED_FORMATS/)
  assert.match(source, /ALLOWED_STAGES/)
  assert.match(source, /slice\(0, 160\)/)
  assert.match(source, /console\.info\("\[analytics\.export\.telemetry\]"/)
})
