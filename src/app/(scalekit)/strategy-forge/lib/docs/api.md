# Strategy Forge Data Layer API

This document describes the TypeScript data models, Supabase helpers, React Query hooks, and diagnostics tooling that power the **Strategy Forge** feature. The module is designed for use inside the 1to100 front‑end and follows Baseplate data‑layer conventions.

---

## Models

All models live in `lib/types/strategy-foundation.ts` and mirror the SQL schema:

- `CompanyStrategy`
- `StrategyPrinciple`
- `StrategyValue`
- `Competitor`
- `CompetitorSignal`
- `StrategyChangeLog`
- Option tables:
  - `OptionPublicationStatus`
  - `OptionCompetitorStatus`
  - `OptionCompetitorSignalType`
  - `OptionDataSource`
  - `OptionStrategyChangeType`
- Aggregated view: `StrategyWorkspaceData` (strategy + related collections + option sets)

---

## Input Schemas

Runtime validation is provided via Zod in `lib/schemas/strategy-foundation.ts`. The following types are exported for use in forms and API helpers:

- `CreateCompanyStrategyInput`, `UpdateCompanyStrategyInput`
- `CreateStrategyPrincipleInput`, `UpdateStrategyPrincipleInput`
- `CreateStrategyValueInput`, `UpdateStrategyValueInput`
- `CreateCompetitorInput`, `UpdateCompetitorInput`
- `CreateCompetitorSignalInput`, `UpdateCompetitorSignalInput`
- `CreateStrategyChangeLogInput`
- Generic option helpers: `CreateOptionInput`, `UpdateOptionInput`

---

## Supabase Helpers

Located in `lib/api/strategy-foundation.ts`. All helpers enforce customer isolation with `current_customer_id()` and populate `created_by_user_id` / `updated_by_user_id` automatically.

### Company Strategy

- `getCompanyStrategy()` / `getCompanyStrategyById(strategyId)`
- `createCompanyStrategy(input)`
- `updateCompanyStrategy(strategyId, input)`
- `deleteCompanyStrategy(strategyId)`

### Principles & Values

- `listStrategyPrinciples(strategyId)`
- `createStrategyPrinciple(input)`
- `updateStrategyPrinciple(principleId, input)`
- `deleteStrategyPrinciple(principleId)`
- Equivalent helpers for `strategy_values`

### Competitors & Signals

- `listCompetitors(params?)`
- `getCompetitorById(competitorId)`
- `createCompetitor(input)`
- `updateCompetitor(competitorId, input)`
- `deleteCompetitor(competitorId)`
- `listCompetitorSignals(competitorId)`
- `createCompetitorSignal(input)`
- `updateCompetitorSignal(signalId, input)`
- `deleteCompetitorSignal(signalId)`

### Change Log

- `listStrategyChangeLogs(strategyId, params?)`
- `createStrategyChangeLog(input)`
- `deleteStrategyChangeLog(changeLogId)`

### Option Tables

Read helpers return active rows by default; pass `true` to include inactive values.

- `listPublicationStatuses(includeInactive?)`
- `listCompetitorStatuses(includeInactive?)`
- `listCompetitorSignalTypes(includeInactive?)`
- `listDataSources(includeInactive?)`
- `listStrategyChangeTypes(includeInactive?)`

System-admin only mutations (will throw if the current user lacks privileges):

- `createPublicationStatusOption(input)`
- `updatePublicationStatusOption(optionId, input)`
- `deletePublicationStatusOption(optionId)`
- Equivalent helpers exist for competitor status, signal type, data source, and change type tables.

### Workspace Aggregation

- `getStrategyWorkspaceData()` — returns the canonical strategy (if any) plus related collections and option sets.

---

## React Query Hooks

Located in `lib/api/strategy-foundation-hooks.ts`. Query keys are exposed through `strategyForgeKeys`.

Examples:

```ts
const { data: strategy, isLoading } = useCompanyStrategyQuery();
const createStrategy = useCreateCompanyStrategyMutation();
const principles = useStrategyPrinciplesQuery(strategy?.strategy_id ?? null);
const competitorList = useCompetitorsQuery({ search: 'AI' });
const workspace = useStrategyWorkspaceQuery();
```

All mutations automatically invalidate downstream queries (including the aggregated workspace cache).

---

## Diagnostics

Route: `/strategy-forge/diagnostics/strategy-foundation`

File: `diagnostics/strategy-foundation/page.tsx`

**What it does**

- Fetches option sets for reference data.
- Backs up any existing `company_strategies` row (with principles/values/change logs), deletes it, and later restores it.
- Executes full CRUD flows for strategies, principles, values, competitors, competitor signals, change logs, and system option tables.
- Invokes `getStrategyWorkspaceData()` to validate the aggregated contract.
- Presents a detailed result table, per-test timings, and execution logs.

**Notes**

- Temporary records are deleted after the run.
- The original canonical strategy (if present) is reinserted along with associated principles, values, and change logs. Restoration failures are logged.
- Option mutations require system-admin privileges; failures are surfaced in the report when the current user lacks access.

---

## Usage

Import from the consolidated barrel file:

```ts
import {
  getCompanyStrategy,
  useCompanyStrategyQuery,
  createStrategyPrinciple,
  useCreateCompetitorMutation,
  strategyForgeKeys,
} from '../lib/api';
```

Models and schema types are exported via `lib/types` and `lib/schemas`, respectively.

---

For additional implementation guidance see the Baseplate feature registry: <https://1to100.com/baseplate/features/feature-registry/>
