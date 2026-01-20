# Testing

This directory contains all tests for the Baseplate application, organized by test type.

## Directory Structure

```
testing/
├── e2e/                    # End-to-End tests (Playwright)
│   ├── src/
│   │   ├── basics/         # Config, constants, utilities
│   │   ├── pages/          # Page Object Models
│   │   └── tests/          # Test specs by feature
│   ├── playwright.config.ts
│   ├── package.json
│   └── README.md           # E2E setup and execution guide
│
└── unit/                   # Unit and contract tests
    └── edge-functions/     # Deno Edge Function tests
        ├── deno.json
        └── README.md       # Unit test guide
```

## E2E Tests (Playwright)

Browser-based end-to-end tests that verify complete user workflows.

**Technology**: Playwright (Node.js)

**Location**: `testing/e2e/`

```bash
cd testing/e2e
npm install
npm test
```

See [e2e/README.md](./e2e/README.md) for detailed setup and test execution instructions.

**Coverage**:
- Authorization (login, registration, password reset)
- User Management (add, edit, impersonate users)
- Customer Management
- Role Settings
- Documentation (articles, categories)
- Notification Management
- System Users

## Unit Tests (Deno)

Unit and contract tests for Edge Functions using Deno's built-in test runner.

**Technology**: Deno

**Location**: `testing/unit/edge-functions/`

```bash
cd testing/unit/edge-functions
deno task test
```

See [unit/edge-functions/README.md](./unit/edge-functions/README.md) for detailed test patterns and execution instructions.

**Coverage**:
- Zod schema validation
- JSON Schema export verification
- Contract tests (Zod ↔ JSON Schema alignment)
- Integration tests (optional, requires deployed functions)

## CI/CD

### E2E Tests
Currently run manually or via project-specific CI configuration.

### Unit Tests
Run automatically in GitHub Actions when changes are made to:
- `src/**/edge/**`
- `testing/unit/edge-functions/**`
- `supabase/functions/**`

See `.github/workflows/deno-tests.yml` for the workflow configuration.
