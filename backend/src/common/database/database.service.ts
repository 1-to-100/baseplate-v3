import { Injectable, OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/common/supabase/supabase.service';
import type {
  TableNames,
  PaginatedResult,
  PaginationOptions,
} from '@/common/types';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private client: SupabaseClient;

  constructor(private readonly supabaseService: SupabaseService) {}

  onModuleInit() {
    this.client = this.supabaseService.getClient();
  }

  // Expose the raw client for advanced operations
  getClient(): SupabaseClient {
    return this.client;
  }

  // Database table accessors - matches your Prisma schema
  get users() {
    return this.client.from('users');
  }

  get customers() {
    return this.client.from('customers');
  }

  get roles() {
    return this.client.from('roles');
  }

  get permissions() {
    return this.client.from('permissions');
  }

  get role_permissions() {
    return this.client.from('role_permissions');
  }

  get managers() {
    return this.client.from('managers');
  }

  get subscriptions() {
    return this.client.from('subscriptions');
  }

  get user_one_time_codes() {
    return this.client.from('user_one_time_codes');
  }

  get api_logs() {
    return this.client.from('api_logs');
  }

  get article_categories() {
    return this.client.from('article_categories');
  }

  get articles() {
    return this.client.from('articles');
  }

  get notifications() {
    return this.client.from('notifications');
  }

  get notification_templates() {
    return this.client.from('notification_templates');
  }

  // Utility methods for common operations

  /**
   * Execute RPC (Remote Procedure Call) functions
   */
  async rpc(functionName: string, params?: Record<string, any>) {
    return this.client.rpc(functionName, params);
  }

  /**
   * Execute raw SQL queries (if needed for migration compatibility)
   * Note: This requires creating a PostgreSQL function that executes raw SQL
   */
  async rawQuery(sql: string, params?: any[]) {
    return this.client.rpc('execute_raw_query', {
      query: sql,
      parameters: params,
    });
  }

  /**
   * Helper method to handle common error patterns
   */
  handleError(error: any, operation: string = 'Database operation') {
    if (error) {
      console.error(`${operation} failed:`, error);
      throw new Error(`${operation} failed: ${error.message}`);
    }
  }

  /**
   * Helper method for safe single record queries
   */
  async findUniqueOrThrow<T>(
    query: any,
    errorMessage: string = 'Resource not found',
  ): Promise<T> {
    const { data, error } = await query.single();
    if (error || !data) {
      throw new Error(errorMessage);
    }
    return data;
  }

  /**
   * Helper method for creating records with proper error handling
   */
  async createWithReturn<T>(
    query: any,
    data: any,
    errorMessage: string = 'Failed to create resource',
  ): Promise<T> {
    const { data: result, error } = await query.insert(data).select().single();
    if (error) {
      throw new Error(`${errorMessage}: ${error.message}`);
    }
    return result;
  }

  /**
   * Helper method for updating records with proper error handling
   */
  async updateWithReturn<T>(
    query: any,
    data: any,
    errorMessage: string = 'Failed to update resource',
  ): Promise<T> {
    const { data: result, error } = await query.update(data).select().single();
    if (error) {
      throw new Error(`${errorMessage}: ${error.message}`);
    }
    return result;
  }

  /**
   * Helper method for soft delete pattern (sets deleted_at timestamp)
   */
  async softDelete(tableName: string, id: number): Promise<void> {
    const { error } = await this.client
      .from(tableName)
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to soft delete record: ${error.message}`);
    }
  }

  /**
   * Helper method to exclude soft-deleted records
   */
  withoutDeleted(query: any) {
    return query.is('deleted_at', null);
  }

  /**
   * Helper method for counting records
   */
  async count(tableName: TableNames, whereClause?: any): Promise<number> {
    let query = this.client
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    if (whereClause) {
      // Apply where conditions - this would need to be expanded based on usage
      for (const [key, value] of Object.entries(whereClause)) {
        query = query.eq(key, value);
      }
    }

    const { count, error } = await query;
    if (error) {
      throw new Error(`Failed to count records: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Helper method for paginated queries with proper typing
   */
  async paginate<T>(
    tableName: TableNames,
    options: PaginationOptions,
    queryBuilder?: (query: any) => any,
  ): Promise<PaginatedResult<T>> {
    const { page, per_page } = options;
    const offset = (page - 1) * per_page;

    // Build base query
    let query = this.client.from(tableName).select('*');

    // Apply custom query modifications if provided
    if (queryBuilder) {
      query = queryBuilder(query);
    }

    // Get total count
    const countQuery = this.client
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    const finalCountQuery = queryBuilder
      ? queryBuilder(countQuery)
      : countQuery;
    const { count } = await finalCountQuery;

    // Get paginated data
    const { data, error } = await query.range(offset, offset + per_page - 1);

    if (error) {
      throw new Error(`Pagination query failed: ${error.message}`);
    }

    return {
      data: data || [],
      meta: {
        total: count || 0,
        page,
        per_page,
        total_pages: Math.ceil((count || 0) / per_page),
      },
    };
  }
}
