export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      campaign_groups: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          insertion_order_id: string
          name: string
          start_date: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          insertion_order_id: string
          name: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          insertion_order_id?: string
          name?: string
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_campaign_groups_insertion_order"
            columns: ["insertion_order_id"]
            isOneToOne: false
            referencedRelation: "insertion_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_metrics_daily: {
        Row: {
          campaign_id: string
          cta_clicks: number
          metric_date: string
          page_views: number
          pin_clicks: number
          total_events: number
        }
        Insert: {
          campaign_id: string
          cta_clicks?: number
          metric_date: string
          page_views?: number
          pin_clicks?: number
          total_events?: number
        }
        Update: {
          campaign_id?: string
          cta_clicks?: number
          metric_date?: string
          page_views?: number
          pin_clicks?: number
          total_events?: number
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          campaign_group_id: string
          created_at: string
          creative_format: string | null
          description: string | null
          end_date: string
          id: string
          insertion_order_id: string | null
          name: string
          short_token: string | null
          start_date: string
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          campaign_group_id: string
          created_at?: string
          creative_format?: string | null
          description?: string | null
          end_date: string
          id?: string
          insertion_order_id?: string | null
          name: string
          short_token?: string | null
          start_date: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          campaign_group_id?: string
          created_at?: string
          creative_format?: string | null
          description?: string | null
          end_date?: string
          id?: string
          insertion_order_id?: string | null
          name?: string
          short_token?: string | null
          start_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_campaign_group_id_fkey"
            columns: ["campaign_group_id"]
            isOneToOne: false
            referencedRelation: "campaign_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_insertion_order_id_fkey"
            columns: ["insertion_order_id"]
            isOneToOne: false
            referencedRelation: "insertion_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_campaign_group"
            columns: ["campaign_group_id"]
            isOneToOne: false
            referencedRelation: "campaign_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip_address: unknown
          metadata: Json | null
          tag_id: string
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          tag_id: string
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          tag_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      insertion_orders: {
        Row: {
          client_name: string
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "insertion_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          campaign_id: string
          code: string
          created_at: string
          id: string
          title: string
          type: string
        }
        Insert: {
          campaign_id: string
          code: string
          created_at?: string
          id?: string
          title: string
          type: string
        }
        Update: {
          campaign_id?: string
          code?: string
          created_at?: string
          id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      events_with_tags: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          event_label: string | null
          event_type: string | null
          id: string | null
          tag_id: string | null
          tag_title: string | null
          tag_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tags_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      backfill_campaign_metrics_daily: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      cleanup_old_events: { Args: never; Returns: undefined }
      get_aggregated_metrics_for_campaigns: {
        Args: {
          p_campaign_ids: string[]
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          total_cta_clicks: number
          total_page_views: number
          total_pin_clicks: number
        }[]
      }
      get_campaign_counters: {
        Args: { campaign_ids: string[] }
        Returns: {
          campaign_id: string
          cta_clicks: number
          last_hour: number
          page_views: number
          pin_clicks: number
          total_7d: number
        }[]
      }
      get_campaign_metrics: {
        Args: {
          campaign_id_param: string
          end_date?: string
          start_date?: string
        }
        Returns: {
          cta_clicks: number
          metric_date: string
          page_views: number
          pin_clicks: number
          total_events: number
        }[]
      }
      get_campaigns_with_events_in_daterange: {
        Args: { p_end_date: string; p_start_date: string }
        Returns: {
          campaign_id: string
        }[]
      }
      get_metrics_by_campaign_and_daterange: {
        Args: {
          p_campaign_ids: string[]
          p_end_date: string
          p_start_date: string
        }
        Returns: {
          campaign_id: string
          cta_clicks: number
          page_views: number
          pin_clicks: number
        }[]
      }
      get_realtime_event_counts: {
        Args: { p_since: string; p_tag_ids: string[] }
        Returns: {
          clicks: number
          last_event: string
          page_views: number
          pin_clicks: number
          tag_id: string
        }[]
      }
      get_report_aggregated: {
        Args: {
          p_breakdown_by_tags?: boolean
          p_campaign_ids?: string[]
          p_end_date?: string
          p_group_by?: string
          p_start_date?: string
        }
        Returns: {
          campaign_id: string
          cta_clicks: number
          page_views: number
          period_start: string
          pin_clicks: number
          tag_id: string
          tag_title: string
        }[]
      }
      get_report_from_events: {
        Args: {
          p_campaign_ids?: string[]
          p_end_date?: string
          p_group_by?: string
          p_start_date?: string
        }
        Returns: {
          campaign_id: string
          cta_clicks: number
          page_views: number
          period_start: string
          pin_clicks: number
        }[]
      }
      get_report_from_materialized_view: {
        Args: {
          p_campaign_ids?: string[]
          p_end_date?: string
          p_group_by?: string
          p_start_date?: string
        }
        Returns: {
          campaign_id: string
          cta_clicks: number
          page_views: number
          period_start: string
          pin_clicks: number
        }[]
      }
      normalize_event_type: {
        Args: { provided_type: string; tag_id: string }
        Returns: string
      }
      refresh_campaign_metrics_daily: { Args: never; Returns: undefined }
      refresh_campaign_metrics_daily_incremental: {
        Args: never
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
