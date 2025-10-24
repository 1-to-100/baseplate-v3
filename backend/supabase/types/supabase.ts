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
      subscription_types: {
        Row: {
          subscription_type_id: string;
          name: string;
          description: string | null;
          active: boolean;
          is_default: boolean;
          stripe_product_id: string | null;
          stripe_price_id: string | null;
          max_users: number | null;
          max_contacts: number | null;
          features: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          subscription_type_id?: string;
          name: string;
          description?: string | null;
          active?: boolean;
          is_default?: boolean;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          max_users?: number | null;
          max_contacts?: number | null;
          features?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          subscription_type_id?: string;
          name?: string;
          description?: string | null;
          active?: boolean;
          is_default?: boolean;
          stripe_product_id?: string | null;
          stripe_price_id?: string | null;
          max_users?: number | null;
          max_contacts?: number | null;
          features?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          role_id: string;
          name: string;
          display_name: string;
          description: string | null;
          is_system_role: boolean;
          permissions: Json;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          role_id?: string;
          name: string;
          display_name: string;
          description?: string | null;
          is_system_role?: boolean;
          permissions?: Json;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          role_id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
          is_system_role?: boolean;
          permissions?: Json;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      permissions: {
        Row: {
          permission_id: string;
          name: string;
          display_name: string;
          description: string | null;
        };
        Insert: {
          permission_id?: string;
          name: string;
          display_name: string;
          description?: string | null;
        };
        Update: {
          permission_id?: string;
          name?: string;
          display_name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      managers: {
        Row: {
          manager_id: string;
          auth_user_id: string | null;
          email: string;
          full_name: string;
          active: boolean;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          manager_id?: string;
          auth_user_id?: string | null;
          email: string;
          full_name: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          manager_id?: string;
          auth_user_id?: string | null;
          email?: string;
          full_name?: string;
          active?: boolean;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          customer_id: string;
          name: string;
          email_domain: string | null;
          lifecycle_stage: Database['public']['Enums']['CustomerLifecycleStage'];
          active: boolean;
          subscription_type_id: string | null;
          stripe_customer_id: string | null;
          owner_id: string | null;
          manager_id: string | null;
          onboarded_at: string | null;
          churned_at: string | null;
          metadata: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          customer_id?: string;
          name: string;
          email_domain?: string | null;
          lifecycle_stage?: Database['public']['Enums']['CustomerLifecycleStage'];
          active?: boolean;
          subscription_type_id?: string | null;
          stripe_customer_id?: string | null;
          owner_id?: string | null;
          manager_id?: string | null;
          onboarded_at?: string | null;
          churned_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          customer_id?: string;
          name?: string;
          email_domain?: string | null;
          lifecycle_stage?: Database['public']['Enums']['CustomerLifecycleStage'];
          active?: boolean;
          subscription_type_id?: string | null;
          stripe_customer_id?: string | null;
          owner_id?: string | null;
          manager_id?: string | null;
          onboarded_at?: string | null;
          churned_at?: string | null;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_subscription_type_id_fkey';
            columns: ['subscription_type_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_types';
            referencedColumns: ['subscription_type_id'];
          },
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
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      users: {
        Row: {
          user_id: string;
          auth_user_id: string | null;
          email: string;
          full_name: string;
          avatar_url: string | null;
          phone_number: string | null;
          customer_id: string | null;
          role_id: string | null;
          manager_id: string | null;
          status: Database['public']['Enums']['UserStatus'];
          last_login_at: string | null;
          preferences: Json | null;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          user_id?: string;
          auth_user_id?: string | null;
          email: string;
          full_name: string;
          avatar_url?: string | null;
          phone_number?: string | null;
          customer_id?: string | null;
          role_id?: string | null;
          manager_id?: string | null;
          status?: Database['public']['Enums']['UserStatus'];
          last_login_at?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          user_id?: string;
          auth_user_id?: string | null;
          email?: string;
          full_name?: string;
          avatar_url?: string | null;
          phone_number?: string | null;
          customer_id?: string | null;
          role_id?: string | null;
          manager_id?: string | null;
          status?: Database['public']['Enums']['UserStatus'];
          last_login_at?: string | null;
          preferences?: Json | null;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'users_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'users_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['role_id'];
          },
          {
            foreignKeyName: 'users_manager_id_fkey';
            columns: ['manager_id'];
            isOneToOne: false;
            referencedRelation: 'managers';
            referencedColumns: ['manager_id'];
          },
        ];
      };
      user_one_time_codes: {
        Row: {
          id: string;
          user_id: string;
          code: string;
          is_used: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          code: string;
          is_used?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          code?: string;
          is_used?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'user_one_time_codes_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      customer_subscriptions: {
        Row: {
          customer_subscription_id: string;
          customer_id: string;
          subscription_type_id: string;
          stripe_subscription_id: string | null;
          stripe_status: Database['public']['Enums']['StripeSubscriptionStatus'] | null;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          canceled_at: string | null;
          trial_start: string | null;
          trial_end: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          customer_subscription_id?: string;
          customer_id: string;
          subscription_type_id: string;
          stripe_subscription_id?: string | null;
          stripe_status?: Database['public']['Enums']['StripeSubscriptionStatus'] | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          customer_subscription_id?: string;
          customer_id?: string;
          subscription_type_id?: string;
          stripe_subscription_id?: string | null;
          stripe_status?: Database['public']['Enums']['StripeSubscriptionStatus'] | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          canceled_at?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
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
      user_invitations: {
        Row: {
          invitation_id: string;
          email: string;
          customer_id: string;
          role_id: string | null;
          invited_by: string;
          status: Database['public']['Enums']['InvitationStatus'];
          token: string;
          expires_at: string;
          accepted_at: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          invitation_id?: string;
          email: string;
          customer_id: string;
          role_id?: string | null;
          invited_by: string;
          status?: Database['public']['Enums']['InvitationStatus'];
          token: string;
          expires_at: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          invitation_id?: string;
          email?: string;
          customer_id?: string;
          role_id?: string | null;
          invited_by?: string;
          status?: Database['public']['Enums']['InvitationStatus'];
          token?: string;
          expires_at?: string;
          accepted_at?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'user_invitations_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'user_invitations_role_id_fkey';
            columns: ['role_id'];
            isOneToOne: false;
            referencedRelation: 'roles';
            referencedColumns: ['role_id'];
          },
          {
            foreignKeyName: 'user_invitations_invited_by_fkey';
            columns: ['invited_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      taxonomies: {
        Row: {
          taxonomy_id: string;
          customer_id: string;
          name: string;
          slug: string;
          parent_id: string | null;
          display_order: number;
          metadata: Json | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          taxonomy_id?: string;
          customer_id: string;
          name: string;
          slug: string;
          parent_id?: string | null;
          display_order?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          taxonomy_id?: string;
          customer_id?: string;
          name?: string;
          slug?: string;
          parent_id?: string | null;
          display_order?: number;
          metadata?: Json | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
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
      extension_data_types: {
        Row: {
          extension_data_type_id: string;
          table_being_extended: string;
          name: string;
          external_name: string;
          field_type: Database['public']['Enums']['ExtensionFieldType'];
          description: string | null;
          is_required: boolean;
          is_active: boolean;
          default_value: string | null;
          validation_rules: Json | null;
          display_order: number;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          extension_data_type_id?: string;
          table_being_extended: string;
          name: string;
          external_name: string;
          field_type: Database['public']['Enums']['ExtensionFieldType'];
          description?: string | null;
          is_required?: boolean;
          is_active?: boolean;
          default_value?: string | null;
          validation_rules?: Json | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          extension_data_type_id?: string;
          table_being_extended?: string;
          name?: string;
          external_name?: string;
          field_type?: Database['public']['Enums']['ExtensionFieldType'];
          description?: string | null;
          is_required?: boolean;
          is_active?: boolean;
          default_value?: string | null;
          validation_rules?: Json | null;
          display_order?: number;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      extension_data: {
        Row: {
          extension_data_id: string;
          extension_data_type_id: string;
          data_id: string;
          value: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          extension_data_id?: string;
          extension_data_type_id: string;
          data_id: string;
          value?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          extension_data_id?: string;
          extension_data_type_id?: string;
          data_id?: string;
          value?: string | null;
          created_at?: string;
          updated_at?: string | null;
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
      article_categories: {
        Row: {
          article_category_id: string;
          customer_id: string;
          name: string;
          slug: string;
          description: string | null;
          subcategory: string | null;
          about: string | null;
          parent_id: string | null;
          icon: string | null;
          display_order: number;
          created_by: string;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          article_category_id?: string;
          customer_id: string;
          name: string;
          slug: string;
          description?: string | null;
          subcategory?: string | null;
          about?: string | null;
          parent_id?: string | null;
          icon?: string | null;
          display_order?: number;
          created_by: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          article_category_id?: string;
          customer_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          subcategory?: string | null;
          about?: string | null;
          parent_id?: string | null;
          icon?: string | null;
          display_order?: number;
          created_by?: string;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
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
          {
            foreignKeyName: 'article_categories_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      articles: {
        Row: {
          article_id: string;
          customer_id: string;
          category_id: string;
          title: string;
          slug: string;
          content: string | null;
          summary: string | null;
          subcategory: string | null;
          status: Database['public']['Enums']['ArticleStatus'];
          published_at: string | null;
          video_url: string | null;
          view_count: number;
          featured: boolean;
          metadata: Json | null;
          created_by: string;
          updated_by: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          article_id?: string;
          customer_id: string;
          category_id: string;
          title: string;
          slug: string;
          content?: string | null;
          summary?: string | null;
          subcategory?: string | null;
          status?: Database['public']['Enums']['ArticleStatus'];
          published_at?: string | null;
          video_url?: string | null;
          view_count?: number;
          featured?: boolean;
          metadata?: Json | null;
          created_by: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          article_id?: string;
          customer_id?: string;
          category_id?: string;
          title?: string;
          slug?: string;
          content?: string | null;
          summary?: string | null;
          subcategory?: string | null;
          status?: Database['public']['Enums']['ArticleStatus'];
          published_at?: string | null;
          video_url?: string | null;
          view_count?: number;
          featured?: boolean;
          metadata?: Json | null;
          created_by?: string;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'articles_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
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
            referencedRelation: 'users';
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
      notification_templates: {
        Row: {
          template_id: string;
          customer_id: string | null;
          name: string;
          subject: string | null;
          body: string;
          type: Database['public']['Enums']['NotificationType'];
          channel: string;
          variables: Json | null;
          is_active: boolean;
          created_at: string;
          updated_at: string | null;
          deleted_at: string | null;
        };
        Insert: {
          template_id?: string;
          customer_id?: string | null;
          name: string;
          subject?: string | null;
          body: string;
          type: Database['public']['Enums']['NotificationType'];
          channel: string;
          variables?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Update: {
          template_id?: string;
          customer_id?: string | null;
          name?: string;
          subject?: string | null;
          body?: string;
          type?: Database['public']['Enums']['NotificationType'];
          channel?: string;
          variables?: Json | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [
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
          id: string;
          customer_id: string | null;
          user_id: string;
          template_id: string | null;
          type: Database['public']['Enums']['NotificationType'];
          title: string | null;
          message: string;
          channel: string | null;
          metadata: Json | null;
          read_at: string | null;
          sender_id: string | null;
          generated_by: string | null;
          created_at: string;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          customer_id?: string | null;
          user_id: string;
          template_id?: string | null;
          type: Database['public']['Enums']['NotificationType'];
          title?: string | null;
          message: string;
          channel?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          sender_id?: string | null;
          generated_by?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          customer_id?: string | null;
          user_id?: string;
          template_id?: string | null;
          type?: Database['public']['Enums']['NotificationType'];
          title?: string | null;
          message?: string;
          channel?: string | null;
          metadata?: Json | null;
          read_at?: string | null;
          sender_id?: string | null;
          generated_by?: string | null;
          created_at?: string;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_customer_id_fkey';
            columns: ['customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['customer_id'];
          },
          {
            foreignKeyName: 'notifications_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
          {
            foreignKeyName: 'notifications_template_id_fkey';
            columns: ['template_id'];
            isOneToOne: false;
            referencedRelation: 'notification_templates';
            referencedColumns: ['template_id'];
          },
        ];
      };
      audit_logs: {
        Row: {
          audit_log_id: string;
          customer_id: string | null;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          changes: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          audit_log_id?: string;
          customer_id?: string | null;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          changes?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          audit_log_id?: string;
          customer_id?: string | null;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          changes?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
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
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
      api_logs: {
        Row: {
          id: string;
          method: string | null;
          url: string | null;
          status_code: number | null;
          response_time: number | null;
          user_id: string | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          method?: string | null;
          url?: string | null;
          status_code?: number | null;
          response_time?: number | null;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          method?: string | null;
          url?: string | null;
          status_code?: number | null;
          response_time?: number | null;
          user_id?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'api_logs_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['user_id'];
          },
        ];
      };
    };
    Views: {
      active_customers: {
        Row: {
          customer_id: string | null;
          name: string | null;
          email_domain: string | null;
          lifecycle_stage: Database['public']['Enums']['CustomerLifecycleStage'] | null;
          subscription_type_name: string | null;
          owner_email: string | null;
          owner_name: string | null;
          created_at: string | null;
          onboarded_at: string | null;
        };
      };
      active_users: {
        Row: {
          user_id: string | null;
          email: string | null;
          full_name: string | null;
          status: Database['public']['Enums']['UserStatus'] | null;
          customer_name: string | null;
          customer_id: string | null;
          role_name: string | null;
          last_login_at: string | null;
          created_at: string | null;
        };
      };
      extension_data_enriched: {
        Row: {
          extension_data_id: string | null;
          data_id: string | null;
          table_being_extended: string | null;
          field_name: string | null;
          field_external_name: string | null;
          field_type: Database['public']['Enums']['ExtensionFieldType'] | null;
          field_description: string | null;
          value: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
      };
    };
    Functions: {
      current_user_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      current_customer_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      has_permission: {
        Args: { permission_name: string };
        Returns: boolean;
      };
      get_user_role_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      has_role: {
        Args: { role_name: string };
        Returns: boolean;
      };
      has_system_role: {
        Args: { role_name: string };
        Returns: boolean;
      };
      get_accessible_customer_ids: {
        Args: Record<PropertyKey, never>;
        Returns: string[];
      };
      user_belongs_to_customer: {
        Args: { check_customer_id: string };
        Returns: boolean;
      };
      get_current_user: {
        Args: Record<PropertyKey, never>;
        Returns: {
          user_id: string;
          auth_user_id: string;
          email: string;
          full_name: string;
          customer_id: string;
          role_id: string;
          status: Database['public']['Enums']['UserStatus'];
        };
      };
      is_manager: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      get_user_roles: {
        Args: Record<PropertyKey, never>;
        Returns: {
          role_id: string;
          role_name: string;
          display_name: string;
          is_system_role: boolean;
          permissions: Json;
        }[];
      };
      has_any_permission: {
        Args: { permission_names: string[] };
        Returns: boolean;
      };
      has_all_permissions: {
        Args: { permission_names: string[] };
        Returns: boolean;
      };
      get_customer_owner_id: {
        Args: { check_customer_id: string };
        Returns: string;
      };
      is_customer_owner: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
    };
    Enums: {
      StripeSubscriptionStatus:
        | 'incomplete'
        | 'incomplete_expired'
        | 'trialing'
        | 'active'
        | 'past_due'
        | 'canceled'
        | 'unpaid'
        | 'paused';
      CustomerLifecycleStage: 'onboarding' | 'active' | 'expansion' | 'at_risk' | 'churned';
      UserStatus: 'active' | 'inactive' | 'invited' | 'suspended' | 'deleted';
      InvitationStatus: 'pending' | 'accepted' | 'expired' | 'revoked';
      NotificationType: 'email' | 'in_app';
      NotificationStatus: 'unread' | 'read' | 'archived' | 'deleted';
      ArticleStatus: 'draft' | 'review' | 'published' | 'archived';
      ExtensionFieldType:
        | 'text'
        | 'number'
        | 'boolean'
        | 'date'
        | 'datetime'
        | 'json'
        | 'select'
        | 'multiselect';
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

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

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
      StripeSubscriptionStatus: [
        'incomplete',
        'incomplete_expired',
        'trialing',
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'paused',
      ],
      CustomerLifecycleStage: ['onboarding', 'active', 'expansion', 'at_risk', 'churned'],
      UserStatus: ['active', 'inactive', 'invited', 'suspended', 'deleted'],
      InvitationStatus: ['pending', 'accepted', 'expired', 'revoked'],
      NotificationType: ['email', 'in_app'],
      NotificationStatus: ['unread', 'read', 'archived', 'deleted'],
      ArticleStatus: ['draft', 'review', 'published', 'archived'],
      ExtensionFieldType: [
        'text',
        'number',
        'boolean',
        'date',
        'datetime',
        'json',
        'select',
        'multiselect',
      ],
    },
  },
  storage: {
    Enums: {},
  },
} as const;
