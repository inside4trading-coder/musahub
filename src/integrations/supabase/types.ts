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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calls: {
        Row: {
          agent_name: string | null
          call_id: string
          caller: string | null
          cost: number | null
          created_at: string | null
          destination: string | null
          direction: string | null
          duration: number | null
          id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          agent_name?: string | null
          call_id: string
          caller?: string | null
          cost?: number | null
          created_at?: string | null
          destination?: string | null
          direction?: string | null
          duration?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          agent_name?: string | null
          call_id?: string
          caller?: string | null
          cost?: number | null
          created_at?: string | null
          destination?: string | null
          direction?: string | null
          duration?: number | null
          id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      campaign_steps: {
        Row: {
          campaign_id: string
          created_at: string
          delay_days: number
          html_body: string | null
          id: string
          scheduled_for: string | null
          sent_at: string | null
          status: string
          step_number: number
          subject: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          delay_days?: number
          html_body?: string | null
          id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          step_number?: number
          subject: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          delay_days?: number
          html_body?: string | null
          id?: string
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string
          step_number?: number
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_steps_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_activities: {
        Row: {
          activity_date: string
          activity_type: string
          created_at: string
          created_by: string | null
          deal_id: string
          id: string
          note: string
        }
        Insert: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          created_by?: string | null
          deal_id: string
          id?: string
          note: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          created_at?: string
          created_by?: string | null
          deal_id?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deals: {
        Row: {
          archived: boolean | null
          assigned_to: string | null
          category: string | null
          company_name: string
          contact_name: string
          created_at: string
          created_by: string | null
          deal_value: number
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          next_step: string | null
          next_step_date: string | null
          notes: string | null
          phone: string | null
          stage: string
          tags: string[] | null
          tiktok: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          archived?: boolean | null
          assigned_to?: string | null
          category?: string | null
          company_name: string
          contact_name: string
          created_at?: string
          created_by?: string | null
          deal_value?: number
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          phone?: string | null
          stage?: string
          tags?: string[] | null
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          archived?: boolean | null
          assigned_to?: string | null
          category?: string | null
          company_name?: string
          contact_name?: string
          created_at?: string
          created_by?: string | null
          deal_value?: number
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          linkedin?: string | null
          next_step?: string | null
          next_step_date?: string | null
          notes?: string | null
          phone?: string | null
          stage?: string
          tags?: string[] | null
          tiktok?: string | null
          updated_at?: string
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          campaign_name: string
          created_at: string
          created_by: string | null
          from_name: string | null
          html_body: string | null
          id: string
          recipients: Json | null
          reply_to: string | null
          scheduled_for: string | null
          sent_at: string | null
          status: string | null
          subject: string
        }
        Insert: {
          campaign_name: string
          created_at?: string
          created_by?: string | null
          from_name?: string | null
          html_body?: string | null
          id?: string
          recipients?: Json | null
          reply_to?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject: string
        }
        Update: {
          campaign_name?: string
          created_at?: string
          created_by?: string | null
          from_name?: string | null
          html_body?: string | null
          id?: string
          recipients?: Json | null
          reply_to?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          status?: string | null
          subject?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          business_name: string | null
          campaign_id: string | null
          error_message: string | null
          id: string
          recipient_email: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          business_name?: string | null
          campaign_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          business_name?: string | null
          campaign_id?: string | null
          error_message?: string | null
          id?: string
          recipient_email?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          author_id: string | null
          category: string
          content: string | null
          created_at: string
          id: string
          published: boolean | null
          slug: string | null
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          category: string
          content?: string | null
          created_at?: string
          id?: string
          published?: boolean | null
          slug?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          category?: string
          content?: string | null
          created_at?: string
          id?: string
          published?: boolean | null
          slug?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      prospects: {
        Row: {
          added_to_crm: boolean | null
          address: string | null
          business_name: string
          category: string | null
          city: string | null
          created_at: string
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          latitude: number | null
          linkedin: string | null
          longitude: number | null
          phone: string | null
          polygon_data: Json | null
          rating: number | null
          review_count: number | null
          search_query: string | null
          tiktok: string | null
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          added_to_crm?: boolean | null
          address?: string | null
          business_name: string
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          latitude?: number | null
          linkedin?: string | null
          longitude?: number | null
          phone?: string | null
          polygon_data?: Json | null
          rating?: number | null
          review_count?: number | null
          search_query?: string | null
          tiktok?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          added_to_crm?: boolean | null
          address?: string | null
          business_name?: string
          category?: string | null
          city?: string | null
          created_at?: string
          email?: string | null
          facebook?: string | null
          id?: string
          instagram?: string | null
          latitude?: number | null
          linkedin?: string | null
          longitude?: number | null
          phone?: string | null
          polygon_data?: Json | null
          rating?: number | null
          review_count?: number | null
          search_query?: string | null
          tiktok?: string | null
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      saved_copies: {
        Row: {
          business_type: string | null
          channel: string | null
          city: string | null
          copy_text: string
          created_at: string
          created_by: string | null
          id: string
          tone: string | null
        }
        Insert: {
          business_type?: string | null
          channel?: string | null
          city?: string | null
          copy_text: string
          created_at?: string
          created_by?: string | null
          id?: string
          tone?: string | null
        }
        Update: {
          business_type?: string | null
          channel?: string | null
          city?: string | null
          copy_text?: string
          created_at?: string
          created_by?: string | null
          id?: string
          tone?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      calls_agent_stats: {
        Row: {
          agent: string | null
          answer_rate: number | null
          answered: number | null
          avg_duration_seconds: number | null
          missed: number | null
          total_calls: number | null
          total_cost: number | null
          total_minutes: number | null
          valid_call_rate: number | null
          valid_calls: number | null
        }
        Relationships: []
      }
      calls_daily_stats: {
        Row: {
          answer_rate: number | null
          answered: number | null
          avg_duration_seconds: number | null
          day: string | null
          missed: number | null
          total_calls: number | null
          total_cost: number | null
          total_minutes: number | null
          valid_call_rate: number | null
          valid_calls: number | null
        }
        Relationships: []
      }
      calls_hourly_stats: {
        Row: {
          answered: number | null
          avg_duration_seconds: number | null
          hour: number | null
          total_calls: number | null
          valid_calls: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_all_active_deals: {
        Args: never
        Returns: {
          archived: boolean | null
          assigned_to: string | null
          category: string | null
          company_name: string
          contact_name: string
          created_at: string
          created_by: string | null
          deal_value: number
          email: string | null
          facebook: string | null
          id: string
          instagram: string | null
          linkedin: string | null
          next_step: string | null
          next_step_date: string | null
          notes: string | null
          phone: string | null
          stage: string
          tags: string[] | null
          tiktok: string | null
          updated_at: string
          website: string | null
          whatsapp: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "deals"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "team"
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
    Enums: {
      app_role: ["admin", "team"],
    },
  },
} as const
