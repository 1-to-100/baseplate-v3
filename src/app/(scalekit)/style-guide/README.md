# Style Guide Feature

The Style Guide feature combines both **Written Style Guide (VoiceOS)** and **Visual Style Guide (VisualOS)** into a unified system for managing brand identity and content standards.

## Overview

This feature centralizes a company's communication rules—both written and visual—into machine-readable style guides that ensure consistency across all content creation, AI generation, and brand touchpoints.

### Written Style Guide (VoiceOS)
Codifies brand personality, voice attributes, approved/prohibited vocabulary, framing metaphors, inclusivity constraints, pacing, sentence-length preferences, and compliance rules.

### Visual Style Guide (VisualOS)
Manages visual brand identity including color palettes, typography styles, logo assets, and social media templates.

## Directory Structure

```
/src/app/(features)/style-guide/
├── sql/
│   └── create-tables.sql           # Database migration file
├── types/
│   ├── database.ts                 # Database table type definitions (both written & visual)
│   ├── api.ts                      # API request/response types
│   ├── validation.ts               # Zod validation schemas
│   └── index.ts                    # Type exports
├── api/
│   ├── style-guides.ts             # Written style guides CRUD
│   ├── framing-concepts.ts         # Framing concepts CRUD
│   ├── compliance-rules.ts         # Compliance rules CRUD
│   ├── vocabulary-entries.ts       # Vocabulary entries CRUD
│   ├── content-evaluations.ts      # Content evaluations CRUD
│   ├── evaluation-rule-hits.ts     # Evaluation rule hits CRUD
│   ├── compliance-reviews.ts       # Compliance reviews CRUD
│   ├── option-items.ts             # Option singleton tables (read-only)
│   ├── visual_style_guides.ts      # Visual style guides CRUD
│   ├── logo_assets.ts              # Logo assets CRUD
│   ├── palette_colors.ts           # Color palettes CRUD
│   ├── typography_styles.ts        # Typography styles CRUD
│   ├── social_templates.ts         # Social templates CRUD
│   ├── options.ts                  # Visual options
│   ├── context.ts                  # Context utilities
│   └── index.ts                    # API exports
├── hooks/
│   ├── use-style-guides.ts         # Written style guide hooks
│   ├── use-compliance-*.ts         # Compliance-related hooks
│   ├── use-vocabulary-entries.ts   # Vocabulary hooks
│   ├── use-framing-concepts.ts     # Framing hooks
│   ├── use-visual-style-guides.ts  # Visual style guide hooks
│   ├── use-logo-assets.ts          # Logo management hooks
│   ├── use-palette-colors.ts       # Color palette hooks
│   ├── use-typography-styles.ts    # Typography hooks
│   ├── use-social-templates.ts     # Social templates hooks
│   └── index.ts                    # Hook exports
├── components/
│   ├── style-guide-editor/         # Written style guide editor
│   ├── compliance-rules/           # Compliance rules management
│   ├── vocabulary/                 # Vocabulary management
│   ├── framing-concepts/           # Framing concepts management
│   ├── create-visual-style-guide-wizard.tsx  # Visual style guide wizard
│   ├── publish-modal.tsx           # Publishing modal
│   └── evaluation-results-modal/   # Evaluation results display
├── pages/
│   ├── style-guide/                # Written style guide editor page
│   ├── compliance-rules/           # Compliance rules page
│   ├── vocabulary/                 # Vocabulary management page
│   ├── framing-concepts/           # Framing concepts page
│   ├── visual-guides/              # Visual style guide pages
│   │   ├── [guideId]/              # Visual guide detail pages
│   │   │   ├── colors/             # Color palette editor
│   │   │   ├── imagery/            # Imagery guidelines
│   │   │   ├── logos/              # Logo assets
│   │   │   └── templates/          # Social templates
│   │   └── create/                 # Create visual guide
│   └── diagnostics/                # Written style guide diagnostics
├── diagnostics-visual/             # Visual style guide diagnostics
├── lib/
│   ├── api/                        # API functions
│   ├── components/                 # Shared components
│   ├── edge/                       # Edge functions
│   │   └── create_initial_written_style_guide/  # AI style guide generation
│   ├── hooks/                      # React hooks
│   └── sql/                        # SQL migrations
└── README.md                       # This file
```

## Database Schema

### Written Style Guide Tables

**Primary Table:**
- `style_guides` - Customer-scoped written style guides

**Secondary Tables:**
- `framing_concepts` - Metaphors and framing options
- `compliance_rules` - Compliance rules and validation
- `vocabulary_entries` - Preferred/prohibited terms
- `content_evaluations` - Content evaluation results
- `evaluation_rule_hits` - Detailed rule violations
- `compliance_reviews` - Review workflow records

**Option Singleton Tables:**
- `language_level_option_items` - Reading level complexity
- `use_of_jargon_option_items` - Jargon usage policies
- `storytelling_option_items` - Storytelling styles
- `humor_usage_option_items` - Humor guidelines
- `pacing_option_items` - Content pacing
- `sentence_option_items_singleton` - Sentence length
- `formality_option_items` - Formality levels
- `compliance_rule_type_option_items` - Rule types

### Visual Style Guide Tables

(Visual style guide tables are documented separately - see VisualOS documentation)

## API Usage

### Written Style Guide Example

```typescript
import { 
  getStyleGuideById, 
  createStyleGuide,
  useActiveStyleGuide 
} from '@/app/(scalekit)/style-guide';

// Get active style guide (hook)
const { data: styleGuide, isLoading } = useActiveStyleGuide();

// Create a style guide (API)
const newGuide = await createStyleGuide({
  customer_id: 'uuid',
  guide_name: 'Company Voice Guidelines',
  brand_voice: 'Trustworthy, Conversational, Expert',
  brand_personality: 'We are the trusted advisor...',
  active: true,
});
```

### Visual Style Guide Example

```typescript
import { 
  useVisualStyleGuides,
  useCreatePaletteColor 
} from '@/app/(scalekit)/style-guide';

// Get visual style guides
const { data: guides, isLoading } = useVisualStyleGuides();

// Add a color to palette
const createColor = useCreatePaletteColor();
await createColor.mutateAsync({
  visual_style_guide_id: 'uuid',
  color_name: 'Primary Blue',
  hex_value: '#0066CC',
});
```

## Type Safety

All types are available from the main export:

```typescript
import type {
  // Written Style Guide types
  StyleGuide,
  FramingConcept,
  ComplianceRule,
  VocabularyEntry,
  
  // Visual Style Guide types
  VisualStyleGuide,
  LogoAsset,
  PaletteColor,
  TypographyStyle,
  
  // Payload types
  CreateStyleGuidePayload,
  UpdateStyleGuidePayload,
} from '@/app/(scalekit)/style-guide/lib/types';
```

## Key Features

### Written Style Guide (VoiceOS)
- ✅ Machine-readable brand voice definition
- ✅ Vocabulary management (preferred/prohibited)
- ✅ Framing concepts and metaphors
- ✅ Compliance rule engine
- ✅ Real-time content evaluation

### Visual Style Guide (VisualOS)
- ✅ Color palette management
- ✅ Typography system definition
- ✅ Logo asset library
- ✅ Social media templates
- ✅ Brand consistency checking
- ✅ Visual guidelines documentation

## Row Level Security (RLS)

All tables have RLS enabled with policies that enforce:

- **System Scope Tables**: Viewable by all authenticated users, editable only by system administrators
- **Customer Scope Tables**: Accessible by system admins, customer success (for assigned customers), and customer admins for their customer
- **User Scope Tables**: Editable by creators and reviewers based on ownership and assignment

## Diagnostics

Comprehensive diagnostics pages are available for testing:

- **Written Style Guide**: `/style-guide/pages/diagnostics`
- **Visual Style Guide**: `/style-guide/diagnostics-visual`

These pages test all API functions, RLS policies, and database schema integrity.

## Migration & Setup

1. Database tables were created during feature installation
2. Default option values have been populated
3. RLS policies are enabled and enforced
4. Edge functions are available for AI-powered generation

## Best Practices

1. **Use consolidated imports** - Import from `@/app/(scalekit)/style-guide` for all functionality
2. **Validate inputs** - Use Zod schemas for validation
3. **Handle errors gracefully** - All API functions throw errors that should be caught
4. **Respect RLS** - UI should reflect access control policies
5. **Maintain one active guide** - Only one active written style guide per customer (MVP)
6. **Version visual guides** - Visual guides support versioning and publishing workflow

## Routes

### Written Style Guide
- `/style-guide/pages/style-guide` - Main editor
- `/style-guide/pages/compliance-rules` - Rules management
- `/style-guide/pages/vocabulary` - Vocabulary management
- `/style-guide/pages/framing-concepts` - Framing concepts

### Visual Style Guide
- `/style-guide/pages/visual-guides/create` - Create visual guide
- `/style-guide/pages/visual-guides/[guideId]` - Edit visual guide
- `/style-guide/pages/visual-guides/[guideId]/colors` - Color palette
- `/style-guide/pages/visual-guides/[guideId]/logos` - Logo assets
- `/style-guide/pages/visual-guides/[guideId]/templates` - Social templates

## Integration Points

- **Content Forge**: Uses style guides for content evaluation and compliance
- **AI Generation**: Edge functions leverage style guides for consistent output
- **Brand System**: Visual guides integrate with design system tokens
