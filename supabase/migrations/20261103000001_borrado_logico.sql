-- =============================================================================
-- Nexpak · Fase 4f: Borrado lógico, auditoría y RPCs de inactivación
-- =============================================================================
-- REGLA PERMANENTE: ningún dato se elimina físicamente. Los registros se
-- inactivan (envíos/perfiles) o anulan (eventos). Esto aplica siempre.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Columnas de borrado lógico en envios
-- ---------------------------------------------------------------------------
ALTER TABLE public.envios
  ADD COLUMN activo               boolean      NOT NULL DEFAULT true,
  ADD COLUMN inactivado_en        timestamptz,
  ADD COLUMN inactivado_por       uuid         REFERENCES auth.users(id),
  ADD COLUMN motivo_inactivacion  text;

CREATE INDEX idx_envios_activo ON public.envios(activo);

-- ---------------------------------------------------------------------------
-- 2. Columnas de anulación en eventos_envio
-- ---------------------------------------------------------------------------
ALTER TABLE public.eventos_envio
  ADD COLUMN anulado          boolean      NOT NULL DEFAULT false,
  ADD COLUMN anulado_en       timestamptz,
  ADD COLUMN anulado_por      uuid         REFERENCES auth.users(id),
  ADD COLUMN motivo_anulacion text;

CREATE INDEX idx_eventos_anulado ON public.eventos_envio(anulado);

-- ---------------------------------------------------------------------------
-- 3. Tabla de auditoría (solo inserción; nadie edita ni borra filas)
-- ---------------------------------------------------------------------------
CREATE TABLE public.auditoria (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tabla         text        NOT NULL,
  registro_id   uuid        NOT NULL,
  accion        text        NOT NULL,
  datos_antes   jsonb,
  datos_despues jsonb,
  usuario_id    uuid        REFERENCES auth.users(id),
  creado_en     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT auditoria_accion_valida CHECK (
    accion IN ('INSERT', 'UPDATE', 'INACTIVAR', 'REACTIVAR', 'ANULAR')
  )
);

CREATE INDEX idx_auditoria_tabla_registro ON public.auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_creado_en      ON public.auditoria(creado_en DESC);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Solo admin puede leer; nadie puede insertar/actualizar/borrar directamente.
-- Los triggers (SECURITY DEFINER) pueden insertar por ser función privilegiada.
CREATE POLICY "auditoria_select_admin" ON public.auditoria
  FOR SELECT TO authenticated USING (public.es_admin());

-- ---------------------------------------------------------------------------
-- 4. Revocar DELETE en todas las tablas de negocio
-- ---------------------------------------------------------------------------
REVOKE DELETE ON public.envios         FROM authenticated, anon;
REVOKE DELETE ON public.eventos_envio  FROM authenticated, anon;
REVOKE DELETE ON public.perfiles       FROM authenticated, anon;

-- Eliminar políticas RLS de DELETE (ya no aplican)
DROP POLICY IF EXISTS "envios_delete_admin"   ON public.envios;
DROP POLICY IF EXISTS "eventos_delete_admin"  ON public.eventos_envio;
DROP POLICY IF EXISTS "perfiles_delete_admin" ON public.perfiles;

-- ---------------------------------------------------------------------------
-- 5. Trigger BEFORE DELETE: segunda barrera contra borrado físico
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_bloquear_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION
    'Los registros no se eliminan físicamente. Usa inactivar_envio() o anular_evento().';
END;
$$;

CREATE TRIGGER tr_envios_no_delete
  BEFORE DELETE ON public.envios
  FOR EACH ROW EXECUTE FUNCTION public.trigger_bloquear_delete();

CREATE TRIGGER tr_eventos_no_delete
  BEFORE DELETE ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_bloquear_delete();

CREATE TRIGGER tr_perfiles_no_delete
  BEFORE DELETE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_bloquear_delete();

-- ---------------------------------------------------------------------------
-- 6. Actualizar trigger_actualizar_estado para usar solo eventos no anulados
--    y dispararse también en UPDATE (para que anular_evento recalcule bien).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_actualizar_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  nuevo_estado    public.estado_envio;
  envio_id_target uuid;
BEGIN
  envio_id_target := NEW.envio_id;

  -- Estado actual = evento no anulado más reciente (por ocurrido_en, desempate por created_at)
  SELECT estado INTO nuevo_estado
  FROM public.eventos_envio
  WHERE envio_id = envio_id_target
    AND anulado   = false
  ORDER BY ocurrido_en DESC, created_at DESC
  LIMIT 1;

  UPDATE public.envios
  SET estado_actual = COALESCE(nuevo_estado, 'guia_generada'),
      updated_at    = now()
  WHERE id = envio_id_target;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_eventos_actualizar_estado ON public.eventos_envio;

-- Ahora dispara en INSERT y en UPDATE cuando cambian estado, ocurrido_en o anulado
CREATE TRIGGER tr_eventos_actualizar_estado
  AFTER INSERT OR UPDATE OF estado, ocurrido_en, anulado ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_actualizar_estado();

-- ---------------------------------------------------------------------------
-- 7. Actualizar trigger_broadcast_evento para dispararse también en UPDATE
-- ---------------------------------------------------------------------------
DROP TRIGGER IF EXISTS tr_eventos_broadcast ON public.eventos_envio;

CREATE TRIGGER tr_eventos_broadcast
  AFTER INSERT OR UPDATE ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_broadcast_evento();

-- ---------------------------------------------------------------------------
-- 8. Trigger de auditoría en envios, eventos y perfiles
--    La acción se puede sobreescribir por las RPCs usando set_config local.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_auditoria()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  accion_override text;
  accion_final    text;
BEGIN
  -- Las RPCs pueden fijar 'app.audit_action' para nombrar la acción (INACTIVAR, etc.)
  accion_override := NULLIF(current_setting('app.audit_action', true), '');

  IF TG_OP = 'INSERT' THEN
    accion_final := COALESCE(accion_override, 'INSERT');
    INSERT INTO public.auditoria
      (tabla, registro_id, accion, datos_antes, datos_despues, usuario_id)
    VALUES
      (TG_TABLE_NAME, NEW.id, accion_final, NULL, to_jsonb(NEW), auth.uid());

  ELSIF TG_OP = 'UPDATE' THEN
    accion_final := COALESCE(accion_override, 'UPDATE');
    INSERT INTO public.auditoria
      (tabla, registro_id, accion, datos_antes, datos_despues, usuario_id)
    VALUES
      (TG_TABLE_NAME, NEW.id, accion_final, to_jsonb(OLD), to_jsonb(NEW), auth.uid());
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER tr_envios_auditoria
  AFTER INSERT OR UPDATE ON public.envios
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

CREATE TRIGGER tr_eventos_auditoria
  AFTER INSERT OR UPDATE ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

CREATE TRIGGER tr_perfiles_auditoria
  AFTER INSERT OR UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.trigger_auditoria();

-- ---------------------------------------------------------------------------
-- 9. RPC: inactivar_envio(p_envio_id, p_motivo)
--    Solo admin. Motivo obligatorio.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inactivar_envio(
  p_envio_id uuid,
  p_motivo   text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden inactivar envíos';
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo de inactivación es obligatorio';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.envios WHERE id = p_envio_id) THEN
    RAISE EXCEPTION 'Envío no encontrado';
  END IF;

  PERFORM set_config('app.audit_action', 'INACTIVAR', true);

  UPDATE public.envios
  SET activo              = false,
      inactivado_en       = now(),
      inactivado_por      = auth.uid(),
      motivo_inactivacion = trim(p_motivo)
  WHERE id = p_envio_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.inactivar_envio(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.inactivar_envio(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 10. RPC: reactivar_envio(p_envio_id)
--     Solo admin.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reactivar_envio(p_envio_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden reactivar envíos';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.envios WHERE id = p_envio_id) THEN
    RAISE EXCEPTION 'Envío no encontrado';
  END IF;

  PERFORM set_config('app.audit_action', 'REACTIVAR', true);

  UPDATE public.envios
  SET activo              = true,
      inactivado_en       = NULL,
      inactivado_por      = NULL,
      motivo_inactivacion = NULL
  WHERE id = p_envio_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reactivar_envio(uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reactivar_envio(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 11. RPC: anular_evento(p_evento_id, p_motivo)
--     Solo admin. Motivo obligatorio. No se puede anular guia_generada.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.anular_evento(
  p_evento_id uuid,
  p_motivo    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado public.estado_envio;
BEGIN
  IF NOT public.es_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden anular eventos';
  END IF;

  IF p_motivo IS NULL OR trim(p_motivo) = '' THEN
    RAISE EXCEPTION 'El motivo de anulación es obligatorio';
  END IF;

  SELECT estado INTO v_estado
  FROM public.eventos_envio
  WHERE id = p_evento_id AND anulado = false;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Evento no encontrado o ya anulado';
  END IF;

  IF v_estado = 'guia_generada' THEN
    RAISE EXCEPTION 'No se puede anular el evento de guía generada';
  END IF;

  PERFORM set_config('app.audit_action', 'ANULAR', true);

  UPDATE public.eventos_envio
  SET anulado          = true,
      anulado_en       = now(),
      anulado_por      = auth.uid(),
      motivo_anulacion = trim(p_motivo)
  WHERE id = p_evento_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.anular_evento(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.anular_evento(uuid, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 12. Actualizar rastrear_envio: omite envíos inactivos y eventos anulados
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rastrear_envio(p_guia text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guia_norm      text;
  v_envio        record;
  v_eventos      jsonb;
  v_apellido     text;
  v_destinatario text;
BEGIN
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
  WHERE e.guia   = guia_norm
    AND e.activo = true;          -- envíos inactivos se tratan como no encontrados

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_apellido := left(trim(split_part(v_envio.destinatario_nombre, ' ', 2)), 1);
  IF v_apellido <> '' THEN
    v_destinatario := trim(split_part(v_envio.destinatario_nombre, ' ', 1))
                      || ' ' || v_apellido || '.';
  ELSE
    v_destinatario := trim(v_envio.destinatario_nombre);
  END IF;

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
  WHERE ev.envio_id = v_envio.id
    AND ev.anulado  = false;      -- eventos anulados no se muestran al cliente

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
