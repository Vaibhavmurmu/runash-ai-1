# MCP_SERVER.md

Guidance for Model Context Protocol (MCP) usage with RunAsh AI.

## Purpose
MCP servers provide structured project/runtime context to agents for safer edits and better traceability.

## Recommended usage flow
1. Discover resources/templates from configured MCP servers.
2. Read only relevant resources for the task.
3. Apply minimal code/doc changes.
4. Validate locally.

## Security rules
- Do not copy secrets from MCP resources into source control.
- Treat tokens, credentials, and customer/payment data as sensitive.
- Use least-privilege context selection.

## Conventions
- Prefer explicit resource names describing domain (e.g., `payments/*`, `auth/*`, `streaming/*`).
- Keep prompts and summaries concise and auditable.

## Troubleshooting
- If server discovery fails: verify server config and environment variables.
- If resource read fails: check URI correctness and access scope.
- If context is stale: refresh listing and re-read authoritative resources.
