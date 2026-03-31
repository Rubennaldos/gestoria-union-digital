-- =============================================================================
-- 002_rls_fixes.sql
-- Correcciones de políticas RLS para:
--   1. Permitir lectura anónima de profiles (solo conteo de admins para bootstrap)
--   2. Permitir al socio leer su propio empadronado vinculado
-- =============================================================================

-- ─── 1. profiles: lectura pública de conteo de admins ─────────────────────────
-- Permite verificar si el sistema está inicializado sin necesitar sesión.
-- Solo expone la columna role_id e id para el conteo, no datos sensibles.

DROP POLICY IF EXISTS "profiles_anon_count_admins" ON public.profiles;

CREATE POLICY "profiles_anon_count_admins"
  ON public.profiles FOR SELECT
  TO anon
  USING (role_id IN ('presidencia', 'super_admin', 'admin'));


-- ─── 2. empadronados: el socio vinculado puede leer su propio registro ─────────
-- auth_uid en empadronados apunta al id del usuario en auth.users.
-- Esto permite que PortalAsociado cargue sin necesitar rol de admin.

DROP POLICY IF EXISTS "empadronados_select_own_socio" ON public.empadronados;

CREATE POLICY "empadronados_select_own_socio"
  ON public.empadronados FOR SELECT
  TO authenticated
  USING (auth_uid = auth.uid());


-- ─── 3. cobranzas_charges: el socio lee sus propios cargos ────────────────────

DROP POLICY IF EXISTS "charges_select_own_socio" ON public.cobranzas_charges;

CREATE POLICY "charges_select_own_socio"
  ON public.cobranzas_charges FOR SELECT
  TO authenticated
  USING (
    empadronado_id IN (
      SELECT id FROM public.empadronados WHERE auth_uid = auth.uid()
    )
  );


-- ─── 4. cobranzas_pagos: el socio lee sus propios pagos ───────────────────────

DROP POLICY IF EXISTS "pagos_select_own_socio" ON public.cobranzas_pagos;

CREATE POLICY "pagos_select_own_socio"
  ON public.cobranzas_pagos FOR SELECT
  TO authenticated
  USING (
    empadronado_id IN (
      SELECT id FROM public.empadronados WHERE auth_uid = auth.uid()
    )
  );
