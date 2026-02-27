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
      aliexpress_feed_categories: {
        Row: {
          category_id: string
          category_name_english: string | null
          category_name_hebrew: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          parent_category_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          category_name_english?: string | null
          category_name_hebrew: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          category_name_english?: string | null
          category_name_hebrew?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          parent_category_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      aliexpress_feed_products: {
        Row: {
          aliexpress_product_id: string
          category_id: string | null
          category_name_hebrew: string | null
          commission_rate: number | null
          created_at: string
          currency: string | null
          discount_percentage: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          original_price_usd: number | null
          out_of_stock: boolean | null
          price_usd: number | null
          product_name: string
          product_name_hebrew: string | null
          rating: number | null
          reviews_count: number | null
          sales_30d: number | null
          tracking_link: string | null
          updated_at: string
        }
        Insert: {
          aliexpress_product_id: string
          category_id?: string | null
          category_name_hebrew?: string | null
          commission_rate?: number | null
          created_at?: string
          currency?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          original_price_usd?: number | null
          out_of_stock?: boolean | null
          price_usd?: number | null
          product_name: string
          product_name_hebrew?: string | null
          rating?: number | null
          reviews_count?: number | null
          sales_30d?: number | null
          tracking_link?: string | null
          updated_at?: string
        }
        Update: {
          aliexpress_product_id?: string
          category_id?: string | null
          category_name_hebrew?: string | null
          commission_rate?: number | null
          created_at?: string
          currency?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          original_price_usd?: number | null
          out_of_stock?: boolean | null
          price_usd?: number | null
          product_name?: string
          product_name_hebrew?: string | null
          rating?: number | null
          reviews_count?: number | null
          sales_30d?: number | null
          tracking_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      blocked_emails: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          email: string
          id: string
          notes: string | null
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          email: string
          id?: string
          notes?: string | null
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          email?: string
          id?: string
          notes?: string | null
          reason?: string | null
        }
        Relationships: []
      }
      button_clicks: {
        Row: {
          button_type: string
          country: string | null
          created_at: string
          id: string
          source: string
        }
        Insert: {
          button_type: string
          country?: string | null
          created_at?: string
          id?: string
          source: string
        }
        Update: {
          button_type?: string
          country?: string | null
          created_at?: string
          id?: string
          source?: string
        }
        Relationships: []
      }
      category_products: {
        Row: {
          affiliate_link: string
          category: string
          created_at: string
          currency: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          lazada_product_id: string | null
          name_english: string | null
          name_hebrew: string
          out_of_stock: boolean | null
          price_thb: number | null
          rating: number | null
          sales_count: number | null
          updated_at: string
        }
        Insert: {
          affiliate_link: string
          category: string
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          lazada_product_id?: string | null
          name_english?: string | null
          name_hebrew: string
          out_of_stock?: boolean | null
          price_thb?: number | null
          rating?: number | null
          sales_count?: number | null
          updated_at?: string
        }
        Update: {
          affiliate_link?: string
          category?: string
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          lazada_product_id?: string | null
          name_english?: string | null
          name_hebrew?: string
          out_of_stock?: boolean | null
          price_thb?: number | null
          rating?: number | null
          sales_count?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      contact_requests: {
        Row: {
          admin_notes: string | null
          budget: string | null
          created_at: string
          email: string
          id: string
          location: string
          phone: string | null
          platform: string
          request_text: string
          requirements: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          budget?: string | null
          created_at?: string
          email: string
          id?: string
          location?: string
          phone?: string | null
          platform?: string
          request_text: string
          requirements?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          budget?: string | null
          created_at?: string
          email?: string
          id?: string
          location?: string
          phone?: string | null
          platform?: string
          request_text?: string
          requirements?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      feed_categories: {
        Row: {
          category_id: number
          category_name_english: string | null
          category_name_hebrew: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          category_id: number
          category_name_english?: string | null
          category_name_hebrew: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          category_id?: number
          category_name_english?: string | null
          category_name_hebrew?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      feed_products: {
        Row: {
          brand_name: string | null
          category_l1: number | null
          category_name_hebrew: string | null
          commission_rate: number | null
          created_at: string
          currency: string | null
          discount_percentage: number | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          lazada_product_id: string
          original_price_thb: number | null
          out_of_stock: boolean | null
          price_thb: number | null
          product_name: string
          rating: number | null
          reviews_count: number | null
          sales_7d: number | null
          seller_name: string | null
          stock: number | null
          tracking_link: string | null
          updated_at: string
        }
        Insert: {
          brand_name?: string | null
          category_l1?: number | null
          category_name_hebrew?: string | null
          commission_rate?: number | null
          created_at?: string
          currency?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          lazada_product_id: string
          original_price_thb?: number | null
          out_of_stock?: boolean | null
          price_thb?: number | null
          product_name: string
          rating?: number | null
          reviews_count?: number | null
          sales_7d?: number | null
          seller_name?: string | null
          stock?: number | null
          tracking_link?: string | null
          updated_at?: string
        }
        Update: {
          brand_name?: string | null
          category_l1?: number | null
          category_name_hebrew?: string | null
          commission_rate?: number | null
          created_at?: string
          currency?: string | null
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          lazada_product_id?: string
          original_price_thb?: number | null
          out_of_stock?: boolean | null
          price_thb?: number | null
          product_name?: string
          rating?: number | null
          reviews_count?: number | null
          sales_7d?: number | null
          seller_name?: string | null
          stock?: number | null
          tracking_link?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      israel_editor_products: {
        Row: {
          aliexpress_product_id: string | null
          category_name_hebrew: string
          created_at: string
          discount_percentage: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          original_price_usd: number | null
          out_of_stock: boolean | null
          price_usd: number | null
          product_name_english: string | null
          product_name_hebrew: string
          rating: number | null
          sales_count: number | null
          tracking_link: string
          updated_at: string
        }
        Insert: {
          aliexpress_product_id?: string | null
          category_name_hebrew: string
          created_at?: string
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          original_price_usd?: number | null
          out_of_stock?: boolean | null
          price_usd?: number | null
          product_name_english?: string | null
          product_name_hebrew: string
          rating?: number | null
          sales_count?: number | null
          tracking_link: string
          updated_at?: string
        }
        Update: {
          aliexpress_product_id?: string | null
          category_name_hebrew?: string
          created_at?: string
          discount_percentage?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          original_price_usd?: number | null
          out_of_stock?: boolean | null
          price_usd?: number | null
          product_name_english?: string | null
          product_name_hebrew?: string
          rating?: number | null
          sales_count?: number | null
          tracking_link?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_templates: {
        Row: {
          content: string
          id: string
          template_name: string
          updated_at: string
        }
        Insert: {
          content: string
          id?: string
          template_name: string
          updated_at?: string
        }
        Update: {
          content?: string
          id?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_public_feed_products: {
        Args: never
        Returns: {
          brand_name: string
          category_l1: number
          category_name_hebrew: string
          created_at: string
          currency: string
          id: string
          image_url: string
          is_featured: boolean
          lazada_product_id: string
          out_of_stock: boolean
          price_thb: number
          product_name: string
          tracking_link: string
          updated_at: string
        }[]
      }
      has_pending_request: { Args: { check_email: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_email_blocked: { Args: { check_email: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
