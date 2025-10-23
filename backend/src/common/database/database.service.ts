import { Injectable, OnModuleInit } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '@/common/supabase/supabase.service';
import {
  SupabaseCRUD,
  executeQuery,
  handleSupabaseError,
  type WhereClause,
} from '@/common/utils/supabase-crud.util';
import type {
  TableNames,
  TableType,
  PaginatedResult,
  PaginationOptions,
  OrderDirection,
} from '@/common/types';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private client: SupabaseClient;
  private crud: SupabaseCRUD;

  constructor(private readonly supabaseService: SupabaseService) {}

  onModuleInit() {
    this.client = this.supabaseService.getClient();
    this.crud = new SupabaseCRUD(this.client);
  }

  // Expose the raw client for advanced operations
  getClient(): SupabaseClient {
    return this.client;
  }

  // Database table accessors
  get users(): any {
    return this.client.from('users');
  }

  get customers(): any {
    return this.client.from('customers');
  }

  get roles(): any {
    return this.client.from('roles');
  }

  get permissions(): any {
    return this.client.from('permissions');
  }

  get role_permissions(): any {
    return this.client.from('role_permissions');
  }

  get managers(): any {
    return this.client.from('managers');
  }

  get subscription_types(): any {
    return this.client.from('subscription_types');
  }

  get subscriptions(): any {
    // Legacy accessor - points to subscription_types now
    return this.client.from('subscription_types');
  }

  get user_one_time_codes(): any {
    return this.client.from('user_one_time_codes');
  }

  get api_logs(): any {
    return this.client.from('api_logs');
  }

  get article_categories(): any {
    return this.client.from('article_categories');
  }

  get articles(): any {
    return this.client.from('articles');
  }

  get notifications(): any {
    return this.client.from('notifications');
  }

  get notification_templates(): any {
    return this.client.from('notification_templates');
  }

  // CRUD Operations using SupabaseCRUD

  /**
   * Find many records
   */
  async findMany<T extends TableNames>(
    tableName: T,
    options?: {
      select?: string;
      where?: WhereClause;
      orderBy?: { field: string; direction: OrderDirection }[];
      take?: number;
      skip?: number;
      include?: Record<
        string,
        boolean | { select?: string; where?: WhereClause }
      >;
    },
  ): Promise<TableType<T>[]> {
    return this.crud.findMany(tableName, options);
  }

  /**
   * Find unique record
   */
  async findUnique<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
      select?: string;
      include?: Record<
        string,
        boolean | { select?: string; where?: WhereClause }
      >;
    },
  ): Promise<TableType<T> | null> {
    return this.crud.findUnique(tableName, options);
  }

  /**
   * Find first record
   */
  async findFirst<T extends TableNames>(
    tableName: T,
    options?: {
      where?: WhereClause;
      select?: string;
      orderBy?: { field: string; direction: OrderDirection }[];
    },
  ): Promise<TableType<T> | null> {
    return this.crud.findFirst(tableName, options);
  }

  /**
   * Create record
   */
  async create<T extends TableNames>(
    tableName: T,
    options: {
      data: Partial<TableType<T>>;
      select?: string;
    },
  ): Promise<TableType<T>> {
    return this.crud.create(tableName, options);
  }

  /**
   * Update record
   */
  async update<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
      data: Partial<TableType<T>>;
      select?: string;
    },
  ): Promise<TableType<T>> {
    return this.crud.update(tableName, options);
  }

  /**
   * Update many records
   */
  async updateMany<T extends TableNames>(
    tableName: T,
    options: {
      where?: WhereClause;
      data: Partial<TableType<T>>;
    },
  ): Promise<{ count: number }> {
    return this.crud.updateMany(tableName, options);
  }

  /**
   * Delete record
   */
  async delete<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
    },
  ): Promise<TableType<T>> {
    return this.crud.delete(tableName, options);
  }

  /**
   * Delete many records
   */
  async deleteMany<T extends TableNames>(
    tableName: T,
    options?: {
      where?: WhereClause;
    },
  ): Promise<{ count: number }> {
    return this.crud.deleteMany(tableName, options);
  }

  /**
   * Count records
   */
  async count<T extends TableNames>(
    tableName: T,
    options?: {
      where?: WhereClause;
    },
  ): Promise<number> {
    return this.crud.count(tableName, options);
  }

  /**
   * Upsert record
   */
  async upsert<T extends TableNames>(
    tableName: T,
    options: {
      where: WhereClause;
      create: Partial<TableType<T>>;
      update: Partial<TableType<T>>;
      select?: string;
    },
  ): Promise<TableType<T>> {
    return this.crud.upsert(tableName, options);
  }

  /**
   * Paginated query with proper typing - enhanced version
   */
  async paginate<T extends TableNames>(
    tableName: T,
    paginationOptions: PaginationOptions,
    queryOptions?: {
      where?: WhereClause;
      select?: string;
      orderBy?: { field: string; direction: OrderDirection }[];
    },
  ): Promise<PaginatedResult<TableType<T>>> {
    return this.crud.paginate(tableName, paginationOptions, queryOptions);
  }

  // Utility methods for common operations

  /**
   * Execute RPC (Remote Procedure Call) functions
   */
  async rpc(functionName: string, params?: Record<string, any>) {
    const { data, error } = await this.client.rpc(functionName, params);
    if (error) {
      handleSupabaseError(error, `RPC ${functionName}`);
    }
    return data;
  }

  /**
   * Execute raw SQL queries (if needed for migration compatibility)
   * Note: This requires creating a PostgreSQL function that executes raw SQL
   */
  async rawQuery(sql: string, params?: any[]) {
    return this.rpc('execute_raw_query', {
      query: sql,
      parameters: params,
    });
  }

  /**
   * Helper method for safe single record queries (legacy support)
   */
  async findUniqueOrThrow<T>(
    query: Promise<{ data: T | null; error: unknown }>,
    errorMessage: string = 'Resource not found',
  ): Promise<T> {
    return executeQuery(query, errorMessage);
  }

  /**
   * Helper method for soft delete pattern (sets deleted_at timestamp)
   */
  async softDelete<T extends TableNames>(
    tableName: T,
    id: number,
  ): Promise<void> {
    await this.update(tableName, {
      where: { id },
      data: { deleted_at: new Date().toISOString() } as unknown as Partial<
        TableType<T>
      >,
    });
  }

  /**
   * Helper method to exclude soft-deleted records (for raw queries)
   */
  withoutDeleted<T>(query: T): T {
    return (query as any).is('deleted_at', null);
  }
}
