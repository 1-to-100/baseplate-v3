import { createClient } from '@/lib/supabase/client';
import type {
  PersonasFeatureMapping,
  PersonasFeatureMappingWithPersona,
  CreatePersonasFeatureMappingPayload,
  UpdatePersonasFeatureMappingPayload,
} from '@/types/personas-feature-mappings';

const supabase = createClient();

export class PersonasFeatureMappingsAPI {
  /**
   * Get all persona-feature mappings for a specific feature
   */
  static async getByFeatureId(featureId: string): Promise<PersonasFeatureMappingWithPersona[]> {
    // First, get the customer_id from the feature's product to verify access
    const { data: featureWithCustomer, error: featureError } = await supabase
      .from('features')
      .select(
        `
        feature_id,
        products!inner(customer_id)
      `
      )
      .eq('feature_id', featureId)
      .single();

    if (featureError || !featureWithCustomer) {
      throw new Error(`Feature not found: ${featureError?.message || 'Feature not found'}`);
    }

    // Extract customer_id from the product
    const customerId = (featureWithCustomer.products as any).customer_id;
    if (!customerId) {
      throw new Error("Feature's product does not have a customer_id");
    }

    // Check if user can access this customer
    const { data: canAccess, error: accessError } = await supabase.rpc('can_access_customer', {
      target_customer_id: customerId,
    });

    if (accessError) {
      throw new Error(`Failed to check customer access: ${accessError.message}`);
    }

    if (!canAccess) {
      throw new Error('You do not have permission to access persona mappings for this feature');
    }

    // Fetch the mappings first (without join to avoid RLS filtering on personas)
    const { data: mappings, error: mappingsError } = await supabase
      .from('personas_feature_mappings')
      .select('*')
      .eq('feature_id', featureId)
      .order('created_at', { ascending: false });

    if (mappingsError) {
      throw new Error(`Failed to fetch persona-feature mappings: ${mappingsError.message}`);
    }

    if (!mappings || mappings.length === 0) {
      return [];
    }

    // Fetch personas separately using the feature's product's customer_id
    // This avoids RLS filtering issues when joining
    const personaIds = mappings.map((m) => m.persona_id);
    const { data: personas, error: personasError } = await supabase
      .from('personas')
      .select('*')
      .in('persona_id', personaIds)
      .eq('customer_id', customerId); // Explicitly filter by the feature's customer_id

    if (personasError) {
      throw new Error(`Failed to fetch personas: ${personasError.message}`);
    }

    // Combine mappings with personas
    const personaMap = new Map((personas || []).map((p) => [p.persona_id, p]));
    return (mappings || []).map((mapping) => ({
      ...mapping,
      personas: personaMap.get(mapping.persona_id) || null,
    })) as PersonasFeatureMappingWithPersona[];
  }

  /**
   * Get a single persona-feature mapping by ID
   */
  static async getById(mappingId: string): Promise<PersonasFeatureMappingWithPersona | null> {
    const { data, error } = await supabase
      .from('personas_feature_mappings')
      .select(
        `
        *,
        personas:persona_id (*)
      `
      )
      .eq('personas_feature_mapping_id', mappingId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      throw new Error(`Failed to fetch persona-feature mapping: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new persona-feature mapping
   */
  static async create(
    mappingData: CreatePersonasFeatureMappingPayload
  ): Promise<PersonasFeatureMapping> {
    const { data, error } = await supabase
      .from('personas_feature_mappings')
      .insert(mappingData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create persona-feature mapping: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing persona-feature mapping
   */
  static async update(
    mappingId: string,
    updateData: UpdatePersonasFeatureMappingPayload
  ): Promise<PersonasFeatureMapping> {
    const { data, error } = await supabase
      .from('personas_feature_mappings')
      .update({
        ...updateData,
        updated_at: new Date().toISOString(),
      })
      .eq('personas_feature_mapping_id', mappingId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update persona-feature mapping: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a persona-feature mapping
   */
  static async delete(mappingId: string): Promise<void> {
    const { error } = await supabase
      .from('personas_feature_mappings')
      .delete()
      .eq('personas_feature_mapping_id', mappingId);

    if (error) {
      throw new Error(`Failed to delete persona-feature mapping: ${error.message}`);
    }
  }

  /**
   * Get all persona-feature mappings for a specific persona
   */
  static async getByPersonaId(personaId: string): Promise<PersonasFeatureMappingWithPersona[]> {
    const { data, error } = await supabase
      .from('personas_feature_mappings')
      .select(
        `
        *,
        personas:persona_id (*)
      `
      )
      .eq('persona_id', personaId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch persona-feature mappings: ${error.message}`);
    }

    return data || [];
  }
}

// Export individual functions for convenience
export const getPersonasFeatureMappingsByFeatureId = PersonasFeatureMappingsAPI.getByFeatureId;
export const getPersonasFeatureMappingById = PersonasFeatureMappingsAPI.getById;
export const createPersonasFeatureMapping = PersonasFeatureMappingsAPI.create;
export const updatePersonasFeatureMapping = PersonasFeatureMappingsAPI.update;
export const deletePersonasFeatureMapping = PersonasFeatureMappingsAPI.delete;
export const getPersonasFeatureMappingsByPersonaId = PersonasFeatureMappingsAPI.getByPersonaId;
