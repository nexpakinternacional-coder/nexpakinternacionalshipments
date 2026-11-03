-- =============================================================================
-- Nexpak · Fase 2 · Migración 2/3: Funciones de lógica y triggers
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Funciones auxiliares de autorización
-- Usadas en las políticas RLS (migración 3).
-- SECURITY DEFINER evita recursión: las políticas de perfiles NO se aplican
-- cuando estas funciones consultan la tabla perfiles.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.es_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id     = auth.uid()
      AND activo = true
  );
$$;

CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.perfiles
    WHERE id     = auth.uid()
      AND rol    = 'admin'
      AND activo = true
  );
$$;

-- ---------------------------------------------------------------------------
-- Función: generar_guia()
--
-- Genera una guía con el formato NXP + 6 chars aleatorios + 1 verificador,
-- usando el mismo algoritmo que src/lib/guia.ts (calcularVerificador).
--
-- Algoritmo:
--   ALFABETO = 'ABCDEFGHJKMNPQRTUVWXYZ2346789'  (29 chars, excluye 0 O 1 I L 5 S)
--   Verificador = ALFABETO[ (Σ i × pos_0based(char_i)) mod 29 ]
--   donde i ∈ {1..6} y pos_0based es el índice 0-based del carácter en el alfabeto.
--
-- Equivalencia con TypeScript demostrada con el ejemplo 'ABCDEF':
--   pos(A)=0, pos(B)=1, pos(C)=2, pos(D)=3, pos(E)=4, pos(F)=5
--   suma = 1×0 + 2×1 + 3×2 + 4×3 + 5×4 + 6×5 = 70
--   70 mod 29 = 12
--   ALFABETO[12] = 'P'  →  guía válida: NXPABCDEFP
--
-- Verificación SQL (pegar en SQL Editor para confirmar):
--   SELECT substr('ABCDEFGHJKMNPQRTUVWXYZ2346789', 13, 1);
--   -- debe devolver 'P'  (SQL usa índice base 1: posición 13 = índice 0-based 12)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generar_guia()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alfabeto       CONSTANT text    := 'ABCDEFGHJKMNPQRTUVWXYZ2346789';
  prefijo        CONSTANT text    := 'NXP';
  chars6         text;
  suma           integer;
  verificador    text;
  guia_candidata text;
  intentos       integer := 0;
BEGIN
  LOOP
    intentos := intentos + 1;
    IF intentos > 20 THEN
      RAISE EXCEPTION 'generar_guia: no se encontró guía única en 20 intentos';
    END IF;

    -- 6 caracteres aleatorios del alfabeto (29 posibles, índice 1-based 1..29)
    chars6 := '';
    FOR i IN 1..6 LOOP
      chars6 := chars6 || substr(alfabeto, 1 + floor(random() * 29)::int, 1);
    END LOOP;

    -- Dígito verificador: misma lógica que calcularVerificador en guia.ts
    --   strpos devuelve posición base 1; restamos 1 para obtener índice 0-based
    suma := 0;
    FOR i IN 1..6 LOOP
      suma := suma + i * (strpos(alfabeto, substr(chars6, i, 1)) - 1);
    END LOOP;
    verificador := substr(alfabeto, (suma % 29) + 1, 1);

    guia_candidata := prefijo || chars6 || verificador;

    -- Verificar unicidad; reintentar si hay colisión (UNIQUE constraint en envios.guia)
    IF NOT EXISTS (SELECT 1 FROM public.envios WHERE guia = guia_candidata) THEN
      RETURN guia_candidata;
    END IF;
  END LOOP;
END;
$$;

-- Asignar como DEFAULT de envios.guia (ahora que la función existe)
ALTER TABLE public.envios ALTER COLUMN guia SET DEFAULT public.generar_guia();

-- ---------------------------------------------------------------------------
-- Trigger 1: updated_at automático en envios
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_envios_updated_at
  BEFORE UPDATE ON public.envios
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ---------------------------------------------------------------------------
-- Trigger 2: al crear un envío, insertar el evento inicial 'guia_generada'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_evento_inicial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.eventos_envio (envio_id, estado, creado_por)
  VALUES (NEW.id, 'guia_generada', NEW.creado_por);
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_envios_evento_inicial
  AFTER INSERT ON public.envios
  FOR EACH ROW EXECUTE FUNCTION public.trigger_evento_inicial();

-- ---------------------------------------------------------------------------
-- Trigger 3: al insertar un evento, actualizar envios.estado_actual
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_actualizar_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.envios
  SET estado_actual = NEW.estado,
      updated_at    = now()
  WHERE id = NEW.envio_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_eventos_actualizar_estado
  AFTER INSERT ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_actualizar_estado();

-- ---------------------------------------------------------------------------
-- Trigger 4: al insertar un evento, emitir Broadcast de Supabase Realtime
--
-- Canal:   'envio:<GUIA>'   (ej. 'envio:NXPABCDEFP')
-- Evento:  'estado'
-- Payload: {"actualizado": true}
-- private: false  →  accesible sin autenticación; anon puede suscribirse
--
-- API: realtime.send(payload, event, topic, private) — disponible desde Supabase feb 2024
-- Referencia: https://supabase.com/docs/guides/realtime/broadcast
--
-- El bloque EXCEPTION hace que el broadcast sea no-fatal:
-- si la función no está disponible, la transacción igualmente se confirma
-- y el frontend usará el polling de 60s como fallback.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_broadcast_evento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  guia_envio text;
BEGIN
  SELECT guia INTO guia_envio
  FROM public.envios
  WHERE id = NEW.envio_id;

  BEGIN
    PERFORM realtime.send(
      payload => jsonb_build_object('actualizado', true),
      event   => 'estado',
      topic   => 'envio:' || guia_envio,
      private => false
    );
  EXCEPTION
    WHEN undefined_function THEN NULL;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_eventos_broadcast
  AFTER INSERT ON public.eventos_envio
  FOR EACH ROW EXECUTE FUNCTION public.trigger_broadcast_evento();

-- ---------------------------------------------------------------------------
-- Trigger 5: al crear un usuario en auth.users, crear su fila en perfiles
-- El nombre se toma de raw_user_meta_data->>'nombre', o del email como fallback.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_crear_perfil()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, rol, activo)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(trim(NEW.raw_user_meta_data->>'nombre'), ''),
      split_part(NEW.email, '@', 1),
      'Sin nombre'
    ),
    'operador',
    true
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.trigger_crear_perfil();
