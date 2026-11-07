-- =============================================================================
-- Nexpak · Fase R3-P4: tabla configuracion_sitio y RPC configuracion_publica
-- =============================================================================
-- Tabla de una sola fila (id = 1) con los datos de negocio editables desde
-- el panel admin. Se conecta al trigger de auditoría existente.
-- RPC configuracion_publica() devuelve solo campos públicos para anon.
-- =============================================================================

-- ── Tabla ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.configuracion_sitio (
  id              smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),

  -- Contacto
  whatsapp        text          DEFAULT '' CHECK (
                                  whatsapp = '' OR (
                                    whatsapp ~ '^[0-9]+$'
                                    AND char_length(whatsapp) BETWEEN 8 AND 15
                                  )
                                ),
  telefono        text          DEFAULT '',
  correo          text          DEFAULT '' CHECK (
                                  correo = '' OR correo ~* '^[^@]+@[^@]+\.[^@]+$'
                                ),
  direccion       text          DEFAULT '',
  ciudad          text          DEFAULT '',
  horario_atencion text         DEFAULT '',

  -- Precios
  moneda          text          DEFAULT 'USD' NOT NULL,
  unidad_peso     text          DEFAULT 'lb'  NOT NULL CHECK (unidad_peso IN ('lb', 'kg')),
  precio_desde_estandar  numeric(10,2) DEFAULT NULL CHECK (precio_desde_estandar IS NULL OR precio_desde_estandar >= 0),
  precio_desde_express   numeric(10,2) DEFAULT NULL CHECK (precio_desde_express   IS NULL OR precio_desde_express   >= 0),

  -- Tiempos por corredor (en días hábiles, opcionales)
  tiempos         jsonb         DEFAULT '{}'::jsonb,
  -- Estructura esperada (todos los campos son opcionales):
  -- {
  --   "usca":   {"estandar_min": 5, "estandar_max": 7, "express_min": 2, "express_max": 3},
  --   "mxus":   {"estandar_min": 7, "estandar_max": 10, "express_min": 3, "express_max": 5},
  --   "estados":{"estandar_min": 3, "estandar_max": 5,  "express_min": 1, "express_max": 2}
  -- }

  -- Legal
  razon_social    text          DEFAULT '',
  nit             text          DEFAULT '',

  -- Auditoría
  actualizado_por uuid          REFERENCES public.perfiles(id) ON DELETE SET NULL,
  updated_at      timestamptz   DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.configuracion_sitio IS
  'Tabla de una sola fila con los datos de negocio editables desde el panel admin.';

-- ── Fila inicial ──────────────────────────────────────────────────────────────

INSERT INTO public.configuracion_sitio (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- ── Trigger updated_at ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trg_configuracion_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_configuracion_updated_at ON public.configuracion_sitio;
CREATE TRIGGER set_configuracion_updated_at
  BEFORE UPDATE ON public.configuracion_sitio
  FOR EACH ROW EXECUTE FUNCTION public.trg_configuracion_updated_at();

-- ── Borrado lógico: nadie puede eliminar ──────────────────────────────────────

REVOKE DELETE ON public.configuracion_sitio FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.trg_no_borrar_configuracion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'La configuración del sitio no puede eliminarse';
END;
$$;

DROP TRIGGER IF EXISTS bloquear_delete_configuracion ON public.configuracion_sitio;
CREATE TRIGGER bloquear_delete_configuracion
  BEFORE DELETE ON public.configuracion_sitio
  FOR EACH ROW EXECUTE FUNCTION public.trg_no_borrar_configuracion();

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE public.configuracion_sitio ENABLE ROW LEVEL SECURITY;

-- Lectura: staff activo
CREATE POLICY "staff puede leer configuracion"
  ON public.configuracion_sitio FOR SELECT
  TO authenticated
  USING (public.es_staff());

-- Escritura: solo admin activo
CREATE POLICY "solo admin puede actualizar configuracion"
  ON public.configuracion_sitio FOR UPDATE
  TO authenticated
  USING  (public.es_admin())
  WITH CHECK (public.es_admin());

-- Nadie puede insertar filas adicionales (la única fila es id=1 creada en la migración)
CREATE POLICY "nadie puede insertar configuracion"
  ON public.configuracion_sitio FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- ── Función de apoyo es_admin() (si no existe ya) ────────────────────────────

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id = auth.uid()
      AND rol = 'admin'
      AND activo = true
  );
$$;

-- ── RPC pública ───────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.configuracion_publica()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cfg public.configuracion_sitio;
BEGIN
  SELECT * INTO v_cfg FROM public.configuracion_sitio WHERE id = 1;

  RETURN jsonb_build_object(
    'whatsapp',              v_cfg.whatsapp,
    'telefono',              v_cfg.telefono,
    'correo',                v_cfg.correo,
    'direccion',             v_cfg.direccion,
    'ciudad',                v_cfg.ciudad,
    'horario_atencion',      v_cfg.horario_atencion,
    'moneda',                v_cfg.moneda,
    'unidad_peso',           v_cfg.unidad_peso,
    'precio_desde_estandar', v_cfg.precio_desde_estandar,
    'precio_desde_express',  v_cfg.precio_desde_express,
    'tiempos',               v_cfg.tiempos,
    'razon_social',          v_cfg.razon_social,
    'nit',                   v_cfg.nit
    -- actualizado_por NO se expone
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.configuracion_publica() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.configuracion_publica() TO anon, authenticated;
