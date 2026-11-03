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
      auditoria: {
        Row: {
          accion: string
          creado_en: string
          datos_antes: Json | null
          datos_despues: Json | null
          id: string
          registro_id: string
          tabla: string
          usuario_id: string | null
        }
        Insert: {
          accion: string
          creado_en?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          id?: string
          registro_id: string
          tabla: string
          usuario_id?: string | null
        }
        Update: {
          accion?: string
          creado_en?: string
          datos_antes?: Json | null
          datos_despues?: Json | null
          id?: string
          registro_id?: string
          tabla?: string
          usuario_id?: string | null
        }
        Relationships: []
      }
      envios: {
        Row: {
          activo: boolean
          alto_cm: number | null
          ancho_cm: number | null
          creado_por: string | null
          created_at: string
          descripcion_contenido: string | null
          destinatario_ciudad: string
          destinatario_direccion: string | null
          destinatario_documento: string | null
          destinatario_email: string | null
          destinatario_nombre: string
          destinatario_pais: string
          destinatario_telefono: string | null
          estado_actual: Database["public"]["Enums"]["estado_envio"]
          fecha_estimada_entrega: string | null
          guia: string
          id: string
          inactivado_en: string | null
          inactivado_por: string | null
          largo_cm: number | null
          moneda: string
          motivo_inactivacion: string | null
          peso_kg: number | null
          remitente_ciudad: string
          remitente_direccion: string | null
          remitente_email: string | null
          remitente_nombre: string
          remitente_pais: string
          remitente_telefono: string | null
          tipo_servicio: Database["public"]["Enums"]["tipo_servicio"]
          updated_at: string
          valor_declarado: number | null
        }
        Insert: {
          activo?: boolean
          alto_cm?: number | null
          ancho_cm?: number | null
          creado_por?: string | null
          created_at?: string
          descripcion_contenido?: string | null
          destinatario_ciudad: string
          destinatario_direccion?: string | null
          destinatario_documento?: string | null
          destinatario_email?: string | null
          destinatario_nombre: string
          destinatario_pais: string
          destinatario_telefono?: string | null
          estado_actual?: Database["public"]["Enums"]["estado_envio"]
          fecha_estimada_entrega?: string | null
          guia?: string
          id?: string
          inactivado_en?: string | null
          inactivado_por?: string | null
          largo_cm?: number | null
          moneda?: string
          motivo_inactivacion?: string | null
          peso_kg?: number | null
          remitente_ciudad: string
          remitente_direccion?: string | null
          remitente_email?: string | null
          remitente_nombre: string
          remitente_pais: string
          remitente_telefono?: string | null
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio"]
          updated_at?: string
          valor_declarado?: number | null
        }
        Update: {
          activo?: boolean
          alto_cm?: number | null
          ancho_cm?: number | null
          creado_por?: string | null
          created_at?: string
          descripcion_contenido?: string | null
          destinatario_ciudad?: string
          destinatario_direccion?: string | null
          destinatario_documento?: string | null
          destinatario_email?: string | null
          destinatario_nombre?: string
          destinatario_pais?: string
          destinatario_telefono?: string | null
          estado_actual?: Database["public"]["Enums"]["estado_envio"]
          fecha_estimada_entrega?: string | null
          guia?: string
          id?: string
          inactivado_en?: string | null
          inactivado_por?: string | null
          largo_cm?: number | null
          moneda?: string
          motivo_inactivacion?: string | null
          peso_kg?: number | null
          remitente_ciudad?: string
          remitente_direccion?: string | null
          remitente_email?: string | null
          remitente_nombre?: string
          remitente_pais?: string
          remitente_telefono?: string | null
          tipo_servicio?: Database["public"]["Enums"]["tipo_servicio"]
          updated_at?: string
          valor_declarado?: number | null
        }
        Relationships: []
      }
      eventos_envio: {
        Row: {
          anulado: boolean
          anulado_en: string | null
          anulado_por: string | null
          creado_por: string | null
          created_at: string
          envio_id: string
          estado: Database["public"]["Enums"]["estado_envio"]
          id: string
          motivo_anulacion: string | null
          nota_interna: string | null
          nota_publica: string | null
          ocurrido_en: string
          ubicacion: string | null
        }
        Insert: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          creado_por?: string | null
          created_at?: string
          envio_id: string
          estado: Database["public"]["Enums"]["estado_envio"]
          id?: string
          motivo_anulacion?: string | null
          nota_interna?: string | null
          nota_publica?: string | null
          ocurrido_en?: string
          ubicacion?: string | null
        }
        Update: {
          anulado?: boolean
          anulado_en?: string | null
          anulado_por?: string | null
          creado_por?: string | null
          created_at?: string
          envio_id?: string
          estado?: Database["public"]["Enums"]["estado_envio"]
          id?: string
          motivo_anulacion?: string | null
          nota_interna?: string | null
          nota_publica?: string | null
          ocurrido_en?: string
          ubicacion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "eventos_envio_envio_id_fkey"
            columns: ["envio_id"]
            isOneToOne: false
            referencedRelation: "envios"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          activo: boolean
          created_at: string
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          activo?: boolean
          created_at?: string
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          activo?: boolean
          created_at?: string
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      anular_evento: {
        Args: { p_evento_id: string; p_motivo: string }
        Returns: undefined
      }
      es_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      es_staff: { Args: Record<PropertyKey, never>; Returns: boolean }
      generar_guia: { Args: Record<PropertyKey, never>; Returns: string }
      inactivar_envio: {
        Args: { p_envio_id: string; p_motivo: string }
        Returns: undefined
      }
      rastrear_envio: { Args: { p_guia: string }; Returns: Json }
      reactivar_envio: {
        Args: { p_envio_id: string }
        Returns: undefined
      }
      registrar_evento_masivo: {
        Args: {
          p_envio_ids: string[]
          p_estado: Database["public"]["Enums"]["estado_envio"]
          p_ubicacion: string
          p_nota_publica: string
          p_nota_interna: string
          p_ocurrido_en: string
        }
        Returns: Json
      }
    }
    Enums: {
      estado_envio:
        | "guia_generada"
        | "recibido_origen"
        | "transito_internacional"
        | "en_aduana"
        | "liberado_aduana"
        | "centro_distribucion"
        | "en_reparto"
        | "entregado"
        | "novedad"
        | "retenido_aduana"
        | "intento_fallido"
        | "devuelto"
      rol_usuario: "admin" | "operador"
      tipo_servicio: "estandar" | "express"
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
      estado_envio: [
        "guia_generada",
        "recibido_origen",
        "transito_internacional",
        "en_aduana",
        "liberado_aduana",
        "centro_distribucion",
        "en_reparto",
        "entregado",
        "novedad",
        "retenido_aduana",
        "intento_fallido",
        "devuelto",
      ],
      rol_usuario: ["admin", "operador"],
      tipo_servicio: ["estandar", "express"],
    },
  },
} as const
