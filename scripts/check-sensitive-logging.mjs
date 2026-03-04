import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const forbidden = /(console\.(log|info|warn|error)\s*\([^\n]*(password|token|secret|authorization|cookie|api[_-]?key|refresh[_-]?token|access[_-]?token|card|cvv|otp\s*code))/i

const changed = execSync('git diff --name-only -- app lib services middleware.ts')
  .toString()
  .split('\n')
  .filter((file) => file && /\.(ts|tsx|js|mjs|cjs)$/.test(file))

const files = changed.length > 0 ? changed : execSync("rg --files -g '*.{ts,tsx,js,mjs,cjs}' app lib services middleware.ts").toString().split('\n').filter(Boolean)

const violations = []

for (const file of files) {
  const content = readFileSync(file, 'utf8')
  const lines = content.split('\n')
  lines.forEach((line, index) => {
    if (forbidden.test(line)) {
      violations.push(`${file}:${index + 1}: ${line.trim()}`)
    }
  })
}

if (violations.length > 0) {
  console.error('Sensitive logging guard failed:\n' + violations.join('\n'))
  process.exit(1)
}

console.log('Sensitive logging guard passed.')
