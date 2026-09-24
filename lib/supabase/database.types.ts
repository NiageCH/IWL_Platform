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
          {
            foreignKeyName: "activity_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
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
      bp_section_versions: {
        Row: {
          author_id: string | null
          company_id: string
          content: string | null
          created_at: string
          id: string
          section_id: string
          status: Database["public"]["Enums"]["estado_seccion_bp"]
          version: number
        }
        Insert: {
          author_id?: string | null
          company_id: string
          content?: string | null
          created_at?: string
          id?: string
          section_id: string
          status: Database["public"]["Enums"]["estado_seccion_bp"]
          version: number
        }
        Update: {
          author_id?: string | null
          company_id?: string
          content?: string | null
          created_at?: string
          id?: string
          section_id?: string
          status?: Database["public"]["Enums"]["estado_seccion_bp"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bp_section_versions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bp_section_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bp_section_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bp_section_versions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "bp_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      bp_sections: {
        Row: {
          company_id: string
          content: string | null
          created_at: string
          current_version: number
          id: string
          status: Database["public"]["Enums"]["estado_seccion_bp"]
          template_id: string
          updated_at: string
          updated_by: string | null
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          company_id: string
          content?: string | null
          created_at?: string
          current_version?: number
          id?: string
          status?: Database["public"]["Enums"]["estado_seccion_bp"]
          template_id: string
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          company_id?: string
          content?: string | null
          created_at?: string
          current_version?: number
          id?: string
          status?: Database["public"]["Enums"]["estado_seccion_bp"]
          template_id?: string
          updated_at?: string
          updated_by?: string | null
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bp_sections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bp_sections_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "bp_sections_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "bp_section_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bp_sections_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bp_sections_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "cap_table_entries_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
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
      comments: {
        Row: {
          author_id: string
          body: string
          company_id: string
          created_at: string
          entity: string
          entity_id: string
          id: string
          mentions: string[]
          parent_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          company_id: string
          created_at?: string
          entity: string
          entity_id: string
          id?: string
          mentions?: string[]
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          company_id?: string
          created_at?: string
          entity?: string
          entity_id?: string
          id?: string
          mentions?: string[]
          parent_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      company_kpis: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          custom_code: string | null
          custom_name: string | null
          custom_unit: Database["public"]["Enums"]["kpi_unit"] | null
          id: string
          is_active: boolean
          kpi_id: string | null
          order_index: number
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          custom_code?: string | null
          custom_name?: string | null
          custom_unit?: Database["public"]["Enums"]["kpi_unit"] | null
          id?: string
          is_active?: boolean
          kpi_id?: string | null
          order_index?: number
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          custom_code?: string | null
          custom_name?: string | null
          custom_unit?: Database["public"]["Enums"]["kpi_unit"] | null
          id?: string
          is_active?: boolean
          kpi_id?: string | null
          order_index?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_kpis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_kpis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "company_kpis_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_kpis_kpi_id_fkey"
            columns: ["kpi_id"]
            isOneToOne: false
            referencedRelation: "kpi_definitions"
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
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
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
            foreignKeyName: "company_pillars_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
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
      dd_item_status_history: {
        Row: {
          changed_by: string | null
          company_id: string
          created_at: string
          dd_item_id: string
          from_status: Database["public"]["Enums"]["estado_punto_dd"] | null
          id: number
          note: string | null
          to_status: Database["public"]["Enums"]["estado_punto_dd"]
        }
        Insert: {
          changed_by?: string | null
          company_id: string
          created_at?: string
          dd_item_id: string
          from_status?: Database["public"]["Enums"]["estado_punto_dd"] | null
          id?: never
          note?: string | null
          to_status: Database["public"]["Enums"]["estado_punto_dd"]
        }
        Update: {
          changed_by?: string | null
          company_id?: string
          created_at?: string
          dd_item_id?: string
          from_status?: Database["public"]["Enums"]["estado_punto_dd"] | null
          id?: never
          note?: string | null
          to_status?: Database["public"]["Enums"]["estado_punto_dd"]
        }
        Relationships: [
          {
            foreignKeyName: "dd_item_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dd_item_status_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dd_item_status_history_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "dd_item_status_history_dd_item_id_fkey"
            columns: ["dd_item_id"]
            isOneToOne: false
            referencedRelation: "dd_items"
            referencedColumns: ["id"]
          },
        ]
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
      dd_items: {
        Row: {
          area_id: string
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          document_id: string | null
          due_date: string | null
          expires_on: string | null
          id: string
          is_required: boolean
          notes: string | null
          owner_id: string | null
          status: Database["public"]["Enums"]["estado_punto_dd"]
          template_id: string | null
          title: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          validity_months: number | null
        }
        Insert: {
          area_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          expires_on?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["estado_punto_dd"]
          template_id?: string | null
          title: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validity_months?: number | null
        }
        Update: {
          area_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          document_id?: string | null
          due_date?: string | null
          expires_on?: string | null
          id?: string
          is_required?: boolean
          notes?: string | null
          owner_id?: string | null
          status?: Database["public"]["Enums"]["estado_punto_dd"]
          template_id?: string | null
          title?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          validity_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dd_items_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "dd_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dd_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dd_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "dd_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dd_items_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dd_items_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dd_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dd_item_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dd_items_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_access_log: {
        Row: {
          action: string
          company_id: string
          created_at: string
          document_id: string
          id: number
          profile_id: string | null
        }
        Insert: {
          action: string
          company_id: string
          created_at?: string
          document_id: string
          id?: never
          profile_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string
          created_at?: string
          document_id?: string
          id?: never
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_access_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "document_access_log_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_access_log_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_versions: {
        Row: {
          company_id: string
          created_at: string
          document_id: string
          file_name: string
          id: string
          mime_type: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          document_id: string
          file_name: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
          version: number
        }
        Update: {
          company_id?: string
          created_at?: string
          document_id?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "document_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "document_versions_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_versions_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          area_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          expires_on: string | null
          folder: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_on?: string | null
          folder?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_on?: string | null
          folder?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "dd_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "documents_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_links: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          hypothesis_id: string | null
          id: string
          kind: Database["public"]["Enums"]["tipo_evidencia"]
          label: string
          section_id: string | null
          target_code: string | null
          target_id: string | null
          url: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          hypothesis_id?: string | null
          id?: string
          kind: Database["public"]["Enums"]["tipo_evidencia"]
          label: string
          section_id?: string | null
          target_code?: string | null
          target_id?: string | null
          url?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          hypothesis_id?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["tipo_evidencia"]
          label?: string
          section_id?: string | null
          target_code?: string | null
          target_id?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "evidence_links_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_hypothesis_id_fkey"
            columns: ["hypothesis_id"]
            isOneToOne: false
            referencedRelation: "hypotheses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_links_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "bp_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      findings: {
        Row: {
          acceptance_note: string | null
          area_id: string
          company_id: string
          created_at: string
          created_by: string | null
          dd_item_id: string | null
          description: string
          due_date: string | null
          id: string
          impact: string | null
          resolution_plan: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severidad_hallazgo"]
          status: Database["public"]["Enums"]["estado_hallazgo"]
          title: string
          updated_at: string
        }
        Insert: {
          acceptance_note?: string | null
          area_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          dd_item_id?: string | null
          description: string
          due_date?: string | null
          id?: string
          impact?: string | null
          resolution_plan?: string | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["severidad_hallazgo"]
          status?: Database["public"]["Enums"]["estado_hallazgo"]
          title: string
          updated_at?: string
        }
        Update: {
          acceptance_note?: string | null
          area_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          dd_item_id?: string | null
          description?: string
          due_date?: string | null
          id?: string
          impact?: string | null
          resolution_plan?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severidad_hallazgo"]
          status?: Database["public"]["Enums"]["estado_hallazgo"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "findings_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "dd_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "findings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "findings_dd_item_id_fkey"
            columns: ["dd_item_id"]
            isOneToOne: false
            referencedRelation: "dd_items"
            referencedColumns: ["id"]
          },
        ]
      }
      hypotheses: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          section_id: string
          statement: string
          status: string
          updated_at: string
          validation_criteria: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          section_id: string
          statement: string
          status?: string
          updated_at?: string
          validation_criteria?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          section_id?: string
          statement?: string
          status?: string
          updated_at?: string
          validation_criteria?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hypotheses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hypotheses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "hypotheses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hypotheses_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "bp_sections"
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
      kpi_values: {
        Row: {
          company_id: string
          company_kpi_id: string
          created_at: string
          created_by: string | null
          id: string
          note: string | null
          period: string
          source: string
          target_value: number | null
          update_id: string | null
          updated_at: string
          value: number | null
        }
        Insert: {
          company_id: string
          company_kpi_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          period: string
          source?: string
          target_value?: number | null
          update_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Update: {
          company_id?: string
          company_kpi_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          note?: string | null
          period?: string
          source?: string
          target_value?: number | null
          update_id?: string | null
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "kpi_values_company_kpi_id_fkey"
            columns: ["company_kpi_id"]
            isOneToOne: false
            referencedRelation: "company_kpis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_update_id_fkey"
            columns: ["update_id"]
            isOneToOne: false
            referencedRelation: "monthly_updates"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_updates: {
        Row: {
          achievements: string | null
          blockers: string | null
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          period: string
          requests: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["estado_update"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
        }
        Insert: {
          achievements?: string | null
          blockers?: string | null
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          period: string
          requests?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["estado_update"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Update: {
          achievements?: string | null
          blockers?: string | null
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          period?: string
          requests?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["estado_update"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_updates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_updates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "monthly_updates_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "monthly_updates_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      tasks: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          owner_id: string | null
          source_entity: string | null
          source_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          source_entity?: string | null
          source_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          owner_id?: string | null
          source_entity?: string | null
          source_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_assessments: {
        Row: {
          assessed_on: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          published_at: string | null
          reviewer_id: string | null
          stage: Database["public"]["Enums"]["company_stage"]
          status: Database["public"]["Enums"]["estado_evaluacion"]
          strengths: string | null
          summary: string | null
          tech_profile: Database["public"]["Enums"]["company_tech_profile"]
          updated_at: string
        }
        Insert: {
          assessed_on?: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          reviewer_id?: string | null
          stage: Database["public"]["Enums"]["company_stage"]
          status?: Database["public"]["Enums"]["estado_evaluacion"]
          strengths?: string | null
          summary?: string | null
          tech_profile: Database["public"]["Enums"]["company_tech_profile"]
          updated_at?: string
        }
        Update: {
          assessed_on?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          published_at?: string | null
          reviewer_id?: string | null
          stage?: Database["public"]["Enums"]["company_stage"]
          status?: Database["public"]["Enums"]["estado_evaluacion"]
          strengths?: string | null
          summary?: string | null
          tech_profile?: Database["public"]["Enums"]["company_tech_profile"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_assessments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tech_assessments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_assessments_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      tech_findings: {
        Row: {
          acceptance_note: string | null
          assessment_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          description: string
          dimension_id: string
          evidence: string | null
          id: string
          recommendation: string
          resolved_at: string | null
          severity: Database["public"]["Enums"]["severidad_hallazgo"]
          status: Database["public"]["Enums"]["estado_hallazgo"]
          title: string
          updated_at: string
        }
        Insert: {
          acceptance_note?: string | null
          assessment_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          description: string
          dimension_id: string
          evidence?: string | null
          id?: string
          recommendation: string
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["severidad_hallazgo"]
          status?: Database["public"]["Enums"]["estado_hallazgo"]
          title: string
          updated_at?: string
        }
        Update: {
          acceptance_note?: string | null
          assessment_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string
          dimension_id?: string
          evidence?: string | null
          id?: string
          recommendation?: string
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["severidad_hallazgo"]
          status?: Database["public"]["Enums"]["estado_hallazgo"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_findings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "tech_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_findings_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["assessment_id"]
          },
          {
            foreignKeyName: "tech_findings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_findings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tech_findings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_findings_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "tech_dimensions"
            referencedColumns: ["id"]
          },
        ]
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
      tech_plan_items: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          effort_days: number | null
          estimated_cost: number | null
          finding_id: string | null
          id: string
          owner: Database["public"]["Enums"]["responsable_plan"]
          quarter: string | null
          status: Database["public"]["Enums"]["estado_plan"]
          title: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          effort_days?: number | null
          estimated_cost?: number | null
          finding_id?: string | null
          id?: string
          owner: Database["public"]["Enums"]["responsable_plan"]
          quarter?: string | null
          status?: Database["public"]["Enums"]["estado_plan"]
          title: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          effort_days?: number | null
          estimated_cost?: number | null
          finding_id?: string | null
          id?: string
          owner?: Database["public"]["Enums"]["responsable_plan"]
          quarter?: string | null
          status?: Database["public"]["Enums"]["estado_plan"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_plan_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_plan_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tech_plan_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_plan_items_finding_id_fkey"
            columns: ["finding_id"]
            isOneToOne: false
            referencedRelation: "tech_findings"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_questionnaire_answers: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by: string | null
          attachments: string[]
          company_id: string
          created_at: string
          criterion_id: string
          id: string
          updated_at: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          attachments?: string[]
          company_id: string
          created_at?: string
          criterion_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by?: string | null
          attachments?: string[]
          company_id?: string
          created_at?: string
          criterion_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_questionnaire_answers_answered_by_fkey"
            columns: ["answered_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_questionnaire_answers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_questionnaire_answers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tech_questionnaire_answers_criterion_id_fkey"
            columns: ["criterion_id"]
            isOneToOne: false
            referencedRelation: "tech_criteria"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_review_sessions: {
        Row: {
          assessment_id: string | null
          attendees: string
          company_id: string
          conclusions: string | null
          created_at: string
          created_by: string | null
          duration_min: number
          held_on: string
          id: string
          updated_at: string
        }
        Insert: {
          assessment_id?: string | null
          attendees: string
          company_id: string
          conclusions?: string | null
          created_at?: string
          created_by?: string | null
          duration_min: number
          held_on: string
          id?: string
          updated_at?: string
        }
        Update: {
          assessment_id?: string | null
          attendees?: string
          company_id?: string
          conclusions?: string | null
          created_at?: string
          created_by?: string | null
          duration_min?: number
          held_on?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_review_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "tech_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_review_sessions_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["assessment_id"]
          },
          {
            foreignKeyName: "tech_review_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_review_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tech_review_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tech_scores: {
        Row: {
          assessment_id: string
          company_id: string
          created_at: string
          dimension_id: string
          evidence: string
          id: string
          level: number
          proposed_level: number | null
          rationale: string | null
          scored_at: string
          scored_by: string | null
          source: Database["public"]["Enums"]["origen_puntuacion"]
          updated_at: string
        }
        Insert: {
          assessment_id: string
          company_id: string
          created_at?: string
          dimension_id: string
          evidence: string
          id?: string
          level: number
          proposed_level?: number | null
          rationale?: string | null
          scored_at?: string
          scored_by?: string | null
          source?: Database["public"]["Enums"]["origen_puntuacion"]
          updated_at?: string
        }
        Update: {
          assessment_id?: string
          company_id?: string
          created_at?: string
          dimension_id?: string
          evidence?: string
          id?: string
          level?: number
          proposed_level?: number | null
          rationale?: string | null
          scored_at?: string
          scored_by?: string | null
          source?: Database["public"]["Enums"]["origen_puntuacion"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tech_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "tech_assessments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_scores_assessment_id_fkey"
            columns: ["assessment_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["assessment_id"]
          },
          {
            foreignKeyName: "tech_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_scores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
          {
            foreignKeyName: "tech_scores_dimension_id_fkey"
            columns: ["dimension_id"]
            isOneToOne: false
            referencedRelation: "tech_dimensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tech_scores_scored_by_fkey"
            columns: ["scored_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      kpi_series: {
        Row: {
          category: Database["public"]["Enums"]["kpi_category"] | null
          code: string | null
          company_id: string | null
          direction: Database["public"]["Enums"]["kpi_direction"] | null
          name: string | null
          note: string | null
          period: string | null
          source: string | null
          target_value: number | null
          unit: Database["public"]["Enums"]["kpi_unit"] | null
          value: number | null
        }
        Relationships: [
          {
            foreignKeyName: "kpi_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kpi_values_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "tech_score_input"
            referencedColumns: ["company_id"]
          },
        ]
      }
      tech_score_input: {
        Row: {
          assessed_on: string | null
          assessment_id: string | null
          company_id: string | null
          dimension_code: string | null
          dimension_name: string | null
          dimension_order: number | null
          evidence: string | null
          level: number | null
          source: Database["public"]["Enums"]["origen_puntuacion"] | null
          stage: Database["public"]["Enums"]["company_stage"] | null
          target_level: number | null
          tech_profile:
            | Database["public"]["Enums"]["company_tech_profile"]
            | null
          weight: number | null
        }
        Relationships: []
      }
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
      estado_evaluacion: "borrador" | "publicada"
      estado_hallazgo: "abierto" | "en_curso" | "resuelto" | "aceptado"
      estado_plan: "pendiente" | "en_curso" | "hecho" | "descartado"
      estado_punto_dd:
        | "pendiente"
        | "entregado"
        | "en_revision"
        | "validado"
        | "bloqueante"
      estado_seccion_bp: "borrador" | "en_revision" | "validada"
      estado_update: "borrador" | "entregado" | "revisado"
      kpi_category: "nucleo" | "sector" | "tecnico" | "propio"
      kpi_direction: "sube_mejor" | "baja_mejor" | "neutro"
      kpi_unit: "moneda" | "porcentaje" | "numero" | "meses" | "dias" | "ratio"
      origen_puntuacion: "automatico" | "manual"
      responsable_plan: "compania" | "niage"
      severidad_hallazgo: "critico" | "alto" | "medio" | "bajo"
      tech_applicability: "siempre" | "ia" | "hardware"
      tipo_evidencia:
        | "documento"
        | "kpi"
        | "hito"
        | "hallazgo_tecnico"
        | "dimension_tecnica"
        | "enlace"
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
      estado_evaluacion: ["borrador", "publicada"],
      estado_hallazgo: ["abierto", "en_curso", "resuelto", "aceptado"],
      estado_plan: ["pendiente", "en_curso", "hecho", "descartado"],
      estado_punto_dd: [
        "pendiente",
        "entregado",
        "en_revision",
        "validado",
        "bloqueante",
      ],
      estado_seccion_bp: ["borrador", "en_revision", "validada"],
      estado_update: ["borrador", "entregado", "revisado"],
      kpi_category: ["nucleo", "sector", "tecnico", "propio"],
      kpi_direction: ["sube_mejor", "baja_mejor", "neutro"],
      kpi_unit: ["moneda", "porcentaje", "numero", "meses", "dias", "ratio"],
      origen_puntuacion: ["automatico", "manual"],
      responsable_plan: ["compania", "niage"],
      severidad_hallazgo: ["critico", "alto", "medio", "bajo"],
      tech_applicability: ["siempre", "ia", "hardware"],
      tipo_evidencia: [
        "documento",
        "kpi",
        "hito",
        "hallazgo_tecnico",
        "dimension_tecnica",
        "enlace",
      ],
      traffic_light: ["verde", "ambar", "rojo"],
    },
  },
} as const

