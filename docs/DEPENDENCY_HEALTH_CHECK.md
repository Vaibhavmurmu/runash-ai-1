# Dependency Health Check Runbook

## Purpose
Keep dependency bloat and supply-chain risk under control by running a lightweight, repeatable audit on every release cycle (or at least once per month).

## Cadence
- **Release cadence:** Run this checklist before each production release.
- **Fallback cadence:** If no release is planned, run monthly.

## Audit scope
Primary runtime scope for this repository:
- `app/`
- `components/`
- `lib/`
- `services/`

## Required checklist
1. **Dependency usage audit**
   - Generate import-usage coverage for direct dependencies against the audit scope.
   - Flag dependencies with no direct imports as removal candidates.
2. **Cleanup pass**
   - Remove clearly unused dependencies (prioritize duplicate-framework and non-runtime packages).
3. **Version pinning pass**
   - Pin business-critical production dependencies to stable, explicit versions.
4. **Validation floor**
   - Run `npm run lint`.
   - Run `npm run build` (when required environment variables/secrets are available).
5. **Performance snapshot**
   - Capture install and build timings before/after dependency edits.

## Command reference
```bash
# install timing (baseline and after)
TIMEFORMAT='install_seconds=%3R'; time pnpm install --force --frozen-lockfile

# build timing (baseline and after)
TIMEFORMAT='build_seconds=%3R'; time pnpm build

# lint floor
npm run lint
```

## 2026-02-24 snapshot (this change)
### Audit findings
- Removed clearly unused duplicate-framework/non-runtime dependencies:
  - `@remix-run/react`
  - `@sveltejs/kit`
  - `svelte`
  - `vue`
  - `vue-router`
  - `types`
  - `@types/hoist-non-react-statics`

### Critical dependency pinning
Pinned the following production dependencies from `latest` to explicit stable versions:
- `@ai-sdk/openai` → `3.0.28`
- `ai` → `6.0.84`
- `@aws-sdk/client-s3` → `3.989.0`
- `@aws-sdk/s3-request-presigner` → `3.989.0`
- `@upstash/redis` → `1.36.2`
- `next-auth` → `4.24.13`
- `stripe` → `20.3.1`
- `zod` → `4.3.6`

### Performance baseline
| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Install (`pnpm install --force --frozen-lockfile`) | 5.811s | 6.035s | +0.224s |
| Build (`pnpm build`) | 152.724s* | 150.273s* | -2.451s |

\* Build failed during page-data collection due to missing Neon database connection string, but timing remains usable as a relative benchmark in this environment.
