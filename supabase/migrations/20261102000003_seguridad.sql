-- =============================================================================
-- Nexpak · Fase 2 · Migración 3/3: RLS, políticas y RPC pública
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Activar Row Level Security en todas las tablas públicas
-- El rol anon no tiene ninguna política → acceso cero a tablas directamente.
-- ---------------------------------------------------------------------------
ALTER TABLE public.perfiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.envios         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos_envio  ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- Políticas: perfiles
--
-- anon       → sin acceso
-- staff      → puede ver todos los perfiles y editar el suyo propio
-- admin      → puede ver, editar cualquier perfil y eliminar
--
-- No hay política INSERT: los perfiles se crean únicamente vía trigger
-- on_auth_user_created (SECURITY DEFINER, omite RLS).
-- ---------------------------------------------------------------------------
CREATE POLICY "perfiles_select_staff" ON public.perfiles
  FOR SELECT
  TO authenticated
  USING (public.es_staff());

CREATE POLICY "perfiles_update" ON public.perfiles
  FOR UPDATE
  TO authenticated
  USING (
    (id = auth.uid() AND public.es_staff()) OR public.es_admin()
  )
  WITH CHECK (
    (id = auth.uid() AND public.es_staff()) OR public.es_admin()
  );

CREATE POLICY "perfiles_delete_admin" ON public.perfiles
  FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- ---------------------------------------------------------------------------
-- Políticas: envios
--
-- anon       → sin acceso directo (solo vía RPC rastrear_envio)
-- staff      → SELECT / INSERT / UPDATE
-- admin      → además puede DELETE
-- ---------------------------------------------------------------------------
CREATE POLICY "envios_select_staff" ON public.envios
  FOR SELECT
  TO authenticated
  USING (public.es_staff());

CREATE POLICY "envios_insert_staff" ON public.envios
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_staff());

CREATE POLICY "envios_update_staff" ON public.envios
  FOR UPDATE
  TO authenticated
  USING  (public.es_staff())
  WITH CHECK (public.es_staff());

CREATE POLICY "envios_delete_admin" ON public.envios
  FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- ---------------------------------------------------------------------------
-- Políticas: eventos_envio
-- Mismos permisos que envios.
-- Los triggers (SECURITY DEFINER) pueden insertar sin políticas adicionales.
-- ---------------------------------------------------------------------------
CREATE POLICY "eventos_select_staff" ON public.eventos_envio
  FOR SELECT
  TO authenticated
  USING (public.es_staff());

CREATE POLICY "eventos_insert_staff" ON public.eventos_envio
  FOR INSERT
  TO authenticated
  WITH CHECK (public.es_staff());

CREATE POLICY "eventos_update_staff" ON public.eventos_envio
  FOR UPDATE
  TO authenticated
  USING  (public.es_staff())
  WITH CHECK (public.es_staff());

CREATE POLICY "eventos_delete_admin" ON public.eventos_envio
  FOR DELETE
  TO authenticated
  USING (public.es_admin());

-- ---------------------------------------------------------------------------
-- RPC pública: rastrear_envio(p_guia text)
--
-- SECURITY DEFINER → puede leer tablas aunque anon no tenga acceso directo.
-- Normaliza la guía: mayúsculas, elimina espacios y guiones.
-- Devuelve JSONB con los campos permitidos (nunca teléfonos, emails,
-- documentos, direcciones, valor declarado ni notas internas).
-- El nombre del destinatario se enmascara: "Juan P."
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rastrear_envio(p_guia text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guia_norm     text;
  v_envio       record;
  v_eventos     jsonb;
  v_apellido    text;
  v_destinatario text;
BEGIN
  -- Normalizar entrada: mayúsculas, sin espacios ni guiones
  guia_norm := upper(replace(replace(p_guia, '-', ''), ' ', ''));

  SELECT
    e.id,
    e.guia,
    e.estado_actual,
    e.tipo_servicio,
    e.fecha_estimada_entrega,
    e.remitente_ciudad,
    e.remitente_pais,
    e.destinatario_ciudad,
    e.destinatario_pais,
    e.destinatario_nombre
  INTO v_envio
  FROM public.envios e
  WHERE e.guia = guia_norm;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Enmascarar nombre del destinatario: "Juan P."
  -- Si solo hay un nombre (sin apellido), se devuelve tal cual.
  v_apellido := left(trim(split_part(v_envio.destinatario_nombre, ' ', 2)), 1);
  IF v_apellido <> '' THEN
    v_destinatario := trim(split_part(v_envio.destinatario_nombre, ' ', 1))
                      || ' ' || v_apellido || '.';
  ELSE
    v_destinatario := trim(v_envio.destinatario_nombre);
  END IF;

  -- Recopilar eventos: solo campos públicos, sin nota_interna
  SELECT jsonb_agg(
    jsonb_build_object(
      'estado',       ev.estado,
      'ubicacion',    ev.ubicacion,
      'nota_publica', ev.nota_publica,
      'ocurrido_en',  ev.ocurrido_en
    ) ORDER BY ev.ocurrido_en ASC
  )
  INTO v_eventos
  FROM public.eventos_envio ev
  WHERE ev.envio_id = v_envio.id;

  RETURN jsonb_build_object(
    'guia',                   v_envio.guia,
    'estado_actual',          v_envio.estado_actual,
    'tipo_servicio',          v_envio.tipo_servicio,
    'fecha_estimada_entrega', v_envio.fecha_estimada_entrega,
    'origen_ciudad',          v_envio.remitente_ciudad,
    'origen_pais',            v_envio.remitente_pais,
    'destino_ciudad',         v_envio.destinatario_ciudad,
    'destino_pais',           v_envio.destinatario_pais,
    'destinatario',           v_destinatario,
    'eventos',                COALESCE(v_eventos, '[]'::jsonb)
  );
END;
$$;

-- Controlar acceso a la función explícitamente
REVOKE EXECUTE ON FUNCTION public.rastrear_envio(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.rastrear_envio(text) TO anon;
GRANT  EXECUTE ON FUNCTION public.rastrear_envio(text) TO authenticated;
