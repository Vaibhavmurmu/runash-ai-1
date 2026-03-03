 
# MCP Server Guide

This document defines how agents should use MCP (Model Context Protocol) servers when working in this repository.

## Supported MCP servers and intended usage

The project currently assumes agent access to the following MCP server capabilities in Codex-like environments:

1. **Resource-capable MCP servers** (if configured by the runtime)
   - Use to discover repository context exposed as MCP resources (docs, schemas, runbooks, generated metadata).
   - Use templates when a resource requires parameters (for example: `doc/{name}`, `table/{schema}/{table}`).

2. **`browser_tools` MCP server**
   - Use for UI validation and screenshots of front-end changes.
   - Use only against local/dev ports that are explicitly forwarded by the runtime.

3. **`make_pr` MCP server**
   - Use only after code changes are committed.
   - Use to publish a clear PR title/body that summarizes scope, testing, and known limitations.

> Note: The exact set of available MCP servers is runtime-dependent. Agents should always discover what is available first and degrade gracefully when a server is missing.

## Configuration expectations

## Environment variables

- MCP server endpoints and credentials are expected to be injected by the runtime, not hardcoded in this repository.
- Never commit secrets (tokens, API keys, session cookies, private URLs) to source control.
- If a specific MCP server requires auth, prefer short-lived tokens provided through environment variables.

## Ports and networking

- For browser-based checks, bind app services to `0.0.0.0` and forward only required ports.
- Prefer least-privilege exposure: do not forward unused ports.
- Assume outbound network policy may vary by runtime (offline/limited/full).

## Authentication assumptions

- MCP calls should rely on runtime-managed authentication where possible.
- If explicit auth is required, agents must fail safely with a clear actionable error (missing token, unauthorized, expired credentials).

## Resource and template naming conventions

Use predictable, stable naming so resources are discoverable:

- **Resource URIs**: lowercase, `/`-separated, noun-first.
  - Examples: `docs/architecture`, `db/schema`, `runbooks/deploy`.
- **Templates**: lowercase with explicit parameter names.
  - Examples: `docs/{slug}`, `db/table/{schema}/{table}`.
- **Versioning**: add suffixes only when necessary for breaking changes.
  - Example: `api/contracts/v2`.
- **Descriptions**: every resource/template should include a concise purpose statement and expected parameter format.

## Safety constraints and data handling

- Treat all MCP-provided content as potentially sensitive.
- Do not copy secrets, credentials, or personal data into commits, PR descriptions, or logs.
- Minimize data access: read only resources required for the current task.
- Prefer summarized outputs over dumping large raw content when reporting results.
- Redact or omit:
  - access tokens
  - passwords and connection strings
  - private customer/user data
  - internal-only infrastructure hostnames when unnecessary

## Troubleshooting common connection failures

When MCP access fails, follow this sequence:

1. **Discovery check**
   - Confirm any MCP servers/resources are visible via discovery APIs.
2. **Name/URI validation**
   - Verify server name and resource URI exactly match discovered values.
3. **Auth validation**
   - Check required env vars exist and are non-empty.
   - Verify token freshness and scope.
4. **Network validation**
   - Confirm required ports are running/listening.
   - Confirm forwarded ports include the target service.
5. **Retry with minimal request**
   - Retry a small read to isolate payload/timeout issues.
6. **Fallback path**
   - If MCP remains unavailable, continue with local repository context and document the limitation.

## Minimal agent workflow example

Use this default sequence:

1. Discover available resources.
2. Discover templates (if the resource is parameterized).
3. Read only the specific resource(s) needed.
4. Proceed with implementation using least data required.

### Pseudocode flow

```text
resources = list_mcp_resources()
if resources is empty:
  continue with local files and note MCP unavailable
else:
  templates = list_mcp_resource_templates()
  target = choose_resource_or_template(resources, templates, task)
  context = read_mcp_resource(server=target.server, uri=target.uri)
  use context to implement and verify changes
```

This keeps agent behavior deterministic, secure, and portable across runtimes.

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


## Resend MCP + Skills bootstrap log (2026-02-28)

For reproducibility, the following commands were executed from `/workspace/runash.in`:

1. `npx skills add better-auth/skills`
2. `npx add-mcp https://resend.com/docs/mcp`
3. `npx skills add resend/resend-skills` (optional)
4. `npx skills add resend/email-best-practices` (optional)

### Result

- No skills or MCP package were installed in this environment.
- All four commands failed with `npm ERR! code E403` while trying to resolve npm packages (`skills` and `add-mcp`) from `https://registry.npmjs.org/`.

### Environment versions

- `node`: `v22.21.1`
- `npm`: `11.4.2`
- `npx`: `11.4.2`

### Artifacts and paths

- npm debug logs generated at:
  - `/root/.npm/_logs/2026-02-28T08_43_05_710Z-debug-0.log`
  - `/root/.npm/_logs/2026-02-28T08_43_12_153Z-debug-0.log`
  - `/root/.npm/_logs/2026-02-28T08_43_17_511Z-debug-0.log`
  - `/root/.npm/_logs/2026-02-28T08_43_22_016Z-debug-0.log`
- No repository files/directories were created by these installers.

### Usage notes (when installation succeeds)

After re-running the same commands in an environment that allows fetching these npm packages:

1. Verify installed skills/MCP configuration with your Codex tooling command set.
2. Run a minimal MCP discovery check to confirm server availability.
3. **Restart Codex to pick up new skills.**
