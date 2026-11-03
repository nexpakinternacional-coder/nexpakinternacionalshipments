-- =============================================================================
-- Nexpak · Fase 2 · Migración 1/3: Tipos enumerados y tablas
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE public.rol_usuario AS ENUM ('admin', 'operador');
CREATE TYPE public.tipo_servicio AS ENUM ('estandar', 'express');

CREATE TYPE public.estado_envio AS ENUM (
  -- Flujo normal (en orden cronológico)
  'guia_generada',
  'recibido_origen',
  'transito_internacional',
  'en_aduana',
  'liberado_aduana',
  'centro_distribucion',
  'en_reparto',
  'entregado',
  -- Estados de excepción
  'novedad',
  'retenido_aduana',
  'intento_fallido',
  'devuelto'
);

-- ---------------------------------------------------------------------------
-- Tabla: perfiles
-- Extiende auth.users con el rol y estado del staff (admin / operador).
-- Se crea automáticamente vía trigger cuando se añade un usuario en auth.users.
-- ---------------------------------------------------------------------------
CREATE TABLE public.perfiles (
  id         uuid                NOT NULL PRIMARY KEY
                                 REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre     text                NOT NULL,
  rol        public.rol_usuario  NOT NULL DEFAULT 'operador',
  activo     boolean             NOT NULL DEFAULT true,
  created_at timestamptz         NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Tabla: envios
-- El campo `guia` recibe su DEFAULT (generar_guia()) en la migración 2,
-- después de definir la función. Aquí se declara NOT NULL sin DEFAULT.
-- ---------------------------------------------------------------------------
CREATE TABLE public.envios (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guia text UNIQUE NOT NULL,

  -- Remitente
  remitente_nombre    text        NOT NULL,
  remitente_telefono  text,
  remitente_email     text,
  remitente_direccion text,
  remitente_pais      text        NOT NULL,
  remitente_ciudad    text        NOT NULL,

  -- Destinatario
  destinatario_nombre    text     NOT NULL,
  destinatario_telefono  text,
  destinatario_email     text,
  destinatario_direccion text,
  destinatario_pais      text     NOT NULL,
  destinatario_ciudad    text     NOT NULL,
  destinatario_documento text,

  -- Paquete
  descripcion_contenido  text,
  peso_kg                numeric(8, 3),
  largo_cm               numeric(8, 2),
  ancho_cm               numeric(8, 2),
  alto_cm                numeric(8, 2),
  valor_declarado        numeric(12, 2),
  moneda                 text                 NOT NULL DEFAULT 'USD',
  tipo_servicio          public.tipo_servicio NOT NULL DEFAULT 'estandar',

  -- Seguimiento
  estado_actual          public.estado_envio  NOT NULL DEFAULT 'guia_generada',
  fecha_estimada_entrega date,

  -- Auditoría
  creado_por uuid        REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Tabla: eventos_envio
-- Historial inmutable de estados. Un trigger actualiza envios.estado_actual
-- con cada INSERT y emite un Broadcast de Realtime.
-- ---------------------------------------------------------------------------
CREATE TABLE public.eventos_envio (
  id           uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  envio_id     uuid                 NOT NULL REFERENCES public.envios(id) ON DELETE CASCADE,
  estado       public.estado_envio  NOT NULL,
  ubicacion    text,
  nota_publica text,
  nota_interna text,
  ocurrido_en  timestamptz          NOT NULL DEFAULT now(),
  creado_por   uuid                 REFERENCES auth.users(id),
  created_at   timestamptz          NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
CREATE INDEX idx_envios_guia           ON public.envios(guia);
CREATE INDEX idx_envios_estado_actual  ON public.envios(estado_actual);
CREATE INDEX idx_envios_created_at     ON public.envios(created_at DESC);
CREATE INDEX idx_eventos_envio_id      ON public.eventos_envio(envio_id);
