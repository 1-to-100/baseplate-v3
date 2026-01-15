import { z } from 'zod';

const optionalLongText = z
  .string()
  .max(5000, 'Keep responses under 5000 characters')
  .optional()
  .transform((value) => value?.trim() ?? '');

const optionalShortText = z
  .string()
  .max(255, 'Keep responses under 255 characters')
  .optional()
  .transform((value) => value?.trim() ?? '');

export const personaFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or fewer')
    .transform((value) => value.trim()),
  titles: optionalShortText,
  department: optionalShortText,
  job_responsibilities: optionalLongText,
  is_manager: z.boolean().default(false),
  experience_years: optionalShortText,
  education_levels: optionalLongText,
  pain_points_html: optionalLongText,
  goals_html: optionalLongText,
  solution_relevant_pain_points_html: optionalLongText,
  solution_relevant_goals_html: optionalLongText,
  current_solutions_html: optionalLongText,
  switching_costs_html: optionalLongText,
  unsatisfied_with_html: optionalLongText,
  ideal_outcome_html: optionalLongText,
  buying_behavior: optionalLongText,
  digital_savviness: optionalLongText,
  is_decider: z.boolean().default(false),
});

export type PersonaFormData = z.infer<typeof personaFormSchema>;
