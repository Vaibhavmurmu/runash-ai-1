#!/usr/bin/env node
/**
 * Next.js 16 Async Params Migration Script
 * 
 * This script helps migrate Page and Layout components from Next.js 15 to 16's async params pattern.
 * 
 * Usage:
 *   node scripts/migrate-async-params.mjs [--dry-run] [--file path/to/file.tsx]
 * 
 * Examples:
 *   node scripts/migrate-async-params.mjs --dry-run
 *   node scripts/migrate-async-params.mjs --file app/dashboard/page.tsx
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { globSync } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");
const targetFile = args.find((arg, i) => args[i - 1] === "--file");

const PATTERNS = [
  // Pattern 1: Page function with { params }
  {
    pattern: /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\(\s*\{\s*params\s*(?:,\s*searchParams)?\s*\}\s*:\s*\{\s*params\s*:\s*([^}]+)\s*(?:;\s*searchParams[^}]*)?\s*\}\s*\)/g,
    replacement: "export default async function $1(props: { params: Promise<$2> })",
    description: "Page component with params destructuring",
  },
  // Pattern 2: Page function with { params, searchParams }
  {
    pattern: /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\(\s*\{\s*params\s*,\s*searchParams\s*\}\s*:\s*\{\s*params\s*:\s*([^;]+);\s*searchParams\s*:\s*([^}]+)\s*\}\s*\)/g,
    replacement: "export default async function $1(props: { params: Promise<$2>; searchParams: Promise<$3> })",
    description: "Page component with params and searchParams destructuring",
  },
  // Pattern 3: Layout function with { params }
  {
    pattern: /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)\s*\(\s*\{\s*params\s*,\s*children\s*\}\s*:\s*\{\s*params\s*:\s*([^;]+);\s*children\s*:\s*React\.ReactNode\s*\}\s*\)/g,
    replacement: "export default async function $1(props: { params: Promise<$2>; children: React.ReactNode })",
    description: "Layout component with params destructuring",
  },
];

const VARIABLE_PATTERNS = [
  {
    // Await params in component body
    pattern: /const\s+\{\s*(\w+)\s*\}\s*=\s*params/g,
    replacement: "const { $1 } = await props.params",
    description: "Destructure params after awaiting",
  },
  {
    // Direct params usage
    pattern: /params\.(\w+)/g,
    replacement: "(await props.params).$1",
    description: "Direct params property access",
  },
  {
    // searchParams destructuring
    pattern: /const\s+\{\s*(\w+)\s*\}\s*=\s*searchParams/g,
    replacement: "const { $1 } = await props.searchParams",
    description: "Destructure searchParams after awaiting",
  },
  {
    // Direct searchParams usage
    pattern: /searchParams\.(\w+)/g,
    replacement: "(await props.searchParams).$1",
    description: "Direct searchParams property access",
  },
];

function migrateFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, "utf-8");
    const originalContent = content;
    let changes = [];

    // Apply function signature migrations
    PATTERNS.forEach(({ pattern, replacement, description }) => {
      if (pattern.test(content)) {
        changes.push(description);
        content = content.replace(pattern, replacement);
      }
    });

    // Apply variable migrations only if we changed the function signature
    if (changes.length > 0) {
      VARIABLE_PATTERNS.forEach(({ pattern, replacement, description }) => {
        if (pattern.test(content)) {
          changes.push(description);
          content = content.replace(pattern, replacement);
        }
      });
    }

    if (changes.length > 0) {
      if (isDryRun) {
        console.log(`\n📄 ${filePath}`);
        changes.forEach((change) => console.log(`  ✓ ${change}`));
        console.log(`\n  Preview:\n${content.substring(0, 500)}...`);
      } else {
        fs.writeFileSync(filePath, content, "utf-8");
        console.log(`✅ ${filePath}`);
        changes.forEach((change) => console.log(`  ✓ ${change}`));
      }
      return true;
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return false;
  }

  return false;
}

function main() {
  console.log(`Next.js 16 Async Params Migration ${isDryRun ? "(DRY RUN)" : ""}\n`);

  let files = [];

  if (targetFile) {
    const fullPath = path.resolve(projectRoot, targetFile);
    if (fs.existsSync(fullPath)) {
      files = [fullPath];
    } else {
      console.error(`❌ File not found: ${targetFile}`);
      process.exit(1);
    }
  } else {
    // Find all page and layout files
    files = globSync("app/**/page.tsx", { cwd: projectRoot }).concat(
      globSync("app/**/layout.tsx", { cwd: projectRoot })
    );
    files = files.map((f) => path.resolve(projectRoot, f));
  }

  console.log(`Found ${files.length} files to check\n`);

  let migratedCount = 0;
  files.forEach((file) => {
    if (migrateFile(file)) {
      migratedCount++;
    }
  });

  console.log(
    `\n${isDryRun ? "Would migrate" : "Migrated"} ${migratedCount} files`
  );

  if (isDryRun) {
    console.log(
      "\n💡 Run without --dry-run to apply migrations: node scripts/migrate-async-params.mjs"
    );
  }
}

main();
