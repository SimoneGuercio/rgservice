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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      employees: {
        Row: {
          attivo: boolean
          cognome: string
          id: string
          nome: string
          ruolo: Database["public"]["Enums"]["employee_ruolo"]
          telefono: string | null
          user_id: string | null
        }
        Insert: {
          attivo?: boolean
          cognome: string
          id?: string
          nome: string
          ruolo: Database["public"]["Enums"]["employee_ruolo"]
          telefono?: string | null
          user_id?: string | null
        }
        Update: {
          attivo?: boolean
          cognome?: string
          id?: string
          nome?: string
          ruolo?: Database["public"]["Enums"]["employee_ruolo"]
          telefono?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      equipment: {
        Row: {
          category_id: string
          created_at: string
          foto_url: string | null
          id: string
          marca: string | null
          modello: string | null
          nome: string
          note: string | null
          numero_seriale: string | null
          pos_x: number
          pos_y: number
          pos_z: number
          prezzo_giornaliero: number
          stato: Database["public"]["Enums"]["equipment_stato"]
          zona_magazzino: string | null
        }
        Insert: {
          category_id: string
          created_at?: string
          foto_url?: string | null
          id?: string
          marca?: string | null
          modello?: string | null
          nome: string
          note?: string | null
          numero_seriale?: string | null
          pos_x?: number
          pos_y?: number
          pos_z?: number
          prezzo_giornaliero?: number
          stato?: Database["public"]["Enums"]["equipment_stato"]
          zona_magazzino?: string | null
        }
        Update: {
          category_id?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          marca?: string | null
          modello?: string | null
          nome?: string
          note?: string | null
          numero_seriale?: string | null
          pos_x?: number
          pos_y?: number
          pos_z?: number
          prezzo_giornaliero?: number
          stato?: Database["public"]["Enums"]["equipment_stato"]
          zona_magazzino?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "equipment_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_categories: {
        Row: {
          colore: string | null
          icona: string | null
          id: string
          nome: string
          zona: string
        }
        Insert: {
          colore?: string | null
          icona?: string | null
          id?: string
          nome: string
          zona: string
        }
        Update: {
          colore?: string | null
          icona?: string | null
          id?: string
          nome?: string
          zona?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          equipment_id: string
          id: string
          order_id: string
        }
        Insert: {
          equipment_id: string
          id?: string
          order_id: string
        }
        Update: {
          equipment_id?: string
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cliente_email: string | null
          cliente_nome: string
          cliente_telefono: string | null
          created_at: string
          data_fine: string
          data_inizio: string
          id: string
          luogo_evento: string | null
          note: string | null
          stato: Database["public"]["Enums"]["order_stato"]
        }
        Insert: {
          cliente_email?: string | null
          cliente_nome: string
          cliente_telefono?: string | null
          created_at?: string
          data_fine: string
          data_inizio: string
          id?: string
          luogo_evento?: string | null
          note?: string | null
          stato?: Database["public"]["Enums"]["order_stato"]
        }
        Update: {
          cliente_email?: string | null
          cliente_nome?: string
          cliente_telefono?: string | null
          created_at?: string
          data_fine?: string
          data_inizio?: string
          id?: string
          luogo_evento?: string | null
          note?: string | null
          stato?: Database["public"]["Enums"]["order_stato"]
        }
        Relationships: []
      }
      tasks: {
        Row: {
          data_ora: string
          employee_id: string | null
          id: string
          note: string | null
          order_id: string
          stato: Database["public"]["Enums"]["task_stato"]
          tipo: Database["public"]["Enums"]["task_tipo"]
        }
        Insert: {
          data_ora: string
          employee_id?: string | null
          id?: string
          note?: string | null
          order_id: string
          stato?: Database["public"]["Enums"]["task_stato"]
          tipo: Database["public"]["Enums"]["task_tipo"]
        }
        Update: {
          data_ora?: string
          employee_id?: string | null
          id?: string
          note?: string | null
          order_id?: string
          stato?: Database["public"]["Enums"]["task_stato"]
          tipo?: Database["public"]["Enums"]["task_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "tasks_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "dipendente"
      employee_ruolo:
        | "magazziniere"
        | "tecnico_audio"
        | "tecnico_luci"
        | "autista"
      equipment_stato: "disponibile" | "in_manutenzione" | "fuori_servizio"
      order_stato:
        | "bozza"
        | "confermato"
        | "in_corso"
        | "completato"
        | "annullato"
      task_stato: "da_fare" | "in_corso" | "completato"
      task_tipo:
        | "preparazione"
        | "carico"
        | "consegna"
        | "montaggio"
        | "smontaggio"
        | "rientro_controllo"
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
    Enums: {
      app_role: ["admin", "dipendente"],
      employee_ruolo: [
        "magazziniere",
        "tecnico_audio",
        "tecnico_luci",
        "autista",
      ],
      equipment_stato: ["disponibile", "in_manutenzione", "fuori_servizio"],
      order_stato: [
        "bozza",
        "confermato",
        "in_corso",
        "completato",
        "annullato",
      ],
      task_stato: ["da_fare", "in_corso", "completato"],
      task_tipo: [
        "preparazione",
        "carico",
        "consegna",
        "montaggio",
        "smontaggio",
        "rientro_controllo",
      ],
    },
  },
} as const
