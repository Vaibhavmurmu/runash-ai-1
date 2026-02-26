#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const isCi = process.env.CI === "true";
const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const skillsRootCandidates = [
  join(codexHome, "skills"),
  join(homedir(), ".codex", "skills"),
];

const command = ["npx", "skills", "add", "better-auth/skills"];
console.log(`> ${command.join(" ")}`);
const install = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  env: process.env,
});

const discovered = [];
for (const root of skillsRootCandidates) {
  if (!existsSync(root)) {
    continue;
  }

  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dir = join(root, entry.name);
    if (entry.name.includes("better") || existsSync(join(dir, "SKILL.md"))) {
      discovered.push(dir);
    }
  }
}

if (discovered.length > 0) {
  console.log("\nDetected skills directories:");
  for (const dir of discovered) {
    console.log(`- ${dir}`);
  }
  process.exit(0);
}

console.warn("\nCould not verify installed Better Auth skills in expected locations.");
console.warn("Expected locations include:");
for (const path of skillsRootCandidates) {
  console.warn(`- ${path}`);
}

if (install.status === 0) {
  console.warn("The install command succeeded, but no matching skill directory was detected.");
}

console.warn("\nFallback guidance:");
console.warn("- Offline/air-gapped: skip this setup (skills are optional and do not block app runtime).");
console.warn("- CI: do not fail pipelines on skills setup; pre-bake skill files into runner images when needed.");
console.warn("- Restricted networks: route npm/git through an internal mirror or approved proxy.");

if (isCi) {
  console.warn("\nCI detected: exiting successfully despite missing skills.");
  process.exit(0);
}

process.exit(1);
