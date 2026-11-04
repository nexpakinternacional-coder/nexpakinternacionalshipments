-- =============================================================================
-- Nexpak · Fase R1 · Migración: Coordenadas, ubicaciones y mapa
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. envios: estado/provincia + coordenadas de origen y destino
-- ---------------------------------------------------------------------------

ALTER TABLE public.envios
  ADD COLUMN IF NOT EXISTS remitente_estado   text,
  ADD COLUMN IF NOT EXISTS destinatario_estado text,
  ADD COLUMN IF NOT EXISTS origen_lat          double precision
    CONSTRAINT envios_origen_lat_rango  CHECK (origen_lat  BETWEEN -90  AND 90),
  ADD COLUMN IF NOT EXISTS origen_lng          double precision
    CONSTRAINT envios_origen_lng_rango  CHECK (origen_lng  BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS destino_lat         double precision
    CONSTRAINT envios_destino_lat_rango CHECK (destino_lat BETWEEN -90  AND 90),
  ADD COLUMN IF NOT EXISTS destino_lng         double precision
    CONSTRAINT envios_destino_lng_rango CHECK (destino_lng BETWEEN -180 AND 180);

-- ---------------------------------------------------------------------------
-- 2. eventos_envio: coordenadas del evento + etiqueta visible al cliente
-- ---------------------------------------------------------------------------

ALTER TABLE public.eventos_envio
  ADD COLUMN IF NOT EXISTS lat               double precision
    CONSTRAINT eventos_lat_rango CHECK (lat BETWEEN -90  AND 90),
  ADD COLUMN IF NOT EXISTS lng               double precision
    CONSTRAINT eventos_lng_rango CHECK (lng BETWEEN -180 AND 180),
  ADD COLUMN IF NOT EXISTS ubicacion_etiqueta text;  -- nombre limpio para el cliente

-- ---------------------------------------------------------------------------
-- 3. Tabla: ubicaciones (lugares guardados del equipo)
-- Sin DELETE (borrado lógico: columna activa).
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.ubicaciones (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  etiqueta     text         NOT NULL,
  ciudad       text,
  estado       text,
  pais         text,
  lat          double precision
    CONSTRAINT ubicaciones_lat_rango CHECK (lat BETWEEN -90  AND 90),
  lng          double precision
    CONSTRAINT ubicaciones_lng_rango CHECK (lng BETWEEN -180 AND 180),
  veces_usada  integer      NOT NULL DEFAULT 1,
  ultimo_uso   timestamptz  NOT NULL DEFAULT now(),
  activa       boolean      NOT NULL DEFAULT true,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  -- Sin duplicados por etiqueta normalizada (lower + trim)
  CONSTRAINT ubicaciones_etiqueta_unica UNIQUE (etiqueta)
);

CREATE INDEX IF NOT EXISTS idx_ubicaciones_veces ON public.ubicaciones(veces_usada DESC);
CREATE INDEX IF NOT EXISTS idx_ubicaciones_activa ON public.ubicaciones(activa);

-- RLS
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ubicaciones_select_staff" ON public.ubicaciones
  FOR SELECT TO authenticated USING (public.es_staff());

CREATE POLICY "ubicaciones_insert_staff" ON public.ubicaciones
  FOR INSERT TO authenticated WITH CHECK (public.es_staff());

CREATE POLICY "ubicaciones_update_staff" ON public.ubicaciones
  FOR UPDATE TO authenticated
  USING  (public.es_staff())
  WITH CHECK (public.es_staff());

-- Sin DELETE: borrado lógico con activa = false
REVOKE DELETE ON public.ubicaciones FROM anon, authenticated;

-- Barrera adicional: trigger que impide DELETE físico
CREATE OR REPLACE FUNCTION public.trigger_no_delete_ubicaciones()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Las ubicaciones no se eliminan físicamente. Usa activa = false.';
END;
$$;

CREATE TRIGGER tr_ubicaciones_no_delete
  BEFORE DELETE ON public.ubicaciones
  FOR EACH ROW EXECUTE FUNCTION public.trigger_no_delete_ubicaciones();

-- ---------------------------------------------------------------------------
-- 4. Trigger: al insertar un evento con coordenadas, upsert en ubicaciones
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trigger_upsert_ubicacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  etiqueta_norm text;
BEGIN
  -- Solo actuar si el evento tiene coordenadas y etiqueta
  IF NEW.lat IS NULL OR NEW.lng IS NULL OR NEW.ubicacion_etiqueta IS NULL THEN
    RETURN NEW;
  END IF;

  etiqueta_norm := trim(NEW.ubicacion_etiqueta);
  IF etiqueta_norm = '' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.ubicaciones (etiqueta, lat, lng, veces_usada, ultimo_uso)
  VALUES (etiqueta_norm, NEW.lat, NEW.lng, 1, now())
  ON CONFLICT (etiqueta) DO UPDATE
    SET veces_usada = public.ubicaciones.veces_usada + 1,
        ultimo_uso  = now(),
        lat         = EXCLUDED.lat,
        lng         = EXCLUDED.lng,
        activa      = true;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_eventos_upsert_ubicacion
  AFTER INSERT ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_upsert_ubicacion();

-- ---------------------------------------------------------------------------
-- 5. rastrear_envio: actualización con coordenadas y estados
--    - Eventos: lat, lng, ubicacion_etiqueta incluidos
--    - Origen y destino: lat/lng del envío
--    - Privacidad destino: redondea coords a 2 decimales (~1 km)
--    - Nunca devuelve coords de precisión para destino final
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
    e.remitente_estado,
    e.destinatario_ciudad,
    e.destinatario_pais,
    e.destinatario_estado,
    e.destinatario_nombre,
    e.origen_lat,
    e.origen_lng,
    -- Privacidad: destino redondeado a 2 decimales (~1 km de precisión)
    round(e.destino_lat::numeric, 2)::double precision AS destino_lat,
    round(e.destino_lng::numeric, 2)::double precision AS destino_lng
  INTO v_envio
  FROM public.envios e
  WHERE e.guia = guia_norm;

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
      'estado',             ev.estado,
      'ubicacion',          ev.ubicacion,
      'ubicacion_etiqueta', ev.ubicacion_etiqueta,
      'nota_publica',       ev.nota_publica,
      'ocurrido_en',        ev.ocurrido_en,
      'lat',                ev.lat,
      'lng',                ev.lng
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
    'origen_estado',          v_envio.remitente_estado,
    'origen_pais',            v_envio.remitente_pais,
    'origen_lat',             v_envio.origen_lat,
    'origen_lng',             v_envio.origen_lng,
    'destino_ciudad',         v_envio.destinatario_ciudad,
    'destino_estado',         v_envio.destinatario_estado,
    'destino_pais',           v_envio.destinatario_pais,
    'destino_lat',            v_envio.destino_lat,
    'destino_lng',            v_envio.destino_lng,
    'destinatario',           v_destinatario,
    'eventos',                COALESCE(v_eventos, '[]'::jsonb)
  );
END;
$$;
