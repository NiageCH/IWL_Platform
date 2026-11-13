
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_log": {
                  Row: {
                    "action": string,"actor_id": string | null,"company_id": string | null,"created_at": string,"detail": NonNullable<Json>,"entity": string,"entity_id": string | null,"id": number
                  }
                  Insert: {
                    "action": string,"actor_id"?: string | null,"company_id"?: string | null,"created_at"?: string,"detail"?: NonNullable<Json>,"entity": string,"entity_id"?: string | null,"id"?: never
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"company_id"?: string | null,"created_at"?: string,"detail"?: NonNullable<Json>,"entity"?: string,"entity_id"?: string | null,"id"?: never
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_actor_id_fkey"
      columns: ["actor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "activity_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    }
                  ]
                },"alert_rules": {
                  Row: {
                    "code": string,"config": NonNullable<Json>,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  Insert: {
                    "code": string,"config"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"config"?: NonNullable<Json>,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"anexo_comentarios": {
                  Row: {
                    "annex_id": string,"company_id": string,"created_at": string,"id": string,"profile_id": string | null,"respondido_at": string | null,"respondido_por": string | null,"respuesta": string | null,"texto": string
                  }
                  Insert: {
                    "annex_id": string,"company_id": string,"created_at"?: string,"id"?: string,"profile_id"?: string | null,"respondido_at"?: string | null,"respondido_por"?: string | null,"respuesta"?: string | null,"texto": string
                  }
                  Update: {
                    "annex_id"?: string,"company_id"?: string,"created_at"?: string,"id"?: string,"profile_id"?: string | null,"respondido_at"?: string | null,"respondido_por"?: string | null,"respuesta"?: string | null,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "anexo_comentarios_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "annexes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_comentarios_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["annex_id"]
    },{
      foreignKeyName: "anexo_comentarios_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_comentarios_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "anexo_comentarios_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_comentarios_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "anexo_comentarios_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_comentarios_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_comentarios_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_comentarios_respondido_por_fkey"
      columns: ["respondido_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_comentarios_respondido_por_fkey"
      columns: ["respondido_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_comentarios_respondido_por_fkey"
      columns: ["respondido_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"anexo_versiones": {
                  Row: {
                    "annex_id": string,"autor_id": string | null,"autor_nombre": string | null,"company_id": string,"contenido": NonNullable<Json>,"created_at": string,"id": string,"momento": string
                  }
                  Insert: {
                    "annex_id": string,"autor_id"?: string | null,"autor_nombre"?: string | null,"company_id": string,"contenido": NonNullable<Json>,"created_at"?: string,"id"?: string,"momento": string
                  }
                  Update: {
                    "annex_id"?: string,"autor_id"?: string | null,"autor_nombre"?: string | null,"company_id"?: string,"contenido"?: NonNullable<Json>,"created_at"?: string,"id"?: string,"momento"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "anexo_versiones_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "annexes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_versiones_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["annex_id"]
    },{
      foreignKeyName: "anexo_versiones_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_versiones_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_versiones_autor_id_fkey"
      columns: ["autor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_versiones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_versiones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "anexo_versiones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "anexo_versiones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    }
                  ]
                },"annex_pillars": {
                  Row: {
                    "annex_id": string,"cadence": string | null,"company_id": string,"created_at": string,"id": string,"intensity": number,"pillar_id": string,"planned_hours": number | null
                  }
                  Insert: {
                    "annex_id": string,"cadence"?: string | null,"company_id": string,"created_at"?: string,"id"?: string,"intensity"?: number,"pillar_id": string,"planned_hours"?: number | null
                  }
                  Update: {
                    "annex_id"?: string,"cadence"?: string | null,"company_id"?: string,"created_at"?: string,"id"?: string,"intensity"?: number,"pillar_id"?: string,"planned_hours"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "annex_pillars_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "annexes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annex_pillars_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["annex_id"]
    },{
      foreignKeyName: "annex_pillars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annex_pillars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "annex_pillars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annex_pillars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "annex_pillars_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "pillars"
      referencedColumns: ["id"]
    }
                  ]
                },"annexes": {
                  Row: {
                    "aceptado_at": string | null,"aceptado_por": string | null,"committed_cash": number | null,"committed_hours": number | null,"committed_hours_value": number | null,"committed_hours_value_motivo": string | null,"committed_seniors": number | null,"company_id": string,"created_at": string,"created_by": string | null,"duration_months": number | null,"ends_on": string | null,"equity_fuera_motivo": string | null,"equity_materializado_on": string | null,"equity_pct": number | null,"firmantes": NonNullable<Json>,"id": string,"notes": string | null,"other_commitments": string | null,"propuesto_at": string | null,"propuesto_por": string | null,"signed_on": string | null,"starts_on": string | null,"status": Database["public"]['Enums']["estado_anexo"],"updated_at": string,"version": number
                  }
                  Insert: {
                    "aceptado_at"?: string | null,"aceptado_por"?: string | null,"committed_cash"?: number | null,"committed_hours"?: number | null,"committed_hours_value"?: number | null,"committed_hours_value_motivo"?: string | null,"committed_seniors"?: number | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"duration_months"?: number | null,"ends_on"?: string | null,"equity_fuera_motivo"?: string | null,"equity_materializado_on"?: string | null,"equity_pct"?: number | null,"firmantes"?: NonNullable<Json>,"id"?: string,"notes"?: string | null,"other_commitments"?: string | null,"propuesto_at"?: string | null,"propuesto_por"?: string | null,"signed_on"?: string | null,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["estado_anexo"],"updated_at"?: string,"version"?: number
                  }
                  Update: {
                    "aceptado_at"?: string | null,"aceptado_por"?: string | null,"committed_cash"?: number | null,"committed_hours"?: number | null,"committed_hours_value"?: number | null,"committed_hours_value_motivo"?: string | null,"committed_seniors"?: number | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"duration_months"?: number | null,"ends_on"?: string | null,"equity_fuera_motivo"?: string | null,"equity_materializado_on"?: string | null,"equity_pct"?: number | null,"firmantes"?: NonNullable<Json>,"id"?: string,"notes"?: string | null,"other_commitments"?: string | null,"propuesto_at"?: string | null,"propuesto_por"?: string | null,"signed_on"?: string | null,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["estado_anexo"],"updated_at"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "annexes_aceptado_por_fkey"
      columns: ["aceptado_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_aceptado_por_fkey"
      columns: ["aceptado_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_aceptado_por_fkey"
      columns: ["aceptado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "annexes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "annexes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_propuesto_por_fkey"
      columns: ["propuesto_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_propuesto_por_fkey"
      columns: ["propuesto_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "annexes_propuesto_por_fkey"
      columns: ["propuesto_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"avisos": {
                  Row: {
                    "candidatura_id": string | null,"cerrado_at": string | null,"cerrado_por": string | null,"company_id": string | null,"created_at": string,"id": string,"para": string | null,"profile_id": string | null,"tipo": string
                  }
                  Insert: {
                    "candidatura_id"?: string | null,"cerrado_at"?: string | null,"cerrado_por"?: string | null,"company_id"?: string | null,"created_at"?: string,"id"?: string,"para"?: string | null,"profile_id"?: string | null,"tipo": string
                  }
                  Update: {
                    "candidatura_id"?: string | null,"cerrado_at"?: string | null,"cerrado_por"?: string | null,"company_id"?: string | null,"created_at"?: string,"id"?: string,"para"?: string | null,"profile_id"?: string | null,"tipo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "avisos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "avisos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_cerrado_por_fkey"
      columns: ["cerrado_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_cerrado_por_fkey"
      columns: ["cerrado_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_cerrado_por_fkey"
      columns: ["cerrado_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "avisos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "avisos_para_fkey"
      columns: ["para"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_para_fkey"
      columns: ["para"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_para_fkey"
      columns: ["para"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "avisos_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"baselines": {
                  Row: {
                    "company_id": string,"content": NonNullable<Json>,"created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["tipo_linea_base"],"notes": string | null,"stage": Database["public"]['Enums']["company_stage"],"taken_on": string
                  }
                  Insert: {
                    "company_id": string,"content": NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["tipo_linea_base"],"notes"?: string | null,"stage": Database["public"]['Enums']["company_stage"],"taken_on": string
                  }
                  Update: {
                    "company_id"?: string,"content"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["tipo_linea_base"],"notes"?: string | null,"stage"?: Database["public"]['Enums']["company_stage"],"taken_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "baselines_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "baselines_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "baselines_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "baselines_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "baselines_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "baselines_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "baselines_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"bp_section_templates": {
                  Row: {
                    "code": string,"created_at": string,"guidance": string | null,"id": string,"is_active": boolean,"name": string,"order_index": number,"updated_at": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"guidance"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"order_index": number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"guidance"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"order_index"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"bp_section_versions": {
                  Row: {
                    "author_id": string | null,"company_id": string,"content": string | null,"created_at": string,"id": string,"section_id": string,"status": Database["public"]['Enums']["estado_seccion_bp"],"version": number
                  }
                  Insert: {
                    "author_id"?: string | null,"company_id": string,"content"?: string | null,"created_at"?: string,"id"?: string,"section_id": string,"status": Database["public"]['Enums']["estado_seccion_bp"],"version": number
                  }
                  Update: {
                    "author_id"?: string | null,"company_id"?: string,"content"?: string | null,"created_at"?: string,"id"?: string,"section_id"?: string,"status"?: Database["public"]['Enums']["estado_seccion_bp"],"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bp_section_versions_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_section_versions_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_section_versions_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_section_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_section_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "bp_section_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_section_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "bp_section_versions_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "bp_sections"
      referencedColumns: ["id"]
    }
                  ]
                },"bp_sections": {
                  Row: {
                    "company_id": string,"content": string | null,"created_at": string,"current_version": number,"id": string,"status": Database["public"]['Enums']["estado_seccion_bp"],"template_id": string,"updated_at": string,"updated_by": string | null,"validated_at": string | null,"validated_by": string | null
                  }
                  Insert: {
                    "company_id": string,"content"?: string | null,"created_at"?: string,"current_version"?: number,"id"?: string,"status"?: Database["public"]['Enums']["estado_seccion_bp"],"template_id": string,"updated_at"?: string,"updated_by"?: string | null,"validated_at"?: string | null,"validated_by"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"content"?: string | null,"created_at"?: string,"current_version"?: number,"id"?: string,"status"?: Database["public"]['Enums']["estado_seccion_bp"],"template_id"?: string,"updated_at"?: string,"updated_by"?: string | null,"validated_at"?: string | null,"validated_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "bp_sections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_sections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "bp_sections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_sections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "bp_sections_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "bp_section_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_sections_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_sections_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_sections_updated_by_fkey"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_sections_validated_by_fkey"
      columns: ["validated_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_sections_validated_by_fkey"
      columns: ["validated_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "bp_sections_validated_by_fkey"
      columns: ["validated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidatura_documentos": {
                  Row: {
                    "bytes": number | null,"candidatura_id": string,"created_at": string,"created_by": string | null,"id": string,"mime": string | null,"nombre": string,"peticion_id": string | null,"reunion_id": string | null,"storage_path": string
                  }
                  Insert: {
                    "bytes"?: number | null,"candidatura_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"mime"?: string | null,"nombre": string,"peticion_id"?: string | null,"reunion_id"?: string | null,"storage_path": string
                  }
                  Update: {
                    "bytes"?: number | null,"candidatura_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"mime"?: string | null,"nombre"?: string,"peticion_id"?: string | null,"reunion_id"?: string | null,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidatura_documentos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_documentos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "candidatura_documentos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_documentos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_documentos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_documentos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_documentos_peticion_id_fkey"
      columns: ["peticion_id"]
isOneToOne: false
      referencedRelation: "candidatura_entregas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_documentos_peticion_id_fkey"
      columns: ["peticion_id"]
isOneToOne: false
      referencedRelation: "candidatura_peticiones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_documentos_reunion_id_fkey"
      columns: ["reunion_id"]
isOneToOne: false
      referencedRelation: "candidatura_reuniones"
      referencedColumns: ["id"]
    }
                  ]
                },"candidatura_enlaces": {
                  Row: {
                    "candidatura_id": string,"created_at": string,"created_by": string | null,"id": string,"tipo": string | null,"titulo": string,"url": string
                  }
                  Insert: {
                    "candidatura_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"tipo"?: string | null,"titulo": string,"url": string
                  }
                  Update: {
                    "candidatura_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"tipo"?: string | null,"titulo"?: string,"url"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidatura_enlaces_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_enlaces_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "candidatura_enlaces_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_enlaces_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_enlaces_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_enlaces_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidatura_eventos": {
                  Row: {
                    "candidatura_id": string,"created_at": string,"created_by": string | null,"desde": Database["public"]['Enums']["estado_candidatura"] | null,"detalle": string | null,"hasta": Database["public"]['Enums']["estado_candidatura"] | null,"id": string,"ocurrido_on": string,"tipo": Database["public"]['Enums']["tipo_evento_candidatura"],"titulo": string | null
                  }
                  Insert: {
                    "candidatura_id": string,"created_at"?: string,"created_by"?: string | null,"desde"?: Database["public"]['Enums']["estado_candidatura"] | null,"detalle"?: string | null,"hasta"?: Database["public"]['Enums']["estado_candidatura"] | null,"id"?: string,"ocurrido_on"?: string,"tipo": Database["public"]['Enums']["tipo_evento_candidatura"],"titulo"?: string | null
                  }
                  Update: {
                    "candidatura_id"?: string,"created_at"?: string,"created_by"?: string | null,"desde"?: Database["public"]['Enums']["estado_candidatura"] | null,"detalle"?: string | null,"hasta"?: Database["public"]['Enums']["estado_candidatura"] | null,"id"?: string,"ocurrido_on"?: string,"tipo"?: Database["public"]['Enums']["tipo_evento_candidatura"],"titulo"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidatura_eventos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_eventos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "candidatura_eventos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_eventos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_eventos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_eventos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidatura_peticiones": {
                  Row: {
                    "area": string | null,"candidatura_id": string,"created_at": string,"created_by": string | null,"detalle": string | null,"id": string,"item_template_id": string | null,"obligatoria": boolean,"orden": number,"titulo": string
                  }
                  Insert: {
                    "area"?: string | null,"candidatura_id": string,"created_at"?: string,"created_by"?: string | null,"detalle"?: string | null,"id"?: string,"item_template_id"?: string | null,"obligatoria"?: boolean,"orden"?: number,"titulo": string
                  }
                  Update: {
                    "area"?: string | null,"candidatura_id"?: string,"created_at"?: string,"created_by"?: string | null,"detalle"?: string | null,"id"?: string,"item_template_id"?: string | null,"obligatoria"?: boolean,"orden"?: number,"titulo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidatura_peticiones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_peticiones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "candidatura_peticiones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_peticiones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_peticiones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_peticiones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_peticiones_item_template_id_fkey"
      columns: ["item_template_id"]
isOneToOne: false
      referencedRelation: "dd_item_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"candidatura_reuniones": {
                  Row: {
                    "asistentes": NonNullable<Json>,"caducada_avisada_at": string | null,"cambiada_motivo": string | null,"cancelada_at": string | null,"cancelada_motivo": string | null,"candidatura_id": string,"celebrada_on": string | null,"conclusion": string | null,"confirmada_at": string | null,"created_at": string,"created_by": string | null,"direccion": string | null,"elegida": Json | null,"enlace": string | null,"estado": string,"formato": string | null,"franjas": NonNullable<Json>,"id": string,"nota": string | null,"nota_candidata": string | null,"notas": string | null,"personas_iwl": (string)[],"propuesta_at": string | null,"propuesta_de": string,"propuesta_por": string | null
                  }
                  Insert: {
                    "asistentes"?: NonNullable<Json>,"caducada_avisada_at"?: string | null,"cambiada_motivo"?: string | null,"cancelada_at"?: string | null,"cancelada_motivo"?: string | null,"candidatura_id": string,"celebrada_on"?: string | null,"conclusion"?: string | null,"confirmada_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"direccion"?: string | null,"elegida"?: Json | null,"enlace"?: string | null,"estado"?: string,"formato"?: string | null,"franjas"?: NonNullable<Json>,"id"?: string,"nota"?: string | null,"nota_candidata"?: string | null,"notas"?: string | null,"personas_iwl"?: (string)[],"propuesta_at"?: string | null,"propuesta_de"?: string,"propuesta_por"?: string | null
                  }
                  Update: {
                    "asistentes"?: NonNullable<Json>,"caducada_avisada_at"?: string | null,"cambiada_motivo"?: string | null,"cancelada_at"?: string | null,"cancelada_motivo"?: string | null,"candidatura_id"?: string,"celebrada_on"?: string | null,"conclusion"?: string | null,"confirmada_at"?: string | null,"created_at"?: string,"created_by"?: string | null,"direccion"?: string | null,"elegida"?: Json | null,"enlace"?: string | null,"estado"?: string,"formato"?: string | null,"franjas"?: NonNullable<Json>,"id"?: string,"nota"?: string | null,"nota_candidata"?: string | null,"notas"?: string | null,"personas_iwl"?: (string)[],"propuesta_at"?: string | null,"propuesta_de"?: string,"propuesta_por"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidatura_reuniones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_reuniones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "candidatura_reuniones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_reuniones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_reuniones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_reuniones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_reuniones_propuesta_por_fkey"
      columns: ["propuesta_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_reuniones_propuesta_por_fkey"
      columns: ["propuesta_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_reuniones_propuesta_por_fkey"
      columns: ["propuesta_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"candidaturas": {
                  Row: {
                    "acuerdo_firmado_on": string | null,"acuerdo_firmantes": NonNullable<Json>,"acuerdo_propuesto_on": string | null,"aportacion_propuesta": string | null,"cif": string | null,"cohort_id": string,"company_id": string | null,"constitucion_prevista": string | null,"contacto_apellidos": string | null,"contacto_cargo": string | null,"contacto_email": string,"contacto_nombre": string,"contacto_telefono": string | null,"created_at": string,"created_by": string | null,"denominacion_social": string | null,"descartada_at": string | null,"descartada_desde": Database["public"]['Enums']["estado_candidatura"] | null,"descartada_motivo": string | null,"descartada_por": string | null,"enlace_abierto_at": string | null,"enlace_visto_at": string | null,"equipo_personas": number | null,"equity_pct": number | null,"estado": Database["public"]['Enums']["estado_candidatura"],"estado_declarado": Database["public"]['Enums']["estado_entrada"] | null,"estado_verificado": Database["public"]['Enums']["estado_entrada"] | null,"forma_juridica": Database["public"]['Enums']["forma_juridica"] | null,"id": string,"is_demo": boolean,"liderazgo_femenino_pct": number | null,"nda_firmado_on": string | null,"nombre": string,"notas": string | null,"one_liner": string | null,"origen": string | null,"pais": string | null,"profile_id": string | null,"sector": string | null,"situacion_societaria": Database["public"]['Enums']["situacion_societaria"] | null,"token": string | null,"token_anulado_at": string | null,"updated_at": string,"via": Database["public"]['Enums']["via_entrada"] | null,"website": string | null
                  }
                  Insert: {
                    "acuerdo_firmado_on"?: string | null,"acuerdo_firmantes"?: NonNullable<Json>,"acuerdo_propuesto_on"?: string | null,"aportacion_propuesta"?: string | null,"cif"?: string | null,"cohort_id": string,"company_id"?: string | null,"constitucion_prevista"?: string | null,"contacto_apellidos"?: string | null,"contacto_cargo"?: string | null,"contacto_email": string,"contacto_nombre": string,"contacto_telefono"?: string | null,"created_at"?: string,"created_by"?: string | null,"denominacion_social"?: string | null,"descartada_at"?: string | null,"descartada_desde"?: Database["public"]['Enums']["estado_candidatura"] | null,"descartada_motivo"?: string | null,"descartada_por"?: string | null,"enlace_abierto_at"?: string | null,"enlace_visto_at"?: string | null,"equipo_personas"?: number | null,"equity_pct"?: number | null,"estado"?: Database["public"]['Enums']["estado_candidatura"],"estado_declarado"?: Database["public"]['Enums']["estado_entrada"] | null,"estado_verificado"?: Database["public"]['Enums']["estado_entrada"] | null,"forma_juridica"?: Database["public"]['Enums']["forma_juridica"] | null,"id"?: string,"is_demo"?: boolean,"liderazgo_femenino_pct"?: number | null,"nda_firmado_on"?: string | null,"nombre": string,"notas"?: string | null,"one_liner"?: string | null,"origen"?: string | null,"pais"?: string | null,"profile_id"?: string | null,"sector"?: string | null,"situacion_societaria"?: Database["public"]['Enums']["situacion_societaria"] | null,"token"?: string | null,"token_anulado_at"?: string | null,"updated_at"?: string,"via"?: Database["public"]['Enums']["via_entrada"] | null,"website"?: string | null
                  }
                  Update: {
                    "acuerdo_firmado_on"?: string | null,"acuerdo_firmantes"?: NonNullable<Json>,"acuerdo_propuesto_on"?: string | null,"aportacion_propuesta"?: string | null,"cif"?: string | null,"cohort_id"?: string,"company_id"?: string | null,"constitucion_prevista"?: string | null,"contacto_apellidos"?: string | null,"contacto_cargo"?: string | null,"contacto_email"?: string,"contacto_nombre"?: string,"contacto_telefono"?: string | null,"created_at"?: string,"created_by"?: string | null,"denominacion_social"?: string | null,"descartada_at"?: string | null,"descartada_desde"?: Database["public"]['Enums']["estado_candidatura"] | null,"descartada_motivo"?: string | null,"descartada_por"?: string | null,"enlace_abierto_at"?: string | null,"enlace_visto_at"?: string | null,"equipo_personas"?: number | null,"equity_pct"?: number | null,"estado"?: Database["public"]['Enums']["estado_candidatura"],"estado_declarado"?: Database["public"]['Enums']["estado_entrada"] | null,"estado_verificado"?: Database["public"]['Enums']["estado_entrada"] | null,"forma_juridica"?: Database["public"]['Enums']["forma_juridica"] | null,"id"?: string,"is_demo"?: boolean,"liderazgo_femenino_pct"?: number | null,"nda_firmado_on"?: string | null,"nombre"?: string,"notas"?: string | null,"one_liner"?: string | null,"origen"?: string | null,"pais"?: string | null,"profile_id"?: string | null,"sector"?: string | null,"situacion_societaria"?: Database["public"]['Enums']["situacion_societaria"] | null,"token"?: string | null,"token_anulado_at"?: string | null,"updated_at"?: string,"via"?: Database["public"]['Enums']["via_entrada"] | null,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidaturas_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "candidaturas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_descartada_por_fkey"
      columns: ["descartada_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_descartada_por_fkey"
      columns: ["descartada_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_descartada_por_fkey"
      columns: ["descartada_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cap_table_entries": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"holder_name": string,"holder_type": string,"id": string,"notes": string | null,"percentage": number,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"holder_name": string,"holder_type"?: string,"id"?: string,"notes"?: string | null,"percentage": number,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"holder_name"?: string,"holder_type"?: string,"id"?: string,"notes"?: string | null,"percentage"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cap_table_entries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cap_table_entries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "cap_table_entries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cap_table_entries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "cap_table_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cap_table_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cap_table_entries_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_commitments": {
                  Row: {
                    "amount": number,"annex_id": string | null,"company_id": string,"condition": string | null,"created_at": string,"created_by": string | null,"description": string | null,"expected_on": string | null,"heading": string,"id": string,"tranche": number | null,"updated_at": string
                  }
                  Insert: {
                    "amount": number,"annex_id"?: string | null,"company_id": string,"condition"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"expected_on"?: string | null,"heading": string,"id"?: string,"tranche"?: number | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"annex_id"?: string | null,"company_id"?: string,"condition"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"expected_on"?: string | null,"heading"?: string,"id"?: string,"tranche"?: number | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_commitments_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "annexes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_commitments_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["annex_id"]
    },{
      foreignKeyName: "cash_commitments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_commitments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "cash_commitments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_commitments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "cash_commitments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_commitments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_commitments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"cash_disbursements": {
                  Row: {
                    "amount": number,"commitment_id": string | null,"company_id": string,"created_at": string,"created_by": string | null,"disbursed_on": string,"document_id": string | null,"id": string,"justified_on": string | null,"notes": string | null,"updated_at": string
                  }
                  Insert: {
                    "amount": number,"commitment_id"?: string | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"disbursed_on": string,"document_id"?: string | null,"id"?: string,"justified_on"?: string | null,"notes"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"commitment_id"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"disbursed_on"?: string,"document_id"?: string | null,"id"?: string,"justified_on"?: string | null,"notes"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cash_disbursements_commitment_id_fkey"
      columns: ["commitment_id"]
isOneToOne: false
      referencedRelation: "cash_commitments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_disbursements_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_disbursements_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "cash_disbursements_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_disbursements_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "cash_disbursements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_disbursements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_disbursements_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "cash_disbursements_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    }
                  ]
                },"cohorts": {
                  Row: {
                    "convocatoria_abierta": boolean,"convocatoria_cierra": string | null,"convocatoria_texto": string | null,"created_at": string,"end_date": string | null,"id": string,"investable_target": number | null,"name": string,"organization_id": string,"start_date": string | null,"updated_at": string
                  }
                  Insert: {
                    "convocatoria_abierta"?: boolean,"convocatoria_cierra"?: string | null,"convocatoria_texto"?: string | null,"created_at"?: string,"end_date"?: string | null,"id"?: string,"investable_target"?: number | null,"name": string,"organization_id": string,"start_date"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "convocatoria_abierta"?: boolean,"convocatoria_cierra"?: string | null,"convocatoria_texto"?: string | null,"created_at"?: string,"end_date"?: string | null,"id"?: string,"investable_target"?: number | null,"name"?: string,"organization_id"?: string,"start_date"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "cohorts_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"comite_actas": {
                  Row: {
                    "candidatura_id": string,"cerrada_at": string | null,"contenido_hash": string | null,"created_at": string,"created_by": string | null,"decision": string,"documento_id": string | null,"fecha": string,"id": string,"mensaje": string | null,"motivo": string | null,"puede_volver": boolean | null,"resumen": string,"revision_on": string | null,"via": Database["public"]['Enums']["via_entrada"] | null,"via_motivo": string | null,"via_propuesta": Database["public"]['Enums']["via_entrada"] | null
                  }
                  Insert: {
                    "candidatura_id": string,"cerrada_at"?: string | null,"contenido_hash"?: string | null,"created_at"?: string,"created_by"?: string | null,"decision": string,"documento_id"?: string | null,"fecha"?: string,"id"?: string,"mensaje"?: string | null,"motivo"?: string | null,"puede_volver"?: boolean | null,"resumen": string,"revision_on"?: string | null,"via"?: Database["public"]['Enums']["via_entrada"] | null,"via_motivo"?: string | null,"via_propuesta"?: Database["public"]['Enums']["via_entrada"] | null
                  }
                  Update: {
                    "candidatura_id"?: string,"cerrada_at"?: string | null,"contenido_hash"?: string | null,"created_at"?: string,"created_by"?: string | null,"decision"?: string,"documento_id"?: string | null,"fecha"?: string,"id"?: string,"mensaje"?: string | null,"motivo"?: string | null,"puede_volver"?: boolean | null,"resumen"?: string,"revision_on"?: string | null,"via"?: Database["public"]['Enums']["via_entrada"] | null,"via_motivo"?: string | null,"via_propuesta"?: Database["public"]['Enums']["via_entrada"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "comite_actas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_actas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "comite_actas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_actas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_actas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_actas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_actas_documento_id_fkey"
      columns: ["documento_id"]
isOneToOne: false
      referencedRelation: "candidatura_documentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_actas_documento_id_fkey"
      columns: ["documento_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["id"]
    }
                  ]
                },"comite_firmas": {
                  Row: {
                    "acta_id": string,"firmado_at": string | null,"firmado_ip": string | null,"firmado_ua": string | null,"profile_id": string
                  }
                  Insert: {
                    "acta_id": string,"firmado_at"?: string | null,"firmado_ip"?: string | null,"firmado_ua"?: string | null,"profile_id": string
                  }
                  Update: {
                    "acta_id"?: string,"firmado_at"?: string | null,"firmado_ip"?: string | null,"firmado_ua"?: string | null,"profile_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comite_firmas_acta_id_fkey"
      columns: ["acta_id"]
isOneToOne: false
      referencedRelation: "comite_actas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_firmas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_firmas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comite_firmas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"comments": {
                  Row: {
                    "author_id": string,"body": string,"company_id": string,"created_at": string,"entity": string,"entity_id": string,"id": string,"mentions": (string)[],"parent_id": string | null,"resolved_at": string | null,"resolved_by": string | null,"updated_at": string
                  }
                  Insert: {
                    "author_id": string,"body": string,"company_id": string,"created_at"?: string,"entity": string,"entity_id": string,"id"?: string,"mentions"?: (string)[],"parent_id"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"company_id"?: string,"created_at"?: string,"entity"?: string,"entity_id"?: string,"id"?: string,"mentions"?: (string)[],"parent_id"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "comments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "comments_parent_id_fkey"
      columns: ["parent_id"]
isOneToOne: false
      referencedRelation: "comments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "comments_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "archive_reason": string | null,"archived_at": string | null,"archived_by": string | null,"cif": string | null,"cohort_id": string | null,"constitucion_prevista": string | null,"created_at": string,"created_by": string | null,"denominacion_social": string | null,"entry_state": Database["public"]['Enums']["estado_entrada"] | null,"female_leadership_pct": number | null,"forma_juridica": Database["public"]['Enums']["forma_juridica"] | null,"founded_on": string | null,"id": string,"is_demo": boolean,"logo_path": string | null,"name": string,"one_liner": string | null,"organization_id": string,"phase_id": string | null,"sector": string | null,"situacion_confirmada_at": string | null,"situacion_confirmada_por": string | null,"situacion_societaria": Database["public"]['Enums']["situacion_societaria"] | null,"slug": string,"stage": Database["public"]['Enums']["company_stage"] | null,"tech_profile": Database["public"]['Enums']["company_tech_profile"] | null,"tramo": Database["public"]['Enums']["tramo_compania"],"updated_at": string,"via": Database["public"]['Enums']["via_entrada"] | null,"website": string | null
                  }
                  Insert: {
                    "archive_reason"?: string | null,"archived_at"?: string | null,"archived_by"?: string | null,"cif"?: string | null,"cohort_id"?: string | null,"constitucion_prevista"?: string | null,"created_at"?: string,"created_by"?: string | null,"denominacion_social"?: string | null,"entry_state"?: Database["public"]['Enums']["estado_entrada"] | null,"female_leadership_pct"?: number | null,"forma_juridica"?: Database["public"]['Enums']["forma_juridica"] | null,"founded_on"?: string | null,"id"?: string,"is_demo"?: boolean,"logo_path"?: string | null,"name": string,"one_liner"?: string | null,"organization_id": string,"phase_id"?: string | null,"sector"?: string | null,"situacion_confirmada_at"?: string | null,"situacion_confirmada_por"?: string | null,"situacion_societaria"?: Database["public"]['Enums']["situacion_societaria"] | null,"slug": string,"stage"?: Database["public"]['Enums']["company_stage"] | null,"tech_profile"?: Database["public"]['Enums']["company_tech_profile"] | null,"tramo"?: Database["public"]['Enums']["tramo_compania"],"updated_at"?: string,"via"?: Database["public"]['Enums']["via_entrada"] | null,"website"?: string | null
                  }
                  Update: {
                    "archive_reason"?: string | null,"archived_at"?: string | null,"archived_by"?: string | null,"cif"?: string | null,"cohort_id"?: string | null,"constitucion_prevista"?: string | null,"created_at"?: string,"created_by"?: string | null,"denominacion_social"?: string | null,"entry_state"?: Database["public"]['Enums']["estado_entrada"] | null,"female_leadership_pct"?: number | null,"forma_juridica"?: Database["public"]['Enums']["forma_juridica"] | null,"founded_on"?: string | null,"id"?: string,"is_demo"?: boolean,"logo_path"?: string | null,"name"?: string,"one_liner"?: string | null,"organization_id"?: string,"phase_id"?: string | null,"sector"?: string | null,"situacion_confirmada_at"?: string | null,"situacion_confirmada_por"?: string | null,"situacion_societaria"?: Database["public"]['Enums']["situacion_societaria"] | null,"slug"?: string,"stage"?: Database["public"]['Enums']["company_stage"] | null,"tech_profile"?: Database["public"]['Enums']["company_tech_profile"] | null,"tramo"?: Database["public"]['Enums']["tramo_compania"],"updated_at"?: string,"via"?: Database["public"]['Enums']["via_entrada"] | null,"website"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_archived_by_fkey"
      columns: ["archived_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_situacion_confirmada_por_fkey"
      columns: ["situacion_confirmada_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_situacion_confirmada_por_fkey"
      columns: ["situacion_confirmada_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_situacion_confirmada_por_fkey"
      columns: ["situacion_confirmada_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"company_kpis": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"custom_code": string | null,"custom_name": string | null,"custom_unit": Database["public"]['Enums']["kpi_unit"] | null,"id": string,"is_active": boolean,"kpi_id": string | null,"order_index": number,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"custom_code"?: string | null,"custom_name"?: string | null,"custom_unit"?: Database["public"]['Enums']["kpi_unit"] | null,"id"?: string,"is_active"?: boolean,"kpi_id"?: string | null,"order_index"?: number,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"custom_code"?: string | null,"custom_name"?: string | null,"custom_unit"?: Database["public"]['Enums']["kpi_unit"] | null,"id"?: string,"is_active"?: boolean,"kpi_id"?: string | null,"order_index"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_kpis_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_kpis_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "company_kpis_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_kpis_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "company_kpis_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_kpis_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_kpis_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_kpis_kpi_id_fkey"
      columns: ["kpi_id"]
isOneToOne: false
      referencedRelation: "kpi_definitions"
      referencedColumns: ["id"]
    }
                  ]
                },"company_members": {
                  Row: {
                    "assigned_hours": number | null,"company_id": string,"created_at": string,"ends_on": string | null,"id": string,"member_role": Database["public"]['Enums']["company_member_role"],"notes": string | null,"profile_id": string,"rate_profile": string | null,"starts_on": string | null,"title": string | null,"updated_at": string
                  }
                  Insert: {
                    "assigned_hours"?: number | null,"company_id": string,"created_at"?: string,"ends_on"?: string | null,"id"?: string,"member_role": Database["public"]['Enums']["company_member_role"],"notes"?: string | null,"profile_id": string,"rate_profile"?: string | null,"starts_on"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "assigned_hours"?: number | null,"company_id"?: string,"created_at"?: string,"ends_on"?: string | null,"id"?: string,"member_role"?: Database["public"]['Enums']["company_member_role"],"notes"?: string | null,"profile_id"?: string,"rate_profile"?: string | null,"starts_on"?: string | null,"title"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "company_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"company_pillars": {
                  Row: {
                    "cadence": string | null,"company_id": string,"created_at": string,"created_by": string | null,"id": string,"intensity": number,"is_active": boolean,"pillar_id": string,"updated_at": string
                  }
                  Insert: {
                    "cadence"?: string | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"intensity"?: number,"is_active"?: boolean,"pillar_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cadence"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"intensity"?: number,"is_active"?: boolean,"pillar_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_pillars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_pillars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "company_pillars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_pillars_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "company_pillars_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_pillars_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_pillars_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_pillars_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "pillars"
      referencedColumns: ["id"]
    }
                  ]
                },"contacts": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"kind": Database["public"]['Enums']["tipo_contacto"],"name": string,"notes": string | null,"organization": string | null,"organization_id": string | null,"role": string | null,"source": string | null,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["tipo_contacto"],"name": string,"notes"?: string | null,"organization"?: string | null,"organization_id"?: string | null,"role"?: string | null,"source"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["tipo_contacto"],"name"?: string,"notes"?: string | null,"organization"?: string | null,"organization_id"?: string | null,"role"?: string | null,"source"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contacts_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"contribution_hours": {
                  Row: {
                    "annex_id": string | null,"applied_rate": number,"company_id": string,"created_at": string,"created_by": string | null,"deliverable_id": string | null,"description": string,"hours": number,"id": string,"market_rate": number,"person_name": string,"profile_code": string,"profile_id": string | null,"rate_card_id": string | null,"session_id": string | null,"stage_id": string | null,"subject_id": string,"task_id": string | null,"updated_at": string,"worked_on": string
                  }
                  Insert: {
                    "annex_id"?: string | null,"applied_rate": number,"company_id": string,"created_at"?: string,"created_by"?: string | null,"deliverable_id"?: string | null,"description": string,"hours": number,"id"?: string,"market_rate": number,"person_name": string,"profile_code": string,"profile_id"?: string | null,"rate_card_id"?: string | null,"session_id"?: string | null,"stage_id"?: string | null,"subject_id": string,"task_id"?: string | null,"updated_at"?: string,"worked_on": string
                  }
                  Update: {
                    "annex_id"?: string | null,"applied_rate"?: number,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"deliverable_id"?: string | null,"description"?: string,"hours"?: number,"id"?: string,"market_rate"?: number,"person_name"?: string,"profile_code"?: string,"profile_id"?: string | null,"rate_card_id"?: string | null,"session_id"?: string | null,"stage_id"?: string | null,"subject_id"?: string,"task_id"?: string | null,"updated_at"?: string,"worked_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_hours_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "annexes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["annex_id"]
    },{
      foreignKeyName: "contribution_hours_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "contribution_hours_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "contribution_hours_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_deliverable_fkey"
      columns: ["deliverable_id"]
isOneToOne: false
      referencedRelation: "deliverables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_rate_card_id_fkey"
      columns: ["rate_card_id"]
isOneToOne: false
      referencedRelation: "rate_cards"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "tech_review_sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "roadmap_stages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "contribution_subjects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"contribution_items": {
                  Row: {
                    "amount": number | null,"annex_id": string | null,"company_id": string,"counterpart": string | null,"created_at": string,"created_by": string | null,"description": string | null,"document_id": string | null,"id": string,"kind": Database["public"]['Enums']["tipo_aportacion"],"market_value": number | null,"occurred_on": string,"outcome": string | null,"stage_id": string | null,"subject_id": string | null,"title": string,"updated_at": string
                  }
                  Insert: {
                    "amount"?: number | null,"annex_id"?: string | null,"company_id": string,"counterpart"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"document_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["tipo_aportacion"],"market_value"?: number | null,"occurred_on": string,"outcome"?: string | null,"stage_id"?: string | null,"subject_id"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"annex_id"?: string | null,"company_id"?: string,"counterpart"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"document_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["tipo_aportacion"],"market_value"?: number | null,"occurred_on"?: string,"outcome"?: string | null,"stage_id"?: string | null,"subject_id"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_items_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "annexes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["annex_id"]
    },{
      foreignKeyName: "contribution_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "contribution_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "contribution_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "roadmap_stages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "contribution_subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"contribution_subjects": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"order_index": number,"updated_at": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"order_index": number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"order_index"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"correos": {
                  Row: {
                    "asunto": string,"candidatura_id": string | null,"company_id": string | null,"created_at": string,"created_by": string | null,"datos": NonNullable<Json>,"destinatario": string,"destinatario_nombre": string | null,"enviado_at": string | null,"error": string | null,"estado": string,"evento": string,"id": string,"intentos": number,"profile_id": string | null,"proveedor": string | null,"proveedor_id": string | null
                  }
                  Insert: {
                    "asunto": string,"candidatura_id"?: string | null,"company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"datos"?: NonNullable<Json>,"destinatario": string,"destinatario_nombre"?: string | null,"enviado_at"?: string | null,"error"?: string | null,"estado"?: string,"evento": string,"id"?: string,"intentos"?: number,"profile_id"?: string | null,"proveedor"?: string | null,"proveedor_id"?: string | null
                  }
                  Update: {
                    "asunto"?: string,"candidatura_id"?: string | null,"company_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"datos"?: NonNullable<Json>,"destinatario"?: string,"destinatario_nombre"?: string | null,"enviado_at"?: string | null,"error"?: string | null,"estado"?: string,"evento"?: string,"id"?: string,"intentos"?: number,"profile_id"?: string | null,"proveedor"?: string | null,"proveedor_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "correos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "correos_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "correos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "correos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "correos_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dd_areas": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"order_index": number,"updated_at": string,"weight": number
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"order_index": number,"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"order_index"?: number,"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    
                  ]
                },"dd_item_status_history": {
                  Row: {
                    "changed_by": string | null,"company_id": string,"created_at": string,"dd_item_id": string,"from_status": Database["public"]['Enums']["estado_punto_dd"] | null,"id": number,"note": string | null,"to_status": Database["public"]['Enums']["estado_punto_dd"]
                  }
                  Insert: {
                    "changed_by"?: string | null,"company_id": string,"created_at"?: string,"dd_item_id": string,"from_status"?: Database["public"]['Enums']["estado_punto_dd"] | null,"id"?: never,"note"?: string | null,"to_status": Database["public"]['Enums']["estado_punto_dd"]
                  }
                  Update: {
                    "changed_by"?: string | null,"company_id"?: string,"created_at"?: string,"dd_item_id"?: string,"from_status"?: Database["public"]['Enums']["estado_punto_dd"] | null,"id"?: never,"note"?: string | null,"to_status"?: Database["public"]['Enums']["estado_punto_dd"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "dd_item_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_item_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_item_status_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_item_status_history_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_item_status_history_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "dd_item_status_history_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_item_status_history_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "dd_item_status_history_dd_item_id_fkey"
      columns: ["dd_item_id"]
isOneToOne: false
      referencedRelation: "dd_items"
      referencedColumns: ["id"]
    }
                  ]
                },"dd_item_templates": {
                  Row: {
                    "area_id": string,"code": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"is_required": boolean,"order_index": number,"requiere_sociedad": boolean,"solo_sin_sociedad": boolean,"title": string,"updated_at": string,"validity_months": number | null
                  }
                  Insert: {
                    "area_id": string,"code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_required"?: boolean,"order_index": number,"requiere_sociedad"?: boolean,"solo_sin_sociedad"?: boolean,"title": string,"updated_at"?: string,"validity_months"?: number | null
                  }
                  Update: {
                    "area_id"?: string,"code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"is_required"?: boolean,"order_index"?: number,"requiere_sociedad"?: boolean,"solo_sin_sociedad"?: boolean,"title"?: string,"updated_at"?: string,"validity_months"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dd_item_templates_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "dd_areas"
      referencedColumns: ["id"]
    }
                  ]
                },"dd_items": {
                  Row: {
                    "area_id": string,"company_id": string,"created_at": string,"created_by": string | null,"description": string | null,"document_id": string | null,"due_date": string | null,"expires_on": string | null,"id": string,"is_required": boolean,"milestone_id": string | null,"notes": string | null,"owner_id": string | null,"status": Database["public"]['Enums']["estado_punto_dd"],"template_id": string | null,"title": string,"updated_at": string,"validated_at": string | null,"validated_by": string | null,"validity_months": number | null
                  }
                  Insert: {
                    "area_id": string,"company_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"document_id"?: string | null,"due_date"?: string | null,"expires_on"?: string | null,"id"?: string,"is_required"?: boolean,"milestone_id"?: string | null,"notes"?: string | null,"owner_id"?: string | null,"status"?: Database["public"]['Enums']["estado_punto_dd"],"template_id"?: string | null,"title": string,"updated_at"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"validity_months"?: number | null
                  }
                  Update: {
                    "area_id"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"document_id"?: string | null,"due_date"?: string | null,"expires_on"?: string | null,"id"?: string,"is_required"?: boolean,"milestone_id"?: string | null,"notes"?: string | null,"owner_id"?: string | null,"status"?: Database["public"]['Enums']["estado_punto_dd"],"template_id"?: string | null,"title"?: string,"updated_at"?: string,"validated_at"?: string | null,"validated_by"?: string | null,"validity_months"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dd_items_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "dd_areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "dd_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "dd_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "dd_item_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_validated_by_fkey"
      columns: ["validated_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_validated_by_fkey"
      columns: ["validated_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "dd_items_validated_by_fkey"
      columns: ["validated_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"decisiones_incorporacion": {
                  Row: {
                    "base": Database["public"]['Enums']["base_incorporacion"],"company_id": string,"created_at": string,"decidido_on": string,"decidido_por": string | null,"decision": Database["public"]['Enums']["decision_incorporacion"],"id": string,"mensaje": string | null,"motivo": string
                  }
                  Insert: {
                    "base": Database["public"]['Enums']["base_incorporacion"],"company_id": string,"created_at"?: string,"decidido_on"?: string,"decidido_por"?: string | null,"decision": Database["public"]['Enums']["decision_incorporacion"],"id"?: string,"mensaje"?: string | null,"motivo": string
                  }
                  Update: {
                    "base"?: Database["public"]['Enums']["base_incorporacion"],"company_id"?: string,"created_at"?: string,"decidido_on"?: string,"decidido_por"?: string | null,"decision"?: Database["public"]['Enums']["decision_incorporacion"],"id"?: string,"mensaje"?: string | null,"motivo"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "decisiones_incorporacion_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "decisiones_incorporacion_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "decisiones_incorporacion_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "decisiones_incorporacion_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "decisiones_incorporacion_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "decisiones_incorporacion_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "decisiones_incorporacion_decidido_por_fkey"
      columns: ["decidido_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"deliverables": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"delivered_on": string,"description": string | null,"document_id": string | null,"id": string,"subject_id": string | null,"title": string,"updated_at": string,"url": string | null
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"delivered_on": string,"description"?: string | null,"document_id"?: string | null,"id"?: string,"subject_id"?: string | null,"title": string,"updated_at"?: string,"url"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"delivered_on"?: string,"description"?: string | null,"document_id"?: string | null,"id"?: string,"subject_id"?: string | null,"title"?: string,"updated_at"?: string,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "deliverables_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "deliverables_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "deliverables_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "deliverables_subject_id_fkey"
      columns: ["subject_id"]
isOneToOne: false
      referencedRelation: "contribution_subjects"
      referencedColumns: ["id"]
    }
                  ]
                },"document_access_log": {
                  Row: {
                    "action": string,"company_id": string,"created_at": string,"document_id": string,"id": number,"profile_id": string | null
                  }
                  Insert: {
                    "action": string,"company_id": string,"created_at"?: string,"document_id": string,"id"?: never,"profile_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"company_id"?: string,"created_at"?: string,"document_id"?: string,"id"?: never,"profile_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_access_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_access_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "document_access_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_access_log_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "document_access_log_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_access_log_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_access_log_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_access_log_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"document_versions": {
                  Row: {
                    "company_id": string,"created_at": string,"document_id": string,"file_name": string,"id": string,"mime_type": string | null,"size_bytes": number | null,"storage_path": string,"uploaded_by": string | null,"version": number
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"document_id": string,"file_name": string,"id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"storage_path": string,"uploaded_by"?: string | null,"version": number
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"document_id"?: string,"file_name"?: string,"id"?: string,"mime_type"?: string | null,"size_bytes"?: number | null,"storage_path"?: string,"uploaded_by"?: string | null,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "document_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "document_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_versions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "document_versions_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "document_versions_uploaded_by_fkey"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"documents": {
                  Row: {
                    "area_id": string | null,"company_id": string,"created_at": string,"created_by": string | null,"description": string | null,"expires_on": string | null,"folder": string,"id": string,"kind": string | null,"name": string,"updated_at": string
                  }
                  Insert: {
                    "area_id"?: string | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"expires_on"?: string | null,"folder"?: string,"id"?: string,"kind"?: string | null,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "area_id"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"expires_on"?: string | null,"folder"?: string,"id"?: string,"kind"?: string | null,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "documents_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "dd_areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "documents_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"evidence_links": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"entity": string | null,"entity_id": string | null,"hypothesis_id": string | null,"id": string,"kind": Database["public"]['Enums']["tipo_evidencia"],"label": string,"section_id": string | null,"target_code": string | null,"target_id": string | null,"url": string | null
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"entity"?: string | null,"entity_id"?: string | null,"hypothesis_id"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["tipo_evidencia"],"label": string,"section_id"?: string | null,"target_code"?: string | null,"target_id"?: string | null,"url"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"entity"?: string | null,"entity_id"?: string | null,"hypothesis_id"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["tipo_evidencia"],"label"?: string,"section_id"?: string | null,"target_code"?: string | null,"target_id"?: string | null,"url"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "evidence_links_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_links_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "evidence_links_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_links_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "evidence_links_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_links_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_links_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_links_hypothesis_id_fkey"
      columns: ["hypothesis_id"]
isOneToOne: false
      referencedRelation: "hypotheses"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_links_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "bp_sections"
      referencedColumns: ["id"]
    }
                  ]
                },"findings": {
                  Row: {
                    "acceptance_note": string | null,"area_id": string,"company_id": string,"created_at": string,"created_by": string | null,"dd_item_id": string | null,"description": string,"due_date": string | null,"id": string,"impact": string | null,"resolution_plan": string | null,"resolved_at": string | null,"severity": Database["public"]['Enums']["severidad_hallazgo"],"status": Database["public"]['Enums']["estado_hallazgo"],"title": string,"updated_at": string
                  }
                  Insert: {
                    "acceptance_note"?: string | null,"area_id": string,"company_id": string,"created_at"?: string,"created_by"?: string | null,"dd_item_id"?: string | null,"description": string,"due_date"?: string | null,"id"?: string,"impact"?: string | null,"resolution_plan"?: string | null,"resolved_at"?: string | null,"severity": Database["public"]['Enums']["severidad_hallazgo"],"status"?: Database["public"]['Enums']["estado_hallazgo"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "acceptance_note"?: string | null,"area_id"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"dd_item_id"?: string | null,"description"?: string,"due_date"?: string | null,"id"?: string,"impact"?: string | null,"resolution_plan"?: string | null,"resolved_at"?: string | null,"severity"?: Database["public"]['Enums']["severidad_hallazgo"],"status"?: Database["public"]['Enums']["estado_hallazgo"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "findings_area_id_fkey"
      columns: ["area_id"]
isOneToOne: false
      referencedRelation: "dd_areas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "findings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "findings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "findings_dd_item_id_fkey"
      columns: ["dd_item_id"]
isOneToOne: false
      referencedRelation: "dd_items"
      referencedColumns: ["id"]
    }
                  ]
                },"hypotheses": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"id": string,"section_id": string,"statement": string,"status": string,"updated_at": string,"validation_criteria": string | null
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"section_id": string,"statement": string,"status"?: string,"updated_at"?: string,"validation_criteria"?: string | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"section_id"?: string,"statement"?: string,"status"?: string,"updated_at"?: string,"validation_criteria"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "hypotheses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hypotheses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "hypotheses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hypotheses_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "hypotheses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hypotheses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hypotheses_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "hypotheses_section_id_fkey"
      columns: ["section_id"]
isOneToOne: false
      referencedRelation: "bp_sections"
      referencedColumns: ["id"]
    }
                  ]
                },"introductions": {
                  Row: {
                    "amount": number | null,"closed_on": string | null,"commission_window_months": number,"company_id": string,"contact_id": string,"counts_for_commission": boolean,"created_at": string,"created_by": string | null,"id": string,"introduced_by": string | null,"introduced_on": string,"introducer_name": string,"notes": string | null,"outcome": string | null,"status": Database["public"]['Enums']["estado_introduccion"],"updated_at": string
                  }
                  Insert: {
                    "amount"?: number | null,"closed_on"?: string | null,"commission_window_months"?: number,"company_id": string,"contact_id": string,"counts_for_commission"?: boolean,"created_at"?: string,"created_by"?: string | null,"id"?: string,"introduced_by"?: string | null,"introduced_on": string,"introducer_name": string,"notes"?: string | null,"outcome"?: string | null,"status"?: Database["public"]['Enums']["estado_introduccion"],"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number | null,"closed_on"?: string | null,"commission_window_months"?: number,"company_id"?: string,"contact_id"?: string,"counts_for_commission"?: boolean,"created_at"?: string,"created_by"?: string | null,"id"?: string,"introduced_by"?: string | null,"introduced_on"?: string,"introducer_name"?: string,"notes"?: string | null,"outcome"?: string | null,"status"?: Database["public"]['Enums']["estado_introduccion"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "introductions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introductions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "introductions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introductions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "introductions_contact_id_fkey"
      columns: ["contact_id"]
isOneToOne: false
      referencedRelation: "contacts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introductions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introductions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introductions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introductions_introduced_by_fkey"
      columns: ["introduced_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introductions_introduced_by_fkey"
      columns: ["introduced_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "introductions_introduced_by_fkey"
      columns: ["introduced_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"kpi_definitions": {
                  Row: {
                    "category": Database["public"]['Enums']["kpi_category"],"code": string,"created_at": string,"derived_from": (string)[],"description": string | null,"direction": Database["public"]['Enums']["kpi_direction"],"id": string,"is_active": boolean,"is_derived": boolean,"name": string,"order_index": number,"sector": string | null,"unit": Database["public"]['Enums']["kpi_unit"],"updated_at": string
                  }
                  Insert: {
                    "category": Database["public"]['Enums']["kpi_category"],"code": string,"created_at"?: string,"derived_from"?: (string)[],"description"?: string | null,"direction"?: Database["public"]['Enums']["kpi_direction"],"id"?: string,"is_active"?: boolean,"is_derived"?: boolean,"name": string,"order_index": number,"sector"?: string | null,"unit": Database["public"]['Enums']["kpi_unit"],"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["kpi_category"],"code"?: string,"created_at"?: string,"derived_from"?: (string)[],"description"?: string | null,"direction"?: Database["public"]['Enums']["kpi_direction"],"id"?: string,"is_active"?: boolean,"is_derived"?: boolean,"name"?: string,"order_index"?: number,"sector"?: string | null,"unit"?: Database["public"]['Enums']["kpi_unit"],"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"kpi_value_history": {
                  Row: {
                    "changed_at": string,"changed_by": string | null,"company_id": string,"company_kpi_id": string,"id": string,"kpi_value_id": string | null,"nota": string | null,"period": string,"valor_anterior": number | null,"valor_nuevo": number | null
                  }
                  Insert: {
                    "changed_at"?: string,"changed_by"?: string | null,"company_id": string,"company_kpi_id": string,"id"?: string,"kpi_value_id"?: string | null,"nota"?: string | null,"period": string,"valor_anterior"?: number | null,"valor_nuevo"?: number | null
                  }
                  Update: {
                    "changed_at"?: string,"changed_by"?: string | null,"company_id"?: string,"company_kpi_id"?: string,"id"?: string,"kpi_value_id"?: string | null,"nota"?: string | null,"period"?: string,"valor_anterior"?: number | null,"valor_nuevo"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "kpi_value_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_value_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_value_history_changed_by_fkey"
      columns: ["changed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_value_history_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_value_history_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "kpi_value_history_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_value_history_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "kpi_value_history_company_kpi_id_fkey"
      columns: ["company_kpi_id"]
isOneToOne: false
      referencedRelation: "company_kpis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_value_history_kpi_value_id_fkey"
      columns: ["kpi_value_id"]
isOneToOne: false
      referencedRelation: "kpi_values"
      referencedColumns: ["id"]
    }
                  ]
                },"kpi_values": {
                  Row: {
                    "company_id": string,"company_kpi_id": string,"created_at": string,"created_by": string | null,"id": string,"note": string | null,"period": string,"source": string,"target_value": number | null,"update_id": string | null,"updated_at": string,"value": number | null
                  }
                  Insert: {
                    "company_id": string,"company_kpi_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"period": string,"source"?: string,"target_value"?: number | null,"update_id"?: string | null,"updated_at"?: string,"value"?: number | null
                  }
                  Update: {
                    "company_id"?: string,"company_kpi_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"note"?: string | null,"period"?: string,"source"?: string,"target_value"?: number | null,"update_id"?: string | null,"updated_at"?: string,"value"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "kpi_values_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_values_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "kpi_values_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_values_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "kpi_values_company_kpi_id_fkey"
      columns: ["company_kpi_id"]
isOneToOne: false
      referencedRelation: "company_kpis"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_values_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_values_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_values_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_values_update_id_fkey"
      columns: ["update_id"]
isOneToOne: false
      referencedRelation: "monthly_updates"
      referencedColumns: ["id"]
    }
                  ]
                },"milestones": {
                  Row: {
                    "annex_id": string | null,"company_id": string,"completed_on": string | null,"confirmed_at": string | null,"confirmed_by": string | null,"created_at": string,"created_by": string | null,"description": string | null,"due_date": string | null,"evidence": string | null,"gates_investable": boolean,"id": string,"origin": Database["public"]['Enums']["origen_hito"],"phase_id": string | null,"plan_item_id": string | null,"stage_id": string | null,"status": Database["public"]['Enums']["estado_hito"],"success_criteria": string,"title": string,"updated_at": string
                  }
                  Insert: {
                    "annex_id"?: string | null,"company_id": string,"completed_on"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"evidence"?: string | null,"gates_investable"?: boolean,"id"?: string,"origin"?: Database["public"]['Enums']["origen_hito"],"phase_id"?: string | null,"plan_item_id"?: string | null,"stage_id"?: string | null,"status"?: Database["public"]['Enums']["estado_hito"],"success_criteria": string,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "annex_id"?: string | null,"company_id"?: string,"completed_on"?: string | null,"confirmed_at"?: string | null,"confirmed_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"evidence"?: string | null,"gates_investable"?: boolean,"id"?: string,"origin"?: Database["public"]['Enums']["origen_hito"],"phase_id"?: string | null,"plan_item_id"?: string | null,"stage_id"?: string | null,"status"?: Database["public"]['Enums']["estado_hito"],"success_criteria"?: string,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "milestones_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "annexes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["annex_id"]
    },{
      foreignKeyName: "milestones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "milestones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "milestones_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_confirmed_by_fkey"
      columns: ["confirmed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_plan_item_id_fkey"
      columns: ["plan_item_id"]
isOneToOne: false
      referencedRelation: "tech_plan_items"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "milestones_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "roadmap_stages"
      referencedColumns: ["id"]
    }
                  ]
                },"monthly_updates": {
                  Row: {
                    "achievements": string | null,"blockers": string | null,"company_id": string,"created_at": string,"due_date": string | null,"id": string,"period": string,"requests": string | null,"reviewed_at": string | null,"reviewed_by": string | null,"status": Database["public"]['Enums']["estado_update"],"submitted_at": string | null,"submitted_by": string | null,"updated_at": string
                  }
                  Insert: {
                    "achievements"?: string | null,"blockers"?: string | null,"company_id": string,"created_at"?: string,"due_date"?: string | null,"id"?: string,"period": string,"requests"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["estado_update"],"submitted_at"?: string | null,"submitted_by"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "achievements"?: string | null,"blockers"?: string | null,"company_id"?: string,"created_at"?: string,"due_date"?: string | null,"id"?: string,"period"?: string,"requests"?: string | null,"reviewed_at"?: string | null,"reviewed_by"?: string | null,"status"?: Database["public"]['Enums']["estado_update"],"submitted_at"?: string | null,"submitted_by"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "monthly_updates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monthly_updates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "monthly_updates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monthly_updates_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "monthly_updates_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monthly_updates_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monthly_updates_reviewed_by_fkey"
      columns: ["reviewed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monthly_updates_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monthly_updates_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "monthly_updates_submitted_by_fkey"
      columns: ["submitted_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"nda_comentarios": {
                  Row: {
                    "candidatura_id": string,"created_at": string,"id": string,"plantilla_id": string | null,"profile_id": string | null,"respondido_at": string | null,"respondido_por": string | null,"respuesta": string | null,"texto": string
                  }
                  Insert: {
                    "candidatura_id": string,"created_at"?: string,"id"?: string,"plantilla_id"?: string | null,"profile_id"?: string | null,"respondido_at"?: string | null,"respondido_por"?: string | null,"respuesta"?: string | null,"texto": string
                  }
                  Update: {
                    "candidatura_id"?: string,"created_at"?: string,"id"?: string,"plantilla_id"?: string | null,"profile_id"?: string | null,"respondido_at"?: string | null,"respondido_por"?: string | null,"respuesta"?: string | null,"texto"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "nda_comentarios_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_comentarios_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "nda_comentarios_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_comentarios_plantilla_id_fkey"
      columns: ["plantilla_id"]
isOneToOne: false
      referencedRelation: "nda_plantillas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_comentarios_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_comentarios_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_comentarios_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_comentarios_respondido_por_fkey"
      columns: ["respondido_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_comentarios_respondido_por_fkey"
      columns: ["respondido_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_comentarios_respondido_por_fkey"
      columns: ["respondido_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"nda_firmas": {
                  Row: {
                    "candidatura_id": string,"contrafirmado_at": string | null,"contrafirmado_ip": string | null,"contrafirmado_ua": string | null,"contrafirmante_correo": string | null,"contrafirmante_id": string | null,"contrafirmante_nombre": string | null,"created_at": string,"datos": Json | null,"documento_id": string | null,"evidencia_url": string | null,"externo": boolean,"firmado_at": string | null,"firmado_ip": string | null,"firmado_ua": string | null,"firmante_correo": string | null,"firmante_id": string | null,"firmante_nombre": string | null,"plantilla_id": string | null,"texto_firmado": string | null,"texto_hash": string | null,"texto_version": string | null
                  }
                  Insert: {
                    "candidatura_id": string,"contrafirmado_at"?: string | null,"contrafirmado_ip"?: string | null,"contrafirmado_ua"?: string | null,"contrafirmante_correo"?: string | null,"contrafirmante_id"?: string | null,"contrafirmante_nombre"?: string | null,"created_at"?: string,"datos"?: Json | null,"documento_id"?: string | null,"evidencia_url"?: string | null,"externo"?: boolean,"firmado_at"?: string | null,"firmado_ip"?: string | null,"firmado_ua"?: string | null,"firmante_correo"?: string | null,"firmante_id"?: string | null,"firmante_nombre"?: string | null,"plantilla_id"?: string | null,"texto_firmado"?: string | null,"texto_hash"?: string | null,"texto_version"?: string | null
                  }
                  Update: {
                    "candidatura_id"?: string,"contrafirmado_at"?: string | null,"contrafirmado_ip"?: string | null,"contrafirmado_ua"?: string | null,"contrafirmante_correo"?: string | null,"contrafirmante_id"?: string | null,"contrafirmante_nombre"?: string | null,"created_at"?: string,"datos"?: Json | null,"documento_id"?: string | null,"evidencia_url"?: string | null,"externo"?: boolean,"firmado_at"?: string | null,"firmado_ip"?: string | null,"firmado_ua"?: string | null,"firmante_correo"?: string | null,"firmante_id"?: string | null,"firmante_nombre"?: string | null,"plantilla_id"?: string | null,"texto_firmado"?: string | null,"texto_hash"?: string | null,"texto_version"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "nda_firmas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: true
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: true
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "nda_firmas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: true
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_contrafirmante_id_fkey"
      columns: ["contrafirmante_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_contrafirmante_id_fkey"
      columns: ["contrafirmante_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_contrafirmante_id_fkey"
      columns: ["contrafirmante_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_documento_id_fkey"
      columns: ["documento_id"]
isOneToOne: false
      referencedRelation: "candidatura_documentos"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_documento_id_fkey"
      columns: ["documento_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_firmante_id_fkey"
      columns: ["firmante_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_firmante_id_fkey"
      columns: ["firmante_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_firmante_id_fkey"
      columns: ["firmante_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_firmas_plantilla_id_fkey"
      columns: ["plantilla_id"]
isOneToOne: false
      referencedRelation: "nda_plantillas"
      referencedColumns: ["id"]
    }
                  ]
                },"nda_plantillas": {
                  Row: {
                    "candidatura_id": string | null,"created_at": string,"created_by": string | null,"hash": string,"id": string,"texto": string,"version": number
                  }
                  Insert: {
                    "candidatura_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"hash": string,"id"?: string,"texto": string,"version": number
                  }
                  Update: {
                    "candidatura_id"?: string | null,"created_at"?: string,"created_by"?: string | null,"hash"?: string,"id"?: string,"texto"?: string,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "nda_plantillas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_plantillas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "nda_plantillas_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_plantillas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_plantillas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "nda_plantillas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"objections": {
                  Row: {
                    "company_id": string,"created_at": string,"entity": string,"entity_id": string,"id": string,"raised_by": string,"reason": string,"resolution": string | null,"resolved_at": string | null,"resolved_by": string | null,"status": Database["public"]['Enums']["estado_objecion"],"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"entity": string,"entity_id": string,"id"?: string,"raised_by": string,"reason": string,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["estado_objecion"],"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"entity"?: string,"entity_id"?: string,"id"?: string,"raised_by"?: string,"reason"?: string,"resolution"?: string | null,"resolved_at"?: string | null,"resolved_by"?: string | null,"status"?: Database["public"]['Enums']["estado_objecion"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "objections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "objections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "objections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "objections_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "objections_raised_by_fkey"
      columns: ["raised_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "objections_raised_by_fkey"
      columns: ["raised_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "objections_raised_by_fkey"
      columns: ["raised_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "objections_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "objections_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "objections_resolved_by_fkey"
      columns: ["resolved_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organizations": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"slug": string,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"slug": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"slug"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"phases": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"name": string,"order_index": number,"updated_at": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"order_index": number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"order_index"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"pillars": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"id": string,"name": string,"order_index": number,"updated_at": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"name": string,"order_index": number,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"name"?: string,"order_index"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"platform_settings": {
                  Row: {
                    "description": string | null,"key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  Insert: {
                    "description"?: string | null,"key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "description"?: string | null,"key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "archived_at": string | null,"bio": string | null,"contrasena_cambiada_at": string | null,"created_at": string,"cv_path": string | null,"email": string,"expertise": (string)[],"full_name": string | null,"id": string,"is_active": boolean,"job_title": string | null,"last_name": string | null,"linkedin_url": string | null,"organization_id": string | null,"photo_path": string | null,"primer_acceso_at": string | null,"resumen_avisos": string,"role": Database["public"]['Enums']["app_role"],"updated_at": string
                  }
                  Insert: {
                    "archived_at"?: string | null,"bio"?: string | null,"contrasena_cambiada_at"?: string | null,"created_at"?: string,"cv_path"?: string | null,"email": string,"expertise"?: (string)[],"full_name"?: string | null,"id": string,"is_active"?: boolean,"job_title"?: string | null,"last_name"?: string | null,"linkedin_url"?: string | null,"organization_id"?: string | null,"photo_path"?: string | null,"primer_acceso_at"?: string | null,"resumen_avisos"?: string,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Update: {
                    "archived_at"?: string | null,"bio"?: string | null,"contrasena_cambiada_at"?: string | null,"created_at"?: string,"cv_path"?: string | null,"email"?: string,"expertise"?: (string)[],"full_name"?: string | null,"id"?: string,"is_active"?: boolean,"job_title"?: string | null,"last_name"?: string | null,"linkedin_url"?: string | null,"organization_id"?: string | null,"photo_path"?: string | null,"primer_acceso_at"?: string | null,"resumen_avisos"?: string,"role"?: Database["public"]['Enums']["app_role"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_organization_id_fkey"
      columns: ["organization_id"]
isOneToOne: false
      referencedRelation: "organizations"
      referencedColumns: ["id"]
    }
                  ]
                },"progress_entries": {
                  Row: {
                    "author_id": string | null,"body": string | null,"company_id": string,"created_at": string,"document_id": string | null,"entry_date": string,"evidence_url": string | null,"id": string,"milestone_id": string | null,"side": Database["public"]['Enums']["lado_avance"],"stage_id": string | null,"title": string,"updated_at": string
                  }
                  Insert: {
                    "author_id"?: string | null,"body"?: string | null,"company_id": string,"created_at"?: string,"document_id"?: string | null,"entry_date"?: string,"evidence_url"?: string | null,"id"?: string,"milestone_id"?: string | null,"side": Database["public"]['Enums']["lado_avance"],"stage_id"?: string | null,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"body"?: string | null,"company_id"?: string,"created_at"?: string,"document_id"?: string | null,"entry_date"?: string,"evidence_url"?: string | null,"id"?: string,"milestone_id"?: string | null,"side"?: Database["public"]['Enums']["lado_avance"],"stage_id"?: string | null,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "progress_entries_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_entries_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_entries_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_entries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_entries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "progress_entries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_entries_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "progress_entries_document_id_fkey"
      columns: ["document_id"]
isOneToOne: false
      referencedRelation: "documents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_entries_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "progress_entries_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "roadmap_stages"
      referencedColumns: ["id"]
    }
                  ]
                },"rate_cards": {
                  Row: {
                    "applied_rate": number,"created_at": string,"id": string,"market_rate": number,"profile_code": string,"profile_name": string,"source": string | null,"updated_at": string,"valid_from": string,"valid_to": string | null
                  }
                  Insert: {
                    "applied_rate": number,"created_at"?: string,"id"?: string,"market_rate": number,"profile_code": string,"profile_name": string,"source"?: string | null,"updated_at"?: string,"valid_from": string,"valid_to"?: string | null
                  }
                  Update: {
                    "applied_rate"?: number,"created_at"?: string,"id"?: string,"market_rate"?: number,"profile_code"?: string,"profile_name"?: string,"source"?: string | null,"updated_at"?: string,"valid_from"?: string,"valid_to"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"readiness_snapshots": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"id": string,"investable": boolean,"note": string | null,"open_critical": number,"preparation_score": number | null,"reason": Database["public"]['Enums']["motivo_instantanea"],"runway_months": number | null,"stage": Database["public"]['Enums']["company_stage"],"taken_on": string,"tech_complete": boolean,"tech_score": number | null
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"investable"?: boolean,"note"?: string | null,"open_critical"?: number,"preparation_score"?: number | null,"reason": Database["public"]['Enums']["motivo_instantanea"],"runway_months"?: number | null,"stage": Database["public"]['Enums']["company_stage"],"taken_on": string,"tech_complete"?: boolean,"tech_score"?: number | null
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"investable"?: boolean,"note"?: string | null,"open_critical"?: number,"preparation_score"?: number | null,"reason"?: Database["public"]['Enums']["motivo_instantanea"],"runway_months"?: number | null,"stage"?: Database["public"]['Enums']["company_stage"],"taken_on"?: string,"tech_complete"?: boolean,"tech_score"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "readiness_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "readiness_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "readiness_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "readiness_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "readiness_snapshots_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "readiness_snapshots_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "readiness_snapshots_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"roadmap_stages": {
                  Row: {
                    "annex_id": string | null,"company_id": string,"created_at": string,"created_by": string | null,"ends_on": string | null,"id": string,"name": string,"notes": string | null,"objective": string,"order_index": number,"planned_cash": number | null,"planned_hours": number | null,"starts_on": string | null,"status": Database["public"]['Enums']["estado_etapa"],"template_stage_id": string | null,"updated_at": string
                  }
                  Insert: {
                    "annex_id"?: string | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"id"?: string,"name": string,"notes"?: string | null,"objective": string,"order_index": number,"planned_cash"?: number | null,"planned_hours"?: number | null,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["estado_etapa"],"template_stage_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "annex_id"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"ends_on"?: string | null,"id"?: string,"name"?: string,"notes"?: string | null,"objective"?: string,"order_index"?: number,"planned_cash"?: number | null,"planned_hours"?: number | null,"starts_on"?: string | null,"status"?: Database["public"]['Enums']["estado_etapa"],"template_stage_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "roadmap_stages_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "annexes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roadmap_stages_annex_id_fkey"
      columns: ["annex_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["annex_id"]
    },{
      foreignKeyName: "roadmap_stages_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roadmap_stages_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "roadmap_stages_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roadmap_stages_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "roadmap_stages_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roadmap_stages_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roadmap_stages_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "roadmap_stages_template_stage_id_fkey"
      columns: ["template_stage_id"]
isOneToOne: false
      referencedRelation: "roadmap_template_stages"
      referencedColumns: ["id"]
    }
                  ]
                },"roadmap_template_milestones": {
                  Row: {
                    "gates_investable": boolean,"id": string,"offset_weeks": number | null,"order_index": number,"success_criteria": string,"template_stage_id": string,"title": string
                  }
                  Insert: {
                    "gates_investable"?: boolean,"id"?: string,"offset_weeks"?: number | null,"order_index": number,"success_criteria": string,"template_stage_id": string,"title": string
                  }
                  Update: {
                    "gates_investable"?: boolean,"id"?: string,"offset_weeks"?: number | null,"order_index"?: number,"success_criteria"?: string,"template_stage_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "roadmap_template_milestones_template_stage_id_fkey"
      columns: ["template_stage_id"]
isOneToOne: false
      referencedRelation: "roadmap_template_stages"
      referencedColumns: ["id"]
    }
                  ]
                },"roadmap_template_stages": {
                  Row: {
                    "code": string,"id": string,"name": string,"objective": string,"order_index": number,"planned_cash": number | null,"planned_hours": number | null,"planned_weeks": number | null,"template_id": string
                  }
                  Insert: {
                    "code": string,"id"?: string,"name": string,"objective": string,"order_index": number,"planned_cash"?: number | null,"planned_hours"?: number | null,"planned_weeks"?: number | null,"template_id": string
                  }
                  Update: {
                    "code"?: string,"id"?: string,"name"?: string,"objective"?: string,"order_index"?: number,"planned_cash"?: number | null,"planned_hours"?: number | null,"planned_weeks"?: number | null,"template_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "roadmap_template_stages_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "roadmap_templates"
      referencedColumns: ["id"]
    }
                  ]
                },"roadmap_templates": {
                  Row: {
                    "code": string,"created_at": string,"description": string | null,"duration_months": number | null,"entry_state": Database["public"]['Enums']["estado_entrada"],"id": string,"is_active": boolean,"name": string,"updated_at": string
                  }
                  Insert: {
                    "code": string,"created_at"?: string,"description"?: string | null,"duration_months"?: number | null,"entry_state": Database["public"]['Enums']["estado_entrada"],"id"?: string,"is_active"?: boolean,"name": string,"updated_at"?: string
                  }
                  Update: {
                    "code"?: string,"created_at"?: string,"description"?: string | null,"duration_months"?: number | null,"entry_state"?: Database["public"]['Enums']["estado_entrada"],"id"?: string,"is_active"?: boolean,"name"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "company_id": string,"completed_by": string | null,"completed_on": string | null,"created_at": string,"created_by": string | null,"description": string | null,"due_date": string | null,"estimated_hours": number | null,"id": string,"milestone_id": string | null,"owner_id": string | null,"pillar_id": string | null,"priority": Database["public"]['Enums']["prioridad_tarea"],"side": Database["public"]['Enums']["lado_avance"],"source_entity": string | null,"source_id": string | null,"stage_id": string | null,"status": Database["public"]['Enums']["estado_tarea"],"title": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"completed_by"?: string | null,"completed_on"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"estimated_hours"?: number | null,"id"?: string,"milestone_id"?: string | null,"owner_id"?: string | null,"pillar_id"?: string | null,"priority"?: Database["public"]['Enums']["prioridad_tarea"],"side"?: Database["public"]['Enums']["lado_avance"],"source_entity"?: string | null,"source_id"?: string | null,"stage_id"?: string | null,"status"?: Database["public"]['Enums']["estado_tarea"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"completed_by"?: string | null,"completed_on"?: string | null,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"estimated_hours"?: number | null,"id"?: string,"milestone_id"?: string | null,"owner_id"?: string | null,"pillar_id"?: string | null,"priority"?: Database["public"]['Enums']["prioridad_tarea"],"side"?: Database["public"]['Enums']["lado_avance"],"source_entity"?: string | null,"source_id"?: string | null,"stage_id"?: string | null,"status"?: Database["public"]['Enums']["estado_tarea"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tasks_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tasks_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_completed_by_fkey"
      columns: ["completed_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_milestone_id_fkey"
      columns: ["milestone_id"]
isOneToOne: false
      referencedRelation: "milestones"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_pillar_id_fkey"
      columns: ["pillar_id"]
isOneToOne: false
      referencedRelation: "pillars"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_stage_id_fkey"
      columns: ["stage_id"]
isOneToOne: false
      referencedRelation: "roadmap_stages"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_assessments": {
                  Row: {
                    "assessed_on": string,"company_id": string,"created_at": string,"created_by": string | null,"id": string,"published_at": string | null,"reviewer_id": string | null,"stage": Database["public"]['Enums']["company_stage"],"status": Database["public"]['Enums']["estado_evaluacion"],"strengths": string | null,"summary": string | null,"tech_profile": Database["public"]['Enums']["company_tech_profile"],"updated_at": string
                  }
                  Insert: {
                    "assessed_on"?: string,"company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"published_at"?: string | null,"reviewer_id"?: string | null,"stage": Database["public"]['Enums']["company_stage"],"status"?: Database["public"]['Enums']["estado_evaluacion"],"strengths"?: string | null,"summary"?: string | null,"tech_profile": Database["public"]['Enums']["company_tech_profile"],"updated_at"?: string
                  }
                  Update: {
                    "assessed_on"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"published_at"?: string | null,"reviewer_id"?: string | null,"stage"?: Database["public"]['Enums']["company_stage"],"status"?: Database["public"]['Enums']["estado_evaluacion"],"strengths"?: string | null,"summary"?: string | null,"tech_profile"?: Database["public"]['Enums']["company_tech_profile"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_assessments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_assessments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_assessments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_assessments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_assessments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_assessments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_assessments_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_assessments_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_assessments_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_assessments_reviewer_id_fkey"
      columns: ["reviewer_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_criteria": {
                  Row: {
                    "automatable": boolean,"code": string,"created_at": string,"description": string | null,"dimension_id": string,"expected_evidence": string | null,"id": string,"is_active": boolean,"order_index": number,"title": string,"updated_at": string
                  }
                  Insert: {
                    "automatable"?: boolean,"code": string,"created_at"?: string,"description"?: string | null,"dimension_id": string,"expected_evidence"?: string | null,"id"?: string,"is_active"?: boolean,"order_index": number,"title": string,"updated_at"?: string
                  }
                  Update: {
                    "automatable"?: boolean,"code"?: string,"created_at"?: string,"description"?: string | null,"dimension_id"?: string,"expected_evidence"?: string | null,"id"?: string,"is_active"?: boolean,"order_index"?: number,"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_criteria_dimension_id_fkey"
      columns: ["dimension_id"]
isOneToOne: false
      referencedRelation: "tech_dimensions"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_dimension_weights": {
                  Row: {
                    "created_at": string,"dimension_id": string,"id": string,"tech_profile": Database["public"]['Enums']["company_tech_profile"],"updated_at": string,"weight": number
                  }
                  Insert: {
                    "created_at"?: string,"dimension_id": string,"id"?: string,"tech_profile": Database["public"]['Enums']["company_tech_profile"],"updated_at"?: string,"weight"?: number
                  }
                  Update: {
                    "created_at"?: string,"dimension_id"?: string,"id"?: string,"tech_profile"?: Database["public"]['Enums']["company_tech_profile"],"updated_at"?: string,"weight"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_dimension_weights_dimension_id_fkey"
      columns: ["dimension_id"]
isOneToOne: false
      referencedRelation: "tech_dimensions"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_dimensions": {
                  Row: {
                    "applicability": Database["public"]['Enums']["tech_applicability"],"code": string,"created_at": string,"description": string | null,"id": string,"is_active": boolean,"name": string,"order_index": number,"updated_at": string
                  }
                  Insert: {
                    "applicability"?: Database["public"]['Enums']["tech_applicability"],"code": string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name": string,"order_index": number,"updated_at"?: string
                  }
                  Update: {
                    "applicability"?: Database["public"]['Enums']["tech_applicability"],"code"?: string,"created_at"?: string,"description"?: string | null,"id"?: string,"is_active"?: boolean,"name"?: string,"order_index"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tech_findings": {
                  Row: {
                    "acceptance_note": string | null,"assessment_id": string | null,"company_id": string,"created_at": string,"created_by": string | null,"description": string,"dimension_id": string,"evidence": string | null,"id": string,"recommendation": string,"resolved_at": string | null,"severity": Database["public"]['Enums']["severidad_hallazgo"],"status": Database["public"]['Enums']["estado_hallazgo"],"title": string,"updated_at": string
                  }
                  Insert: {
                    "acceptance_note"?: string | null,"assessment_id"?: string | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"description": string,"dimension_id": string,"evidence"?: string | null,"id"?: string,"recommendation": string,"resolved_at"?: string | null,"severity": Database["public"]['Enums']["severidad_hallazgo"],"status"?: Database["public"]['Enums']["estado_hallazgo"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "acceptance_note"?: string | null,"assessment_id"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string,"dimension_id"?: string,"evidence"?: string | null,"id"?: string,"recommendation"?: string,"resolved_at"?: string | null,"severity"?: Database["public"]['Enums']["severidad_hallazgo"],"status"?: Database["public"]['Enums']["estado_hallazgo"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_findings_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "tech_assessments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_findings_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["assessment_id"]
    },{
      foreignKeyName: "tech_findings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_findings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_findings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_findings_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_findings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_findings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_findings_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_findings_dimension_id_fkey"
      columns: ["dimension_id"]
isOneToOne: false
      referencedRelation: "tech_dimensions"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_maturity_levels": {
                  Row: {
                    "description": string,"level": number,"name": string
                  }
                  Insert: {
                    "description": string,"level": number,"name": string
                  }
                  Update: {
                    "description"?: string,"level"?: number,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"tech_plan_items": {
                  Row: {
                    "company_id": string,"created_at": string,"created_by": string | null,"description": string | null,"due_date": string | null,"effort_days": number | null,"estimated_cost": number | null,"finding_id": string | null,"id": string,"owner": Database["public"]['Enums']["responsable_plan"],"quarter": string | null,"status": Database["public"]['Enums']["estado_plan"],"title": string,"updated_at": string
                  }
                  Insert: {
                    "company_id": string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"effort_days"?: number | null,"estimated_cost"?: number | null,"finding_id"?: string | null,"id"?: string,"owner": Database["public"]['Enums']["responsable_plan"],"quarter"?: string | null,"status"?: Database["public"]['Enums']["estado_plan"],"title": string,"updated_at"?: string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"due_date"?: string | null,"effort_days"?: number | null,"estimated_cost"?: number | null,"finding_id"?: string | null,"id"?: string,"owner"?: Database["public"]['Enums']["responsable_plan"],"quarter"?: string | null,"status"?: Database["public"]['Enums']["estado_plan"],"title"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_plan_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_plan_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_plan_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_plan_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_plan_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_plan_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_plan_items_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_plan_items_finding_id_fkey"
      columns: ["finding_id"]
isOneToOne: false
      referencedRelation: "tech_findings"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_questionnaire_answers": {
                  Row: {
                    "answer": string | null,"answered_at": string | null,"answered_by": string | null,"attachments": (string)[],"company_id": string,"created_at": string,"criterion_id": string,"id": string,"updated_at": string
                  }
                  Insert: {
                    "answer"?: string | null,"answered_at"?: string | null,"answered_by"?: string | null,"attachments"?: (string)[],"company_id": string,"created_at"?: string,"criterion_id": string,"id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "answer"?: string | null,"answered_at"?: string | null,"answered_by"?: string | null,"attachments"?: (string)[],"company_id"?: string,"created_at"?: string,"criterion_id"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_questionnaire_answers_answered_by_fkey"
      columns: ["answered_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_questionnaire_answers_answered_by_fkey"
      columns: ["answered_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_questionnaire_answers_answered_by_fkey"
      columns: ["answered_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_questionnaire_answers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_questionnaire_answers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_questionnaire_answers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_questionnaire_answers_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_questionnaire_answers_criterion_id_fkey"
      columns: ["criterion_id"]
isOneToOne: false
      referencedRelation: "tech_criteria"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_review_sessions": {
                  Row: {
                    "assessment_id": string | null,"attendees": string,"company_id": string,"conclusions": string | null,"created_at": string,"created_by": string | null,"duration_min": number,"held_on": string,"id": string,"updated_at": string
                  }
                  Insert: {
                    "assessment_id"?: string | null,"attendees": string,"company_id": string,"conclusions"?: string | null,"created_at"?: string,"created_by"?: string | null,"duration_min": number,"held_on": string,"id"?: string,"updated_at"?: string
                  }
                  Update: {
                    "assessment_id"?: string | null,"attendees"?: string,"company_id"?: string,"conclusions"?: string | null,"created_at"?: string,"created_by"?: string | null,"duration_min"?: number,"held_on"?: string,"id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_review_sessions_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "tech_assessments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_review_sessions_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["assessment_id"]
    },{
      foreignKeyName: "tech_review_sessions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_review_sessions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_review_sessions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_review_sessions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_review_sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_review_sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_review_sessions_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_scores": {
                  Row: {
                    "assessment_id": string,"company_id": string,"created_at": string,"dimension_id": string,"evidence": string,"id": string,"level": number,"proposed_level": number | null,"rationale": string | null,"scored_at": string,"scored_by": string | null,"source": Database["public"]['Enums']["origen_puntuacion"],"updated_at": string
                  }
                  Insert: {
                    "assessment_id": string,"company_id": string,"created_at"?: string,"dimension_id": string,"evidence": string,"id"?: string,"level": number,"proposed_level"?: number | null,"rationale"?: string | null,"scored_at"?: string,"scored_by"?: string | null,"source"?: Database["public"]['Enums']["origen_puntuacion"],"updated_at"?: string
                  }
                  Update: {
                    "assessment_id"?: string,"company_id"?: string,"created_at"?: string,"dimension_id"?: string,"evidence"?: string,"id"?: string,"level"?: number,"proposed_level"?: number | null,"rationale"?: string | null,"scored_at"?: string,"scored_by"?: string | null,"source"?: Database["public"]['Enums']["origen_puntuacion"],"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_scores_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "tech_assessments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_scores_assessment_id_fkey"
      columns: ["assessment_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["assessment_id"]
    },{
      foreignKeyName: "tech_scores_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_scores_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_scores_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_scores_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "tech_scores_dimension_id_fkey"
      columns: ["dimension_id"]
isOneToOne: false
      referencedRelation: "tech_dimensions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_scores_scored_by_fkey"
      columns: ["scored_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_scores_scored_by_fkey"
      columns: ["scored_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tech_scores_scored_by_fkey"
      columns: ["scored_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"tech_stage_targets": {
                  Row: {
                    "created_at": string,"dimension_id": string,"id": string,"stage": Database["public"]['Enums']["company_stage"],"target_level": number,"updated_at": string
                  }
                  Insert: {
                    "created_at"?: string,"dimension_id": string,"id"?: string,"stage": Database["public"]['Enums']["company_stage"],"target_level": number,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"dimension_id"?: string,"id"?: string,"stage"?: Database["public"]['Enums']["company_stage"],"target_level"?: number,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "tech_stage_targets_dimension_id_fkey"
      columns: ["dimension_id"]
isOneToOne: false
      referencedRelation: "tech_dimensions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "admin_companias": {
                  Row: {
                    "archive_reason": string | null,"archived_at": string | null,"cif": string | null,"cohort_id": string | null,"cohort_name": string | null,"constitucion_prevista": string | null,"created_at": string | null,"denominacion_social": string | null,"entry_state": Database["public"]['Enums']["estado_entrada"] | null,"equipo": Json | null,"etapas": number | null,"female_leadership_pct": number | null,"forma_juridica": Database["public"]['Enums']["forma_juridica"] | null,"founded_on": string | null,"id": string | null,"logo_path": string | null,"name": string | null,"one_liner": string | null,"phase_id": string | null,"phase_name": string | null,"sector": string | null,"situacion_societaria": Database["public"]['Enums']["situacion_societaria"] | null,"slug": string | null,"stage": Database["public"]['Enums']["company_stage"] | null,"tech_profile": Database["public"]['Enums']["company_tech_profile"] | null,"tiene_actividad": boolean | null,"website": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "companies_phase_id_fkey"
      columns: ["phase_id"]
isOneToOne: false
      referencedRelation: "phases"
      referencedColumns: ["id"]
    }
                  ]
                },"admin_personas": {
                  Row: {
                    "archived_at": string | null,"asignaciones": Json | null,"bio": string | null,"correo_editable": boolean | null,"created_at": string | null,"cv_path": string | null,"email": string | null,"expertise": (string)[] | null,"full_name": string | null,"id": string | null,"is_active": boolean | null,"job_title": string | null,"last_name": string | null,"linkedin_url": string | null,"organization_name": string | null,"photo_path": string | null,"role": Database["public"]['Enums']["app_role"] | null,"tiene_actividad": boolean | null
                  }
                  Relationships: [
                    
                  ]
                },"candidatura_entregas": {
                  Row: {
                    "area": string | null,"candidatura_id": string | null,"detalle": string | null,"documentos": number | null,"id": string | null,"obligatoria": boolean | null,"orden": number | null,"titulo": string | null
                  }
                  Insert: {
                           "area"?: string | null,"candidatura_id"?: string | null,"detalle"?: string | null,"documentos"?: never,"id"?: string | null,"obligatoria"?: boolean | null,"orden"?: number | null,"titulo"?: string | null
                         }
                        Update: {
                           "area"?: string | null,"candidatura_id"?: string | null,"detalle"?: string | null,"documentos"?: never,"id"?: string | null,"obligatoria"?: boolean | null,"orden"?: number | null,"titulo"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "candidatura_peticiones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "candidaturas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidatura_peticiones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "documentos_de_seleccion"
      referencedColumns: ["candidatura_id"]
    },{
      foreignKeyName: "candidatura_peticiones_candidatura_id_fkey"
      columns: ["candidatura_id"]
isOneToOne: false
      referencedRelation: "embudo_candidaturas"
      referencedColumns: ["id"]
    }
                  ]
                },"commitment_counter": {
                  Row: {
                    "annex_id": string | null,"cash_pct": number | null,"committed_cash": number | null,"committed_hours": number | null,"company_id": string | null,"deliverables_count": number | null,"delivered_hours": number | null,"delivered_hours_value": number | null,"delivered_market_value": number | null,"disbursed_cash": number | null,"equity_pct": number | null,"hours_pct": number | null,"introductions_closed": number | null,"introductions_made": number | null,"justified_cash": number | null
                  }
                  Relationships: [
                    
                  ]
                },"contribution_hours_valued": {
                  Row: {
                    "applied_rate": number | null,"applied_value": number | null,"company_id": string | null,"description": string | null,"discount_value": number | null,"hours": number | null,"id": string | null,"market_rate": number | null,"market_value": number | null,"objected": boolean | null,"person_name": string | null,"profile_code": string | null,"subject_code": string | null,"subject_name": string | null,"worked_on": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_hours_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "contribution_hours_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_hours_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    }
                  ]
                },"contribution_items_summary": {
                  Row: {
                    "amount": number | null,"company_id": string | null,"discount": number | null,"items": number | null,"kind": Database["public"]['Enums']["tipo_aportacion"] | null,"market_value": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "contribution_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "contribution_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "contribution_items_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    }
                  ]
                },"documentos_de_seleccion": {
                  Row: {
                    "bytes": number | null,"candidatura_id": string | null,"company_id": string | null,"created_at": string | null,"id": string | null,"item_template_id": string | null,"nombre": string | null,"storage_path": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidatura_peticiones_item_template_id_fkey"
      columns: ["item_template_id"]
isOneToOne: false
      referencedRelation: "dd_item_templates"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    }
                  ]
                },"embudo_candidaturas": {
                  Row: {
                    "acuerdo_firmado_on": string | null,"acuerdo_firmantes": Json | null,"acuerdo_propuesto_on": string | null,"aportacion_propuesta": string | null,"cif": string | null,"cohort_id": string | null,"cohorte": string | null,"company_id": string | null,"company_slug": string | null,"constitucion_prevista": string | null,"contacto_apellidos": string | null,"contacto_cargo": string | null,"contacto_email": string | null,"contacto_nombre": string | null,"contacto_telefono": string | null,"created_at": string | null,"created_by": string | null,"denominacion_social": string | null,"descartada_at": string | null,"descartada_desde": Database["public"]['Enums']["estado_candidatura"] | null,"descartada_motivo": string | null,"descartada_por": string | null,"enlace_abierto_at": string | null,"enlace_visto_at": string | null,"enlaces": number | null,"equipo_personas": number | null,"equity_pct": number | null,"estado": Database["public"]['Enums']["estado_candidatura"] | null,"estado_declarado": Database["public"]['Enums']["estado_entrada"] | null,"estado_verificado": Database["public"]['Enums']["estado_entrada"] | null,"forma_juridica": Database["public"]['Enums']["forma_juridica"] | null,"id": string | null,"is_demo": boolean | null,"liderazgo_femenino_pct": number | null,"nda_firmado_on": string | null,"nombre": string | null,"notas": string | null,"one_liner": string | null,"origen": string | null,"pais": string | null,"profile_id": string | null,"sector": string | null,"situacion_societaria": Database["public"]['Enums']["situacion_societaria"] | null,"token": string | null,"token_anulado_at": string | null,"ultimo_movimiento": string | null,"updated_at": string | null,"via": Database["public"]['Enums']["via_entrada"] | null,"website": string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "candidaturas_cohort_id_fkey"
      columns: ["cohort_id"]
isOneToOne: false
      referencedRelation: "cohorts"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_company_id_fkey"
      columns: ["company_id"]
isOneToOne: true
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "candidaturas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_descartada_por_fkey"
      columns: ["descartada_por"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_descartada_por_fkey"
      columns: ["descartada_por"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_descartada_por_fkey"
      columns: ["descartada_por"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "candidaturas_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: true
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"kpi_series": {
                  Row: {
                    "category": Database["public"]['Enums']["kpi_category"] | null,"code": string | null,"company_id": string | null,"direction": Database["public"]['Enums']["kpi_direction"] | null,"name": string | null,"note": string | null,"period": string | null,"source": string | null,"target_value": number | null,"unit": Database["public"]['Enums']["kpi_unit"] | null,"value": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "kpi_values_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_values_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "kpi_values_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "kpi_values_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    }
                  ]
                },"mentoria_dedicacion": {
                  Row: {
                    "assigned_hours": number | null,"company_id": string | null,"company_name": string | null,"company_slug": string | null,"email": string | null,"ends_on": string | null,"full_name": string | null,"imputadas": number | null,"member_role": Database["public"]['Enums']["company_member_role"] | null,"pct": number | null,"profile_id": string | null,"rate_profile": string | null,"starts_on": string | null,"tareas_abiertas": number | null,"tareas_vencidas": number | null,"valor_imputado": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "company_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "admin_personas"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "personas_asignables"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "company_members_profile_id_fkey"
      columns: ["profile_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"personas_asignables": {
                  Row: {
                    "email": string | null,"expertise": (string)[] | null,"full_name": string | null,"horas_comprometidas": number | null,"id": string | null,"job_title": string | null,"last_name": string | null,"organization_name": string | null,"proyectos": number | null,"role": Database["public"]['Enums']["app_role"] | null
                  }
                  Relationships: [
                    
                  ]
                },"readiness_movement": {
                  Row: {
                    "baseline_on": string | null,"baseline_preparation": number | null,"baseline_tech": number | null,"company_id": string | null,"latest_investable": boolean | null,"latest_on": string | null,"latest_open_critical": number | null,"latest_preparation": number | null,"latest_tech": number | null,"preparation_movement": number | null,"snapshot_count": number | null,"tech_movement": number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "readiness_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "admin_companias"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "readiness_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "commitment_counter"
      referencedColumns: ["company_id"]
    },{
      foreignKeyName: "readiness_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "readiness_snapshots_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "tech_score_input"
      referencedColumns: ["company_id"]
    }
                  ]
                },"tech_score_input": {
                  Row: {
                    "assessed_on": string | null,"assessment_id": string | null,"company_id": string | null,"dimension_code": string | null,"dimension_name": string | null,"dimension_order": number | null,"evidence": string | null,"level": number | null,"source": Database["public"]['Enums']["origen_puntuacion"] | null,"stage": Database["public"]['Enums']["company_stage"] | null,"target_level": number | null,"tech_profile": Database["public"]['Enums']["company_tech_profile"] | null,"weight": number | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "aceptar_anexo":
{ Args: { "p_anexo": string }; Returns: undefined
                           },
"anadir_enlace_con_token":
{ Args: { "p_titulo": string,"p_token": string,"p_url": string }; Returns: undefined
                           },
"apuntar_documento_nda":
{ Args: { "p_candidatura": string,"p_documento": string }; Returns: undefined
                           },
"archivar_compania":
{ Args: { "motivo"?: string,"target_company": string }; Returns: undefined
                           },
"avisar_reuniones_caducadas":
{ Args: Record<PropertyKey, never>; Returns: number
                           },
"borrar_compania":
{ Args: { "target_company": string }; Returns: undefined
                           },
"borrar_compania_con_todo":
{ Args: { "target_company": string }; Returns: undefined
                           },
"compania_tiene_actividad":
{ Args: { "target_company": string }; Returns: boolean
                           },
"completar_candidatura":
{ Args: { "p_contacto_cargo"?: string,"p_contacto_telefono"?: string,"p_equipo_personas"?: number,"p_estado_declarado"?: Database["public"]['Enums']["estado_entrada"],"p_liderazgo_femenino_pct"?: number,"p_one_liner"?: string,"p_pais"?: string,"p_sector"?: string,"p_token": string,"p_website"?: string }; Returns: undefined
                           },
"contenido_compania":
{ Args: { "target_company": string }; Returns: Json
                           },
"contrafirmar_nda":
{ Args: { "p_candidatura": string,"p_ip": string,"p_profile": string,"p_ua": string }; Returns: undefined
                           },
"convocatoria_abierta":
{ Args: Record<PropertyKey, never>; Returns: {
              "cierra": string,"nombre": string,"texto": string
            }[]
                           },
"crear_compania":
{ Args: { "p_cohort_id"?: string,"p_entry_state"?: Database["public"]['Enums']["estado_entrada"],"p_female_leadership_pct"?: number,"p_founded_on"?: string,"p_name": string,"p_one_liner"?: string,"p_phase_code": string,"p_roadmap_start"?: string,"p_roadmap_template"?: string,"p_sector"?: string,"p_slug": string,"p_stage": Database["public"]['Enums']["company_stage"],"p_tech_profile": Database["public"]['Enums']["company_tech_profile"],"p_website"?: string }; Returns: string
                           },
"dar_acceso_candidatura":
{ Args: { "p_candidatura": string,"p_profile": string }; Returns: undefined
                           },
"dar_acceso_fundadora":
{ Args: { "p_company": string,"p_profile": string }; Returns: undefined
                           },
"datos_nda":
{ Args: { "p_candidatura": string }; Returns: {
              "contraparte_nombre": string,"lugar": string,"situacion_societaria": Database["public"]['Enums']["situacion_societaria"],"startup": string
            }[]
                           },
"estado_nda":
{ Args: { "p_candidatura": string }; Returns: string
                           },
"firmar_acta":
{ Args: { "p_acta": string,"p_ip": string,"p_profile": string,"p_ua": string }; Returns: boolean
                           },
"firmar_acuerdo":
{ Args: { "p_company": string,"p_firmado_on"?: string,"p_phase_code"?: string,"p_roadmap_start"?: string,"p_roadmap_template"?: string,"p_stage": Database["public"]['Enums']["company_stage"],"p_tech_profile": Database["public"]['Enums']["company_tech_profile"] }; Returns: undefined
                           },
"firmar_candidatura":
{ Args: { "p_candidatura": string,"p_firmado_on"?: string,"p_phase_code"?: string,"p_roadmap_start"?: string,"p_roadmap_template"?: string,"p_slug": string,"p_stage": Database["public"]['Enums']["company_stage"],"p_tech_profile": Database["public"]['Enums']["company_tech_profile"] }; Returns: string
                           },
"firmar_nda":
{ Args: { "p_candidatura": string,"p_datos": Json,"p_ip": string,"p_nombre": string,"p_plantilla": string,"p_profile": string,"p_texto": string,"p_ua": string }; Returns: undefined
                           },
"instanciar_hoja_de_ruta":
{ Args: { "inicio"?: string,"target_annex"?: string,"target_company": string,"template": string }; Returns: number
                           },
"mi_candidatura":
{ Args: Record<PropertyKey, never>; Returns: {
              "convocatoria": string,"enlaces": Json,"id": string,"momento": string,"nombre": string,"presentada_on": string,"puede_subir": boolean
            }[]
                           },
"mi_candidatura_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"mis_peticiones":
{ Args: Record<PropertyKey, never>; Returns: {
              "area": string,"detalle": string,"entregados": number,"id": string,"obligatoria": boolean,"titulo": string
            }[]
                           },
"pasar_a_aceleracion":
{ Args: { "p_company": string,"p_motivo": string }; Returns: undefined
                           },
"persona_tiene_actividad":
{ Args: { "target_profile": string }; Returns: boolean
                           },
"plantilla_nda_de":
{ Args: { "p_candidatura": string }; Returns: string
                           },
"presentar_candidatura":
{ Args: { "p_contacto_apellidos": string,"p_contacto_cargo"?: string,"p_contacto_email": string,"p_contacto_nombre": string,"p_contacto_telefono"?: string,"p_enlaces"?: Json,"p_equipo_personas"?: number,"p_estado_declarado"?: Database["public"]['Enums']["estado_entrada"],"p_liderazgo_femenino_pct"?: number,"p_nombre": string,"p_one_liner"?: string,"p_origen"?: string,"p_pais"?: string,"p_sector"?: string,"p_website"?: string }; Returns: string
                           },
"puede_cambiar_correo":
{ Args: { "target_profile": string }; Returns: boolean
                           },
"reabrir_update":
{ Args: { "target_update": string }; Returns: undefined
                           },
"registrar_apertura_enlace":
{ Args: { "p_token": string }; Returns: undefined
                           },
"registrar_nda_externo":
{ Args: { "p_candidatura": string,"p_documento": string,"p_firmado_on": string,"p_profile": string,"p_url": string }; Returns: undefined
                           },
"restaurar_compania":
{ Args: { "target_company": string }; Returns: undefined
                           },
"reunion_contraproponer":
{ Args: { "p_franjas": Json,"p_nota"?: string,"p_reunion": string,"p_token"?: string }; Returns: undefined
                           },
"reunion_elegir":
{ Args: { "p_inicio": string,"p_reunion": string,"p_token"?: string }; Returns: undefined
                           },
"reunion_vigente":
{ Args: { "p_token"?: string }; Returns: {
              "cancelada_motivo": string,"direccion": string,"elegida": Json,"enlace": string,"estado": string,"formato": string,"franjas": Json,"id": string,"nota": string,"nota_candidata": string,"personas_iwl": (string)[],"propuesta_de": string
            }[]
                           },
"testigo_de_candidatura":
{ Args: { "p_id": string }; Returns: string
                           },
"ver_candidatura":
{ Args: { "p_token": string }; Returns: {
              "contacto_cargo": string,"contacto_telefono": string,"convocatoria": string,"en_diligencia": boolean,"enlaces": Json,"equipo_personas": number,"estado_declarado": Database["public"]['Enums']["estado_entrada"],"id": string,"le_toca_a_ella": boolean,"liderazgo_femenino_pct": number,"momento": string,"nombre": string,"one_liner": string,"pais": string,"presentada_on": string,"puede_subir": boolean,"sector": string,"website": string
            }[]
                           }
          }
          Enums: {
            "app_role": "admin_iwl"|"equipo_iwl"|"revisor_niage"|"fundadora"|"mentor"|"lector_externo"|"candidata","base_incorporacion": "due_diligence"|"estrategica","company_member_role": "fundadora"|"responsable_iwl"|"revisor_niage"|"mentor"|"mentor_principal"|"mentor_secundario","company_stage": "pre_semilla"|"semilla"|"serie_a","company_tech_profile": "software"|"software_ia"|"hardware","decision_incorporacion": "si"|"no","estado_anexo": "borrador"|"propuesto"|"comentado"|"aceptado"|"firmado"|"cerrado","estado_caja": "comprometido"|"desembolsado"|"justificado","estado_candidatura": "presentada"|"en_revision"|"reunion"|"comite"|"preseleccionada"|"nda"|"entrada"|"acuerdo"|"firmada"|"descartada","estado_entrada": "idea"|"prototipo"|"mvp"|"primeros_clientes"|"facturacion","estado_etapa": "planificada"|"en_curso"|"completada"|"cancelada","estado_evaluacion": "borrador"|"publicada","estado_hallazgo": "abierto"|"en_curso"|"resuelto"|"aceptado","estado_hito": "pendiente"|"en_curso"|"cumplido"|"retrasado","estado_introduccion": "presentada"|"reunion_celebrada"|"en_negociacion"|"cerrada"|"descartada","estado_objecion": "abierta"|"aceptada"|"rechazada","estado_plan": "pendiente"|"en_curso"|"hecho"|"descartado","estado_punto_dd": "pendiente"|"entregado"|"en_revision"|"validado"|"bloqueante"|"no_aplica"|"por_construir","estado_seccion_bp": "borrador"|"en_revision"|"validada"|"por_construir","estado_tarea": "pendiente"|"en_curso"|"hecha"|"bloqueada"|"descartada","estado_update": "borrador"|"entregado"|"revisado","forma_juridica": "sl"|"sa"|"otra"|"extranjera","kpi_category": "nucleo"|"sector"|"tecnico"|"propio","kpi_direction": "sube_mejor"|"baja_mejor"|"neutro","kpi_unit": "moneda"|"porcentaje"|"numero"|"meses"|"dias"|"ratio","lado_avance": "compania"|"iwl","motivo_instantanea": "linea_base"|"evaluacion"|"mensual"|"manual","origen_hito": "anexo"|"plan_tecnico"|"due_diligence"|"acordado"|"societario","origen_puntuacion": "automatico"|"manual","prioridad_tarea": "alta"|"media"|"baja","responsable_plan": "compania"|"niage","severidad_hallazgo": "critico"|"alto"|"medio"|"bajo","situacion_societaria": "sin_constituir"|"en_constitucion"|"constituida","tech_applicability": "siempre"|"ia"|"hardware","tipo_aportacion": "compra"|"evento"|"reunion_inversor"|"gestion","tipo_contacto": "inversor"|"cliente"|"partner"|"proveedor"|"organismo_publico","tipo_evento_candidatura": "cambio_estado"|"reunion"|"comite"|"nota","tipo_evidencia": "documento"|"kpi"|"hito"|"hallazgo_tecnico"|"dimension_tecnica"|"enlace","tipo_linea_base": "inicial"|"trimestral"|"previa_ronda","traffic_light": "verde"|"ambar"|"rojo","tramo_compania": "entrada"|"incubacion","via_entrada": "aceleracion"|"construccion"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "app_role": ["admin_iwl", "equipo_iwl", "revisor_niage", "fundadora", "mentor", "lector_externo", "candidata"],"base_incorporacion": ["due_diligence", "estrategica"],"company_member_role": ["fundadora", "responsable_iwl", "revisor_niage", "mentor", "mentor_principal", "mentor_secundario"],"company_stage": ["pre_semilla", "semilla", "serie_a"],"company_tech_profile": ["software", "software_ia", "hardware"],"decision_incorporacion": ["si", "no"],"estado_anexo": ["borrador", "propuesto", "comentado", "aceptado", "firmado", "cerrado"],"estado_caja": ["comprometido", "desembolsado", "justificado"],"estado_candidatura": ["presentada", "en_revision", "reunion", "comite", "preseleccionada", "nda", "entrada", "acuerdo", "firmada", "descartada"],"estado_entrada": ["idea", "prototipo", "mvp", "primeros_clientes", "facturacion"],"estado_etapa": ["planificada", "en_curso", "completada", "cancelada"],"estado_evaluacion": ["borrador", "publicada"],"estado_hallazgo": ["abierto", "en_curso", "resuelto", "aceptado"],"estado_hito": ["pendiente", "en_curso", "cumplido", "retrasado"],"estado_introduccion": ["presentada", "reunion_celebrada", "en_negociacion", "cerrada", "descartada"],"estado_objecion": ["abierta", "aceptada", "rechazada"],"estado_plan": ["pendiente", "en_curso", "hecho", "descartado"],"estado_punto_dd": ["pendiente", "entregado", "en_revision", "validado", "bloqueante", "no_aplica", "por_construir"],"estado_seccion_bp": ["borrador", "en_revision", "validada", "por_construir"],"estado_tarea": ["pendiente", "en_curso", "hecha", "bloqueada", "descartada"],"estado_update": ["borrador", "entregado", "revisado"],"forma_juridica": ["sl", "sa", "otra", "extranjera"],"kpi_category": ["nucleo", "sector", "tecnico", "propio"],"kpi_direction": ["sube_mejor", "baja_mejor", "neutro"],"kpi_unit": ["moneda", "porcentaje", "numero", "meses", "dias", "ratio"],"lado_avance": ["compania", "iwl"],"motivo_instantanea": ["linea_base", "evaluacion", "mensual", "manual"],"origen_hito": ["anexo", "plan_tecnico", "due_diligence", "acordado", "societario"],"origen_puntuacion": ["automatico", "manual"],"prioridad_tarea": ["alta", "media", "baja"],"responsable_plan": ["compania", "niage"],"severidad_hallazgo": ["critico", "alto", "medio", "bajo"],"situacion_societaria": ["sin_constituir", "en_constitucion", "constituida"],"tech_applicability": ["siempre", "ia", "hardware"],"tipo_aportacion": ["compra", "evento", "reunion_inversor", "gestion"],"tipo_contacto": ["inversor", "cliente", "partner", "proveedor", "organismo_publico"],"tipo_evento_candidatura": ["cambio_estado", "reunion", "comite", "nota"],"tipo_evidencia": ["documento", "kpi", "hito", "hallazgo_tecnico", "dimension_tecnica", "enlace"],"tipo_linea_base": ["inicial", "trimestral", "previa_ronda"],"traffic_light": ["verde", "ambar", "rojo"],"tramo_compania": ["entrada", "incubacion"],"via_entrada": ["aceleracion", "construccion"]
          }
        }
} as const

