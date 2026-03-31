// src/services/auth.ts
// ─────────────────────────────────────────────────────────────────────────────
//  Autenticación → Supabase Auth + public.profiles
//
//  signIn  : supabase.auth.signInWithPassword
//  signOut : supabase.auth.signOut
//  reset   : supabase.auth.resetPasswordForEmail
//  create  : supabaseAdmin.auth.admin.createUser  (requiere VITE_SUPABASE_SERVICE_ROLE_KEY)
//
//  Los módulos de cobranzas (RTDB) no están migrados aún y siguen en Firebase.
//  writeAuditLog se mantiene en RTDB por compatibilidad.
// ─────────────────────────────────────────────────────────────────────────────

import { supabase, supabaseAdmin }      from '@/lib/supabase';
import { CreateUserForm, UserProfile }   from '@/types/auth';
import { getEmpadronadoById, linkAuthToEmpadronado } from '@/services/empadronados';
import { getPersonalByEmpadronadoId, puedeAccederAhora } from '@/services/planilla';

// =============================================================================
// 1. TIPO DE FILA DE public.profiles  (snake_case)
// =============================================================================

export type ProfileRow = {
  id: string;
  email: string;
  display_name: string;
  role_id: string;
  activo: boolean;
  username: string | null;
  phone: string | null;
  tipo_usuario: string | null;
  fecha_inicio_mandato: number | null;
  fecha_fin_mandato: number | null;
  empadronado_id: string | null;
  modules: Record<string, string> | null;
  created_at: string;
  updated_at: string;
};

/**
 * Convierte una fila de public.profiles (snake_case) al tipo UserProfile
 * (camelCase) usado en toda la aplicación. Así ningún componente necesita
 * cambios: los nombres de campo son idénticos al modelo anterior de Firebase.
 */
export function profileRowToUserProfile(row: ProfileRow): UserProfile {
  return {
    uid:                 row.id,
    email:               row.email,
    displayName:         row.display_name,
    roleId:              row.role_id,
    activo:              row.activo,
    username:            row.username            ?? undefined,
    phone:               row.phone               ?? undefined,
    empadronadoId:       row.empadronado_id       ?? undefined,
    tipoUsuario:         row.tipo_usuario         as UserProfile['tipoUsuario'] ?? undefined,
    fechaInicioMandato:  row.fecha_inicio_mandato ?? undefined,
    fechaFinMandato:     row.fecha_fin_mandato    ?? undefined,
    createdAt:           row.created_at ? new Date(row.created_at).getTime() : undefined,
    updatedAt:           row.updated_at ? new Date(row.updated_at).getTime() : undefined,
    modules:             (row.modules as any)     ?? {},
  };
}

// =============================================================================
// 2. HELPERS
// =============================================================================

const normalize = (v?: string | null) => (v || '').trim().toLowerCase();
const RESERVED_SUPER_EMAIL = 'presidencia@jpusap.com';

/** Resuelve username → email consultando public.profiles */
const resolveEmailByUsername = async (usernameRaw: string): Promise<string | null> => {
  const username = normalize(usernameRaw);
  if (!username) return null;
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', username)
    .maybeSingle();
  return data?.email ?? null;
};

/** Lanza error si el username ya existe en public.profiles */
const ensureUsernameAvailable = async (usernameRaw?: string | null) => {
  const username = normalize(usernameRaw);
  if (!username) return;
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', username)
    .maybeSingle();
  if (data) throw new Error(`El usuario "${username}" ya está en uso`);
};

/** Traduce mensajes de error de Supabase Auth a códigos que Login.tsx ya maneja */
function mapAuthError(msg: string): Error {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid_credentials')) {
    return new Error('invalid-credential');
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return new Error('too-many-requests');
  }
  if (m.includes('user not found')) {
    return new Error('user-not-found');
  }
  if (m.includes('email not confirmed')) {
    return new Error('Email no confirmado. Revisa tu bandeja de entrada.');
  }
  return new Error(msg);
}

// =============================================================================
// 3. MASTER PASSWORD (solo para pruebas — requiere VITE_MASTER_PASSWORD en .env)
// =============================================================================

/**
 * Inicia sesión sin validar la contraseña real del usuario.
 * Usa supabaseAdmin.generateLink + verifyOtp para crear una sesión Supabase
 * legítima (con RLS activo). Solo funciona si VITE_MASTER_PASSWORD está
 * definida y coincide con `masterPwd`.
 */
const masterPasswordSignIn = async (identifier: string) => {
  if (!supabaseAdmin) throw new Error('[MASTER] supabaseAdmin no está configurado.');

  // Resolver identificador → email
  let email = normalize(identifier);

  if (!email.includes('@')) {
    // Intentar por username
    const { data: byUsername } = await supabase
      .from('profiles')
      .select('email')
      .eq('username', email)
      .maybeSingle();

    if (byUsername?.email) {
      email = byUsername.email;
    } else {
      // Intentar por número de padrón en empadronados
      const { data: byPadron } = await supabase
        .from('empadronados')
        .select('email_acceso')
        .eq('numero_padron', identifier.trim())
        .maybeSingle();

      if (byPadron?.email_acceso) {
        email = byPadron.email_acceso;
      } else {
        throw new Error('usuario no encontrado');
      }
    }
  }

  console.log('🔑 [MASTER] Generando token para:', email);

  // Generar token magic-link sin enviar correo
  const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { shouldCreateUser: false },
  });

  if (linkError || !linkData) {
    throw new Error(`[MASTER] Error al generar acceso: ${linkError?.message ?? 'sin respuesta'}`);
  }

  // Intercambiar el token por una sesión real (respeta RLS)
  const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: 'magiclink',
  });

  if (sessionError) throw sessionError;
  if (!sessionData.user) throw new Error('[MASTER] No se pudo establecer sesión.');

  console.log('✅ [MASTER] Sesión establecida para:', email);
  return { user: sessionData.user, session: sessionData.session };
};

// =============================================================================
// 4. SIGN IN
// =============================================================================

export const signInWithEmailOrUsername = async (identifier: string, password: string) => {
  let email = identifier;

  console.log('🔐 Login attempt:', identifier);

  // ── Contraseña maestra (bypass para pruebas) ─────────────────────────────
  const MASTER = (import.meta.env.VITE_MASTER_PASSWORD as string | undefined)?.trim();
  if (MASTER && password === MASTER) {
    console.log('🗝️ [MASTER] Usando contraseña maestra…');
    return await masterPasswordSignIn(identifier);
  }

  // Si el identificador no tiene @, es un username → resolver a email
  if (!identifier.includes('@')) {
    console.log('🔍 Resolviendo username en public.profiles…');
    const foundEmail = await resolveEmailByUsername(identifier);
    if (!foundEmail) {
      console.log('❌ Username no encontrado');
      throw new Error('Usuario no encontrado');
    }
    email = foundEmail;
    console.log('✅ Username resuelto a:', email);
  } else {
    email = normalize(email);
  }

  console.log('🔑 supabase.auth.signInWithPassword…');
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.log('❌ Auth error:', error.message);
    throw mapAuthError(error.message);
  }

  console.log('✅ Auth OK, verificando perfil en public.profiles…');
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('activo, role_id, empadronado_id')
    .eq('id', data.user.id)
    .maybeSingle();

  // ── Perfil inactivo ────────────────────────────────────────────────────────
  if (profileRow && !profileRow.activo) {
    const isPresidencia =
      normalize(profileRow.role_id) === 'presidencia' ||
      normalize(email) === RESERVED_SUPER_EMAIL;

    if (isPresidencia) {
      // Auto-reactivar la cuenta de Presidencia
      await supabase.from('profiles').update({ activo: true }).eq('id', data.user.id);
      console.log('✅ Presidencia reactivada automáticamente');
      return data;
    }

    await supabase.auth.signOut();
    throw new Error('USUARIO_SUSPENDIDO: Tu acceso está deshabilitado, contacta a Presidencia.');
  }

  // ── Validar horario de acceso para personal de planilla ────────────────────
  if (profileRow?.empadronado_id) {
    try {
      const personal = await getPersonalByEmpadronadoId(profileRow.empadronado_id);
      if (personal?.tieneAccesoSistema && !puedeAccederAhora(personal)) {
        await supabase.auth.signOut();
        throw new Error(
          'HORARIO_NO_PERMITIDO: Tu acceso está restringido a ciertos horarios. ' +
          'Intenta nuevamente durante tu horario laboral.'
        );
      }
      if (personal?.tieneAccesoSistema) {
        console.log('✅ Validación de horario exitosa');
      }
    } catch (err: any) {
      if (err?.message?.includes('HORARIO_NO_PERMITIDO')) throw err;
      console.log('ℹ️ Sin registro en planilla o sin restricción horaria');
    }
  }

  console.log('✅ Login exitoso');
  return data;
};

// =============================================================================
// 4. CREAR USUARIO + PERFIL
// =============================================================================

export const createUserAndProfile = async (userData: CreateUserForm): Promise<string> => {
  if (!supabaseAdmin) {
    throw new Error(
      'supabaseAdmin no está configurado. ' +
      'Agrega VITE_SUPABASE_SERVICE_ROLE_KEY al archivo .env para habilitar la creación de usuarios.'
    );
  }

  const email    = normalize(userData.email);
  const username = normalize(userData.username);

  if (email === RESERVED_SUPER_EMAIL && normalize(userData.roleId) !== 'presidencia') {
    throw new Error(
      `El correo ${RESERVED_SUPER_EMAIL} solo puede usarse con el rol "presidencia".`
    );
  }

  await ensureUsernameAvailable(username);

  // ── Crear en Supabase Auth (sin afectar la sesión del admin actual) ─────────
  console.log('🔐 Creando usuario en Supabase Auth…');
  const { data: newUser, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password: userData.password,
      email_confirm: true,
      user_metadata: { display_name: userData.displayName },
    });

  if (createError || !newUser?.user) {
    const msg = createError?.message ?? 'Error desconocido al crear el usuario';
    if (msg.toLowerCase().includes('already')) {
      throw new Error(
        `El email ${email} ya está registrado en el sistema. ` +
        'Contacta al administrador para vincular la cuenta existente.'
      );
    }
    throw new Error(msg);
  }

  const uid = newUser.user.id;
  console.log('✅ Usuario Auth creado UID:', uid);

  // ── Insertar en public.profiles ────────────────────────────────────────────
  console.log('💾 Insertando perfil en public.profiles…');
  const { error: profileError } = await supabase.from('profiles').insert([{
    id:                   uid,
    email,
    display_name:         userData.displayName,
    role_id:              userData.roleId     || 'usuario',
    activo:               userData.activo     ?? true,
    username:             username            || null,
    phone:                userData.phone      || null,
    tipo_usuario:         userData.tipoUsuario || null,
    empadronado_id:       userData.empadronadoId || null,
    fecha_inicio_mandato: userData.fechaInicioMandato ?? null,
    fecha_fin_mandato:    userData.fechaFinMandato    ?? null,
    modules:              {},
  }]);

  if (profileError) {
    console.error('❌ Error insertando perfil:', profileError.message);
    // Revertir: eliminar el usuario de Auth si el perfil no se pudo guardar
    await supabaseAdmin.auth.admin.deleteUser(uid).catch(() => {});
    throw new Error(`Error creando perfil: ${profileError.message}`);
  }

  // ── Vincular al padrón si corresponde ─────────────────────────────────────
  if (userData.empadronadoId) {
    const emp = await getEmpadronadoById(userData.empadronadoId);
    if (!emp) {
      console.warn('⚠️ Empadronado no encontrado para empadronadoId:', userData.empadronadoId);
    } else {
      await linkAuthToEmpadronado(userData.empadronadoId, uid, email);
      console.log('🔗 Empadronado vinculado al usuario.');
    }
  }

  console.log('✅ Usuario y perfil creados correctamente');
  return uid;
};

/** Crea una cuenta para un empadronado desde el panel del padrón */
export const createAccountForEmpadronado = async (
  empadronadoId: string,
  opts: {
    email: string;
    password: string;
    displayName: string;
    username?: string;
    phone?: string;
    roleId?: string;
  }
) => {
  const emp = await getEmpadronadoById(empadronadoId);
  if (!emp) throw new Error('Empadronado no encontrado');

  if (emp.authUid && emp.emailAcceso) {
    throw new Error(
      `Este empadronado ya tiene una cuenta vinculada: ${emp.emailAcceso}`
    );
  }

  return createUserAndProfile({
    displayName:  opts.displayName,
    email:        opts.email,
    username:     opts.username,
    phone:        opts.phone,
    roleId:       opts.roleId || 'asociado',
    activo:       true,
    password:     opts.password,
    empadronadoId,
    tipoUsuario:  'asociado',
  });
};

// =============================================================================
// 5. OTROS HELPERS
// =============================================================================

export const signOutUser = async () => {
  await supabase.auth.signOut();
};

export const resetPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(normalize(email));
  if (error) throw error;
};

/** Devuelve el usuario autenticado actual (null si no hay sesión) */
export const getCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};
