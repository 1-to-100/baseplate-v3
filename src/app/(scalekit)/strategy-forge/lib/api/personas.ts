import { createClient } from '@/lib/supabase/client';
import type { Persona, CreatePersonaData, UpdatePersonaData } from '../types';

const supabase = createClient();

export class PersonasAPI {
  /**
   * Get all personas for the current customer
   */
  static async getAll(customerIdOverride?: string): Promise<Persona[]> {
    const customerId = await this.getCurrentCustomerId(customerIdOverride);
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch personas: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a single persona by ID for the current customer
   */
  static async getById(personaId: string, customerIdOverride?: string): Promise<Persona | null> {
    const customerId = await this.getCurrentCustomerId(customerIdOverride);
    const { data, error } = await supabase
      .from('personas')
      .select('*')
      .eq('persona_id', personaId)
      .eq('customer_id', customerId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      throw new Error(`Failed to fetch persona: ${error.message}`);
    }

    return data;
  }

  /**
   * Create a new persona for the current customer
   */
  static async create(
    personaData: CreatePersonaData,
    authUserId: string,
    customerIdOverride?: string
  ): Promise<Persona> {
    const customerId = await this.getCurrentCustomerId(customerIdOverride);
    const userId = await this.getBaseplateUserId(authUserId);

    const { data, error } = await supabase
      .from('personas')
      .insert({
        ...personaData,
        customer_id: customerId,
        created_by: userId,
        updated_by: userId,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create persona: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing persona for the current customer
   */
  static async update(
    updateData: UpdatePersonaData,
    authUserId: string,
    customerIdOverride?: string
  ): Promise<Persona> {
    const { persona_id, ...dataToUpdate } = updateData;
    const userId = await this.getBaseplateUserId(authUserId);
    const customerId = await this.getCurrentCustomerId(customerIdOverride);

    const { data, error } = await supabase
      .from('personas')
      .update({
        ...dataToUpdate,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('persona_id', persona_id)
      .eq('customer_id', customerId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update persona: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a persona for the current customer
   */
  static async delete(personaId: string, customerIdOverride?: string): Promise<void> {
    const customerId = await this.getCurrentCustomerId(customerIdOverride);
    const { error } = await supabase
      .from('personas')
      .delete()
      .eq('persona_id', personaId)
      .eq('customer_id', customerId);

    if (error) {
      throw new Error(`Failed to delete persona: ${error.message}`);
    }
  }

  /**
   * Get the current customer ID using the SQL function
   */
  private static async getCurrentCustomerId(override?: string): Promise<string> {
    if (override) {
      return override;
    }
    const { data, error } = await supabase.rpc('customer_id');

    if (error) {
      throw new Error(`Failed to get customer ID: ${error.message}`);
    }

    return data;
  }

  private static async getBaseplateUserId(authUserId: string): Promise<string> {
    const { data, error } = await supabase
      .from('users')
      .select('user_id')
      .eq('auth_user_id', authUserId)
      .maybeSingle();

    if (error || !data?.user_id) {
      throw new Error('Unable to resolve current user');
    }

    return data.user_id;
  }

  /**
   * Test method to verify customer isolation - should not be able to access other customers' data
   */
  static async testCustomerIsolation(): Promise<{
    canAccessOwnData: boolean;
    canAccessOtherData: boolean;
    error?: string;
  }> {
    try {
      // Try to get all personas (should only return current customer's data)
      const ownPersonas = await this.getAll();

      // Try to access data with a different customer_id (should fail or return empty)
      const { data: otherData, error: otherError } = await supabase
        .from('personas')
        .select('*')
        .neq('customer_id', await this.getCurrentCustomerId())
        .limit(1);

      return {
        canAccessOwnData: Array.isArray(ownPersonas),
        canAccessOtherData: !otherError && otherData && otherData.length > 0,
        error: otherError ? otherError.message : undefined,
      };
    } catch (error) {
      return {
        canAccessOwnData: false,
        canAccessOtherData: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
