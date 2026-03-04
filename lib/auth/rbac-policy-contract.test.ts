import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"

async function loadRbacSource() {
  return readFile(new URL("../rbac.ts", import.meta.url), "utf8")
}

test("rbac policy keeps method-specific admin CRUD authorization", async () => {
  const source = await loadRbacSource()

  assert.match(source, /prefix:\s*"\/api\/admin\/users",\s*requiredPermissions:\s*\["users:read"\],\s*methods:\s*\["GET"\]/)
  assert.match(source, /prefix:\s*"\/api\/admin\/users",\s*requiredPermissions:\s*\["users:write"\],\s*methods:\s*\["POST",\s*"PUT",\s*"PATCH"\]/)
  assert.match(source, /prefix:\s*"\/api\/admin\/users",\s*requiredPermissions:\s*\["users:write",\s*"system:control"\],\s*methods:\s*\["DELETE"\]/)
})

test("legacy and canonical role mapping remains backward compatible for existing users", async () => {
  const source = await loadRbacSource()

  assert.match(source, /\[DEFAULT_ROLES\.ADMIN\]:\s*BASELINE_ROLES\.ADMIN/)
  assert.match(source, /\[DEFAULT_ROLES\.CUSTOMER_OPERATOR\]:\s*BASELINE_ROLES\.OPERATOR/)
  assert.match(source, /\[DEFAULT_ROLES\.GUEST\]:\s*BASELINE_ROLES\.VIEWER/)
  assert.match(source, /\[CANONICAL_ADMIN_ROLES\.ADMIN\]:\s*BASELINE_ROLES\.ADMIN/)
})
