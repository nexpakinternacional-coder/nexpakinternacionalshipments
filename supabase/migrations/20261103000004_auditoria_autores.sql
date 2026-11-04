-- =============================================================================
-- Nexpak · Fase 6b: Autoría correcta en eventos y envíos
-- =============================================================================
-- PROBLEMA: creado_por quedaba NULL porque la columna no tenía DEFAULT y el
-- frontend no siempre lo enviaba.  Los eventos aparecían como "Sistema".
--
-- SOLUCIÓN:
--   1. DEFAULT auth.uid() en envios.creado_por y eventos_envio.creado_por.
--   2. Trigger BEFORE INSERT que fuerza creado_por = auth.uid() cuando hay
--      sesión, impidiendo suplantación de autor.
--   3. Columnas editado_por / editado_en en eventos_envio.
--   4. Trigger BEFORE UPDATE (solo en columnas de contenido) que registra quién
--      y cuándo se editó el evento.
--
-- NOTA SOBRE DATOS EXISTENTES:
--   Los registros anteriores con creado_por = NULL quedan como están.
--   En el dashboard se muestran como "Sistema" (correcto: fueron generados
--   antes de esta corrección). No se tocan.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. DEFAULT auth.uid() en las dos tablas de negocio
-- ---------------------------------------------------------------------------
ALTER TABLE public.envios
  ALTER COLUMN creado_por SET DEFAULT auth.uid();

ALTER TABLE public.eventos_envio
  ALTER COLUMN creado_por SET DEFAULT auth.uid();

-- ---------------------------------------------------------------------------
-- 2. Trigger BEFORE INSERT: fuerza creado_por = auth.uid() cuando hay sesión
--    De esta forma, aunque el frontend envíe un valor diferente, se sobreescribe.
--    Los triggers SECURITY DEFINER (como trigger_evento_inicial) llaman
--    auth.uid() dentro del contexto de sesión del usuario, así que también
--    heredan el autor correcto.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_forzar_creado_por()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    NEW.creado_por := auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_envios_forzar_autor
  BEFORE INSERT ON public.envios
  FOR EACH ROW EXECUTE FUNCTION public.trigger_forzar_creado_por();

CREATE TRIGGER tr_eventos_forzar_autor
  BEFORE INSERT ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_forzar_creado_por();

-- ---------------------------------------------------------------------------
-- 3. Columnas de edición en eventos_envio
-- ---------------------------------------------------------------------------
ALTER TABLE public.eventos_envio
  ADD COLUMN editado_por uuid        REFERENCES auth.users(id),
  ADD COLUMN editado_en  timestamptz;

-- ---------------------------------------------------------------------------
-- 4. Trigger BEFORE UPDATE: registra autor y fecha de la última edición
--    Solo dispara cuando se tocan las columnas de contenido del evento,
--    para no interferir con las actualizaciones de anulación (anulado_*).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_registro_edicion_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.editado_por := auth.uid();
  NEW.editado_en  := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_eventos_registro_edicion
  BEFORE UPDATE OF estado, ubicacion, nota_publica, nota_interna, ocurrido_en
  ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_registro_edicion_evento();

-- ---------------------------------------------------------------------------
-- 5. VERIFICACIÓN: comentario con la prueba SQL recomendada
--
-- Para verificar que un evento insertado por un usuario autenticado queda
-- con creado_por correcto, ejecuta en el SQL Editor con la sesión del usuario:
--
--   BEGIN;
--   INSERT INTO public.eventos_envio (envio_id, estado)
--   VALUES ('<uuid-de-un-envio-activo>', 'en_reparto');
--   SELECT creado_por, auth.uid(),
--          (creado_por = auth.uid()) AS autor_correcto
--   FROM public.eventos_envio
--   ORDER BY created_at DESC
--   LIMIT 1;
--   ROLLBACK;
--
-- El resultado debe mostrar autor_correcto = true.
-- Los eventos anteriores con creado_por IS NULL son "pre-corrección" y
-- se muestran correctamente como "Sistema" en el dashboard.
-- ---------------------------------------------------------------------------
