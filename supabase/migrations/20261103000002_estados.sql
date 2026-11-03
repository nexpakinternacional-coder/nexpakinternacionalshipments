-- =============================================================================
-- Nexpak · Fase 5: Cambio de estados, edición de eventos y cambio masivo
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Validación de fecha: ocurrido_en no puede estar más de 5 min en el futuro
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_validar_ocurrido_en()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.ocurrido_en > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'La fecha del evento no puede estar más de 5 minutos en el futuro';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_eventos_validar_fecha
  BEFORE INSERT OR UPDATE OF ocurrido_en ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_validar_ocurrido_en();

-- ---------------------------------------------------------------------------
-- 2. RPC: registrar_evento_masivo
--    Transaccional: todo o nada. Ignora envíos inactivos.
--    Solo staff activo puede ejecutarla.
--    Devuelve { actualizados: int, omitidos: int }.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.registrar_evento_masivo(
  p_envio_ids    uuid[],
  p_estado       public.estado_envio,
  p_ubicacion    text,
  p_nota_publica text,
  p_nota_interna text,
  p_ocurrido_en  timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  envio_id_iter uuid;
  envio_activo  boolean;
  actualizados  integer := 0;
  omitidos      integer := 0;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Solo el personal activo puede registrar eventos masivos';
  END IF;

  IF p_ocurrido_en > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'La fecha del evento no puede estar más de 5 minutos en el futuro';
  END IF;

  FOREACH envio_id_iter IN ARRAY p_envio_ids LOOP
    SELECT activo INTO envio_activo
    FROM public.envios
    WHERE id = envio_id_iter;

    -- Omitir si no existe o está inactivo
    IF NOT FOUND OR NOT envio_activo THEN
      omitidos := omitidos + 1;
      CONTINUE;
    END IF;

    INSERT INTO public.eventos_envio
      (envio_id, estado, ubicacion, nota_publica, nota_interna, ocurrido_en, creado_por)
    VALUES (
      envio_id_iter,
      p_estado,
      NULLIF(trim(p_ubicacion),    ''),
      NULLIF(trim(p_nota_publica), ''),
      NULLIF(trim(p_nota_interna), ''),
      p_ocurrido_en,
      auth.uid()
    );

    actualizados := actualizados + 1;
  END LOOP;

  RETURN jsonb_build_object('actualizados', actualizados, 'omitidos', omitidos);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.registrar_evento_masivo(uuid[], public.estado_envio, text, text, text, timestamptz) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.registrar_evento_masivo(uuid[], public.estado_envio, text, text, text, timestamptz) TO authenticated;
