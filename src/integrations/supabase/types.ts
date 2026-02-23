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
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      brands: {
        Row: {
          id: number
          logo_url: string | null
          name: string
        }
        Insert: {
          id?: number
          logo_url?: string | null
          name: string
        }
        Update: {
          id?: number
          logo_url?: string | null
          name?: string
        }
        Relationships: []
      }
      chat_feedback: {
        Row: {
          chat_id: string | null
          created_at: string | null
          feedback: string
          id: string
          message_id: string | null
          source_used: string | null
          user_id: string | null
        }
        Insert: {
          chat_id?: string | null
          created_at?: string | null
          feedback: string
          id?: string
          message_id?: string | null
          source_used?: string | null
          user_id?: string | null
        }
        Update: {
          chat_id?: string | null
          created_at?: string | null
          feedback?: string
          id?: string
          message_id?: string | null
          source_used?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_feedback_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_feedback_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_logs: {
        Row: {
          chat_id: string | null
          component: string
          duration_ms: number | null
          error_details: Json | null
          event_type: string
          id: string
          message: string
          metadata: Json | null
          request_id: string
          severity: string | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          chat_id?: string | null
          component: string
          duration_ms?: number | null
          error_details?: Json | null
          event_type: string
          id?: string
          message: string
          metadata?: Json | null
          request_id: string
          severity?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          chat_id?: string | null
          component?: string
          duration_ms?: number | null
          error_details?: Json | null
          event_type?: string
          id?: string
          message?: string
          metadata?: Json | null
          request_id?: string
          severity?: string | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_logs_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          chat_id: string
          content: string
          document_ids: string[] | null
          id: string
          metadata: Json | null
          role: string
          timestamp: string | null
        }
        Insert: {
          chat_id: string
          content: string
          document_ids?: string[] | null
          id?: string
          metadata?: Json | null
          role: string
          timestamp?: string | null
        }
        Update: {
          chat_id?: string
          content?: string
          document_ids?: string[] | null
          id?: string
          metadata?: Json | null
          role?: string
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_chat_id_fkey"
            columns: ["chat_id"]
            isOneToOne: false
            referencedRelation: "chats"
            referencedColumns: ["id"]
          },
        ]
      }
      chats: {
        Row: {
          created_at: string | null
          id: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      drive_files: {
        Row: {
          brand: string | null
          category: string | null
          created_at: string
          file_name: string
          file_url: string | null
          id: string
          mime_type: string
          subcategory_1: string | null
          subcategory_2: string | null
          subcategory_3: string | null
          subcategory_4: string | null
          subcategory_5: string | null
          subcategory_6: string | null
          updated_at: string
        }
        Insert: {
          brand?: string | null
          category?: string | null
          created_at?: string
          file_name: string
          file_url?: string | null
          id: string
          mime_type: string
          subcategory_1?: string | null
          subcategory_2?: string | null
          subcategory_3?: string | null
          subcategory_4?: string | null
          subcategory_5?: string | null
          subcategory_6?: string | null
          updated_at?: string
        }
        Update: {
          brand?: string | null
          category?: string | null
          created_at?: string
          file_name?: string
          file_url?: string | null
          id?: string
          mime_type?: string
          subcategory_1?: string | null
          subcategory_2?: string | null
          subcategory_3?: string | null
          subcategory_4?: string | null
          subcategory_5?: string | null
          subcategory_6?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          department: string
          email: string
          first_name: string
          id: string
          last_name: string
          manager_id: string | null
          phone: string | null
          position_x: number | null
          position_y: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          department: string
          email: string
          first_name: string
          id?: string
          last_name: string
          manager_id?: string | null
          phone?: string | null
          position_x?: number | null
          position_y?: number | null
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          manager_id?: string | null
          phone?: string | null
          position_x?: number | null
          position_y?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      file_content: {
        Row: {
          content: string
          content_format: string
          content_status: string
          file_id: string
          id: string
          processed_at: string
        }
        Insert: {
          content: string
          content_format?: string
          content_status?: string
          file_id: string
          id?: string
          processed_at?: string
        }
        Update: {
          content?: string
          content_format?: string
          content_status?: string
          file_id?: string
          id?: string
          processed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_content_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "drive_files"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_entries: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient1: string
          ingredient2: string | null
          ingredient3: string | null
          ingredient4: string | null
          ingredient5: string | null
          product_id: number | null
          product_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient1: string
          ingredient2?: string | null
          ingredient3?: string | null
          ingredient4?: string | null
          ingredient5?: string | null
          product_id?: number | null
          product_type: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient1?: string
          ingredient2?: string | null
          ingredient3?: string | null
          ingredient4?: string | null
          ingredient5?: string | null
          product_id?: number | null
          product_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: number | null
          id: number
          name: string
        }
        Insert: {
          brand_id?: number | null
          id?: number
          name: string
        }
        Update: {
          brand_id?: number | null
          id?: number
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string | null
        }
        Insert: {
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string | null
        }
        Update: {
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      state_allowed_products: {
        Row: {
          id: number
          product_id: number | null
          state_id: number | null
        }
        Insert: {
          id?: number
          product_id?: number | null
          state_id?: number | null
        }
        Update: {
          id?: number
          product_id?: number | null
          state_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "state_allowed_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "state_allowed_products_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: false
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      state_excise_taxes: {
        Row: {
          created_at: string
          excise_tax_info: string | null
          id: string
          state_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          excise_tax_info?: string | null
          id?: string
          state_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          excise_tax_info?: string | null
          id?: string
          state_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_state_excise_taxes_state_id"
            columns: ["state_id"]
            isOneToOne: true
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      state_notes: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          state_id: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          state_id: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          state_id?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "state_notes_state_id_fkey"
            columns: ["state_id"]
            isOneToOne: true
            referencedRelation: "states"
            referencedColumns: ["id"]
          },
        ]
      }
      states: {
        Row: {
          id: number
          name: string
        }
        Insert: {
          id?: number
          name: string
        }
        Update: {
          id?: number
          name?: string
        }
        Relationships: []
      }
      user_filter_preferences: {
        Row: {
          created_at: string
          filter_settings: Json
          filter_type: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filter_settings?: Json
          filter_type?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filter_settings?: Json
          filter_type?: string
          id?: string
          updated_at?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
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
      get_storage_policies: {
        Args: { bucket_name: string }
        Returns: {
          action: string
          command: string
          definition: string
          name: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: { _role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      update_app_settings: {
        Args: { setting_id: string; setting_value: Json }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "basic" | "admin"
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
      app_role: ["basic", "admin"],
    },
  },
} as const
