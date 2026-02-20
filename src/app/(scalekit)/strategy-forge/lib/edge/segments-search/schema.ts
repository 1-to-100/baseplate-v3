/**
 * Zod schema for segments-search request/response
 */
import { z } from 'npm:zod@3.24.1';

export const SegmentFilterDtoSchema = z
  .object({
    country: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    employees: z
      .union([z.string(), z.array(z.string())])
      .nullable()
      .optional(),
    categories: z.array(z.string()).optional(),
    technographics: z.array(z.string()).optional(),
    personas: z.array(z.number()).optional(),
  })
  .strict();

export const SearchByFiltersRequestSchema = z
  .object({
    filters: SegmentFilterDtoSchema,
    page: z.number().int().min(1).optional(),
    perPage: z.number().int().min(1).optional(),
  })
  .strict();

const LocationSchema = z
  .object({
    country: z.object({ name: z.string().optional() }).optional(),
    city: z.object({ name: z.string().optional() }).optional(),
    region: z.object({ name: z.string().optional() }).optional(),
  })
  .optional();

export const CompanyPreviewSchema = z.object({
  id: z.string(),
  diffbotId: z.string(),
  name: z.string(),
  fullName: z.string().optional(),
  logo: z.string().optional(),
  type: z.string().optional(),
  location: LocationSchema,
  nbEmployees: z.number().optional(),
  nbEmployeesMin: z.number().optional(),
  nbEmployeesMax: z.number().optional(),
  categories: z.array(z.object({ name: z.string() })).optional(),
  homepageUri: z.string().optional(),
});

export const SearchByFiltersResponseSchema = z.object({
  data: z.array(CompanyPreviewSchema),
  totalCount: z.number(),
  page: z.number(),
  perPage: z.number(),
  diffbotQueries: z.array(z.string()),
});

export type SegmentFilterDto = z.infer<typeof SegmentFilterDtoSchema>;
export type SearchByFiltersRequest = z.infer<typeof SearchByFiltersRequestSchema>;
export type CompanyPreview = z.infer<typeof CompanyPreviewSchema>;
export type SearchByFiltersResponse = z.infer<typeof SearchByFiltersResponseSchema>;

export function safeParseSearchByFiltersRequest(
  data: unknown
): z.SafeParseReturnType<unknown, SearchByFiltersRequest> {
  return SearchByFiltersRequestSchema.safeParse(data);
}

export function safeParseSearchByFiltersResponse(
  data: unknown
): z.SafeParseReturnType<unknown, SearchByFiltersResponse> {
  return SearchByFiltersResponseSchema.safeParse(data);
}
