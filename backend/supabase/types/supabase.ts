export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '13.0.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      api_logs: {
        Row: {
          created_at: string;
          duration: number;
          headers: string | null;
          id: number;
          method: string;
          request_body: string | null;
          status_code: number;
          url: string;
        };
        Insert: {
          created_at?: string;
          duration: number;
          headers?: string | null;
          id?: number;
          method: string;
          request_body?: string | null;
          status_code: number;
          url: string;
        };
        Update: {
          created_at?: string;
          duration?: number;
          headers?: string | null;
          id?: number;
          method?: string;
          request_body?: string | null;
          status_code?: number;
          url?: string;
        };
        Relationships: [];
      };
      article_categories: {
        Row: {
          about: string | null;
          created_at: string;
          created_by: number;
          customer_id: number;
          icon: string | null;
          id: number;
          name: string;
          subcategory: string | null;
          updated_at: string;
        };
        Insert: {
          about?: string | null;
          created_at?: string;
          created_by: number;
          customer_id: number;
          icon?: string | null;
          id?: number;
          name: string;
          subcategory?: string | null;
          updated_at?: string;
        };
        Update: {
          about?: string | null;
          created_at?: string;
          created_by?: number;
          customer_id?: number;
          icon?: string | null;
          id?: number;
          name?: string;
          subcategory?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'article_categories_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'article_categories_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      articles: {
        Row: {
          category_id: number;
          content: string | null;
          created_at: string;
          created_by: number;
          customer_id: number;
          id: number;
          status: string | null;
          subcategory: string | null;
          title: string;
          updated_at: string;
          video_url: string | null;
          views_number: number | null;
        };
        Insert: {
          category_id: number;
          content?: string | null;
          created_at?: string;
          created_by: number;
          customer_id: number;
          id?: number;
          status?: string | null;
          subcategory?: string | null;
          title: string;
          updated_at?: string;
          video_url?: string | null;
          views_number?: number | null;
        };
        Update: {
          category_id?: number;
          content?: string | null;
          created_at?: string;
          created_by?: number;
          customer_id?: number;
          id?: number;
          status?: string | null;
          subcategory?: string | null;
          title?: string;
          updated_at?: string;
          video_url?: string | null;
          views_number?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'articles_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'article_categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'articles_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'articles_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          created_at: string;
          customer_success_id: number | null;
          domain: string;
          email: string;
          id: number;
          manager_id: number | null;
          name: string;
          owner_id: number;
          status: Database['public']['Enums']['CustomerStatus'] | null;
          subscription_id: number | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          customer_success_id?: number | null;
          domain: string;
          email: string;
          id?: number;
          manager_id?: number | null;
          name: string;
          owner_id: number;
          status?: Database['public']['Enums']['CustomerStatus'] | null;
          subscription_id?: number | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          customer_success_id?: number | null;
          domain?: string;
          email?: string;
          id?: number;
          manager_id?: number | null;
          name?: string;
          owner_id?: number;
          status?: Database['public']['Enums']['CustomerStatus'] | null;
          subscription_id?: number | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_customer_success_id_fkey';
            columns: ['customer_success_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customers_manager_id_fkey';
            columns: ['manager_id'];
            isOneToOne: false;
            referencedRelation: 'managers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customers_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: true;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'customers_subscription_id_fkey';
            columns: ['subscription_id'];
            isOneToOne: false;
            referencedRelation: 'subscriptions';
            referencedColumns: ['id'];
          },
        ];
      };
      managers: {
        Row: {
          created_at: string;
          id: number;
          name: string | null;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          id?: number;
          name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: number;
          name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      notification_templates: {
        Row: {
          channel: string;
          comment: string | null;
          created_at: string;
          customer_id: number | null;
          deleted_at: string | null;
          id: number;
          message: string | null;
          title: string;
          type: Database['public']['Enums']['NotificationType'][];
          updated_at: string | null;
        };
        Insert: {
          channel: string;
          comment?: string | null;
          created_at?: string;
          customer_id?: number | null;
          deleted_at?: string | null;
          id?: number;
          message?: string | null;
          title: string;
          type: Database['public']['Enums']['NotificationType'][];
          updated_at?: string | null;
        };
        Update: {
          channel?: string;
          comment?: string | null;
          created_at?: string;
          customer_id?: number | null;
          deleted_at?: string | null;
          id?: number;
          message?: string | null;
          title?: string;
          type?: Database['public']['Enums']['NotificationType'][];
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_templates_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          channel: string | null;
          created_at: string;
          customer_id: number | null;
          generated_by: string | null;
          id: number;
          is_read: boolean | null;
          message: string | null;
          metadata: Json | null;
          read_at: string | null;
          sender_id: number | null;
          template_id: number | null;
          title: string | null;
          type: Database['public']['Enums']['NotificationType'];
          user_id: number | null;
        };
        Insert: {
          channel?: string | null;
          created_at?: string;
          customer_id?: number | null;
          generated_by?: string | null;
          id?: number;
          is_read?: boolean | null;
          message?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          sender_id?: number | null;
          template_id?: number | null;
          title?: string | null;
          type: Database['public']['Enums']['NotificationType'];
          user_id?: number | null;
        };
        Update: {
          channel?: string | null;
          created_at?: string;
          customer_id?: number | null;
          generated_by?: string | null;
          id?: number;
          is_read?: boolean | null;
          message?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          sender_id?: number | null;
          template_id?: number | null;
          title?: string | null;
          type?: Database['public']['Enums']['NotificationType'];
          user_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'notification_templates';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      permissions: {
        Row: {
          id: number;
          label: string;
          name: string;
        };
        Insert: {
          id?: number;
          label: string;
          name: string;
        };
        Update: {
          id?: number;
          label?: string;
          name?: string;
        };
        Relationships: [];
      };
      role_permissions: {
        Row: {
          permission_id: number;
          role_id: number;
        };
        Insert: {
          permission_id: number;
          role_id: number;
        };
        Update: {
          permission_id?: number;
          role_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'role_permissions_permission_id_fkey';
            columns: ['permission_id'];
            isOneToOne: false;
            referencedRelation: 'permissions';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'role_permissions_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          id: number;
          image_url: string | null;
          name: string | null;
          updated_at: string | null;
          system_role: boolean;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: number;
          image_url?: string | null;
          name?: string | null;
          updated_at?: string | null;
          system_role?: boolean;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: number;
          image_url?: string | null;
          name?: string | null;
          updated_at?: string | null;
          system_role?: boolean;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          created_at: string;
          description: string | null;
          id: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_one_time_codes: {
        Row: {
          code: string;
          created_at: string;
          id: number;
          is_used: boolean;
          user_id: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: number;
          is_used: boolean;
          user_id: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: number;
          is_used?: boolean;
          user_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'user_one_time_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      users: {
        Row: {
          avatar: string | null;
          created_at: string;
          customer_id: number | null;
          deleted_at: string | null;
          email: string;
          email_verified: boolean | null;
          first_name: string | null;
          id: number;
          is_customer_success: boolean | null;
          is_superadmin: boolean | null;
          last_name: string | null;
          manager_id: number | null;
          phone_number: string | null;
          role_id: number | null;
          status: string;
          uid: string | null;
          updated_at: string | null;
        };
        Insert: {
          avatar?: string | null;
          created_at?: string;
          customer_id?: number | null;
          deleted_at?: string | null;
          email: string;
          email_verified?: boolean | null;
          first_name?: string | null;
          id?: number;
          is_customer_success?: boolean | null;
          is_superadmin?: boolean | null;
          last_name?: string | null;
          manager_id?: number | null;
          phone_number?: string | null;
          role_id?: number | null;
          status?: string;
          uid?: string | null;
          updated_at?: string | null;
        };
        Update: {
          avatar?: string | null;
          created_at?: string;
          customer_id?: number | null;
          deleted_at?: string | null;
          email?: string;
          email_verified?: boolean | null;
          first_name?: string | null;
          id?: number;
          is_customer_success?: boolean | null;
          is_superadmin?: boolean | null;
          last_name?: string | null;
          manager_id?: number | null;
          phone_number?: string | null;
          role_id?: number | null;
          status?: string;
          uid?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'users_manager_id_fkey';
            columns: ['manager_id'];
            isOneToOne: false;
            referencedRelation: 'managers';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'users_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      Action: 'manage' | 'create' | 'read' | 'update' | 'delete';
      CustomerStatus: 'active' | 'inactive' | 'suspended';
      NotificationType: 'EMAIL' | 'IN_APP';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'objects_bucketId_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: 's3_multipart_uploads_parts_bucket_id_fkey';
            columns: ['bucket_id'];
            isOneToOne: false;
            referencedRelation: 'buckets';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 's3_multipart_uploads_parts_upload_id_fkey';
            columns: ['upload_id'];
            isOneToOne: false;
            referencedRelation: 's3_multipart_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: {
        Args: { name: string };
        Returns: string;
      };
      filename: {
        Args: { name: string };
        Returns: string;
      };
      foldername: {
        Args: { name: string };
        Returns: string[];
      };
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          start_after?: string;
        };
        Returns: {
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  'public'
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
        DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] &
        DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      Action: ['manage', 'create', 'read', 'update', 'delete'],
      CustomerStatus: ['active', 'inactive', 'suspended'],
      NotificationType: ['EMAIL', 'IN_APP'],
    },
  },
  storage: {
    Enums: {},
  },
} as const;
