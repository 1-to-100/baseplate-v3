import { z } from 'zod';

export const journeyPhaseSchema = z.enum(['Marketing', 'Sales', 'Onboarding', 'Customer Success']);

export const createCustomerJourneyStageSchema = z.object({
  journey_phase: journeyPhaseSchema,
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters'),
  graduation_criteria: z
    .string()
    .min(1, 'Graduation criteria is required')
    .max(1000, 'Graduation criteria must be less than 1000 characters'),
  order_index: z.number().int().min(0).max(32767).optional().nullable(),
  code: z.string().max(50, 'Code must be less than 50 characters').optional().nullable(),
});

export const updateCustomerJourneyStageSchema = z.object({
  journey_phase: journeyPhaseSchema.optional(),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  graduation_criteria: z
    .string()
    .min(1, 'Graduation criteria is required')
    .max(1000, 'Graduation criteria must be less than 1000 characters')
    .optional(),
  order_index: z.number().int().min(0).max(32767).optional().nullable(),
  code: z.string().max(50, 'Code must be less than 50 characters').optional().nullable(),
});

export type CreateCustomerJourneyStageFormData = z.infer<typeof createCustomerJourneyStageSchema>;
export type UpdateCustomerJourneyStageFormData = z.infer<typeof updateCustomerJourneyStageSchema>;
