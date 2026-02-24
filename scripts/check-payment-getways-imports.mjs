import { readFileSync } from "node:fs"
import { execSync } from "node:child_process"

const allowlist = new Set(["lib/payment-getways/pay.ts"])
const importRegex = /(?:from\s+["'][^"']*payment-getways\/pay["']|import\s*\(\s*["'][^"']*payment-getways\/pay["']\s*\)|require\(\s*["'][^"']*payment-getways\/pay["']\s*\))/

const files = execSync(
  "rg --files --glob '!node_modules/**' --glob '*.{ts,tsx,js,jsx,mjs,cjs}' .",
  { encoding: "utf8" },
)
  .split("\n")
  .filter(Boolean)
  .map((file) => file.replace(/^\.\//, ""))

const violations = []

for (const file of files) {
  const content = readFileSync(file, "utf8")
  const lines = content.split("\n")

  lines.forEach((line, index) => {
    if (importRegex.test(line) && !allowlist.has(file)) {
      violations.push(`${file}:${index + 1}: ${line.trim()}`)
    }
  })
}

if (violations.length > 0) {
  console.error("Found deprecated `payment-getways` imports outside the allowlist:\n")
  console.error(violations.join("\n"))
  process.exit(1)
}

console.log("Deprecated `payment-getways` import check passed.")
