/**
 * Schema-driven mock data generator for Zod schemas
 *
 * Generates valid mock data based on Zod schema structure,
 * eliminating the need to manually craft test fixtures.
 *
 * Usage:
 * ```ts
 * import { generateMock, generateMockArray } from './mock-generator.ts';
 * import { MySchema } from '../../../path/to/schema.ts';
 *
 * const validData = generateMock(MySchema);
 * const validArray = generateMockArray(MySchema, 3);
 * ```
 */
import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

type ZodPrimitive = z.ZodString | z.ZodNumber | z.ZodBoolean;
type ZodComplex =
  | z.ZodObject<z.ZodRawShape>
  | z.ZodArray<z.ZodTypeAny>
  | z.ZodEnum<[string, ...string[]]>
  | z.ZodEffects<z.ZodTypeAny>;

type SupportedZodType = ZodPrimitive | ZodComplex;

interface MockOptions {
  /** Seed for deterministic generation (future use) */
  seed?: number;
  /** Override values for specific fields */
  overrides?: Record<string, unknown>;
  /** Number of items to generate for arrays (default: 2) */
  arrayLength?: number;
  /** Counter for generating unique values */
  counter?: number;
}

// ============================================================================
// Mock Value Generators
// ============================================================================

const SAMPLE_STRINGS: Record<string, string[]> = {
  hex: ['#1976D2', '#FF5733', '#333333', '#FFFFFF', '#4CAF50'],
  name: ['Primary Blue', 'Accent Orange', 'Text Dark', 'Background White', 'Success Green'],
  url: [
    'https://example.com',
    'https://competitor.io',
    'https://company.com',
    'https://service.net',
  ],
  website_url: [
    'https://acme.com',
    'https://competitor.io',
    'https://rival.com',
    'https://alternative.net',
  ],
  description: [
    'A comprehensive solution for enterprise needs.',
    'Leading provider of innovative services.',
    'Focused on delivering exceptional value.',
  ],
  department: ['Engineering', 'Marketing', 'Sales', 'Product', 'Operations'],
  default: ['Sample text', 'Test value', 'Mock string', 'Example content'],
};

const SAMPLE_HTML_LISTS: string[] = [
  '- Item one\n- Item two\n- Item three',
  '- First point\n- Second point',
  '- Key responsibility\n- Core function\n- Main task',
];

/**
 * Generate a string value based on field name hints
 */
function generateString(fieldName: string, counter: number): string {
  const lowerName = fieldName.toLowerCase();

  // Check for HTML/markdown list fields
  if (lowerName.includes('_html') || lowerName.includes('list')) {
    return SAMPLE_HTML_LISTS[counter % SAMPLE_HTML_LISTS.length];
  }

  // Check for URL fields
  if (lowerName.includes('url') || lowerName.includes('website')) {
    const urls = SAMPLE_STRINGS.website_url;
    return urls[counter % urls.length];
  }

  // Check for hex color
  if (lowerName.includes('hex') || lowerName.includes('color')) {
    const colors = SAMPLE_STRINGS.hex;
    return colors[counter % colors.length];
  }

  // Check for name field
  if (lowerName === 'name' || lowerName.includes('name')) {
    const names = SAMPLE_STRINGS.name;
    return names[counter % names.length];
  }

  // Check for description
  if (lowerName.includes('description')) {
    const descriptions = SAMPLE_STRINGS.description;
    return descriptions[counter % descriptions.length];
  }

  // Check for department
  if (lowerName.includes('department')) {
    const departments = SAMPLE_STRINGS.department;
    return departments[counter % departments.length];
  }

  // Default string
  const defaults = SAMPLE_STRINGS.default;
  return `${defaults[counter % defaults.length]} ${counter + 1}`;
}

/**
 * Generate a number value
 */
function generateNumber(schema: z.ZodNumber, counter: number): number {
  const checks = schema._def.checks || [];

  let isInt = false;
  let min: number | undefined;
  let max: number | undefined;

  for (const check of checks) {
    if (check.kind === 'int') isInt = true;
    if (check.kind === 'min') min = check.value as number;
    if (check.kind === 'max') max = check.value as number;
  }

  // Generate a reasonable number
  let value = counter + 1;

  if (min !== undefined && value < min) value = min;
  if (max !== undefined && value > max) value = max;

  return isInt ? Math.floor(value) : value;
}

/**
 * Generate a value from an enum
 */
function generateEnum(schema: z.ZodEnum<[string, ...string[]]>, counter: number): string {
  const options = schema._def.values;
  return options[counter % options.length];
}

// ============================================================================
// Main Generator
// ============================================================================

/**
 * Generate mock data for any supported Zod schema
 */
export function generateMock<T extends z.ZodTypeAny>(
  schema: T,
  options: MockOptions = {}
): z.infer<T> {
  const { overrides = {}, arrayLength = 2, counter = 0 } = options;

  return generateValue(schema, '', { ...options, counter, arrayLength, overrides });
}

/**
 * Generate an array of mock data
 */
export function generateMockArray<T extends z.ZodTypeAny>(
  schema: T,
  count: number,
  options: MockOptions = {}
): z.infer<T>[] {
  return Array.from({ length: count }, (_, i) =>
    generateMock(schema, { ...options, counter: i })
  );
}

/**
 * Internal: Generate a value for a specific schema type
 */
function generateValue(
  schema: z.ZodTypeAny,
  fieldName: string,
  options: MockOptions
): unknown {
  const { overrides = {}, arrayLength = 2, counter = 0 } = options;

  // Check for overrides first
  if (fieldName && fieldName in overrides) {
    return overrides[fieldName];
  }

  const typeName = schema._def.typeName;

  switch (typeName) {
    case 'ZodString':
      return generateString(fieldName, counter);

    case 'ZodNumber':
      return generateNumber(schema as z.ZodNumber, counter);

    case 'ZodBoolean':
      return counter % 2 === 0;

    case 'ZodEnum':
      return generateEnum(schema as z.ZodEnum<[string, ...string[]]>, counter);

    case 'ZodArray': {
      const arraySchema = schema as z.ZodArray<z.ZodTypeAny>;
      const itemSchema = arraySchema._def.type;

      return Array.from({ length: arrayLength }, (_, i) =>
        generateValue(itemSchema, fieldName, { ...options, counter: i })
      );
    }

    case 'ZodObject': {
      const objectSchema = schema as z.ZodObject<z.ZodRawShape>;
      const shape = objectSchema._def.shape();
      const result: Record<string, unknown> = {};

      for (const [key, valueSchema] of Object.entries(shape)) {
        result[key] = generateValue(valueSchema as z.ZodTypeAny, key, options);
      }

      return result;
    }

    case 'ZodEffects': {
      // Handle .strict() and other effects by unwrapping
      const effectsSchema = schema as z.ZodEffects<z.ZodTypeAny>;
      return generateValue(effectsSchema._def.schema, fieldName, options);
    }

    case 'ZodNullable': {
      // Handle .nullable() by unwrapping and generating the inner type
      const nullableSchema = schema as z.ZodNullable<z.ZodTypeAny>;
      return generateValue(nullableSchema._def.innerType, fieldName, options);
    }

    case 'ZodOptional': {
      // Handle .optional() by unwrapping and generating the inner type
      const optionalSchema = schema as z.ZodOptional<z.ZodTypeAny>;
      return generateValue(optionalSchema._def.innerType, fieldName, options);
    }

    default:
      // Fallback for unsupported types
      console.warn(`Unsupported Zod type: ${typeName} for field: ${fieldName}`);
      return null;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate mock data with specific field overrides
 */
export function generateMockWith<T extends z.ZodTypeAny>(
  schema: T,
  overrides: Partial<z.infer<T>>
): z.infer<T> {
  return generateMock(schema, { overrides: overrides as Record<string, unknown> });
}

/**
 * Generate invalid mock data by removing required fields
 * Useful for testing validation rejection
 */
export function generateInvalidMock<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T,
  fieldsToRemove: string[]
): Partial<z.infer<T>> {
  const mock = generateMock(schema);
  const result = { ...mock };

  for (const field of fieldsToRemove) {
    delete result[field];
  }

  return result;
}

/**
 * Generate mock data with extra fields (for testing strict mode rejection)
 */
export function generateMockWithExtra<T extends z.ZodTypeAny>(
  schema: T,
  extraFields: Record<string, unknown>
): z.infer<T> & Record<string, unknown> {
  const mock = generateMock(schema);
  return { ...mock, ...extraFields };
}

// ============================================================================
// Schema Introspection Helpers
// ============================================================================

/**
 * Get all field names from a Zod object schema
 */
export function getSchemaFields<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T
): string[] {
  const shape = schema._def.shape();
  return Object.keys(shape);
}

/**
 * Check if a schema has strict mode enabled
 */
export function isStrictSchema<T extends z.ZodObject<z.ZodRawShape>>(
  schema: T
): boolean {
  return schema._def.unknownKeys === 'strict';
}
