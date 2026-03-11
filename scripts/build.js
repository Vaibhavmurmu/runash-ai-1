#!/usr/bin/env node

// Wrapper script to run Next.js build in a way that avoids SIGTERM issues
// seen when invoking via npm/pnpm scripts in some environments.

const { spawnSync } = require("child_process");
const path = require("path");

const nextBin = path.resolve("./node_modules/next/dist/bin/next");

// Run the build synchronously to avoid signal forwarding issues in some shells.
console.error("build wrapper: execPath=", process.execPath);
console.error("build wrapper: argv=", process.argv);
console.error("build wrapper: NODE_OPTIONS=", process.env.NODE_OPTIONS);
console.error("build wrapper: npm_config_user_agent=", process.env.npm_config_user_agent);

const result = spawnSync(process.execPath, [nextBin, "build", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});

// Debug: log the result in case the build is terminated unexpectedly.
if (result.error) {
  console.error("Build wrapper error:", result.error);
}
if (result.signal) {
  console.error("Build terminated by signal:", result.signal);
  // Forward termination signal
  process.kill(process.pid, result.signal);
}
console.error("Build exit status:", result.status);

process.exit(result.status || 0);
