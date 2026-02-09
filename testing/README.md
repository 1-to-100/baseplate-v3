# Testing

This directory contains all tests for the Baseplate application.

## Quick Start

```bash
# Unit tests (Deno) - from repo root
deno task test:edge

# E2E tests (Playwright)
cd testing/e2e && npm install && npm test
```

## Directory Structure

```
testing/
├── e2e/                    # End-to-End tests (Playwright)
│   └── README.md           # E2E setup guide
│
└── unit/
    └── edge-functions/     # Deno Edge Function tests
        ├── llm/            # LLM Provider Adapter tests
        └── README.md       # Unit test guide
```

## Test Types

| Type | Technology | Location | Guide |
|------|------------|----------|-------|
| E2E | Playwright | `testing/e2e/` | [e2e/README.md](./e2e/README.md) |
| Unit | Deno | `testing/unit/edge-functions/` | [unit/edge-functions/README.md](./unit/edge-functions/README.md) |

## CI/CD

Unit tests run automatically in GitHub Actions on every push and pull request.

See `.github/workflows/deno-tests.yml` for configuration.
