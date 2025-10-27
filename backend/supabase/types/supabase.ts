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
      acceptance_criteria: {
        Row: {
          acceptance_criteria_id: string;
          created_at: string;
          created_by: string | null;
          expected_result: string | null;
          feature_id: string;
          priority: Database['public']['Enums']['acceptance_criteria_priority_enum'];
          steps: string[] | null;
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          acceptance_criteria_id?: string;
          created_at?: string;
          created_by?: string | null;
          expected_result?: string | null;
          feature_id: string;
          priority?: Database['public']['Enums']['acceptance_criteria_priority_enum'];
          steps?: string[] | null;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Update: {
          acceptance_criteria_id?: string;
          created_at?: string;
          created_by?: string | null;
          expected_result?: string | null;
          feature_id?: string;
          priority?: Database['public']['Enums']['acceptance_criteria_priority_enum'];
          steps?: string[] | null;
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      api_endpoints: {
        Row: {
          api_endpoint_id: string;
          auth_required: boolean;
          created_at: string;
          error_contracts: Json | null;
          example_calls: string | null;
          feature_id: string;
          last_generated_version_id: string | null;
          method: Database['public']['Enums']['http_method_enum'];
          path: string;
          rate_limits: Json | null;
          request_schema: Json | null;
          response_schema: Json | null;
          updated_at: string;
        };
        Insert: {
          api_endpoint_id?: string;
          auth_required?: boolean;
          created_at?: string;
          error_contracts?: Json | null;
          example_calls?: string | null;
          feature_id: string;
          last_generated_version_id?: string | null;
          method?: Database['public']['Enums']['http_method_enum'];
          path?: string;
          rate_limits?: Json | null;
          request_schema?: Json | null;
          response_schema?: Json | null;
          updated_at?: string;
        };
        Update: {
          api_endpoint_id?: string;
          auth_required?: boolean;
          created_at?: string;
          error_contracts?: Json | null;
          example_calls?: string | null;
          feature_id?: string;
          last_generated_version_id?: string | null;
          method?: Database['public']['Enums']['http_method_enum'];
          path?: string;
          rate_limits?: Json | null;
          request_schema?: Json | null;
          response_schema?: Json | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'api_endpoints_version_id_fkey';
            columns: ['last_generated_version_id'];
            isOneToOne: false;
            referencedRelation: 'feature_versions';
            referencedColumns: ['feature_version_id'];
          },
        ];
      };
      api_logs: {
        Row: {
          created_at: string;
          id: string;
          ip_address: string | null;
          method: string | null;
          response_time: number | null;
          status_code: number | null;
          url: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          method?: string | null;
          response_time?: number | null;
          status_code?: number | null;
          url?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip_address?: string | null;
          method?: string | null;
          response_time?: number | null;
          status_code?: number | null;
          url?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'api_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'api_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      article_categories: {
        Row: {
          about: string | null;
          article_category_id: string;
          created_at: string;
          created_by: string;
          customer_id: string;
          description: string | null;
          display_order: number;
          icon: string | null;
          name: string;
          parent_id: string | null;
          slug: string;
          subcategory: string | null;
          updated_at: string | null;
        };
        Insert: {
          about?: string | null;
          article_category_id?: string;
          created_at?: string;
          created_by: string;
          customer_id: string;
          description?: string | null;
          display_order?: number;
          icon?: string | null;
          name: string;
          parent_id?: string | null;
          slug: string;
          subcategory?: string | null;
          updated_at?: string | null;
        };
        Update: {
          about?: string | null;
          article_category_id?: string;
          created_at?: string;
          created_by?: string;
          customer_id?: string;
          description?: string | null;
          display_order?: number;
          icon?: string | null;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          subcategory?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'article_categories_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'article_categories_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'article_categories_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'article_categories_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'article_categories_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'article_categories_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'article_categories';
            referencedColumns: ['article_category_id'];
          },
        ];
      };
      articles: {
        Row: {
          article_id: string;
          category_id: string;
          content: string | null;
          created_at: string;
          created_by: string;
          customer_id: string;
          featured: boolean;
          metadata: Json | null;
          published_at: string | null;
          slug: string;
          status: Database['public']['Enums']['articlestatus'];
          subcategory: string | null;
          summary: string | null;
          title: string;
          updated_at: string | null;
          updated_by: string | null;
          video_url: string | null;
          view_count: number;
        };
        Insert: {
          article_id?: string;
          category_id: string;
          content?: string | null;
          created_at?: string;
          created_by: string;
          customer_id: string;
          featured?: boolean;
          metadata?: Json | null;
          published_at?: string | null;
          slug: string;
          status?: Database['public']['Enums']['articlestatus'];
          subcategory?: string | null;
          summary?: string | null;
          title: string;
          updated_at?: string | null;
          updated_by?: string | null;
          video_url?: string | null;
          view_count?: number;
        };
        Update: {
          article_id?: string;
          category_id?: string;
          content?: string | null;
          created_at?: string;
          created_by?: string;
          customer_id?: string;
          featured?: boolean;
          metadata?: Json | null;
          published_at?: string | null;
          slug?: string;
          status?: Database['public']['Enums']['articlestatus'];
          subcategory?: string | null;
          summary?: string | null;
          title?: string;
          updated_at?: string | null;
          updated_by?: string | null;
          video_url?: string | null;
          view_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'articles_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'article_categories';
            referencedColumns: ['article_category_id'];
          },
          {
            foreignKeyName: 'articles_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'articles_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'articles_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'articles_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'articles_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'articles_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'articles_updated_by_fkey';
            columns: ['updated_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          audit_log_id: string;
          changes: Json | null;
          created_at: string;
          customer_id: string | null;
          entity_id: string | null;
          entity_type: string;
          ip_address: string | null;
          user_agent: string | null;
          user_id: string | null;
        };
        Insert: {
          action: string;
          audit_log_id?: string;
          changes?: Json | null;
          created_at?: string;
          customer_id?: string | null;
          entity_id?: string | null;
          entity_type: string;
          ip_address?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Update: {
          action?: string;
          audit_log_id?: string;
          changes?: Json | null;
          created_at?: string;
          customer_id?: string | null;
          entity_id?: string | null;
          entity_type?: string;
          ip_address?: string | null;
          user_agent?: string | null;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'audit_logs_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'audit_logs_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'audit_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      customer_subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          customer_id: string;
          customer_subscription_id: string;
          stripe_status:
            | Database['public']['Enums']['stripesubscriptionstatus']
            | null;
          stripe_subscription_id: string | null;
          subscription_type_id: string;
          trial_end: string | null;
          trial_start: string | null;
          updated_at: string | null;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          customer_id: string;
          customer_subscription_id?: string;
          stripe_status?:
            | Database['public']['Enums']['stripesubscriptionstatus']
            | null;
          stripe_subscription_id?: string | null;
          subscription_type_id: string;
          trial_end?: string | null;
          trial_start?: string | null;
          updated_at?: string | null;
        };
        Update: {
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          customer_id?: string;
          customer_subscription_id?: string;
          stripe_status?:
            | Database['public']['Enums']['stripesubscriptionstatus']
            | null;
          stripe_subscription_id?: string | null;
          subscription_type_id?: string;
          trial_end?: string | null;
          trial_start?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customer_subscriptions_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'customer_subscriptions_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'customer_subscriptions_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'customer_subscriptions_subscription_type_id_fkey';
            columns: ['subscription_type_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_types';
            referencedColumns: ['subscription_type_id'];
          },
        ];
      };
      customers: {
        Row: {
          active: boolean;
          churned_at: string | null;
          created_at: string;
          customer_id: string;
          email_domain: string | null;
          lifecycle_stage: Database['public']['Enums']['customerlifecyclestage'];
          manager_id: string | null;
          metadata: Json | null;
          name: string;
          onboarded_at: string | null;
          owner_id: string | null;
          stripe_customer_id: string | null;
          subscription_type_id: string | null;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean;
          churned_at?: string | null;
          created_at?: string;
          customer_id?: string;
          email_domain?: string | null;
          lifecycle_stage?: Database['public']['Enums']['customerlifecyclestage'];
          manager_id?: string | null;
          metadata?: Json | null;
          name: string;
          onboarded_at?: string | null;
          owner_id?: string | null;
          stripe_customer_id?: string | null;
          subscription_type_id?: string | null;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean;
          churned_at?: string | null;
          created_at?: string;
          customer_id?: string;
          email_domain?: string | null;
          lifecycle_stage?: Database['public']['Enums']['customerlifecyclestage'];
          manager_id?: string | null;
          metadata?: Json | null;
          name?: string;
          onboarded_at?: string | null;
          owner_id?: string | null;
          stripe_customer_id?: string | null;
          subscription_type_id?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_manager_id_fkey';
            columns: ['manager_id'];
            isOneToOne: false;
            referencedRelation: 'managers';
            referencedColumns: ['manager_id'];
          },
          {
            foreignKeyName: 'customers_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'customers_owner_id_fkey';
            columns: ['owner_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'customers_subscription_type_id_fkey';
            columns: ['subscription_type_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_types';
            referencedColumns: ['subscription_type_id'];
          },
        ];
      };
      extension_data: {
        Row: {
          created_at: string;
          data_id: string;
          extension_data_id: string;
          extension_data_type_id: string;
          updated_at: string | null;
          value: string | null;
        };
        Insert: {
          created_at?: string;
          data_id: string;
          extension_data_id?: string;
          extension_data_type_id: string;
          updated_at?: string | null;
          value?: string | null;
        };
        Update: {
          created_at?: string;
          data_id?: string;
          extension_data_id?: string;
          extension_data_type_id?: string;
          updated_at?: string | null;
          value?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'extension_data_extension_data_type_id_fkey';
            columns: ['extension_data_type_id'];
            isOneToOne: false;
            referencedRelation: 'extension_data_types';
            referencedColumns: ['extension_data_type_id'];
          },
        ];
      };
      extension_data_types: {
        Row: {
          created_at: string;
          default_value: string | null;
          description: string | null;
          display_order: number;
          extension_data_type_id: string;
          external_name: string;
          field_type: Database['public']['Enums']['extensionfieldtype'];
          is_active: boolean;
          is_required: boolean;
          name: string;
          table_being_extended: string;
          updated_at: string | null;
          validation_rules: Json | null;
        };
        Insert: {
          created_at?: string;
          default_value?: string | null;
          description?: string | null;
          display_order?: number;
          extension_data_type_id?: string;
          external_name: string;
          field_type: Database['public']['Enums']['extensionfieldtype'];
          is_active?: boolean;
          is_required?: boolean;
          name: string;
          table_being_extended: string;
          updated_at?: string | null;
          validation_rules?: Json | null;
        };
        Update: {
          created_at?: string;
          default_value?: string | null;
          description?: string | null;
          display_order?: number;
          extension_data_type_id?: string;
          external_name?: string;
          field_type?: Database['public']['Enums']['extensionfieldtype'];
          is_active?: boolean;
          is_required?: boolean;
          name?: string;
          table_being_extended?: string;
          updated_at?: string | null;
          validation_rules?: Json | null;
        };
        Relationships: [];
      };
      feature_screens: {
        Row: {
          components_count: number;
          created_at: string;
          description: string | null;
          display_order: number;
          feature_id: string;
          figma_frame_id: string | null;
          name: string;
          screen_id: string;
          thumbnail_url: string | null;
          updated_at: string;
        };
        Insert: {
          components_count?: number;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          feature_id: string;
          figma_frame_id?: string | null;
          name?: string;
          screen_id?: string;
          thumbnail_url?: string | null;
          updated_at?: string;
        };
        Update: {
          components_count?: number;
          created_at?: string;
          description?: string | null;
          display_order?: number;
          feature_id?: string;
          figma_frame_id?: string | null;
          name?: string;
          screen_id?: string;
          thumbnail_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      feature_versions: {
        Row: {
          content_snapshot: Json;
          created_at: string;
          created_by: string | null;
          diff_summary: string | null;
          feature_id: string;
          feature_version_id: string;
          version_number: number;
        };
        Insert: {
          content_snapshot?: Json;
          created_at?: string;
          created_by?: string | null;
          diff_summary?: string | null;
          feature_id: string;
          feature_version_id?: string;
          version_number?: number;
        };
        Update: {
          content_snapshot?: Json;
          created_at?: string;
          created_by?: string | null;
          diff_summary?: string | null;
          feature_id?: string;
          feature_version_id?: string;
          version_number?: number;
        };
        Relationships: [];
      };
      managers: {
        Row: {
          active: boolean;
          auth_user_id: string | null;
          created_at: string;
          email: string;
          full_name: string;
          manager_id: string;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean;
          auth_user_id?: string | null;
          created_at?: string;
          email: string;
          full_name: string;
          manager_id?: string;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean;
          auth_user_id?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string;
          manager_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      notification_templates: {
        Row: {
          body: string;
          channel: string;
          created_at: string;
          customer_id: string | null;
          deleted_at: string | null;
          is_active: boolean;
          name: string;
          subject: string | null;
          template_id: string;
          type: Database['public']['Enums']['notificationtype'];
          updated_at: string | null;
          variables: Json | null;
        };
        Insert: {
          body: string;
          channel: string;
          created_at?: string;
          customer_id?: string | null;
          deleted_at?: string | null;
          is_active?: boolean;
          name: string;
          subject?: string | null;
          template_id?: string;
          type: Database['public']['Enums']['notificationtype'];
          updated_at?: string | null;
          variables?: Json | null;
        };
        Update: {
          body?: string;
          channel?: string;
          created_at?: string;
          customer_id?: string | null;
          deleted_at?: string | null;
          is_active?: boolean;
          name?: string;
          subject?: string | null;
          template_id?: string;
          type?: Database['public']['Enums']['notificationtype'];
          updated_at?: string | null;
          variables?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_templates_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'notification_templates_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'notification_templates_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
        ];
      };
      notifications: {
        Row: {
          channel: string | null;
          created_at: string;
          customer_id: string | null;
          generated_by: string | null;
          id: string;
          message: string;
          metadata: Json | null;
          read_at: string | null;
          sender_id: string | null;
          template_id: string | null;
          title: string | null;
          type: Database['public']['Enums']['notificationtype'];
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          channel?: string | null;
          created_at?: string;
          customer_id?: string | null;
          generated_by?: string | null;
          id?: string;
          message: string;
          metadata?: Json | null;
          read_at?: string | null;
          sender_id?: string | null;
          template_id?: string | null;
          title?: string | null;
          type: Database['public']['Enums']['notificationtype'];
          updated_at?: string | null;
          user_id: string;
        };
        Update: {
          channel?: string | null;
          created_at?: string;
          customer_id?: string | null;
          generated_by?: string | null;
          id?: string;
          message?: string;
          metadata?: Json | null;
          read_at?: string | null;
          sender_id?: string | null;
          template_id?: string | null;
          title?: string | null;
          type?: Database['public']['Enums']['notificationtype'];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'notifications_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'notifications_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'notifications_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'notification_templates';
            referencedColumns: ['template_id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      permissions: {
        Row: {
          description: string | null;
          display_name: string;
          name: string;
          permission_id: string;
        };
        Insert: {
          description?: string | null;
          display_name: string;
          name: string;
          permission_id?: string;
        };
        Update: {
          description?: string | null;
          display_name?: string;
          name?: string;
          permission_id?: string;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          created_at: string;
          description: string | null;
          display_name: string;
          is_system_role: boolean;
          name: string;
          permissions: Json;
          role_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          display_name: string;
          is_system_role?: boolean;
          name: string;
          permissions?: Json;
          role_id?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          display_name?: string;
          is_system_role?: boolean;
          name?: string;
          permissions?: Json;
          role_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      screen_components: {
        Row: {
          accessibility_notes: string | null;
          component_name: string;
          created_at: string;
          display_order: number;
          name: string;
          props_configuration: Json | null;
          screen_component_id: string;
          screen_id: string;
          source_reference_id: string | null;
          updated_at: string;
        };
        Insert: {
          accessibility_notes?: string | null;
          component_name?: string;
          created_at?: string;
          display_order?: number;
          name?: string;
          props_configuration?: Json | null;
          screen_component_id?: string;
          screen_id: string;
          source_reference_id?: string | null;
          updated_at?: string;
        };
        Update: {
          accessibility_notes?: string | null;
          component_name?: string;
          created_at?: string;
          display_order?: number;
          name?: string;
          props_configuration?: Json | null;
          screen_component_id?: string;
          screen_id?: string;
          source_reference_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'screen_components_screen_id_fkey';
            columns: ['screen_id'];
            isOneToOne: false;
            referencedRelation: 'feature_screens';
            referencedColumns: ['screen_id'];
          },
          {
            foreignKeyName: 'screen_components_source_reference_fkey';
            columns: ['source_reference_id'];
            isOneToOne: false;
            referencedRelation: 'source_references';
            referencedColumns: ['source_reference_id'];
          },
        ];
      };
      source_references: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string | null;
          feature_id: string;
          reference_data: Json | null;
          reference_type: Database['public']['Enums']['source_reference_type_enum'];
          reference_url: string | null;
          source_reference_id: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          feature_id: string;
          reference_data?: Json | null;
          reference_type?: Database['public']['Enums']['source_reference_type_enum'];
          reference_url?: string | null;
          source_reference_id?: string;
          title?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          feature_id?: string;
          reference_data?: Json | null;
          reference_type?: Database['public']['Enums']['source_reference_type_enum'];
          reference_url?: string | null;
          source_reference_id?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscription_types: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          features: Json | null;
          is_default: boolean;
          max_contacts: number | null;
          max_users: number | null;
          name: string;
          stripe_price_id: string | null;
          stripe_product_id: string | null;
          subscription_type_id: string;
          updated_at: string | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          features?: Json | null;
          is_default?: boolean;
          max_contacts?: number | null;
          max_users?: number | null;
          name: string;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          subscription_type_id?: string;
          updated_at?: string | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          features?: Json | null;
          is_default?: boolean;
          max_contacts?: number | null;
          max_users?: number | null;
          name?: string;
          stripe_price_id?: string | null;
          stripe_product_id?: string | null;
          subscription_type_id?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      taxonomies: {
        Row: {
          created_at: string;
          customer_id: string;
          display_order: number;
          metadata: Json | null;
          name: string;
          parent_id: string | null;
          slug: string;
          taxonomy_id: string;
          updated_at: string | null;
        };
        Insert: {
          created_at?: string;
          customer_id: string;
          display_order?: number;
          metadata?: Json | null;
          name: string;
          parent_id?: string | null;
          slug: string;
          taxonomy_id?: string;
          updated_at?: string | null;
        };
        Update: {
          created_at?: string;
          customer_id?: string;
          display_order?: number;
          metadata?: Json | null;
          name?: string;
          parent_id?: string | null;
          slug?: string;
          taxonomy_id?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'taxonomies_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'taxonomies_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'taxonomies_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'taxonomies_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'taxonomies';
            referencedColumns: ['taxonomy_id'];
          },
        ];
      };
      user_invitations: {
        Row: {
          accepted_at: string | null;
          created_at: string;
          customer_id: string;
          email: string;
          expires_at: string;
          invitation_id: string;
          invited_by: string;
          role_id: string | null;
          status: Database['public']['Enums']['invitationstatus'];
          token: string;
          updated_at: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          created_at?: string;
          customer_id: string;
          email: string;
          expires_at: string;
          invitation_id?: string;
          invited_by: string;
          role_id?: string | null;
          status?: Database['public']['Enums']['invitationstatus'];
          token: string;
          updated_at?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          created_at?: string;
          customer_id?: string;
          email?: string;
          expires_at?: string;
          invitation_id?: string;
          invited_by?: string;
          role_id?: string | null;
          status?: Database['public']['Enums']['invitationstatus'];
          token?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_invitations_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'user_invitations_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'user_invitations_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'user_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_invitations_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['role_id'];
          },
        ];
      };
      user_one_time_codes: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          is_used: boolean;
          user_id: string;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          is_used?: boolean;
          user_id: string;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          is_used?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_one_time_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'user_one_time_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      users: {
        Row: {
          auth_user_id: string | null;
          avatar_url: string | null;
          created_at: string;
          customer_id: string | null;
          deleted_at: string | null;
          email: string;
          full_name: string;
          last_login_at: string | null;
          manager_id: string | null;
          phone_number: string | null;
          preferences: Json | null;
          role_id: string | null;
          status: Database['public']['Enums']['userstatus'];
          updated_at: string | null;
          user_id: string;
        };
        Insert: {
          auth_user_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          customer_id?: string | null;
          deleted_at?: string | null;
          email: string;
          full_name: string;
          last_login_at?: string | null;
          manager_id?: string | null;
          phone_number?: string | null;
          preferences?: Json | null;
          role_id?: string | null;
          status?: Database['public']['Enums']['userstatus'];
          updated_at?: string | null;
          user_id?: string;
        };
        Update: {
          auth_user_id?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          customer_id?: string | null;
          deleted_at?: string | null;
          email?: string;
          full_name?: string;
          last_login_at?: string | null;
          manager_id?: string | null;
          phone_number?: string | null;
          preferences?: Json | null;
          role_id?: string | null;
          status?: Database['public']['Enums']['userstatus'];
          updated_at?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'users_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'users_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'active_users';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'users_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'users_manager_id_fkey';
            columns: ['manager_id'];
            isOneToOne: false;
            referencedRelation: 'managers';
            referencedColumns: ['manager_id'];
          },
          {
            foreignKeyName: 'users_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['role_id'];
          },
        ];
      };
    };
    Views: {
      active_customers: {
        Row: {
          created_at: string | null;
          customer_id: string | null;
          email_domain: string | null;
          lifecycle_stage:
            | Database['public']['Enums']['customerlifecyclestage']
            | null;
          name: string | null;
          onboarded_at: string | null;
          owner_email: string | null;
          owner_name: string | null;
          subscription_type_name: string | null;
        };
        Relationships: [];
      };
      active_users: {
        Row: {
          created_at: string | null;
          customer_id: string | null;
          customer_name: string | null;
          email: string | null;
          full_name: string | null;
          last_login_at: string | null;
          role_name: string | null;
          status: Database['public']['Enums']['userstatus'] | null;
          user_id: string | null;
        };
        Relationships: [];
      };
      extension_data_enriched: {
        Row: {
          created_at: string | null;
          data_id: string | null;
          extension_data_id: string | null;
          field_description: string | null;
          field_external_name: string | null;
          field_name: string | null;
          field_type: Database['public']['Enums']['extensionfieldtype'] | null;
          table_being_extended: string | null;
          updated_at: string | null;
          value: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      current_customer_id: { Args: never; Returns: string };
      current_user_id: { Args: never; Returns: string };
      get_accessible_customer_ids: { Args: never; Returns: string[] };
      get_current_user: {
        Args: never;
        Returns: {
          auth_user_id: string;
          customer_id: string;
          email: string;
          full_name: string;
          role_id: string;
          status: Database['public']['Enums']['userstatus'];
          user_id: string;
        }[];
      };
      get_customer_owner_id: {
        Args: { check_customer_id: string };
        Returns: string;
      };
      get_user_role_id: { Args: never; Returns: string };
      get_user_roles: {
        Args: never;
        Returns: {
          display_name: string;
          is_system_role: boolean;
          permissions: Json;
          role_id: string;
          role_name: string;
        }[];
      };
      has_all_permissions: {
        Args: { permission_names: string[] };
        Returns: boolean;
      };
      has_any_permission: {
        Args: { permission_names: string[] };
        Returns: boolean;
      };
      has_permission: { Args: { permission_name: string }; Returns: boolean };
      has_role: { Args: { role_name: string }; Returns: boolean };
      has_system_role: { Args: { role_name: string }; Returns: boolean };
      is_customer_owner: { Args: never; Returns: boolean };
      is_manager: { Args: never; Returns: boolean };
      user_belongs_to_customer: {
        Args: { check_customer_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      acceptance_criteria_priority_enum: 'P0' | 'P1' | 'P2';
      articlestatus: 'draft' | 'review' | 'published' | 'archived';
      customerlifecyclestage:
        | 'onboarding'
        | 'active'
        | 'expansion'
        | 'at_risk'
        | 'churned';
      extensionfieldtype:
        | 'text'
        | 'number'
        | 'boolean'
        | 'date'
        | 'datetime'
        | 'json'
        | 'select'
        | 'multiselect';
      http_method_enum: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
      invitationstatus: 'pending' | 'accepted' | 'expired' | 'revoked';
      notificationstatus: 'unread' | 'read' | 'archived' | 'deleted';
      notificationtype: 'email' | 'in_app';
      source_reference_type_enum: 'figma' | 'url' | 'file' | 'text' | 'other';
      stripesubscriptionstatus:
        | 'incomplete'
        | 'incomplete_expired'
        | 'trialing'
        | 'active'
        | 'past_due'
        | 'canceled'
        | 'unpaid'
        | 'paused';
      userstatus: 'active' | 'inactive' | 'invited' | 'suspended' | 'deleted';
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
          type: Database['storage']['Enums']['buckettype'];
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
          type?: Database['storage']['Enums']['buckettype'];
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
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          format: string;
          id: string;
          type: Database['storage']['Enums']['buckettype'];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          format?: string;
          id: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          format?: string;
          id?: string;
          type?: Database['storage']['Enums']['buckettype'];
          updated_at?: string;
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
          level: number | null;
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
          level?: number | null;
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
          level?: number | null;
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
      prefixes: {
        Row: {
          bucket_id: string;
          created_at: string | null;
          level: number;
          name: string;
          updated_at: string | null;
        };
        Insert: {
          bucket_id: string;
          created_at?: string | null;
          level?: number;
          name: string;
          updated_at?: string | null;
        };
        Update: {
          bucket_id?: string;
          created_at?: string | null;
          level?: number;
          name?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'prefixes_bucketId_fkey';
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
      add_prefixes: {
        Args: { _bucket_id: string; _name: string };
        Returns: undefined;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      delete_leaf_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      delete_prefix: {
        Args: { _bucket_id: string; _name: string };
        Returns: boolean;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_level: { Args: { name: string }; Returns: number };
      get_prefix: { Args: { name: string }; Returns: string };
      get_prefixes: { Args: { name: string }; Returns: string[] };
      get_size_by_bucket: {
        Args: never;
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
      lock_top_prefixes: {
        Args: { bucket_ids: string[]; names: string[] };
        Returns: undefined;
      };
      operation: { Args: never; Returns: string };
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
      search_legacy_v1: {
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
      search_v1_optimised: {
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
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: 'STANDARD' | 'ANALYTICS';
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
      acceptance_criteria_priority_enum: ['P0', 'P1', 'P2'],
      articlestatus: ['draft', 'review', 'published', 'archived'],
      customerlifecyclestage: [
        'onboarding',
        'active',
        'expansion',
        'at_risk',
        'churned',
      ],
      extensionfieldtype: [
        'text',
        'number',
        'boolean',
        'date',
        'datetime',
        'json',
        'select',
        'multiselect',
      ],
      http_method_enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      invitationstatus: ['pending', 'accepted', 'expired', 'revoked'],
      notificationstatus: ['unread', 'read', 'archived', 'deleted'],
      notificationtype: ['email', 'in_app'],
      source_reference_type_enum: ['figma', 'url', 'file', 'text', 'other'],
      stripesubscriptionstatus: [
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused',
      ],
      userstatus: ['active', 'inactive', 'invited', 'suspended', 'deleted'],
    },
  },
  storage: {
    Enums: {
      buckettype: ['STANDARD', 'ANALYTICS'],
    },
  },
} as const;
