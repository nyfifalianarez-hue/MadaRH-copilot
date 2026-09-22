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
      action_proposals: {
        Row: {
          analysis: string
          created_at: string
          created_by: string
          decided_at: string | null
          decided_by: string | null
          effect: Json | null
          id: string
          kind: string
          legal_rule_ids: string[]
          org_id: string
          preview: string
          requires_external_call: boolean
          status: Database["public"]["Enums"]["proposal_status"]
          target: string
          title: string
          updated_at: string
        }
        Insert: {
          analysis: string
          created_at?: string
          created_by: string
          decided_at?: string | null
          decided_by?: string | null
          effect?: Json | null
          id?: string
          kind: string
          legal_rule_ids?: string[]
          org_id: string
          preview: string
          requires_external_call?: boolean
          status?: Database["public"]["Enums"]["proposal_status"]
          target: string
          title: string
          updated_at?: string
        }
        Update: {
          analysis?: string
          created_at?: string
          created_by?: string
          decided_at?: string | null
          decided_by?: string | null
          effect?: Json | null
          id?: string
          kind?: string
          legal_rule_ids?: string[]
          org_id?: string
          preview?: string
          requires_external_call?: boolean
          status?: Database["public"]["Enums"]["proposal_status"]
          target?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "action_proposals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          detail: string | null
          id: string
          new_values: Json | null
          old_values: Json | null
          org_id: string | null
          resource: string
          sensitive: boolean
          success: boolean
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string | null
          resource: string
          sensitive?: boolean
          success?: boolean
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          org_id?: string | null
          resource?: string
          sensitive?: boolean
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          employee_id: string | null
          expires_on: string | null
          id: string
          is_missing: boolean
          kind: string
          label: string
          org_id: string
          sensitivity: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id?: string | null
          expires_on?: string | null
          id?: string
          is_missing?: boolean
          kind: string
          label: string
          org_id: string
          sensitivity?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string | null
          expires_on?: string | null
          id?: string
          is_missing?: boolean
          kind?: string
          label?: string
          org_id?: string
          sensitivity?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_sensitive: {
        Row: {
          category: string
          created_at: string
          employee_id: string
          id: string
          org_id: string
          payload: Json
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          employee_id: string
          id?: string
          org_id: string
          payload?: Json
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          employee_id?: string
          id?: string
          org_id?: string
          payload?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_sensitive_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_sensitive_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          archived_at: string | null
          contract_end_on: string | null
          contract_type: string | null
          created_at: string
          department: string | null
          full_name: string
          hired_on: string | null
          id: string
          is_demo: boolean
          manager_id: string | null
          matricule: string
          org_id: string
          position: string | null
          site: string | null
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          contract_end_on?: string | null
          contract_type?: string | null
          created_at?: string
          department?: string | null
          full_name: string
          hired_on?: string | null
          id?: string
          is_demo?: boolean
          manager_id?: string | null
          matricule: string
          org_id: string
          position?: string | null
          site?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          contract_end_on?: string | null
          contract_type?: string | null
          created_at?: string
          department?: string | null
          full_name?: string
          hired_on?: string | null
          id?: string
          is_demo?: boolean
          manager_id?: string | null
          matricule?: string
          org_id?: string
          position?: string | null
          site?: string | null
          status?: string
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
          {
            foreignKeyName: "employees_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_documents: {
        Row: {
          body: string
          created_at: string
          created_by: string
          employee_id: string | null
          id: string
          kind: string
          org_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          created_by: string
          employee_id?: string | null
          id?: string
          kind: string
          org_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          employee_id?: string | null
          id?: string
          kind?: string
          org_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_credentials: {
        Row: {
          access_token_ciphertext: string
          account_label: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          org_id: string
          provider: string
          refresh_token_ciphertext: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          access_token_ciphertext: string
          account_label?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          org_id: string
          provider: string
          refresh_token_ciphertext?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          access_token_ciphertext?: string
          account_label?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string
          provider?: string
          refresh_token_ciphertext?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_credentials_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_health_checks: {
        Row: {
          checked_at: string
          checked_by: string | null
          detail: string | null
          http_status: number | null
          id: string
          ok: boolean
          org_id: string
          provider: string
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          detail?: string | null
          http_status?: number | null
          id?: string
          ok: boolean
          org_id: string
          provider: string
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          detail?: string | null
          http_status?: number | null
          id?: string
          ok?: boolean
          org_id?: string
          provider?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_health_checks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_scopes: {
        Row: {
          created_at: string
          id: string
          is_write: boolean
          provider: string
          purpose: string
          scope: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_write?: boolean
          provider: string
          purpose: string
          scope: string
        }
        Update: {
          created_at?: string
          id?: string
          is_write?: boolean
          provider?: string
          purpose?: string
          scope?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          account_label: string | null
          authorized_at: string | null
          authorized_by: string | null
          created_at: string
          id: string
          last_check_at: string | null
          last_check_detail: string | null
          last_check_ok: boolean | null
          org_id: string
          provider: string
          status: Database["public"]["Enums"]["integration_status"]
          updated_at: string
        }
        Insert: {
          account_label?: string | null
          authorized_at?: string | null
          authorized_by?: string | null
          created_at?: string
          id?: string
          last_check_at?: string | null
          last_check_detail?: string | null
          last_check_ok?: boolean | null
          org_id: string
          provider: string
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
        }
        Update: {
          account_label?: string | null
          authorized_at?: string | null
          authorized_by?: string | null
          created_at?: string
          id?: string
          last_check_at?: string | null
          last_check_detail?: string | null
          last_check_ok?: boolean | null
          org_id?: string
          provider?: string
          status?: Database["public"]["Enums"]["integration_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integrations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_absences: {
        Row: {
          comment: string | null
          created_at: string
          decided_at: string | null
          decided_by: string | null
          employee_id: string
          end_on: string
          id: string
          legal_rule_id: string | null
          org_id: string
          start_on: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          employee_id: string
          end_on: string
          id?: string
          legal_rule_id?: string | null
          org_id: string
          start_on: string
          status?: string
          type: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          employee_id?: string
          end_on?: string
          id?: string
          legal_rule_id?: string | null
          org_id?: string
          start_on?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_absences_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_absences_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_rule_versions: {
        Row: {
          changed_at: string
          changed_by: string | null
          comment: string | null
          id: string
          rule_id: string
          statement: string
          status: Database["public"]["Enums"]["rule_status"]
          version: number
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          comment?: string | null
          id?: string
          rule_id: string
          statement: string
          status?: Database["public"]["Enums"]["rule_status"]
          version: number
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          comment?: string | null
          id?: string
          rule_id?: string
          statement?: string
          status?: Database["public"]["Enums"]["rule_status"]
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_rule_versions_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "legal_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_rules: {
        Row: {
          applies_to: string
          article: string | null
          confidence: number
          created_at: string
          effective_on: string | null
          id: string
          last_checked_on: string | null
          source_id: string | null
          statement: string
          status: Database["public"]["Enums"]["rule_status"]
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          applies_to: string
          article?: string | null
          confidence?: number
          created_at?: string
          effective_on?: string | null
          id?: string
          last_checked_on?: string | null
          source_id?: string | null
          statement: string
          status?: Database["public"]["Enums"]["rule_status"]
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          applies_to?: string
          article?: string | null
          confidence?: number
          created_at?: string
          effective_on?: string | null
          id?: string
          last_checked_on?: string | null
          source_id?: string | null
          statement?: string
          status?: Database["public"]["Enums"]["rule_status"]
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_rules_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "legal_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_sources: {
        Row: {
          created_at: string
          id: string
          is_official: boolean
          label: string
          reference: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_official?: boolean
          label: string
          reference?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_official?: boolean
          label?: string
          reference?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          expires_at: string
          org_id: string
          provider: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          org_id: string
          provider: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          org_id?: string
          provider?: string
          redirect_uri?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_states_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string
          created_at: string
          id: string
          is_demo: boolean
          name: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          org_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string
          id: string
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          created_at: string
          demo_mode: boolean
          locale: string
          mask_sensitive_by_default: boolean
          org_id: string
          retention_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          demo_mode?: boolean
          locale?: string
          mask_sensitive_by_default?: boolean
          org_id: string
          retention_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          demo_mode?: boolean
          locale?: string
          mask_sensitive_by_default?: boolean
          org_id?: string
          retention_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          done: boolean
          due_on: string | null
          id: string
          org_id: string
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          done?: boolean
          due_on?: string | null
          id?: string
          org_id: string
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          done?: boolean
          due_on?: string | null
          id?: string
          org_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      current_org_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin_rh" | "rh" | "manager" | "auditeur" | "collaborateur"
      integration_status:
        | "non_connecte"
        | "autorisation_requise"
        | "en_attente_autorisation"
        | "connecte_verifie"
        | "erreur"
      proposal_status: "en_attente" | "confirme" | "rejete"
      rule_status: "a_verifier" | "verifie" | "obsolete"
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
      app_role: ["admin_rh", "rh", "manager", "auditeur", "collaborateur"],
      integration_status: [
        "non_connecte",
        "autorisation_requise",
        "en_attente_autorisation",
        "connecte_verifie",
        "erreur",
      ],
      proposal_status: ["en_attente", "confirme", "rejete"],
      rule_status: ["a_verifier", "verifie", "obsolete"],
    },
  },
} as const
