import type { Persona } from '@/app/(scalekit)/strategy-forge/lib/types/persona';

export interface PersonasFeatureMapping {
  personas_feature_mapping_id: string;
  feature_id: string;
  persona_id: string;
  created_at: string;
  updated_at: string;
}

export interface PersonasFeatureMappingWithPersona extends PersonasFeatureMapping {
  personas: Persona | null;
}

export interface CreatePersonasFeatureMappingPayload {
  feature_id: string;
  persona_id: string;
}

export interface UpdatePersonasFeatureMappingPayload {
  feature_id?: string;
  persona_id?: string;
}
