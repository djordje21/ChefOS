
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "audit_log": {
                  Row: {
                    "action": string,"actor_user_id": string | null,"after": Json | null,"at": string,"before": Json | null,"entity": string,"entity_id": string | null,"id": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_user_id"?: string | null,"after"?: Json | null,"at"?: string,"before"?: Json | null,"entity": string,"entity_id"?: string | null,"id"?: never,"workspace_id": string
                  }
                  Update: {
                    "action"?: string,"actor_user_id"?: string | null,"after"?: Json | null,"at"?: string,"before"?: Json | null,"entity"?: string,"entity_id"?: string | null,"id"?: never,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "audit_log_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"invitations": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"all_outlets": boolean,"created_at": string,"email": string,"expires_at": string,"id": string,"invited_by": string,"outlet_grants": NonNullable<Json>,"revoked_at": string | null,"revoked_reason": string | null,"role_id": string,"role_level": string,"token_hash": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"all_outlets"?: boolean,"created_at"?: string,"email": string,"expires_at": string,"id"?: string,"invited_by": string,"outlet_grants"?: NonNullable<Json>,"revoked_at"?: string | null,"revoked_reason"?: string | null,"role_id": string,"role_level"?: string,"token_hash": string,"workspace_id": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"all_outlets"?: boolean,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"invited_by"?: string,"outlet_grants"?: NonNullable<Json>,"revoked_at"?: string | null,"revoked_reason"?: string | null,"role_id"?: string,"role_level"?: string,"token_hash"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invitations_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invitations_workspace_id_role_level_role_id_fkey"
      columns: ["workspace_id","role_level","role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["workspace_id","level","id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "all_outlets": boolean,"created_at": string,"role_id": string,"role_level": string,"status": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "all_outlets"?: boolean,"created_at"?: string,"role_id": string,"role_level"?: string,"status"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "all_outlets"?: boolean,"created_at"?: string,"role_id"?: string,"role_level"?: string,"status"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_workspace_id_role_level_role_id_fkey"
      columns: ["workspace_id","role_level","role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["workspace_id","level","id"]
    }
                  ]
                },"outlet_memberships": {
                  Row: {
                    "created_at": string,"outlet_id": string,"role_id": string,"role_level": string,"user_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"outlet_id": string,"role_id": string,"role_level"?: string,"user_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"outlet_id"?: string,"role_id"?: string,"role_level"?: string,"user_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "outlet_memberships_workspace_id_outlet_id_fkey"
      columns: ["workspace_id","outlet_id"]
isOneToOne: false
      referencedRelation: "outlets"
      referencedColumns: ["workspace_id","id"]
    },{
      foreignKeyName: "outlet_memberships_workspace_id_role_level_role_id_fkey"
      columns: ["workspace_id","role_level","role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["workspace_id","level","id"]
    },{
      foreignKeyName: "outlet_memberships_workspace_id_user_id_fkey"
      columns: ["workspace_id","user_id"]
isOneToOne: false
      referencedRelation: "memberships"
      referencedColumns: ["workspace_id","user_id"]
    }
                  ]
                },"outlets": {
                  Row: {
                    "active": boolean,"created_at": string,"id": string,"name": string,"type": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name": string,"type"?: string,"workspace_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"id"?: string,"name"?: string,"type"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "outlets_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"plans": {
                  Row: {
                    "code": string,"features": NonNullable<Json>,"id": string,"is_default": boolean,"limits": NonNullable<Json>,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"features"?: NonNullable<Json>,"id"?: string,"is_default"?: boolean,"limits": NonNullable<Json>,"name": string
                  }
                  Update: {
                    "code"?: string,"features"?: NonNullable<Json>,"id"?: string,"is_default"?: boolean,"limits"?: NonNullable<Json>,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"full_name": string,"id": string,"ui_language": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"full_name"?: string,"id": string,"ui_language"?: string
                  }
                  Update: {
                    "created_at"?: string,"full_name"?: string,"id"?: string,"ui_language"?: string
                  }
                  Relationships: [
                    
                  ]
                },"role_permissions": {
                  Row: {
                    "permission_code": string,"role_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "permission_code": string,"role_id": string,"workspace_id": string
                  }
                  Update: {
                    "permission_code"?: string,"role_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "role_permissions_permission_code_fkey"
      columns: ["permission_code"]
isOneToOne: false
      referencedRelation: "sys_permissions"
      referencedColumns: ["code"]
    },{
      foreignKeyName: "role_permissions_workspace_id_role_id_fkey"
      columns: ["workspace_id","role_id"]
isOneToOne: false
      referencedRelation: "roles"
      referencedColumns: ["workspace_id","id"]
    }
                  ]
                },"roles": {
                  Row: {
                    "id": string,"is_system": boolean,"key": string | null,"level": string,"name": string,"sort_order": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"is_system"?: boolean,"key"?: string | null,"level": string,"name": string,"sort_order"?: number,"workspace_id": string
                  }
                  Update: {
                    "id"?: string,"is_system"?: boolean,"key"?: string | null,"level"?: string,"name"?: string,"sort_order"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "roles_workspace_id_fkey"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"sys_permissions": {
                  Row: {
                    "code": string,"description": string,"level": string
                  }
                  ComputedFields: never
                  Insert: {
                    "code": string,"description": string,"level": string
                  }
                  Update: {
                    "code"?: string,"description"?: string,"level"?: string
                  }
                  Relationships: [
                    
                  ]
                },"workspaces": {
                  Row: {
                    "base_currency": string,"created_at": string,"created_by": string,"id": string,"kind": string,"locale": string,"name": string,"plan_id": string,"status": string,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "base_currency": string,"created_at"?: string,"created_by": string,"id"?: string,"kind"?: string,"locale"?: string,"name": string,"plan_id": string,"status"?: string,"timezone"?: string
                  }
                  Update: {
                    "base_currency"?: string,"created_at"?: string,"created_by"?: string,"id"?: string,"kind"?: string,"locale"?: string,"name"?: string,"plan_id"?: string,"status"?: string,"timezone"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_plan_id_fkey"
      columns: ["plan_id"]
isOneToOne: false
      referencedRelation: "plans"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invitation":
{ Args: { "p_token": string }; Returns: string
                           },
"create_invitation":
{ Args: { "p_all_outlets"?: boolean,"p_email": string,"p_outlet_grants"?: Json,"p_role_id": string,"p_valid_days"?: number,"p_workspace_id": string }; Returns: {
              "invitation_id": string,"token": string
            }[]
                           },
"create_workspace":
{ Args: { "p_base_currency": string,"p_locale"?: string,"p_name": string,"p_timezone"?: string }; Returns: string
                           },
"get_invitation":
{ Args: { "p_token": string }; Returns: {
              "email": string,"expires_at": string,"invited_by_name": string,"role_name": string,"state": string,"workspace_name": string
            }[]
                           },
"list_members":
{ Args: { "p_workspace_id": string }; Returns: {
              "all_outlets": boolean,"email": string,"full_name": string,"joined_at": string,"outlet_access": Json,"role_id": string,"role_key": string,"role_name": string,"status": string,"user_id": string
            }[]
                           },
"my_permissions":
{ Args: { "p_workspace_id": string }; Returns: Json
                           },
"my_workspaces":
{ Args: Record<PropertyKey, never>; Returns: {
              "all_outlets": boolean,"base_currency": string,"kind": string,"name": string,"role_key": string,"role_name": string,"workspace_id": string
            }[]
                           },
"remove_member":
{ Args: { "p_user_id": string,"p_workspace_id": string }; Returns: undefined
                           },
"revoke_invitation":
{ Args: { "p_invitation_id": string }; Returns: undefined
                           },
"set_outlet_access":
{ Args: { "p_outlet_id": string,"p_role_id": string,"p_user_id": string,"p_workspace_id": string }; Returns: undefined
                           },
"update_member":
{ Args: { "p_all_outlets": boolean,"p_role_id": string,"p_user_id": string,"p_workspace_id": string }; Returns: undefined
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
  "public": {
          Enums: {
            
          }
        }
} as const
