export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string | null
          created_at: string
          detail: Json
          entity: string
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: Json
          entity: string
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string
          entity_id?: string | null
          id?: never
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          code: string
          config: Json
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bp_section_templates: {
        Row: {
          code: string
          created_at: string
          guidance: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          guidance?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          guidance?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      cap_table_entries: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          holder_name: string
          holder_type: string
          id: string
          notes: string | null
          percentage: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          holder_name: string
          holder_type?: string
          id?: string
          notes?: string | null
          percentage: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          holder_name?: string
          holder_type?: string
          id?: string
          notes?: string | null
          percentage?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cap_table_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cap_table_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cohorts: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          investable_target: number | null
          name: string
          organization_id: string
          start_date: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          investable_target?: number | null
          name: string
          organization_id: string
          start_date?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          investable_target?: number | null
          name?: string
          organization_id?: string
          start_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohorts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          cohort_id: string | null
          created_at: string
          created_by: string | null
          female_leadership_pct: number | null
          founded_on: string | null
          id: string
          name: string
          one_liner: string | null
          organization_id: string
          phase_id: string | null
          sector: string | null
          slug: string
          stage: Database["public"]["Enums"]["company_stage"]
          tech_profile: Database["public"]["Enums"]["company_tech_profile"]
          updated_at: string
          website: string | null
        }
        Insert: {
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          female_leadership_pct?: number | null
          founded_on?: string | null
          id?: string
          name: string
          one_liner?: string | null
          organization_id: string
          phase_id?: string | null
          sector?: string | null
          slug: string
          stage?: Database["public"]["Enums"]["company_stage"]
          tech_profile?: Database["public"]["Enums"]["company_tech_profile"]
          updated_at?: string
          website?: string | null
        }
        Update: {
          cohort_id?: string | null
          created_at?: string
          created_by?: string | null
          female_leadership_pct?: number | null
          founded_on?: string | null
          id?: string
          name?: string
          one_liner?: string | null
          organization_id?: string
          phase_id?: string | null
          sector?: string | null
          slug?: string
          stage?: Database["public"]["Enums"]["company_stage"]
          tech_profile?: Database["public"]["Enums"]["company_tech_profile"]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companies_cohort_id_fkey"
            columns: ["cohort_id"]
            isOneToOne: false
            referencedRelation: "cohorts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "companies_phase_id_fkey"
            columns: ["phase_id"]
            isOneToOne: false
            referencedRelation: "phases"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          member_role: Database["public"]["Enums"]["company_member_role"]
          profile_id: string
          title: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          member_role: Database["public"]["Enums"]["company_member_role"]
          profile_id: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          member_role?: Database["public"]["Enums"]["company_member_role"]
          profile_id?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pillars: {
        Row: {
          cadence: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          intensity: number
          is_active: boolean
          pillar_id: string
          updated_at: string
        }
        Insert: {
          cadence?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          intensity?: number
          is_active?: boolean
          pillar_id: string
          updated_at?: string
        }
        Update: {
          cadence?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          intensity?: number
          is_active?: boolean
          pillar_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_pillars_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_pillars_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_pillars_pillar_id_fkey"
            columns: ["pillar_id"]
            isOneToOne: false
            referencedRelation: "pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      dd_areas: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          updated_at: string
          weight: number
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index: number
          updated_at?: string
          weight?: number
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      dd_item_templates: {
        Row: {
          area_id: string
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_required: boolean
          order_index: number
          title: string
          updated_at: string
          validity_months: number | null
        }
        Insert: {
          area_id: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          order_index: number
          title: string
          updated_at?: string
          validity_months?: number | null
        }
        Update: {
          area_id?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_required?: boolean
          order_index?: number
          title?: string
          updated_at?: string
          validity_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dd_item_templates_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "dd_areas"
            referencedColumns: ["id"]
          },
        ]
      }
      kpi_definitions: {
        Row: {
          category: Database["public"]["Enums"]["kpi_category"]
          code: string
          created_at: string
          derived_from: string[]
          description: string | null
          direction: Database["public"]["Enums"]["kpi_direction"]
          id: string
          is_active: boolean
          is_derived: boolean
          name: string
          order_index: number
          sector: string | null
          unit: Database["public"]["Enums"]["kpi_unit"]
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["kpi_category"]
          code: string
          created_at?: string
          derived_from?: string[]
          description?: string | null
          direction?: Database["public"]["Enums"]["kpi_direction"]
          id?: string
          is_active?: boolean
          is_derived?: boolean
          name: string
          order_index: number
          sector?: string | null
          unit: Database["public"]["Enums"]["kpi_unit"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["kpi_category"]
          code?: string
          created_at?: string
          derived_from?: string[]
          description?: string | null
          direction?: Database["public"]["Enums"]["kpi_direction"]
          id?: string
          is_active?: boolean
          is_derived?: boolean
          name?: string
          order_index?: number
          sector?: string | null
          unit?: Database["public"]["Enums"]["kpi_unit"]
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      phases: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      pillars: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          order_index: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          organization_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_criteria: {
        Row: {
          automatable: boolean
          code: string
          created_at: string
          description: string | null
          dimension_id: string
          expected_evidence: string | null
          id: string
          is_active: boolean
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          automatable?: boolean
          code: string
          created_at?: string
          description?: string | null
          dimension_id: string
          expected_evidence?: string | null
          id?: string
          is_active?: boolean
          order_index: number
          title: string
          updated_at?: string
        }
        Update: {
          automatable?: boolean
          code?: string
          created_at?: string
          description?: string | null
          dimension_id?: string
          expected_evidence?: string | null
          id?: string
          is_active?: boolean
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_criteria_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "tech_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_dimension_weights: {
        Row: {
          created_at: string
          dimension_id: string
          id: string
          tech_profile: Database["public"]["Enums"]["company_tech_profile"]
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          dimension_id: string
          id?: string
          tech_profile: Database["public"]["Enums"]["company_tech_profile"]
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          dimension_id?: string
          id?: string
          tech_profile?: Database["public"]["Enums"]["company_tech_profile"]
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "tech_dimension_weights_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "tech_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_dimensions: {
        Row: {
          applicability: Database["public"]["Enums"]["tech_applicability"]
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          applicability?: Database["public"]["Enums"]["tech_applicability"]
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          order_index: number
          updated_at?: string
        }
        Update: {
          applicability?: Database["public"]["Enums"]["tech_applicability"]
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      tech_maturity_levels: {
        Row: {
          description: string
          level: number
          name: string
        }
        Insert: {
          description: string
          level: number
          name: string
        }
        Update: {
          description?: string
          level?: number
          name?: string
        }
        Relationships: []
      }
      tech_stage_targets: {
        Row: {
          created_at: string
          dimension_id: string
          id: string
          stage: Database["public"]["Enums"]["company_stage"]
          target_level: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dimension_id: string
          id?: string
          stage: Database["public"]["Enums"]["company_stage"]
          target_level: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dimension_id?: string
          id?: string
          stage?: Database["public"]["Enums"]["company_stage"]
          target_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_stage_targets_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "tech_dimensions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role:
        | "admin_iwl"
        | "equipo_iwl"
        | "revisor_niage"
        | "fundadora"
        | "mentor"
        | "lector_externo"
      company_member_role:
        | "fundadora"
        | "responsable_iwl"
        | "revisor_niage"
        | "mentor"
      company_stage: "pre_semilla" | "semilla" | "serie_a"
      company_tech_profile: "software" | "software_ia" | "hardware"
      kpi_category: "nucleo" | "sector" | "tecnico" | "propio"
      kpi_direction: "sube_mejor" | "baja_mejor" | "neutro"
      kpi_unit: "moneda" | "porcentaje" | "numero" | "meses" | "dias" | "ratio"
      tech_applicability: "siempre" | "ia" | "hardware"
      traffic_light: "verde" | "ambar" | "rojo"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: [
        "admin_iwl",
        "equipo_iwl",
        "revisor_niage",
        "fundadora",
        "mentor",
        "lector_externo",
      ],
      company_member_role: [
        "fundadora",
        "responsable_iwl",
        "revisor_niage",
        "mentor",
      ],
      company_stage: ["pre_semilla", "semilla", "serie_a"],
      company_tech_profile: ["software", "software_ia", "hardware"],
      kpi_category: ["nucleo", "sector", "tecnico", "propio"],
      kpi_direction: ["sube_mejor", "baja_mejor", "neutro"],
      kpi_unit: ["moneda", "porcentaje", "numero", "meses", "dias", "ratio"],
      tech_applicability: ["siempre", "ia", "hardware"],
      traffic_light: ["verde", "ambar", "rojo"],
    },
  },
} as const

