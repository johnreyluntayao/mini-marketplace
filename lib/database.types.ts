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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      listing_owners: {
        Row: {
          listing_id: string
          owner_hash: string
        }
        Insert: {
          listing_id: string
          owner_hash: string
        }
        Update: {
          listing_id?: string
          owner_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_owners_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          location: string | null
          price: number
          search_text: string | null
          seller_email: string
          sold_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          image_url?: string | null
          location?: string | null
          price: number
          search_text?: string | null
          seller_email: string
          sold_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          image_url?: string | null
          location?: string | null
          price?: number
          search_text?: string | null
          seller_email?: string
          sold_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          buyer_email: string
          created_at: string
          id: string
          listing_id: string
          message: string
        }
        Insert: {
          buyer_email: string
          created_at?: string
          id?: string
          listing_id: string
          message: string
        }
        Update: {
          buyer_email?: string
          created_at?: string
          id?: string
          listing_id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          expires_at: string
          id: string
          listing_id: string
          paid_at: string | null
          platform_fee_cents: number
          status: string
          stripe_account_id: string
          stripe_checkout_id: string | null
          stripe_payment_intent_id: string | null
          title: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          expires_at?: string
          id: string
          listing_id: string
          paid_at?: string | null
          platform_fee_cents: number
          status?: string
          stripe_account_id: string
          stripe_checkout_id?: string | null
          stripe_payment_intent_id?: string | null
          title: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          expires_at?: string
          id?: string
          listing_id?: string
          paid_at?: string | null
          platform_fee_cents?: number
          status?: string
          stripe_account_id?: string
          stripe_checkout_id?: string | null
          stripe_payment_intent_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_stripe_account_id_fkey"
            columns: ["stripe_account_id"]
            isOneToOne: false
            referencedRelation: "seller_payment_accounts"
            referencedColumns: ["stripe_account_id"]
          },
        ]
      }
      seller_payment_accounts: {
        Row: {
          charges_enabled: boolean
          details_submitted: boolean
          owner_hash: string
          payouts_enabled: boolean
          seller_email: string
          stripe_account_id: string
          stripe_checked_at: string
        }
        Insert: {
          charges_enabled?: boolean
          details_submitted?: boolean
          owner_hash: string
          payouts_enabled?: boolean
          seller_email: string
          stripe_account_id: string
          stripe_checked_at?: string
        }
        Update: {
          charges_enabled?: boolean
          details_submitted?: boolean
          owner_hash?: string
          payouts_enabled?: boolean
          seller_email?: string
          stripe_account_id?: string
          stripe_checked_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      confirm_marketplace_order: {
        Args: {
          p_account_id: string
          p_amount: number
          p_checkout_id: string
          p_fee: number
          p_intent_id: string
          p_order_id: string
        }
        Returns: boolean
      }
      marketplace_listing_can_buy: {
        Args: { p_listing_id: string }
        Returns: boolean
      }
      publish_marketplace_listing: {
        Args: { p_listing: Json; p_owner_hash: string }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          image_url: string | null
          location: string | null
          price: number
          search_text: string | null
          seller_email: string
          sold_at: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      reserve_marketplace_order: {
        Args: { p_listing_id: string; p_order_id: string }
        Returns: {
          amount_cents: number
          created_at: string
          currency: string
          expires_at: string
          id: string
          listing_id: string
          paid_at: string | null
          platform_fee_cents: number
          status: string
          stripe_account_id: string
          stripe_checkout_id: string | null
          stripe_payment_intent_id: string | null
          title: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
