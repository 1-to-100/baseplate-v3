# Strategy Forge Feature

Strategy management system for defining company strategy (mission, vision, principles, values), customer personas, market segments, competitors, company information, and customer journey stages to inform content and strategy decisions.

## 📁 Directory Structure

This feature follows the [Baseplate Feature Registry specification](https://1to100.com/baseplate/features/feature-registry/).

```
src/app/(scalekit)/strategy-forge/
├── layout.tsx                          # Feature layout
├── page.tsx                             # Root page (navigation cards)
├── index.ts                             # Root feature export for portability
├── README.md                            # This file
├── overview/
│   └── page.tsx                         # Strategy overview dashboard
├── publish/
│   └── page.tsx                         # Strategy publishing interface
├── change-log/
│   └── page.tsx                         # Strategy change log
├── company-information/
│   └── page.tsx                         # Company info management
├── competitors/
│   ├── page.tsx                         # Competitors list
│   └── [competitorId]/
│       └── page.tsx                     # Competitor details
├── customer-journey-stages/
│   └── page.tsx                         # Customer journey stages list
├── edit/
│   ├── mission/
│   │   └── page.tsx                     # Edit mission statement
│   ├── vision/
│   │   └── page.tsx                     # Edit vision statement
│   ├── principles/
│   │   └── page.tsx                     # Edit strategic principles
│   └── values/
│       └── page.tsx                     # Edit company values
├── personas/
│   ├── page.tsx                         # Personas list
│   ├── [id]/
│   │   ├── page.tsx                     # Persona details
│   │   └── edit/
│   │       └── page.tsx                 # Edit persona
│   └── create/
│       └── page.tsx                     # Create persona
├── segments/
│   ├── page.tsx                         # Segments list
│   ├── [id]/
│   │   └── edit/
│   │       └── page.tsx                 # Edit segment
│   └── create/
│       └── page.tsx                     # Create segment
└── lib/
    ├── types/                           # TypeScript type definitions
    │   ├── index.ts                     # Barrel export
    │   ├── persona.ts                   # Persona types
    │   ├── customer-info.ts             # Customer info types
    │   ├── customer-journey-stages.ts   # Journey stages types
    │   ├── segments.ts                  # Segment types
    │   └── strategy-foundation.ts       # Strategy foundation types
    ├── schemas/                         # Zod validation schemas
    │   ├── customer-journey-stages.ts   # Journey stages schema
    │   ├── persona.ts                   # Persona schema
    │   └── strategy-foundation.ts       # Strategy foundation schema
    ├── api/                             # Supabase client wrappers
    │   ├── index.ts                      # Barrel export
    │   ├── personas.ts                  # Personas API
    │   ├── personas-feature-mappings.ts # Persona-feature mappings API
    │   ├── customer-info.ts              # Customer info API
    │   ├── customer-journey-stages.ts    # Journey stages API
    │   ├── segments.ts                  # Segments API
    │   ├── strategy-foundation.ts       # Strategy foundation API
    │   ├── strategy-foundation-hooks.ts # Strategy foundation React hooks
    │   └── territories.ts               # Territories API
    ├── edge/                            # Supabase edge functions
    │   ├── create-initial-customer-strategy-for-customer-id/
    │   │   ├── index.ts                  # Create initial strategy
    │   │   └── deno.json                 # Deno configuration
    │   ├── create-persona/
    │   │   ├── index.ts                  # Create persona function
    │   │   ├── deno.json                 # Deno configuration
    │   │   └── README.md                 # Function documentation
    │   ├── get-competitor-list-for-customer-id/
    │   │   ├── index.ts                  # Generate competitors
    │   │   └── deno.json                 # Deno configuration
    │   ├── suggest-personas-for-customer-id/
    │   │   ├── index.ts                  # Suggest personas
    │   │   └── deno.json                 # Deno configuration
    │   └── suggest-segments-for-customer-id/
    │       ├── index.ts                  # Suggest segments
    │       └── deno.json                 # Deno configuration
    ├── components/                      # Feature components
    │   ├── index.ts                     # Barrel export
    │   ├── persona-creation-dialog.tsx  # Persona creation dialog
    │   └── create-edit-stage-modal.tsx  # Stage creation/edit modal
    ├── docs/                            # Documentation
    │   └── api.md                        # API documentation
    └── sql/                             # Database schema
        ├── strategy-forge-create.sql    # Foundation tables schema
        └── strategy-forge-rls-policies.sql # RLS policies
```

## 🗄️ Database Schema

Multiple tables with Row Level Security (RLS) organized into system-scoped option tables and customer-scoped data tables:

### System-Scoped Tables (Option Tables)

#### **option_publication_status** - Publication status options
- Draft, Scheduled, Published, Archived

#### **option_competitor_status** - Competitor lifecycle status
- Active Competitor, Monitored, Partner, Potential Threat, Retired

#### **option_competitor_signal_type** - Competitor signal types
- Pricing Change, Feature Launch, Funding Round, Hiring Signal, GTM Move, Partnership

#### **option_data_source** - Data source options
- Manual Entry, Site Scan, LLM Suggestion, Import, Partner Feed

#### **option_strategy_change_type** - Strategy change log types
- Edit Mission, Edit Vision, Add/Update/Reorder Principles, Add/Update/Reorder Values, Publish, Archive

#### **customer_journey_stages_singleton** - System-wide default journey stage templates
- Pre-configured journey stages for Marketing, Sales, Onboarding, Customer Success phases
- Editable by system administrators only
- Used as templates when creating customer-specific journey stages

### Customer-Scoped Tables

#### 1. **company_strategies** - Company strategy workspace
- Mission and vision statements
- Publication status and effective dates
- One-to-one relationship with customers

#### 2. **strategy_principles** - Strategic principles
- Ordered collection of principles
- Linked to company_strategies

#### 3. **strategy_values** - Company values
- Ordered collection of values
- Linked to company_strategies

#### 4. **competitors** - Competitor intelligence
- Competitor name, website, category, summary
- Status and source tracking
- Linked to customers

#### 5. **competitor_signals** - Competitor events and observations
- Signal types (pricing, launches, funding, etc.)
- Observed dates and source URLs
- Linked to competitors

#### 6. **strategy_change_logs** - Strategy change audit trail
- Immutable log of all strategy changes
- Change types, summaries, justifications
- Linked to company_strategies

#### 7. **personas** - Customer personas
- Define buyer personas for targeting
- Store job responsibilities, pain points, goals
- Track decision-making authority and management status
- Support solution-relevant analysis

#### 8. **segments** - Market segments or organizational groupings
- Define market segments or organizational groupings
- Support external system integration via codes/IDs
- Categorize content distribution regions

#### 9. **customer_info** - Company information and messaging
- Store company tagline, problem/solution overviews
- Define competitive positioning
- Set visual style guide and content authoring guidelines

#### 10. **customer_journey_stages** - Customer journey mapping
- Define stages across Marketing, Sales, Onboarding, Customer Success
- Track graduation criteria and ordering
- Support segment-specific journey customization

## 🔐 Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Enforce customer isolation using `current_customer_id()` function
- Allow read/write access within customer boundaries
- Prevent cross-tenant data access

## 🎨 Routes

### Strategy Foundation Routes

1. **Overview** (`/strategy-forge/overview`)
   - View complete strategy at a glance
   - Mission, vision, principles, values summary
   - GTM strategy fields
   - Quick navigation to edit pages

2. **Mission** (`/strategy-forge/edit/mission`)
   - Edit company mission statement
   - Mission description and context

3. **Vision** (`/strategy-forge/edit/vision`)
   - Edit company vision statement
   - Vision description and context

4. **Principles** (`/strategy-forge/edit/principles`)
   - Manage strategic principles
   - Drag-and-drop reordering
   - Add, edit, and remove principles

5. **Values** (`/strategy-forge/edit/values`)
   - Manage company values
   - Drag-and-drop reordering
   - Add, edit, and remove values

6. **Publish** (`/strategy-forge/publish`)
   - Publish strategy to organization
   - Schedule publication dates
   - Provide summary and justification

7. **Change Log** (`/strategy-forge/change-log`)
   - View strategy change history
   - Audit trail of all edits

8. **Competitors** (`/strategy-forge/competitors`)
   - List all competitors
   - Generate AI-suggested competitors
   - View competitor details
   - Track competitor signals

9. **Company Information** (`/strategy-forge/company-information`)
   - Edit company messaging and positioning
   - Set problem/solution narratives
   - Configure style guides and prompts

10. **Personas** (`/strategy-forge/personas`)
    - List all customer personas
    - Create AI-generated personas
    - Edit persona details and targeting criteria

11. **Segments** (`/strategy-forge/segments`)
    - Manage market segments or organizational groupings
    - Generate AI-suggested segments
    - Define segment codes and external IDs
    - Organize market segments

12. **Customer Journey Stages** (`/strategy-forge/customer-journey-stages`)
    - Define journey stages by phase
    - Drag-and-drop reordering
    - Track graduation criteria

## 🔌 API Functions

All API functions are fully typed and include:
- Authentication checks
- Customer isolation
- Error handling

### Strategy Foundation API
```typescript
getCompanyStrategy()                      // Get company strategy
updateMission(payload)                     // Update mission
updateVision(payload)                     // Update vision
getPrinciples()                            // Get principles
createPrinciple(payload)                   // Create principle
updatePrinciple(id, payload)              // Update principle
deletePrinciple(id)                        // Delete principle
reorderPrinciples(orderMap)               // Reorder principles
getValues()                                // Get values
createValue(payload)                       // Create value
updateValue(id, payload)                   // Update value
deleteValue(id)                            // Delete value
reorderValues(orderMap)                    // Reorder values
publishStrategy(payload)                   // Publish strategy
getChangeLogs(params)                      // Get change logs
```

### Personas API
```typescript
PersonasAPI.getAll()                       // Get all personas
PersonasAPI.getById(id)                    // Get single persona
PersonasAPI.create(data, userId)           // Create persona
PersonasAPI.update(data, userId)           // Update persona
PersonasAPI.delete(id)                     // Delete persona
```

### Customer Info API
```typescript
getOrCreateCustomerInfo()                  // Get or create info
getCustomerInfoById(id)                    // Get by ID
updateCustomerInfo(payload)                // Update info
getCustomerInfo()                          // List all (legacy)
```

### Segments API
```typescript
getSegmentsList(params)                    // List segments
getSegmentById(id)                         // Get single segment
createSegment(payload)                     // Create segment
updateSegment(id, payload)                 // Update segment
deleteSegment(id)                          // Delete segment
```

### Customer Journey Stages API
```typescript
getCustomerJourneyStagesList(params)       // List stages
getCustomerJourneyStageById(id)            // Get single stage
createCustomerJourneyStage(payload)        // Create stage
updateCustomerJourneyStage(id, payload)    // Update stage
deleteCustomerJourneyStage(id)             // Delete stage
```

### Edge Functions

#### **create-initial-customer-strategy-for-customer-id**
- Creates initial company strategy with GTM fields
- Generates mission, vision, principles, values from customer info
- Requires customer_id in request body

#### **create-persona**
- Creates a new persona record
- Requires customer_id, name, and description
- Returns created persona with full details

#### **get-competitor-list-for-customer-id**
- Generates AI-suggested competitors based on customer info
- Uses OpenAI to analyze company and suggest competitors
- Inserts suggestions into competitors table

#### **suggest-personas-for-customer-id**
- Generates AI-suggested personas based on customer info
- Uses OpenAI to analyze company and suggest buyer personas
- Returns suggestions without inserting (user must confirm)

#### **suggest-segments-for-customer-id**
- Generates AI-suggested market segments
- Analyzes customer website and company information
- Creates segment records automatically

## 📊 Type Definitions

All database tables have corresponding TypeScript interfaces:

### Strategy Foundation
- `CompanyStrategy` - Full strategy record
- `StrategyPrinciple` - Principle record
- `StrategyValue` - Value record
- `StrategyChangeLog` - Change log record
- `CreatePrinciplePayload` - Principle creation payload
- `UpdatePrinciplePayload` - Principle update payload
- `CreateValuePayload` - Value creation payload
- `UpdateValuePayload` - Value update payload
- `PublishStrategyPayload` - Strategy publication payload

### Competitors
- `Competitor` - Full competitor record
- `CompetitorSignal` - Competitor signal record
- `CreateCompetitorPayload` - Competitor creation payload
- `UpdateCompetitorPayload` - Competitor update payload

### Personas
- `Persona` - Full persona record
- `CreatePersonaData` - Creation payload
- `UpdatePersonaData` - Update payload

### Customer Info
- `CustomerInfo` - Full customer info record
- `CreateCustomerInfoPayload` - Creation payload
- `UpdateCustomerInfoPayload` - Update payload

### Segments
- `Segment` - Full segment record
- `CreateSegmentPayload` - Creation payload
- `UpdateSegmentPayload` - Update payload
- `GetSegmentsParams` - List filters
- `GetSegmentsResponse` - Paginated response

### Customer Journey Stages
- `CustomerJourneyStage` - Full stage record
- `JourneyPhaseType` - Phase enum
- `CreateCustomerJourneyStagePayload` - Creation payload
- `UpdateCustomerJourneyStagePayload` - Update payload
- `GetCustomerJourneyStagesParams` - List filters
- `GetCustomerJourneyStagesResponse` - Paginated response

## 🚀 Usage Examples

### Creating a Persona
```typescript
import { PersonasAPI } from '@/app/(features)/strategy-forge/lib/api';

const persona = await PersonasAPI.create({
  name: 'Marketing Manager',
  titles: 'Marketing Manager, Digital Marketing Lead',
  department: 'Marketing',
  job_responsibilities: 'Oversee digital campaigns...',
  is_manager: true,
  is_decider: true,
  // ... other fields
}, userId);
```

### Fetching Segments
```typescript
import { getSegmentsList } from '@/app/(features)/strategy-forge/lib/api';

const { data, meta } = await getSegmentsList({
  page: 1,
  perPage: 20,
  search: 'north',
});
```

### Updating Company Info
```typescript
import { updateCustomerInfo } from '@/app/(features)/strategy-forge/lib/api';

const updated = await updateCustomerInfo({
  customer_info_id: 'uuid',
  tagline: 'New tagline',
  problem_overview: 'Updated problem...',
});
```

## 🎯 Key Features

### Strategy Foundation
- ✅ Mission and vision statement management
- ✅ Strategic principles with ordering
- ✅ Company values with ordering
- ✅ Strategy publication workflow
- ✅ Change log and audit trail
- ✅ AI-powered initial strategy generation

### Competitor Intelligence
- ✅ Competitor tracking and management
- ✅ AI-powered competitor suggestions
- ✅ Competitor signals and events
- ✅ Status and source tracking
- ✅ Website and category information

### Persona Management
- ✅ AI-powered persona generation
- ✅ Rich persona profiles with pain points and goals
- ✅ Solution-relevant analysis
- ✅ Decision maker identification
- ✅ Buying behavior insights

### Segment Organization
- ✅ Market segments and organizational groupings
- ✅ AI-powered segment suggestions
- ✅ External system integration
- ✅ Code-based categorization
- ✅ Customer isolation

### Company Messaging
- ✅ Editable company information
- ✅ Problem/solution narratives
- ✅ Competitive positioning
- ✅ Style guides and prompts
- ✅ Inline editing UI

### Journey Mapping
- ✅ Phase-based organization (Marketing, Sales, Onboarding, Customer Success)
- ✅ System-wide default stage templates
- ✅ Customer-specific stage customization
- ✅ Drag-and-drop ordering
- ✅ Graduation criteria tracking
- ✅ Code-based identification
- ✅ Automatic ordering

## 🔮 Future Enhancements

### Planned Features
- [ ] Persona-to-content mapping
- [ ] Segment-to-content mapping
- [ ] Journey stage-to-content mapping
- [ ] Persona recommendations based on content
- [ ] Segment performance analytics
- [ ] Journey stage analytics
- [ ] Import personas from CSV
- [ ] Export personas to JSON/CSV

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Supabase project with database access
- Next.js 14+
- Material UI Joy

### Setup
1. Database tables should already exist
2. If not, run `lib/sql/strategy-forge-create.sql` in Supabase SQL Editor
3. Run `lib/sql/strategy-forge-rls-policies.sql` to set up RLS policies
4. Verify RLS policies are enabled
5. Test customer isolation
6. Deploy Edge Functions using `supabase functions deploy`

### Feature Registry

This feature is registered in the Baseplate Feature Registry. To enable/disable or configure:

```json
{
  "slug": "strategy-forge",
  "enabled": true,
  "version": "1.0.0",
  "path": "/strategy-forge",
  "displayName": "Strategy Forge",
  "description": "Strategy management system for defining customer personas, market segments, company information, and customer journey stages.",
  "dependencies": [],
  "order": 10
}
```

See the [Baseplate Feature Registry documentation](https://1to100.com/baseplate/features/feature-registry/) for more details.

### Import Patterns

**Within the feature:**
```typescript
import { PersonasAPI } from '../lib/api';
import type { Persona } from '../lib/types';
```

**From outside the feature:**
```typescript
// Using root feature export (recommended for portability)
import { PersonasAPI, type Persona } from '@/app/(scalekit)/strategy-forge';

// Or using direct paths
import { PersonasAPI } from '@/app/(scalekit)/strategy-forge/lib/api';
import type { Persona } from '@/app/(scalekit)/strategy-forge/lib/types';
```

## 📝 Notes

- All customer-scoped tables use `customer_id` for multi-tenancy
- System-scoped option tables are shared across all customers
- Strategy foundation tables (company_strategies, principles, values) have one-to-one relationship with customers
- Personas support AI generation via OpenAI integration
- Competitors support AI-powered suggestions
- Segments support AI-powered suggestions and external system integration
- Journey stages support drag-and-drop reordering and system-wide templates
- All timestamps are `timestamptz` (with timezone)
- Customer info has one-to-one relationship with customers
- Edge Functions require proper JWT authentication and customer_id in request body
- RLS policies enforce customer isolation using `can_access_customer()` function

## 🤝 Contributing

When adding features:
1. Update types in `lib/types/`
2. Add API functions in `lib/api/`
3. Create reusable components in `lib/components/`
4. Update this README with new functionality
5. Follow the feature isolation pattern

## 📄 License

Internal use only - 1to100 Baseplate

