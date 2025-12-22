import { z } from "zod";

const uuidSchema = z.string().uuid();
const isoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/, "Expected ISO-8601 timestamp"));

const nullableString = z
  .string()
  .trim()
  .min(1)
  .max(4000)
  .nullable()
  .optional();

export const createCompanyStrategyInputSchema = z.object({
  strategy_id: uuidSchema.optional(),
  mission: z.string().trim().min(1).max(400),
  mission_description: nullableString,
  vision: z.string().trim().min(1).max(800),
  vision_description: nullableString,
  publication_status_id: uuidSchema,
  owner_user_id: uuidSchema.nullable().optional(),
  is_published: z.boolean().optional(),
  effective_at: isoDateTimeSchema.nullable().optional(),
});

export const updateCompanyStrategyInputSchema = z
  .object({
    mission: z.string().trim().min(1).max(400).optional(),
    mission_description: nullableString,
    vision: z.string().trim().min(1).max(800).optional(),
    vision_description: nullableString,
    publication_status_id: uuidSchema.optional(),
    owner_user_id: uuidSchema.nullable().optional(),
    is_published: z.boolean().optional(),
    effective_at: isoDateTimeSchema.nullable().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided to update a strategy.",
  });

export const createStrategyPrincipleInputSchema = z.object({
  strategy_id: uuidSchema,
  name: z.string().trim().min(1).max(120),
  description: nullableString,
  order_index: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

export const updateStrategyPrincipleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: nullableString,
    order_index: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided to update a strategy principle.",
  });

export const createStrategyValueInputSchema = z.object({
  strategy_id: uuidSchema,
  name: z.string().trim().min(1).max(120),
  description: nullableString,
  order_index: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

export const updateStrategyValueInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    description: nullableString,
    order_index: z.number().int().min(0).optional(),
    is_active: z.boolean().optional(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided to update a strategy value.",
  });

const optionalUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .url()
  .or(z.string().trim().max(2048))
  .optional()
  .nullable();

export const createCompetitorInputSchema = z.object({
  name: z.string().trim().min(1).max(255),
  website_url: optionalUrlSchema,
  category: z.string().trim().max(255).optional().nullable(),
  summary: nullableString,
  status_id: uuidSchema,
  source_id: uuidSchema.optional().nullable(),
});

export const updateCompetitorInputSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    website_url: optionalUrlSchema,
    category: z.string().trim().max(255).optional().nullable(),
    summary: nullableString,
    status_id: uuidSchema.optional(),
    source_id: uuidSchema.optional().nullable(),
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided to update a competitor.",
  });

export const createCompetitorSignalInputSchema = z.object({
  competitor_id: uuidSchema,
  signal_type_id: uuidSchema,
  observed_at: isoDateTimeSchema.optional(),
  source_url: optionalUrlSchema,
  note: nullableString,
});

export const updateCompetitorSignalInputSchema = z
  .object({
    signal_type_id: uuidSchema.optional(),
    observed_at: isoDateTimeSchema.optional(),
    source_url: optionalUrlSchema,
    note: nullableString,
  })
  .refine((val) => Object.keys(val).length > 0, {
    message: "At least one field must be provided to update a competitor signal.",
  });

export const createStrategyChangeLogInputSchema = z.object({
  strategy_id: uuidSchema,
  change_type_id: uuidSchema,
  summary: z.string().trim().min(1).max(240),
  justification: nullableString,
  meta: z.record(z.any()).optional().nullable(),
});

const baseOptionUpsertSchema = z.object({
  programmatic_name: z.string().trim().min(1).max(120),
  display_name: z.string().trim().min(1).max(180),
  description: nullableString,
  sort_order: z.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

export const createOptionInputSchema = baseOptionUpsertSchema;
export const updateOptionInputSchema = baseOptionUpsertSchema.partial().refine(
  (val) => Object.keys(val).length > 0,
  {
    message: "At least one field must be provided to update an option record.",
  }
);

export type CreateCompanyStrategyInput = z.infer<typeof createCompanyStrategyInputSchema>;
export type UpdateCompanyStrategyInput = z.infer<typeof updateCompanyStrategyInputSchema>;
export type CreateStrategyPrincipleInput = z.infer<typeof createStrategyPrincipleInputSchema>;
export type UpdateStrategyPrincipleInput = z.infer<typeof updateStrategyPrincipleInputSchema>;
export type CreateStrategyValueInput = z.infer<typeof createStrategyValueInputSchema>;
export type UpdateStrategyValueInput = z.infer<typeof updateStrategyValueInputSchema>;
export type CreateCompetitorInput = z.infer<typeof createCompetitorInputSchema>;
export type UpdateCompetitorInput = z.infer<typeof updateCompetitorInputSchema>;
export type CreateCompetitorSignalInput = z.infer<typeof createCompetitorSignalInputSchema>;
export type UpdateCompetitorSignalInput = z.infer<typeof updateCompetitorSignalInputSchema>;
export type CreateStrategyChangeLogInput = z.infer<typeof createStrategyChangeLogInputSchema>;
export type CreateOptionInput = z.infer<typeof createOptionInputSchema>;
export type UpdateOptionInput = z.infer<typeof updateOptionInputSchema>;


