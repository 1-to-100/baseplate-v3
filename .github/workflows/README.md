# CI/CD Workflows

This directory contains the CI/CD pipeline for the Baseplate application.

## Structure

```
workflows/
├── ci.yml                       # Main orchestrator
├── _typecheck-lint.yml          # Reusable: TypeScript type check + ESLint
├── _build.yml                   # Reusable: Next.js build
├── _deno-tests.yml              # Reusable: Deno edge function tests
├── _deploy-edge-functions.yml   # Reusable: Deploy to Supabase
└── _check-wrapper-files.yml     # Reusable: PR check for wrapper files
```

Files prefixed with `_` are reusable workflows called by the orchestrator. They should not be triggered directly.

## Pipeline Flow

```
┌─────────────────────────────────────────────────────────────┐
│                         ci.yml                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Stage 1: typecheck-lint                                    │
│           ├── TypeScript type checking (pnpm type:check)    │
│           └── ESLint (pnpm lint)                            │
│                          │                                  │
│                          ▼                                  │
│  Stage 2: build ─────────┬─────────── deno-tests            │
│           │              │            ├── Check changes     │
│           │              │            ├── Deno type check   │
│           │      (parallel)           └── Run tests         │
│           │              │                   │              │
│           ▼              ▼                   ▼              │
│  Stage 3: deploy (push to master/main only)                 │
│           └── Deploy changed edge functions to Supabase     │
│                                                             │
│  PR Check: check-wrapper-files (runs in parallel on PRs)    │
│            └── Blocks commits of auto-generated wrappers    │
└─────────────────────────────────────────────────────────────┘
```

## Triggers

| Event                      | Branches     | What Runs                                     |
| -------------------------- | ------------ | --------------------------------------------- |
| Push                       | master, main | Full pipeline including deploy                |
| Pull Request               | master, main | Type check → Build + Deno tests (no deploy)   |
| Manual (workflow_dispatch) | any          | Full pipeline with optional `deploy_all` flag |

## Jobs

### typecheck-lint

Runs TypeScript compiler and ESLint. This is the first gate - if it fails, nothing else runs.

### build

Builds the Next.js application. Runs after typecheck-lint passes.

### deno-tests

Runs Deno edge function tests. Only executes if edge function files changed:

- `src/**/edge/**`
- `testing/unit/edge-functions/**`
- `supabase/functions/**`
- `deno.json`

### deploy

Deploys edge functions to Supabase. Only runs on push to master/main after build and deno-tests pass.

Options:

- Detects which functions changed and deploys only those
- If `_shared/` changes, deploys all functions
- Manual trigger with `deploy_all: true` deploys everything

### check-wrapper-files

PR-only check that prevents committing auto-generated wrapper files in non-application repos. These wrappers are generated at deploy time by `supabase/scripts/wrap-feature-functions.mjs`.

## Configuration

### Repository Variables (Settings → Secrets and variables → Actions → Variables)

| Variable              | Description                                                                                    |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `APPLICATION_REPO`    | Set to `true` for application repos that include feature functions from `src/app/**/lib/edge/` |
| `SUPABASE_PROJECT_ID` | Supabase project reference ID                                                                  |

### Repository Secrets

| Secret                  | Description                           |
| ----------------------- | ------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Supabase access token for deployments |

## Branch Protection

Recommended required status checks for master/main:

- `Type Check & Lint`
- `Build`
- `Deno Tests` (if edge functions exist)
