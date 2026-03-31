-- =============================================================================
-- SISJPUSAP — Esquema inicial para Supabase / PostgreSQL
-- Proyecto: sis-jpusap  |  Migración desde Firebase Realtime Database
-- Generado: 2026-03-27
-- =============================================================================
-- Instrucciones: pegar completo en el SQL Editor de Supabase y ejecutar.
-- =============================================================================


-- =============================================================================
-- 0. EXTENSIONES
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Permisos de módulo (mismo modelo que Firebase)
CREATE TYPE permission_level AS ENUM ('none', 'read', 'write', 'approve', 'admin');

-- Datos personales
CREATE TYPE genero_tipo        AS ENUM ('masculino', 'femenino');
CREATE TYPE estado_vivienda    AS ENUM ('construida', 'construccion', 'terreno');

-- Cobranzas
CREATE TYPE estado_charge      AS ENUM ('pendiente', 'pagado', 'moroso', 'anulado');
CREATE TYPE estado_pago_cob    AS ENUM ('pendiente', 'aprobado', 'rechazado');
CREATE TYPE metodo_pago        AS ENUM ('efectivo', 'transferencia', 'yape', 'plin', 'importacion_masiva');

-- Finanzas
CREATE TYPE tipo_movimiento    AS ENUM ('ingreso', 'egreso');
CREATE TYPE categoria_ingreso  AS ENUM ('cuotas','donacion','multa_externa','evento','alquiler','intereses','otro');
CREATE TYPE categoria_egreso   AS ENUM ('mantenimiento','servicios','personal','seguridad','compras','eventos','reparaciones','otro');

-- Acceso
CREATE TYPE estado_acceso      AS ENUM ('pendiente', 'autorizado', 'denegado');
CREATE TYPE tipo_acceso        AS ENUM ('vehicular', 'peatonal');
CREATE TYPE tipo_servicio_prov AS ENUM ('gas', 'delivery', 'bodega', 'otro');

-- Eventos
CREATE TYPE estado_evento      AS ENUM ('activo', 'inactivo', 'finalizado', 'cancelado');
CREATE TYPE categoria_evento   AS ENUM ('deportivo','cultural','educativo','social','recreativo','otro');
CREATE TYPE estado_inscripcion AS ENUM ('inscrito','confirmado','cancelado','asistio','no_asistio');

-- Deportes
CREATE TYPE tipo_cancha        AS ENUM ('futbol', 'voley', 'basquet', 'tenis', 'padel');
CREATE TYPE ubicacion_cancha   AS ENUM ('boulevard', 'quinta_llana');
CREATE TYPE estado_reserva     AS ENUM ('pendiente', 'pagado', 'cancelado', 'no-show', 'completado');

-- Sanciones
CREATE TYPE tipo_entidad_san   AS ENUM ('empadronado','maestro_obra','direccion','vehiculo','negocio','delegado','junta_directiva');
CREATE TYPE tipo_sancion       AS ENUM ('amonestacion','multa','suspension_temporal','suspension_permanente','inhabilitacion','otros');
CREATE TYPE estado_sancion     AS ENUM ('activa', 'cumplida', 'anulada', 'en_proceso');

-- Planilla / RRHH
CREATE TYPE tipo_personal      AS ENUM ('residente', 'personal_seguridad');
CREATE TYPE tipo_contrato      AS ENUM ('planilla', 'recibo_honorarios', 'temporal', 'indefinido');
CREATE TYPE frecuencia_pago    AS ENUM ('semanal', 'quincenal', 'mensual');


-- =============================================================================
-- 2. TABLAS BASE
-- =============================================================================

-- ─── 2.1 PERFILES DE USUARIO (vinculado a auth.users) ────────────────────────
-- NOTA: debe crearse ANTES que las funciones helper que la referencian.
CREATE TABLE public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text        NOT NULL,
  display_name    text        NOT NULL,
  role_id         text        NOT NULL DEFAULT 'usuario',
  activo          boolean     NOT NULL DEFAULT true,

  -- Datos opcionales del perfil
  username        text        UNIQUE,
  phone           text,
  tipo_usuario    text,                        -- administrador | presidente | directivo | delegado | asociado
  fecha_inicio_mandato bigint,                 -- epoch ms (para directivos/delegados)
  fecha_fin_mandato    bigint,

  -- Relación con empadronado
  empadronado_id  text,                        -- FK lógica; se convierte a uuid en la migración completa

  -- Módulos (jsonb: { padron: 'admin', cobranzas: 'write', … })
  modules         jsonb       NOT NULL DEFAULT '{}',

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.profiles IS 'Perfil de usuario del sistema. Vinculado 1:1 con auth.users.';
COMMENT ON COLUMN public.profiles.modules IS 'Mapa de permisos por módulo. Valores: none | read | write | approve | admin';


-- =============================================================================
-- 3. FUNCIONES HELPER (usadas por RLS — deben crearse DESPUÉS de public.profiles)
-- =============================================================================

-- Verifica que el usuario autenticado tenga nivel 'admin' en el módulo indicado
CREATE OR REPLACE FUNCTION auth_is_module_admin(module_name text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT (modules ->> module_name) = 'admin'
       FROM public.profiles
      WHERE id = auth.uid()),
    false
  );
$$;

-- Devuelve el nivel de permiso del usuario autenticado sobre un módulo
CREATE OR REPLACE FUNCTION auth_module_level(module_name text)
RETURNS text
LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT modules ->> module_name
       FROM public.profiles
      WHERE id = auth.uid()),
    'none'
  );
$$;


-- =============================================================================
-- 4. CATÁLOGOS
-- =============================================================================

-- ─── 4.1 CATÁLOGO DE ROLES ────────────────────────────────────────────────────
CREATE TABLE public.roles (
  id          text PRIMARY KEY,
  nombre      text NOT NULL,
  descripcion text,
  orden       integer NOT NULL DEFAULT 99,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.roles (id, nombre, descripcion, orden) VALUES
  ('usuario',      'Usuario',      'Acceso básico al portal',               10),
  ('asociado',     'Asociado',     'Propietario empadronado activo',        20),
  ('delegado',     'Delegado',     'Delegado de etapa',                     30),
  ('directivo',    'Directivo',    'Miembro de junta directiva',            40),
  ('presidencia',  'Presidencia',  'Presidente de la junta',                50),
  ('administrador','Administrador','Administrador del sistema',             99);


-- ─── 4.2 CATÁLOGO DE MÓDULOS ──────────────────────────────────────────────────
CREATE TABLE public.modules_catalog (
  id                  text PRIMARY KEY,
  nombre              text    NOT NULL,
  icon                text,
  orden               integer NOT NULL DEFAULT 99,
  requiere_aprobacion boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.modules_catalog (id, nombre, icon, orden, requiere_aprobacion) VALUES
  ('padron',          'Padrón',                    'Users',        10, true),
  ('cobranzas',       'Cobranzas',                 'CreditCard',   20, true),
  ('finanzas',        'Finanzas',                  'BarChart',     30, true),
  ('acceso',          'Control de Acceso',         'Shield',       40, false),
  ('seguridad',       'Seguridad',                 'Lock',         50, true),
  ('deportes',        'Deportes',                  'Activity',     60, false),
  ('admin_deportes',  'Administración Deportes',   'Building',     25, true),
  ('eventos',         'Eventos',                   'Calendar',     70, false),
  ('admin_eventos',   'Administración Eventos',    'CalendarPlus', 75, true),
  ('planilla',        'Planilla',                  'Briefcase',    80, true),
  ('portal',          'Portal Asociado',           'Globe',        90, false),
  ('comunicaciones',  'Comunicaciones',            'MessageSquare',100,true),
  ('balances',        'Balances',                  'FileBarChart', 26, false),
  ('admin_balances',  'Administrador de Balances', 'Settings',     27, true),
  ('sanciones',       'Sanciones',                 'AlertTriangle',110,true),
  ('patrimonio',      'Patrimonio',                'Package',      120,true),
  ('auditoria',       'Auditoría',                 'FileSearch',   130,true);


-- =============================================================================
-- 4. EMPADRONADOS
-- =============================================================================

CREATE TABLE public.empadronados (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_padron   text        NOT NULL UNIQUE,
  nombre          text        NOT NULL,
  apellidos       text        NOT NULL,
  dni             text        NOT NULL,
  familia         text        NOT NULL,

  -- Datos de domicilio
  manzana         text,
  lote            text,
  etapa           text,

  -- Datos personales
  genero          genero_tipo NOT NULL,
  cumpleanos      date,                          -- almacenado como date; originalmente DD/MM/YYYY
  vive            boolean     NOT NULL DEFAULT true,
  estado_vivienda estado_vivienda NOT NULL DEFAULT 'construida',

  -- Estado en el padrón
  habilitado      boolean     NOT NULL DEFAULT true,
  anulado         boolean     NOT NULL DEFAULT false,
  observaciones   text,

  -- Datos flexibles en jsonb (arrays en el modelo original)
  miembros_familia jsonb       NOT NULL DEFAULT '[]',  -- FamilyMember[]
  vehiculos        jsonb       NOT NULL DEFAULT '[]',  -- Vehicle[]
  telefonos        jsonb       NOT NULL DEFAULT '[]',  -- PhoneNumber[]

  -- Vínculo con cuenta del sistema
  auth_uid         uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email_acceso     text,

  -- Fecha de ingreso a la asociación
  fecha_ingreso   timestamptz,

  -- Auditoría
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  creado_por      uuid        REFERENCES auth.users(id),
  modificado_por  uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_empadronados_dni          ON public.empadronados(dni);
CREATE INDEX idx_empadronados_auth_uid     ON public.empadronados(auth_uid);
CREATE INDEX idx_empadronados_num_padron   ON public.empadronados(numero_padron);
CREATE INDEX idx_empadronados_habilitado   ON public.empadronados(habilitado) WHERE NOT anulado;

COMMENT ON TABLE public.empadronados IS 'Padrón de propietarios/residentes de la asociación.';


-- =============================================================================
-- 5. COBRANZAS V2
-- =============================================================================

-- ─── 5.1 Configuración global de cobranzas ───────────────────────────────────
CREATE TABLE public.cobranzas_configuracion (
  id                          serial      PRIMARY KEY,          -- siempre 1 (single-row)
  monto_mensual               numeric(10,2) NOT NULL DEFAULT 50,
  dia_cierre                  smallint    NOT NULL DEFAULT 14,
  dia_vencimiento             smallint    NOT NULL DEFAULT 15,
  dias_pronto_pago            smallint    NOT NULL DEFAULT 3,
  porcentaje_pronto_pago      numeric(5,2) NOT NULL DEFAULT 5,
  porcentaje_morosidad        numeric(5,2) NOT NULL DEFAULT 10,
  serie_comprobantes          text        NOT NULL DEFAULT '001',
  numero_comprobante_actual   integer     NOT NULL DEFAULT 1,
  sede                        text        NOT NULL DEFAULT 'JPUSAP',
  updated_at                  timestamptz NOT NULL DEFAULT now(),
  updated_by                  uuid        REFERENCES auth.users(id),
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO public.cobranzas_configuracion DEFAULT VALUES;

COMMENT ON TABLE public.cobranzas_configuracion IS 'Configuración global del módulo de cobranzas. Siempre una sola fila.';


-- ─── 5.2 Charges (cargos mensuales) ──────────────────────────────────────────
CREATE TABLE public.cobranzas_charges (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empadronado_id      uuid        NOT NULL REFERENCES public.empadronados(id) ON DELETE RESTRICT,
  periodo             char(6)     NOT NULL,                     -- YYYYMM
  monto_original      numeric(10,2) NOT NULL,
  monto_pagado        numeric(10,2) NOT NULL DEFAULT 0,
  saldo               numeric(10,2) NOT NULL,
  fecha_vencimiento   date        NOT NULL,
  estado              estado_charge NOT NULL DEFAULT 'pendiente',
  es_moroso           boolean     NOT NULL DEFAULT false,
  monto_morosidad     numeric(10,2),

  -- Anulación
  anulado             boolean     NOT NULL DEFAULT false,
  fecha_anulacion     timestamptz,
  anulado_por         uuid        REFERENCES auth.users(id),
  anulado_por_nombre  text,
  motivo_anulacion    text,

  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_charge_emp_periodo UNIQUE (empadronado_id, periodo)
);

CREATE INDEX idx_charges_empadronado ON public.cobranzas_charges(empadronado_id);
CREATE INDEX idx_charges_periodo     ON public.cobranzas_charges(periodo);
CREATE INDEX idx_charges_estado      ON public.cobranzas_charges(estado);

COMMENT ON TABLE public.cobranzas_charges IS 'Cargo mensual por empadronado (una fila por asociado por período YYYYMM).';


-- ─── 5.3 Pagos ───────────────────────────────────────────────────────────────
CREATE TABLE public.cobranzas_pagos (
  id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  charge_id               uuid        NOT NULL REFERENCES public.cobranzas_charges(id) ON DELETE RESTRICT,
  empadronado_id          uuid        NOT NULL REFERENCES public.empadronados(id) ON DELETE RESTRICT,
  periodo                 char(6)     NOT NULL,                 -- YYYYMM
  monto                   numeric(10,2) NOT NULL,
  monto_original          numeric(10,2) NOT NULL,
  descuento_pronto_pago   numeric(10,2),
  metodo_pago             metodo_pago NOT NULL DEFAULT 'efectivo',
  numero_operacion        text,
  estado                  estado_pago_cob NOT NULL DEFAULT 'pendiente',

  -- Fechas
  fecha_pago_registrada   date        NOT NULL,                 -- Fecha que el usuario declara haber pagado
  fecha_creacion          timestamptz NOT NULL DEFAULT now(),
  fecha_modificacion      timestamptz,

  -- Comprobante / evidencia
  archivo_comprobante     text,                                 -- URL en Supabase Storage

  -- Aprobación
  fecha_aprobacion        timestamptz,
  aprobado_por            uuid        REFERENCES auth.users(id),
  aprobado_por_nombre     text,
  comentario_aprobacion   text,

  -- Rechazo
  fecha_rechazo           timestamptz,
  motivo_rechazo          text,

  observaciones           text
);

CREATE INDEX idx_pagos_charge         ON public.cobranzas_pagos(charge_id);
CREATE INDEX idx_pagos_empadronado    ON public.cobranzas_pagos(empadronado_id);
CREATE INDEX idx_pagos_estado         ON public.cobranzas_pagos(estado);
CREATE INDEX idx_pagos_periodo        ON public.cobranzas_pagos(periodo);

COMMENT ON TABLE public.cobranzas_pagos IS 'Registro de pagos realizados por los empadronados.';


-- ─── 5.4 Bloqueo de períodos ─────────────────────────────────────────────────
CREATE TABLE public.cobranzas_periodos (
  periodo             char(6)     PRIMARY KEY,                  -- YYYYMM
  generado            boolean     NOT NULL DEFAULT false,
  fecha_generacion    timestamptz,
  generado_por        uuid        REFERENCES auth.users(id)
);


-- =============================================================================
-- 6. FINANZAS — MOVIMIENTOS
-- =============================================================================

CREATE TABLE public.movimientos_financieros (
  id                          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo                        tipo_movimiento NOT NULL,
  categoria                   text        NOT NULL,             -- categoria_ingreso | categoria_egreso
  monto                       numeric(12,2) NOT NULL,
  descripcion                 text        NOT NULL,
  fecha                       date        NOT NULL,
  numero_comprobante          text,
  beneficiario                text,                             -- para egresos
  proveedor                   text,                             -- para egresos
  banco                       text,
  observaciones               text,

  -- Comprobantes (jsonb: Comprobante[])
  comprobantes                jsonb       NOT NULL DEFAULT '[]',

  -- Vínculo opcional con empadronado
  empadronado_id              uuid        REFERENCES public.empadronados(id) ON DELETE SET NULL,
  empadronado_numero_padron   text,
  empadronado_nombres         text,
  empadronado_dni             text,

  -- Auditoría
  registrado_por              uuid        NOT NULL REFERENCES auth.users(id),
  registrado_por_nombre       text        NOT NULL,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_movimientos_tipo     ON public.movimientos_financieros(tipo);
CREATE INDEX idx_movimientos_fecha    ON public.movimientos_financieros(fecha DESC);
CREATE INDEX idx_movimientos_emp      ON public.movimientos_financieros(empadronado_id);

COMMENT ON TABLE public.movimientos_financieros IS 'Libro de ingresos y egresos de la tesorería.';


-- =============================================================================
-- 7. EVENTOS
-- =============================================================================

CREATE TABLE public.eventos (
  id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo                text        NOT NULL,
  descripcion           text        NOT NULL,
  categoria             categoria_evento NOT NULL,
  estado                estado_evento    NOT NULL DEFAULT 'activo',
  fecha_inicio          timestamptz NOT NULL,
  fecha_fin             timestamptz,
  fecha_fin_indefinida  boolean     NOT NULL DEFAULT false,

  -- Detalles
  instructor            text,
  cupos_maximos         integer,
  cupos_ilimitados      boolean     NOT NULL DEFAULT false,
  cupos_disponibles     integer,
  precio                numeric(10,2) NOT NULL DEFAULT 0,
  imagen                text,                                   -- URL
  requisitos            text,
  materiales_incluidos  text,

  -- Sesiones y promociones (jsonb por su complejidad variable)
  sesiones              jsonb       NOT NULL DEFAULT '[]',      -- SesionEvento[]
  promocion             jsonb,                                  -- PromocionEvento | null

  -- Auditoría
  created_at            timestamptz NOT NULL DEFAULT now(),
  creado_por            uuid        NOT NULL REFERENCES auth.users(id),
  ultima_modificacion   timestamptz,
  modificado_por        uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_eventos_estado    ON public.eventos(estado);
CREATE INDEX idx_eventos_inicio    ON public.eventos(fecha_inicio DESC);

COMMENT ON TABLE public.eventos IS 'Eventos organizados por la asociación (deportivos, culturales, etc.).';


CREATE TABLE public.inscripciones_eventos (
  id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  evento_id             uuid        NOT NULL REFERENCES public.eventos(id) ON DELETE CASCADE,
  empadronado_id        uuid        NOT NULL REFERENCES public.empadronados(id) ON DELETE RESTRICT,
  nombre_empadronado    text        NOT NULL,
  dni                   text,
  estado                estado_inscripcion NOT NULL DEFAULT 'inscrito',
  acompanantes          integer     NOT NULL DEFAULT 0,
  observaciones         text,
  pago_realizado        boolean     NOT NULL DEFAULT false,
  fecha_pago            timestamptz,
  monto_pagado          numeric(10,2),
  comprobante_id        uuid,                                   -- FK a receipts si aplica
  fecha_inscripcion     timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_inscripcion_uq ON public.inscripciones_eventos(evento_id, empadronado_id)
  WHERE estado <> 'cancelado';
CREATE INDEX idx_inscripcion_emp   ON public.inscripciones_eventos(empadronado_id);
CREATE INDEX idx_inscripcion_evt   ON public.inscripciones_eventos(evento_id);


-- =============================================================================
-- 8. DEPORTES
-- =============================================================================

CREATE TABLE public.canchas (
  id              uuid            PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          text            NOT NULL,
  tipo            tipo_cancha     NOT NULL,
  ubicacion       ubicacion_cancha NOT NULL,
  activa          boolean         NOT NULL DEFAULT true,
  configuracion   jsonb           NOT NULL DEFAULT '{}',        -- ConfiguracionCancha
  created_at      timestamptz     NOT NULL DEFAULT now(),
  updated_at      timestamptz     NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.canchas IS 'Canchas e instalaciones deportivas disponibles para reserva.';


CREATE TABLE public.reservas (
  id                  uuid            PRIMARY KEY DEFAULT uuid_generate_v4(),
  cancha_id           uuid            NOT NULL REFERENCES public.canchas(id) ON DELETE RESTRICT,
  empadronado_id      uuid            REFERENCES public.empadronados(id) ON DELETE SET NULL,
  nombre_cliente      text            NOT NULL,
  dni                 text,
  telefono            text            NOT NULL,
  fecha_inicio        timestamptz     NOT NULL,
  fecha_fin           timestamptz     NOT NULL,
  duracion_horas      numeric(4,1)    NOT NULL,
  estado              estado_reserva  NOT NULL DEFAULT 'pendiente',
  es_aportante        boolean         NOT NULL DEFAULT false,

  -- Precio desglosado
  precio_base         numeric(10,2)   NOT NULL,
  precio_luz          numeric(10,2)   NOT NULL DEFAULT 0,
  descuento_aportante numeric(10,2)   NOT NULL DEFAULT 0,
  precio_total        numeric(10,2)   NOT NULL,

  -- Pago
  metodo_pago         metodo_pago,
  numero_operacion    text,
  voucher_url         text,
  fecha_pago          timestamptz,
  es_prepago          boolean         NOT NULL DEFAULT false,
  monto_prepago       numeric(10,2),
  saldo_pendiente     numeric(10,2),

  -- Reserva recurrente
  es_recurrente       boolean         NOT NULL DEFAULT false,
  frecuencia_recurrente text,
  fecha_fin_recurrente  timestamptz,
  reservas_generadas  jsonb           DEFAULT '[]',             -- uuid[]

  -- Extras
  comprobante_url     text,
  ingreso_id          uuid,                                     -- FK a movimientos_financieros
  observaciones       text,

  -- Auditoría
  created_by          uuid            NOT NULL REFERENCES auth.users(id),
  created_at          timestamptz     NOT NULL DEFAULT now(),
  updated_at          timestamptz     NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservas_cancha    ON public.reservas(cancha_id);
CREATE INDEX idx_reservas_emp       ON public.reservas(empadronado_id);
CREATE INDEX idx_reservas_estado    ON public.reservas(estado);
CREATE INDEX idx_reservas_inicio    ON public.reservas(fecha_inicio);
CREATE INDEX idx_reservas_dni       ON public.reservas(dni);

COMMENT ON TABLE public.reservas IS 'Reservas de canchas deportivas.';


-- =============================================================================
-- 9. CONTROL DE ACCESO
-- =============================================================================

CREATE TABLE public.maestros_obra (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre          text        NOT NULL,
  dni             text,
  telefono        text,
  empresa         text,
  activo          boolean     NOT NULL DEFAULT true,
  notas           text,
  creado_por_uid  uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_maestros_dni ON public.maestros_obra(dni);


CREATE TABLE public.registros_visitas (
  id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empadronado_id          uuid        NOT NULL REFERENCES public.empadronados(id) ON DELETE RESTRICT,
  tipo_acceso             tipo_acceso NOT NULL,
  placa                   text,
  placas                  text[]      DEFAULT '{}',
  visitantes              jsonb       NOT NULL DEFAULT '[]',    -- Visitante[]
  menores                 smallint    NOT NULL DEFAULT 0,
  estado                  estado_acceso NOT NULL DEFAULT 'pendiente',
  es_favorito             boolean     NOT NULL DEFAULT false,
  solicitado_por_nombre   text,
  solicitado_por_padron   text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_visitas_emp       ON public.registros_visitas(empadronado_id);
CREATE INDEX idx_visitas_estado    ON public.registros_visitas(estado);
CREATE INDEX idx_visitas_created   ON public.registros_visitas(created_at DESC);


CREATE TABLE public.registros_trabajadores (
  id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empadronado_id          uuid        NOT NULL REFERENCES public.empadronados(id) ON DELETE RESTRICT,
  tipo_acceso             tipo_acceso NOT NULL,
  placa                   text,
  placas                  text[]      DEFAULT '{}',
  maestro_obra_id         uuid        REFERENCES public.maestros_obra(id) ON DELETE SET NULL,
  maestro_obra_temporal   jsonb,                                -- { nombre, dni }
  trabajadores            jsonb       NOT NULL DEFAULT '[]',    -- Trabajador[]
  estado                  estado_acceso NOT NULL DEFAULT 'pendiente',
  es_favorito             boolean     NOT NULL DEFAULT false,
  solicitado_por_nombre   text,
  solicitado_por_padron   text,
  fecha_inicio            timestamptz,
  fecha_fin               timestamptz,
  activa                  boolean     NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trabajadores_emp    ON public.registros_trabajadores(empadronado_id);
CREATE INDEX idx_trabajadores_estado ON public.registros_trabajadores(estado);
CREATE INDEX idx_trabajadores_dni    ON public.registros_trabajadores USING gin (trabajadores);


CREATE TABLE public.registros_proveedores (
  id                      uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empadronado_id          uuid        NOT NULL REFERENCES public.empadronados(id) ON DELETE RESTRICT,
  tipo_acceso             tipo_acceso NOT NULL,
  placa                   text,
  placas                  text[]      DEFAULT '{}',
  empresa                 text        NOT NULL,
  tipo_servicio           tipo_servicio_prov,
  estado                  estado_acceso NOT NULL DEFAULT 'pendiente',
  solicitado_por_nombre   text,
  solicitado_por_padron   text,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_proveedores_emp    ON public.registros_proveedores(empadronado_id);
CREATE INDEX idx_proveedores_estado ON public.registros_proveedores(estado);


-- =============================================================================
-- 10. SANCIONES
-- =============================================================================

CREATE TABLE public.sanciones (
  id                    uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  numero_sancion        text        NOT NULL UNIQUE,
  tipo_entidad          tipo_entidad_san NOT NULL,
  entidad_id            text        NOT NULL,
  entidad_nombre        text        NOT NULL,
  entidad_documento     text,                                   -- DNI, RUC, placa…
  tipo_sancion          tipo_sancion    NOT NULL,
  motivo                text        NOT NULL,
  descripcion           text        NOT NULL,
  monto_multa           numeric(10,2),
  fecha_aplicacion      date        NOT NULL,
  fecha_vencimiento     date,
  estado                estado_sancion  NOT NULL DEFAULT 'activa',
  aplicado_por          uuid        NOT NULL REFERENCES auth.users(id),
  aplicado_por_nombre   text        NOT NULL,
  documento_sancion     text,                                   -- URL
  resolucion            text,
  observaciones         text,
  fecha_cumplimiento    date,
  cumplido_por          uuid        REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sanciones_estado      ON public.sanciones(estado);
CREATE INDEX idx_sanciones_entidad_id  ON public.sanciones(entidad_id);
CREATE INDEX idx_sanciones_tipo        ON public.sanciones(tipo_sancion);

COMMENT ON TABLE public.sanciones IS 'Registro de sanciones disciplinarias a empadronados, trabajadores y otros.';


-- =============================================================================
-- 11. PLANILLA / RRHH
-- =============================================================================

CREATE TABLE public.personal_planilla (
  id                  uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  empadronado_id      uuid        REFERENCES public.empadronados(id) ON DELETE SET NULL,
  nombre_completo     text        NOT NULL,
  dni                 text        NOT NULL,
  tipo_personal       tipo_personal NOT NULL,
  funcion             text        NOT NULL,
  area_asignada       text,
  fecha_contratacion  date        NOT NULL,
  activo              boolean     NOT NULL DEFAULT true,
  sueldo              numeric(10,2),
  tipo_contrato       tipo_contrato,
  frecuencia_pago     frecuencia_pago,
  tiene_acceso_sistema boolean    NOT NULL DEFAULT false,
  horarios_acceso     jsonb       NOT NULL DEFAULT '[]',        -- HorarioAcceso[]
  observaciones       text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  creado_por          uuid        REFERENCES auth.users(id),
  modificado_por      uuid        REFERENCES auth.users(id)
);

CREATE INDEX idx_planilla_tipo  ON public.personal_planilla(tipo_personal);
CREATE INDEX idx_planilla_activo ON public.personal_planilla(activo);


-- =============================================================================
-- 12. COMUNICACIONES
-- =============================================================================

CREATE TABLE public.mensajes_masivos (
  id              uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo          text        NOT NULL,
  descripcion     text        NOT NULL,
  imagen          text,                                         -- URL
  link            text,
  estilo_texto    jsonb       NOT NULL DEFAULT '{}',            -- EstiloTexto
  activo          boolean     NOT NULL DEFAULT true,
  fecha_inicio    timestamptz,
  fecha_fin       timestamptz,
  creado_por      uuid        NOT NULL REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mensajes_activo    ON public.mensajes_masivos(activo);
CREATE INDEX idx_mensajes_fechas    ON public.mensajes_masivos(fecha_inicio, fecha_fin);


-- =============================================================================
-- 13. AUDITORÍA
-- =============================================================================

CREATE TABLE public.audit_logs (
  id          uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  ts          timestamptz NOT NULL DEFAULT now(),
  actor_uid   uuid        NOT NULL REFERENCES auth.users(id),
  target_uid  uuid,
  accion      text        NOT NULL,
  modulo_id   text,
  old_data    jsonb,
  new_data    jsonb
);

CREATE INDEX idx_audit_actor   ON public.audit_logs(actor_uid);
CREATE INDEX idx_audit_target  ON public.audit_logs(target_uid);
CREATE INDEX idx_audit_ts      ON public.audit_logs(ts DESC);
CREATE INDEX idx_audit_accion  ON public.audit_logs(accion);


-- =============================================================================
-- 14. CONFIGURACIÓN GENERAL Y CORRELATIVOS
-- =============================================================================

CREATE TABLE public.configuracion_global (
  clave       text        PRIMARY KEY,
  valor       jsonb       NOT NULL,
  descripcion text,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid        REFERENCES auth.users(id)
);

CREATE TABLE public.correlativos (
  id          text        PRIMARY KEY,             -- ej. 'recibo', 'comprobante', 'sancion'
  prefijo     text        NOT NULL DEFAULT '',
  actual      integer     NOT NULL DEFAULT 0,
  anio        smallint,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.correlativos (id, prefijo, actual) VALUES
  ('recibo',       'REC',  0),
  ('comprobante',  'COMP', 0),
  ('sancion',      'SAN',  0);


-- =============================================================================
-- 15. TRIGGER: auto-crear perfil al registrar usuario en Supabase Auth
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role_id, activo, modules)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    'usuario',
    true,
    '{}'::jsonb
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();


-- Trigger: actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at          BEFORE UPDATE ON public.profiles          FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_empadronados_updated_at       BEFORE UPDATE ON public.empadronados       FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_charges_updated_at            BEFORE UPDATE ON public.cobranzas_charges  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_movimientos_updated_at        BEFORE UPDATE ON public.movimientos_financieros FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_reservas_updated_at           BEFORE UPDATE ON public.reservas            FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_canchas_updated_at            BEFORE UPDATE ON public.canchas             FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_sanciones_updated_at          BEFORE UPDATE ON public.sanciones           FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER trg_planilla_updated_at           BEFORE UPDATE ON public.personal_planilla   FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();


-- =============================================================================
-- 16. ROW LEVEL SECURITY (RLS)
-- =============================================================================
-- Reglas basadas en database.rules.json de Firebase:
--   • auth != null   → cualquier usuario autenticado puede leer/escribir
--   • modules/padron = 'admin'      → admin del módulo padrón
--   • modules/comunicaciones = 'admin' → admin de comunicaciones
--   • modules/portal = 'admin'         → admin del portal
--   • $uid === auth.uid              → el propio usuario
-- =============================================================================

-- Habilitar RLS en todas las tablas públicas
ALTER TABLE public.profiles                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules_catalog           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empadronados              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobranzas_configuracion   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobranzas_charges         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobranzas_pagos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cobranzas_periodos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_financieros   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inscripciones_eventos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canchas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservas                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maestros_obra             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_visitas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_trabajadores    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registros_proveedores     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sanciones                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal_planilla         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_masivos          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_global      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.correlativos              ENABLE ROW LEVEL SECURITY;


-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- Usuarios autenticados ven todos los perfiles (necesario para buscar usuarios)
CREATE POLICY "profiles_select_authenticated"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Cada usuario puede actualizar solo su propio perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Solo admin de padrón puede insertar nuevos perfiles manualmente
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_module_admin('padron'));

-- Solo admin de padrón puede eliminar perfiles
CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('padron'));


-- ─── CATÁLOGOS (roles, módulos) — solo lectura para todos ────────────────────
CREATE POLICY "roles_select_authenticated"
  ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "modules_catalog_select_authenticated"
  ON public.modules_catalog FOR SELECT TO authenticated USING (true);


-- ─── EMPADRONADOS ─────────────────────────────────────────────────────────────
-- Cualquier usuario autenticado puede leer el padrón
CREATE POLICY "empadronados_select_authenticated"
  ON public.empadronados FOR SELECT
  TO authenticated
  USING (true);

-- Solo admin de padrón puede insertar
CREATE POLICY "empadronados_insert_admin"
  ON public.empadronados FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_module_admin('padron'));

-- Solo admin de padrón puede modificar
CREATE POLICY "empadronados_update_admin"
  ON public.empadronados FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('padron'))
  WITH CHECK (auth_is_module_admin('padron'));

-- Solo admin de padrón puede eliminar
CREATE POLICY "empadronados_delete_admin"
  ON public.empadronados FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('padron'));


-- ─── COBRANZAS CONFIGURACIÓN ─────────────────────────────────────────────────
CREATE POLICY "cob_config_select_authenticated"
  ON public.cobranzas_configuracion FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "cob_config_update_admin"
  ON public.cobranzas_configuracion FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('cobranzas'));


-- ─── CHARGES ──────────────────────────────────────────────────────────────────
CREATE POLICY "charges_select_authenticated"
  ON public.cobranzas_charges FOR SELECT
  TO authenticated USING (true);

-- El propio empadronado (por auth_uid) puede ver sus cargos
-- ya cubierto por la política anterior; aquí aseguramos la escritura
CREATE POLICY "charges_insert_admin"
  ON public.cobranzas_charges FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_module_admin('cobranzas'));

CREATE POLICY "charges_update_admin"
  ON public.cobranzas_charges FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('cobranzas'));

CREATE POLICY "charges_delete_admin"
  ON public.cobranzas_charges FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('cobranzas'));


-- ─── PAGOS ────────────────────────────────────────────────────────────────────
-- Cualquier usuario autenticado lee todos los pagos (visible para economía)
CREATE POLICY "pagos_select_authenticated"
  ON public.cobranzas_pagos FOR SELECT
  TO authenticated USING (true);

-- Un empadronado puede registrar su propio pago:
-- su auth_uid coincide con el auth_uid del empadronado vinculado al charge
CREATE POLICY "pagos_insert_own_or_admin"
  ON public.cobranzas_pagos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_module_admin('cobranzas')
    OR EXISTS (
      SELECT 1 FROM public.empadronados e
      WHERE e.id = empadronado_id
        AND e.auth_uid = auth.uid()
    )
  );

-- Solo admins pueden aprobar/rechazar (modificar estado)
CREATE POLICY "pagos_update_admin"
  ON public.cobranzas_pagos FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('cobranzas'));

CREATE POLICY "pagos_delete_admin"
  ON public.cobranzas_pagos FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('cobranzas'));


-- ─── PERÍODOS ─────────────────────────────────────────────────────────────────
CREATE POLICY "periodos_select_authenticated"
  ON public.cobranzas_periodos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "periodos_write_admin"
  ON public.cobranzas_periodos FOR ALL
  TO authenticated
  USING (auth_is_module_admin('cobranzas'))
  WITH CHECK (auth_is_module_admin('cobranzas'));


-- ─── FINANZAS / MOVIMIENTOS ───────────────────────────────────────────────────
CREATE POLICY "movimientos_select_authenticated"
  ON public.movimientos_financieros FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "movimientos_insert_admin"
  ON public.movimientos_financieros FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_module_admin('finanzas'));

CREATE POLICY "movimientos_update_admin"
  ON public.movimientos_financieros FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('finanzas'));

CREATE POLICY "movimientos_delete_admin"
  ON public.movimientos_financieros FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('finanzas'));


-- ─── EVENTOS ──────────────────────────────────────────────────────────────────
CREATE POLICY "eventos_select_authenticated"
  ON public.eventos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "eventos_write_admin"
  ON public.eventos FOR ALL
  TO authenticated
  USING (auth_is_module_admin('admin_eventos'))
  WITH CHECK (auth_is_module_admin('admin_eventos'));


-- ─── INSCRIPCIONES EVENTOS ────────────────────────────────────────────────────
CREATE POLICY "inscripciones_select_authenticated"
  ON public.inscripciones_eventos FOR SELECT
  TO authenticated USING (true);

-- El empadronado puede inscribirse a sí mismo
CREATE POLICY "inscripciones_insert_own_or_admin"
  ON public.inscripciones_eventos FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_module_admin('admin_eventos')
    OR EXISTS (
      SELECT 1 FROM public.empadronados e
      WHERE e.id = empadronado_id
        AND e.auth_uid = auth.uid()
    )
  );

CREATE POLICY "inscripciones_update_admin"
  ON public.inscripciones_eventos FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('admin_eventos'));

CREATE POLICY "inscripciones_delete_admin"
  ON public.inscripciones_eventos FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('admin_eventos'));


-- ─── CANCHAS ──────────────────────────────────────────────────────────────────
CREATE POLICY "canchas_select_authenticated"
  ON public.canchas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "canchas_write_admin"
  ON public.canchas FOR ALL
  TO authenticated
  USING (auth_is_module_admin('admin_deportes'))
  WITH CHECK (auth_is_module_admin('admin_deportes'));


-- ─── RESERVAS ─────────────────────────────────────────────────────────────────
CREATE POLICY "reservas_select_authenticated"
  ON public.reservas FOR SELECT
  TO authenticated USING (true);

-- El empadronado puede crear su propia reserva
CREATE POLICY "reservas_insert_own_or_admin"
  ON public.reservas FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_module_admin('admin_deportes')
    OR auth_is_module_admin('deportes')
    OR (empadronado_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.empadronados e
      WHERE e.id = empadronado_id
        AND e.auth_uid = auth.uid()
    ))
  );

CREATE POLICY "reservas_update_admin"
  ON public.reservas FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('admin_deportes') OR auth_is_module_admin('deportes'));

CREATE POLICY "reservas_delete_admin"
  ON public.reservas FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('admin_deportes'));


-- ─── ACCESO (visitas, trabajadores, proveedores, maestros_obra) ───────────────
CREATE POLICY "visitas_select_authenticated"
  ON public.registros_visitas FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "visitas_insert_own_or_admin"
  ON public.registros_visitas FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_module_admin('acceso')
    OR EXISTS (
      SELECT 1 FROM public.empadronados e
      WHERE e.id = empadronado_id AND e.auth_uid = auth.uid()
    )
  );

CREATE POLICY "visitas_update_admin"
  ON public.registros_visitas FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('acceso') OR auth_is_module_admin('seguridad'));

CREATE POLICY "visitas_delete_admin"
  ON public.registros_visitas FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('acceso'));

-- Políticas similares para trabajadores
CREATE POLICY "trabajadores_select_authenticated"
  ON public.registros_trabajadores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "trabajadores_insert_own_or_admin"
  ON public.registros_trabajadores FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_module_admin('acceso')
    OR EXISTS (
      SELECT 1 FROM public.empadronados e
      WHERE e.id = empadronado_id AND e.auth_uid = auth.uid()
    )
  );

CREATE POLICY "trabajadores_update_admin"
  ON public.registros_trabajadores FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('acceso') OR auth_is_module_admin('seguridad'));

CREATE POLICY "trabajadores_delete_admin"
  ON public.registros_trabajadores FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('acceso'));

-- Proveedores
CREATE POLICY "proveedores_select_authenticated"
  ON public.registros_proveedores FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "proveedores_insert_own_or_admin"
  ON public.registros_proveedores FOR INSERT
  TO authenticated
  WITH CHECK (
    auth_is_module_admin('acceso')
    OR EXISTS (
      SELECT 1 FROM public.empadronados e
      WHERE e.id = empadronado_id AND e.auth_uid = auth.uid()
    )
  );

CREATE POLICY "proveedores_update_admin"
  ON public.registros_proveedores FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('acceso') OR auth_is_module_admin('seguridad'));

-- Maestros de obra
CREATE POLICY "maestros_select_authenticated"
  ON public.maestros_obra FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "maestros_write_authenticated"
  ON public.maestros_obra FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ─── SANCIONES ────────────────────────────────────────────────────────────────
CREATE POLICY "sanciones_select_authenticated"
  ON public.sanciones FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "sanciones_insert_admin"
  ON public.sanciones FOR INSERT
  TO authenticated
  WITH CHECK (auth_is_module_admin('sanciones') OR auth_is_module_admin('seguridad'));

CREATE POLICY "sanciones_update_admin"
  ON public.sanciones FOR UPDATE
  TO authenticated
  USING (auth_is_module_admin('sanciones') OR auth_is_module_admin('seguridad'));

CREATE POLICY "sanciones_delete_admin"
  ON public.sanciones FOR DELETE
  TO authenticated
  USING (auth_is_module_admin('sanciones'));


-- ─── PLANILLA ─────────────────────────────────────────────────────────────────
CREATE POLICY "planilla_select_authenticated"
  ON public.personal_planilla FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "planilla_write_admin"
  ON public.personal_planilla FOR ALL
  TO authenticated
  USING (auth_is_module_admin('planilla'))
  WITH CHECK (auth_is_module_admin('planilla'));


-- ─── COMUNICACIONES ───────────────────────────────────────────────────────────
-- Todos los usuarios autenticados ven mensajes activos y vigentes
CREATE POLICY "mensajes_select_authenticated"
  ON public.mensajes_masivos FOR SELECT
  TO authenticated
  USING (
    activo = true
    OR auth_is_module_admin('comunicaciones')
  );

-- Solo admin de comunicaciones puede crear/editar/eliminar
CREATE POLICY "mensajes_write_admin"
  ON public.mensajes_masivos FOR ALL
  TO authenticated
  USING (auth_is_module_admin('comunicaciones'))
  WITH CHECK (auth_is_module_admin('comunicaciones'));


-- ─── AUDITORÍA ────────────────────────────────────────────────────────────────
-- Solo admins de padrón pueden leer los logs
CREATE POLICY "audit_select_admin"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (auth_is_module_admin('padron') OR auth_is_module_admin('auditoria'));

-- Cualquier usuario autenticado puede insertar un log (trazabilidad)
CREATE POLICY "audit_insert_authenticated"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_uid = auth.uid());


-- ─── CONFIGURACIÓN Y CORRELATIVOS ─────────────────────────────────────────────
CREATE POLICY "config_select_authenticated"
  ON public.configuracion_global FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "config_write_admin"
  ON public.configuracion_global FOR ALL
  TO authenticated
  USING (auth_is_module_admin('padron'))
  WITH CHECK (auth_is_module_admin('padron'));

CREATE POLICY "correlativos_select_authenticated"
  ON public.correlativos FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "correlativos_write_authenticated"
  ON public.correlativos FOR UPDATE
  TO authenticated
  USING (true);


-- =============================================================================
-- FIN DEL SCRIPT
-- =============================================================================
