import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import path from "node:path"
import test from "node:test"

const roleRouteFile = path.join(process.cwd(), "app", "api", "admin", "users", "[userId]", "role", "route.ts")
const permissionRouteFile = path.join(process.cwd(), "app", "api", "admin", "users", "[userId]", "permissions", "route.ts")

test("role assignment endpoint validates target user existence", () => {
  const source = readFileSync(roleRouteFile, "utf8")
  assert.match(source, /SELECT id FROM users WHERE id = \$1/)
  assert.match(source, /User not found/)
})

test("permission assignment endpoint validates self-mutation and permission registry", () => {
  const source = readFileSync(permissionRouteFile, "utf8")
  assert.match(source, /Cannot modify your own permission overrides/)
  assert.match(source, /SELECT id FROM admin_permissions WHERE key = \$1/)
  assert.match(source, /Unknown permission/)
})
