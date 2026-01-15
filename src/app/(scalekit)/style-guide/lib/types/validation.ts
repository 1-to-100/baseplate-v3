/**
 * Zod validation schemas for Voice OS feature
 * Used for validating request payloads and API responses
 */

import { z } from 'zod';

/**
 * UUID string validation
 */
const uuidSchema = z.string().uuid();

/**
 * Timestamp string validation
 */
const timestampSchema = z.string().datetime();

/**
 * Severity level validation (1-3)
 */
const severityLevelSchema = z.number().int().min(1).max(3);

/**
 * Vocabulary type validation
 */
const vocabularyTypeSchema = z.enum(['preferred', 'prohibited', 'neutral']);

/**
 * Compliance review status validation
 */
const complianceReviewStatusSchema = z.enum(['pending', 'approved', 'request_changes', 'blocked']);

/**
 * Language Level Option Item validation schema
 */
export const languageLevelOptionItemSchema = z.object({
  language_level_option_item_id: uuidSchema,
  name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.nullable(),
});

/**
 * Use of Jargon Option Item validation schema
 */
export const useOfJargonOptionItemSchema = z.object({
  use_of_jargon_option_item_id: uuidSchema,
  name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.nullable(),
});

/**
 * Storytelling Option Item validation schema
 */
export const storytellingOptionItemSchema = z.object({
  storytelling_option_item_id: uuidSchema,
  name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.nullable(),
});

/**
 * Humor Usage Option Item validation schema
 */
export const humorUsageOptionItemSchema = z.object({
  humor_usage_option_item_id: uuidSchema,
  name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.nullable(),
});

/**
 * Pacing Option Item validation schema
 */
export const pacingOptionItemSchema = z.object({
  pacing_option_item_id: uuidSchema,
  name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.nullable(),
});

/**
 * Sentence Option Item validation schema
 */
export const sentenceOptionItemSchema = z.object({
  sentence_option_items_id: uuidSchema,
  name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.nullable(),
});

/**
 * Formality Option Item validation schema
 */
export const formalityOptionItemSchema = z.object({
  formality_option_item_id: uuidSchema,
  name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.nullable(),
});

/**
 * Compliance Rule Type Option Item validation schema
 */
export const complianceRuleTypeOptionItemSchema = z.object({
  compliance_rule_type_option_item_id: uuidSchema,
  name: z.string().min(1),
  display_name: z.string().min(1),
  description: z.string().nullable(),
  sort_order: z.number().int().min(0),
  is_active: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema.nullable(),
});

/**
 * Style Guide validation schema
 */
export const styleGuideSchema = z.object({
  style_guide_id: uuidSchema,
  customer_id: uuidSchema,
  guide_name: z.string().min(1),
  brand_personality: z.string().nullable(),
  brand_voice: z.string().nullable(),
  formality_option_item_id: uuidSchema.nullable(),
  sentence_length_option_item_id: uuidSchema.nullable(),
  pacing_option_item_id: uuidSchema.nullable(),
  humor_usage_option_item_id: uuidSchema.nullable(),
  storytelling_style_option_item_id: uuidSchema.nullable(),
  use_of_jargon_option_item_id: uuidSchema.nullable(),
  language_level_option_item_id: uuidSchema.nullable(),
  inclusivity_guidelines: z.string().nullable(),
  llm_prompt_template: z.string().nullable(),
  active: z.boolean(),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

/**
 * Create Style Guide payload validation schema
 */
export const createStyleGuidePayloadSchema = z.object({
  customer_id: uuidSchema,
  guide_name: z.string().min(1),
  brand_personality: z.string().nullable().optional(),
  brand_voice: z.string().nullable().optional(),
  formality_option_item_id: uuidSchema.nullable().optional(),
  sentence_length_option_item_id: uuidSchema.nullable().optional(),
  pacing_option_item_id: uuidSchema.nullable().optional(),
  humor_usage_option_item_id: uuidSchema.nullable().optional(),
  storytelling_style_option_item_id: uuidSchema.nullable().optional(),
  use_of_jargon_option_item_id: uuidSchema.nullable().optional(),
  language_level_option_item_id: uuidSchema.nullable().optional(),
  inclusivity_guidelines: z.string().nullable().optional(),
  llm_prompt_template: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

/**
 * Update Style Guide payload validation schema
 */
export const updateStyleGuidePayloadSchema = z.object({
  style_guide_id: uuidSchema,
  guide_name: z.string().min(1).optional(),
  brand_personality: z.string().nullable().optional(),
  brand_voice: z.string().nullable().optional(),
  formality_option_item_id: uuidSchema.nullable().optional(),
  sentence_length_option_item_id: uuidSchema.nullable().optional(),
  pacing_option_item_id: uuidSchema.nullable().optional(),
  humor_usage_option_item_id: uuidSchema.nullable().optional(),
  storytelling_style_option_item_id: uuidSchema.nullable().optional(),
  use_of_jargon_option_item_id: uuidSchema.nullable().optional(),
  language_level_option_item_id: uuidSchema.nullable().optional(),
  inclusivity_guidelines: z.string().nullable().optional(),
  llm_prompt_template: z.string().nullable().optional(),
  active: z.boolean().optional(),
});

/**
 * Framing Concept validation schema
 */
export const framingConceptSchema = z.object({
  framing_concept_id: uuidSchema,
  style_guide_id: uuidSchema.optional(),
  written_style_guide_id: uuidSchema,
  name: z.string().min(1),
  description: z.string().nullable(),
  example_usage: z.string().nullable(),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

/**
 * Create Framing Concept payload validation schema
 */
export const createFramingConceptPayloadSchema = z
  .object({
    style_guide_id: uuidSchema.optional(),
    written_style_guide_id: uuidSchema.optional(),
    name: z.string().min(1),
    description: z.string().nullable().optional(),
    example_usage: z.string().nullable().optional(),
  })
  .refine(
    (data) => data.style_guide_id !== undefined || data.written_style_guide_id !== undefined,
    { message: 'Either style_guide_id or written_style_guide_id must be provided' }
  );

/**
 * Update Framing Concept payload validation schema
 */
export const updateFramingConceptPayloadSchema = z.object({
  framing_concept_id: uuidSchema,
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  example_usage: z.string().nullable().optional(),
});

/**
 * Compliance Rule validation schema
 */
export const complianceRuleSchema = z.object({
  compliance_rule_id: uuidSchema,
  customer_id: uuidSchema,
  style_guide_id: uuidSchema.nullable(),
  compliance_rule_type_option_item_id: uuidSchema.nullable(),
  name: z.string().min(1),
  rule_name: z.string().min(1),
  description: z.string().nullable(),
  rule_definition_json: z.record(z.unknown()).nullable(),
  rule_replacement: z.string().nullable(),
  severity_level: severityLevelSchema,
  is_active: z.boolean(),
  is_blocking: z.boolean(),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

/**
 * Create Compliance Rule payload validation schema
 */
export const createComplianceRulePayloadSchema = z.object({
  customer_id: uuidSchema,
  style_guide_id: uuidSchema.nullable().optional(),
  compliance_rule_type_option_item_id: uuidSchema.nullable().optional(),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  rule_definition_json: z.record(z.unknown()).nullable().optional(),
  rule_replacement: z.string().nullable().optional(),
  severity_level: severityLevelSchema.optional(),
  is_active: z.boolean().optional(),
  is_blocking: z.boolean().optional(),
});

/**
 * Update Compliance Rule payload validation schema
 */
export const updateComplianceRulePayloadSchema = z.object({
  compliance_rule_id: uuidSchema,
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  rule_definition_json: z.record(z.unknown()).nullable().optional(),
  compliance_rule_type_option_item_id: uuidSchema.nullable().optional(),
  rule_replacement: z.string().nullable().optional(),
  severity_level: severityLevelSchema.optional(),
  is_active: z.boolean().optional(),
  is_blocking: z.boolean().optional(),
});

/**
 * Vocabulary Entry validation schema
 */
export const vocabularyEntrySchema = z.object({
  vocabulary_entry_id: uuidSchema,
  style_guide_id: uuidSchema.optional(),
  written_style_guide_id: uuidSchema,
  name: z.string().min(1),
  vocabulary_type: vocabularyTypeSchema,
  suggested_replacement: z.string().nullable(),
  example_usage: z.string().nullable(),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

/**
 * Create Vocabulary Entry payload validation schema
 */
export const createVocabularyEntryPayloadSchema = z
  .object({
    style_guide_id: uuidSchema.optional(),
    written_style_guide_id: uuidSchema.optional(),
    name: z.string().min(1),
    vocabulary_type: vocabularyTypeSchema,
    suggested_replacement: z.string().nullable().optional(),
    example_usage: z.string().nullable().optional(),
  })
  .refine(
    (data) => data.style_guide_id !== undefined || data.written_style_guide_id !== undefined,
    { message: 'Either style_guide_id or written_style_guide_id must be provided' }
  );

/**
 * Update Vocabulary Entry payload validation schema
 */
export const updateVocabularyEntryPayloadSchema = z.object({
  vocabulary_entry_id: uuidSchema,
  name: z.string().min(1).optional(),
  vocabulary_type: vocabularyTypeSchema.optional(),
  suggested_replacement: z.string().nullable().optional(),
  example_usage: z.string().nullable().optional(),
});

/**
 * Content Evaluation validation schema
 */
export const contentEvaluationSchema = z.object({
  evaluation_id: uuidSchema,
  style_guide_id: uuidSchema.nullable(),
  written_style_guide_id: uuidSchema.nullable(),
  visual_style_guide_id: uuidSchema.nullable(),
  content_id: uuidSchema.nullable(),
  evaluation_status: z.string(),
  overall_score: z.number().nullable(),
  overall_severity: severityLevelSchema,
  blocked: z.boolean(),
  issues_count: z.number().int().min(0),
  autofix_suggestion: z.string().nullable(),
  evaluation_json: z.record(z.unknown()).nullable(),
  rule_hits_json: z.record(z.unknown()).nullable(),
  evaluation_metadata_json: z.record(z.unknown()).nullable(),
  evaluated_at: timestampSchema,
  completed_at: timestampSchema.nullable(),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

/**
 * Create Content Evaluation payload validation schema
 */
export const createContentEvaluationPayloadSchema = z.object({
  style_guide_id: uuidSchema.nullable().optional(),
  written_style_guide_id: uuidSchema.nullable().optional(),
  visual_style_guide_id: uuidSchema.nullable().optional(),
  content_id: uuidSchema.nullable().optional(),
  evaluation_status: z.string().optional(),
  overall_score: z.number().nullable().optional(),
  overall_severity: severityLevelSchema.optional(),
  blocked: z.boolean().optional(),
  issues_count: z.number().int().min(0).optional(),
  autofix_suggestion: z.string().nullable().optional(),
  evaluation_json: z.record(z.unknown()).nullable().optional(),
  rule_hits_json: z.record(z.unknown()).nullable().optional(),
  evaluation_metadata_json: z.record(z.unknown()).nullable().optional(),
  completed_at: timestampSchema.nullable().optional(),
});

/**
 * Update Content Evaluation payload validation schema
 */
export const updateContentEvaluationPayloadSchema = z.object({
  evaluation_id: uuidSchema,
  evaluation_status: z.string().optional(),
  overall_score: z.number().nullable().optional(),
  overall_severity: severityLevelSchema.optional(),
  blocked: z.boolean().optional(),
  issues_count: z.number().int().min(0).optional(),
  autofix_suggestion: z.string().nullable().optional(),
  evaluation_json: z.record(z.unknown()).nullable().optional(),
  rule_hits_json: z.record(z.unknown()).nullable().optional(),
  evaluation_metadata_json: z.record(z.unknown()).nullable().optional(),
  completed_at: timestampSchema.nullable().optional(),
});

/**
 * Evaluation Rule Hit validation schema
 */
export const evaluationRuleHitSchema = z.object({
  rule_hit_id: uuidSchema,
  evaluation_id: uuidSchema,
  compliance_rule_id: uuidSchema.nullable(),
  vocabulary_entry_id: uuidSchema.nullable(),
  framing_concept_id: uuidSchema.nullable(),
  rule_name: z.string().min(1),
  matched_text: z.string().nullable(),
  suggested_replacement: z.string().nullable(),
  suggestion: z.string().nullable(),
  severity_level: severityLevelSchema,
  is_blocking: z.boolean(),
  location: z.record(z.unknown()).nullable(),
  rule_metadata_json: z.record(z.unknown()).nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

/**
 * Create Evaluation Rule Hit payload validation schema
 */
export const createEvaluationRuleHitPayloadSchema = z.object({
  evaluation_id: uuidSchema,
  compliance_rule_id: uuidSchema.nullable().optional(),
  vocabulary_entry_id: uuidSchema.nullable().optional(),
  framing_concept_id: uuidSchema.nullable().optional(),
  rule_name: z.string().min(1),
  matched_text: z.string().nullable().optional(),
  suggested_replacement: z.string().nullable().optional(),
  suggestion: z.string().nullable().optional(),
  severity_level: severityLevelSchema.optional(),
  is_blocking: z.boolean().optional(),
  location: z.record(z.unknown()).nullable().optional(),
  rule_metadata_json: z.record(z.unknown()).nullable().optional(),
});

/**
 * Update Evaluation Rule Hit payload validation schema
 */
export const updateEvaluationRuleHitPayloadSchema = z.object({
  rule_hit_id: uuidSchema,
  compliance_rule_id: uuidSchema.nullable().optional(),
  vocabulary_entry_id: uuidSchema.nullable().optional(),
  framing_concept_id: uuidSchema.nullable().optional(),
  rule_name: z.string().min(1).optional(),
  matched_text: z.string().nullable().optional(),
  suggested_replacement: z.string().nullable().optional(),
  suggestion: z.string().nullable().optional(),
  severity_level: severityLevelSchema.optional(),
  is_blocking: z.boolean().optional(),
  location: z.record(z.unknown()).nullable().optional(),
  rule_metadata_json: z.record(z.unknown()).nullable().optional(),
});

/**
 * Compliance Review validation schema
 */
export const complianceReviewSchema = z.object({
  compliance_review_id: uuidSchema,
  evaluation_id: uuidSchema,
  content_id: uuidSchema.nullable(),
  assigned_reviewer_id: uuidSchema.nullable(),
  status: complianceReviewStatusSchema,
  action_notes: z.string().nullable(),
  llm_rewrite_suggestion: z.string().nullable(),
  requested_changes_json: z.record(z.unknown()).nullable(),
  created_by: uuidSchema.nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  resolved_at: timestampSchema.nullable(),
});

/**
 * Create Compliance Review payload validation schema
 */
export const createComplianceReviewPayloadSchema = z.object({
  evaluation_id: uuidSchema,
  content_id: uuidSchema.nullable().optional(),
  assigned_reviewer_id: uuidSchema.nullable().optional(),
  status: complianceReviewStatusSchema.optional(),
  action_notes: z.string().nullable().optional(),
  llm_rewrite_suggestion: z.string().nullable().optional(),
  requested_changes_json: z.record(z.unknown()).nullable().optional(),
});

/**
 * Update Compliance Review payload validation schema
 */
export const updateComplianceReviewPayloadSchema = z.object({
  compliance_review_id: uuidSchema,
  assigned_reviewer_id: uuidSchema.nullable().optional(),
  status: complianceReviewStatusSchema.optional(),
  action_notes: z.string().nullable().optional(),
  llm_rewrite_suggestion: z.string().nullable().optional(),
  requested_changes_json: z.record(z.unknown()).nullable().optional(),
  resolved_at: timestampSchema.nullable().optional(),
});
