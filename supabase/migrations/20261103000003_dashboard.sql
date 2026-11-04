-- =============================================================================
-- Nexpak · Fase 6: RPC resumen_dashboard
-- =============================================================================
-- Devuelve en una sola llamada todos los datos que necesita el dashboard.
-- Solo staff activo puede ejecutarla.
-- UMBRAL_ESTANCADO: días sin movimiento para considerar un envío estancado.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.resumen_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_umbral_dias  CONSTANT int := 5;   -- ajustar aquí si se necesita otro umbral
  v_indicadores  jsonb;
  v_por_estado   jsonb;
  v_movimientos  jsonb;
  v_atencion     jsonb;
BEGIN
  IF NOT public.es_staff() THEN
    RAISE EXCEPTION 'Solo el personal activo puede ver el resumen del dashboard';
  END IF;

  -- ── Indicadores globales ────────────────────────────────────────────────────
  SELECT jsonb_build_object(
    'en_curso',               count(*) FILTER (
                                WHERE estado_actual NOT IN ('entregado','devuelto')
                              ),
    'transito_internacional', count(*) FILTER (
                                WHERE estado_actual = 'transito_internacional'
                              ),
    'en_aduana',              count(*) FILTER (
                                WHERE estado_actual IN ('en_aduana','retenido_aduana')
                              ),
    'con_excepcion',          count(*) FILTER (
                                WHERE estado_actual IN ('novedad','retenido_aduana','intento_fallido','devuelto')
                              ),
    'entregados_30d',         count(*) FILTER (
                                WHERE estado_actual = 'entregado'
                                  AND updated_at   >= now() - interval '30 days'
                              ),
    'creados_hoy',            count(*) FILTER (
                                WHERE created_at   >= date_trunc('day', now())
                              )
  )
  INTO v_indicadores
  FROM public.envios
  WHERE activo = true;

  -- ── Conteo por estado (solo activos) ────────────────────────────────────────
  SELECT COALESCE(
    jsonb_object_agg(estado_actual::text, conteo ORDER BY conteo DESC),
    '{}'::jsonb
  )
  INTO v_por_estado
  FROM (
    SELECT estado_actual, count(*) AS conteo
    FROM public.envios
    WHERE activo = true
    GROUP BY estado_actual
  ) s;

  -- ── Últimos 10 movimientos (eventos no anulados de envíos activos) ───────────
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'guia',        env.guia,
        'envio_id',    ev.envio_id,
        'estado',      ev.estado::text,
        'ubicacion',   ev.ubicacion,
        'ocurrido_en', ev.ocurrido_en,
        'creado_por',  COALESCE(p.nombre, 'Sistema')
      )
    ),
    '[]'::jsonb
  )
  INTO v_movimientos
  FROM (
    SELECT ev2.*
    FROM public.eventos_envio ev2
    JOIN public.envios env2 ON env2.id = ev2.envio_id AND env2.activo = true
    WHERE ev2.anulado = false
    ORDER BY ev2.created_at DESC
    LIMIT 10
  ) ev
  JOIN public.envios env ON env.id = ev.envio_id
  LEFT JOIN public.perfiles p ON p.id = ev.creado_por;

  -- ── Envíos que requieren atención ────────────────────────────────────────────
  -- Incluye: excepciones activas y envíos estancados (> umbral días sin movimiento)
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'guia',                e.guia,
        'id',                  e.id,
        'estado_actual',       e.estado_actual::text,
        'destinatario_nombre', e.destinatario_nombre,
        'motivo',              CASE
                                 WHEN e.estado_actual IN ('novedad','retenido_aduana','intento_fallido')
                                 THEN 'excepcion'
                                 ELSE 'estancado'
                               END,
        'dias_sin_movimiento', EXTRACT(DAY FROM now() - e.updated_at)::int
      )
      ORDER BY e.updated_at ASC
    ),
    '[]'::jsonb
  )
  INTO v_atencion
  FROM public.envios e
  WHERE e.activo = true
    AND e.estado_actual NOT IN ('entregado', 'devuelto')
    AND (
      e.estado_actual IN ('novedad', 'retenido_aduana', 'intento_fallido')
      OR e.updated_at < now() - (v_umbral_dias || ' days')::interval
    );

  RETURN jsonb_build_object(
    'indicadores',           v_indicadores,
    'por_estado',            v_por_estado,
    'ultimos_movimientos',   v_movimientos,
    'requieren_atencion',    v_atencion
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resumen_dashboard() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.resumen_dashboard() TO authenticated;
