import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, adminAuth } from "@/config/firebase";
import { get, ref } from "firebase/database";
import { db } from "@/config/firebase";
import { CreateUserForm } from "@/types/auth";
import { createUserProfile, getUserProfile, updateUserProfile } from "./rtdb";
import { getEmpadronadoById, linkAuthToEmpadronado } from "@/services/empadronados";

/* ─────────────────────────────────────────────────────────
   Utils
   ───────────────────────────────────────────────────────── */
const normalize = (v?: string | null) => (v || "").trim().toLowerCase();
const RESERVED_SUPER_EMAIL = "presidencia@jpusap.com";

/** Busca email por username normalizado */
const resolveEmailByUsername = async (usernameRaw: string): Promise<string | null> => {
  const username = normalize(usernameRaw);
  if (!username) return null;
  const usernameRef = ref(db, `usernames/${username}`);
  const snapshot = await get(usernameRef);
  return snapshot.exists() ? String(snapshot.val().email || "") : null;
};

/** Verifica que un username (normalizado) esté libre */
const ensureUsernameAvailable = async (usernameRaw?: string | null) => {
  const username = normalize(usernameRaw);
  if (!username) return; // no hay username
  const usernameRef = ref(db, `usernames/${username}`);
  const snapshot = await get(usernameRef);
  if (snapshot.exists()) {
    throw new Error(`El usuario "${username}" ya está en uso`);
  }
};

/* ─────────────────────────────────────────────────────────
   Login: email o username
   ───────────────────────────────────────────────────────── */
export const signInWithEmailOrUsername = async (identifier: string, password: string) => {
  let email = identifier;

  console.log("🔐 Login attempt:", identifier);

  // Si el identificador NO tiene @, lo tratamos como username
  if (!identifier.includes("@")) {
    console.log("🔍 Resolviendo username en RTDB...");
    const foundEmail = await resolveEmailByUsername(identifier);
    if (!foundEmail) {
      console.log("❌ Username no encontrado");
      // Debug opcional
      const allUsernamesRef = ref(db, "usernames");
      const allSnapshot = await get(allUsernamesRef);
      if (allSnapshot.exists()) {
        console.log("🧭 Usernames disponibles:", Object.keys(allSnapshot.val()));
      }
      throw new Error("Usuario no encontrado");
    }
    email = foundEmail;
    console.log("✅ Username resuelto a email:", email);
  } else {
    email = normalize(email);
  }

  console.log("🔑 Firebase Auth signIn...");
  const result = await signInWithEmailAndPassword(auth, email, password);

  console.log("✅ Auth OK, leyendo perfil...");
  const profile = await getUserProfile(result.user.uid);
  console.log("👤 Perfil:", profile);

  // Si el perfil no está activo
  if (!profile?.activo) {
    // Auto-activar SOLO si es la cuenta de Presidencia
    if (normalize(profile?.roleId) === "presidencia" || normalize(email) === RESERVED_SUPER_EMAIL) {
      try {
        await updateUserProfile(result.user.uid, { activo: true }, result.user.uid);
        console.log("✅ Presidencia activada automáticamente");
        return result;
      } catch (e) {
        console.error("❌ Error auto-activando Presidencia:", e);
      }
    }

    await signOut(auth);
    throw new Error("USUARIO_SUSPENDIDO: Tu acceso está deshabilitado, contacta a Presidencia.");
  }

  console.log("✅ Login exitoso");
  return result;
};

/* ─────────────────────────────────────────────────────────
   Crear usuario + perfil (usando app secundaria)
   ───────────────────────────────────────────────────────── */
export const createUserAndProfile = async (userData: CreateUserForm): Promise<string> => {
  const {
    password,
    email: rawEmail,
    username: rawUsername,
    roleId,
    empadronadoId,
    ...restProfile
  } = userData;

  const email = normalize(rawEmail);
  const username = normalize(rawUsername);

  console.log("🔧 createUserAndProfile:", {
    email,
    username,
    displayName: userData.displayName,
    roleId: userData.roleId,
    empadronadoId,
  });

  // Reglas para la cuenta reservada de Presidencia
  if (email === RESERVED_SUPER_EMAIL && normalize(roleId) !== "presidencia") {
    throw new Error(
      `El correo ${RESERVED_SUPER_EMAIL} solo puede usarse con el rol "presidencia".`
    );
  }

  // Username único (si se proporciona)
  await ensureUsernameAvailable(username);

  console.log("🔐 Creando usuario en Auth (adminAuth)...");
  const result = await createUserWithEmailAndPassword(adminAuth, email, password);
  const uid = result.user.uid;
  console.log("✅ Usuario Auth creado UID:", uid);

  try {
    console.log("💾 Creando perfil en RTDB...");
    
    // Preparar datos de perfil filtrando valores undefined
    const profileData = {
      ...restProfile,
      email,
      username: username || null, // Usar null en lugar de undefined
      roleId,
      uid,
      createdAt: Date.now(),
      empadronadoId: empadronadoId || null, // Usar null en lugar de undefined
      phone: restProfile.phone || null, // Asegurar que phone sea null si está vacío
    };
    
    await createUserProfile(uid, profileData);

    // Vincular al padrón si corresponde
    if (empadronadoId) {
      const emp = await getEmpadronadoById(empadronadoId);
      if (!emp) {
        console.warn("⚠️ Empadronado no encontrado para empadronadoId:", empadronadoId);
      } else {
        await linkAuthToEmpadronado(empadronadoId, uid, email);
        console.log("🔗 Empadronado vinculado al usuario.");
      }
    }

    console.log("✅ Perfil creado y todo OK");
    return uid;
  } finally {
    // MUY IMPORTANTE: Cerrar sesión de la app secundaria
    console.log("🚪 Cerrando sesión adminAuth...");
    await signOut(adminAuth);
    console.log("✅ adminAuth signOut");
  }
};

/* Helper para crear la cuenta de un empadronado directo desde el padrón */
export const createAccountForEmpadronado = async (
  empadronadoId: string,
  opts: {
    email: string;
    password: string;
    displayName: string;
    username?: string;
    phone?: string;
    roleId?: string; // por defecto "asociado"
  }
) => {
  const emp = await getEmpadronadoById(empadronadoId);
  if (!emp) throw new Error("Empadronado no encontrado");

  // Verificar si el empadronado ya tiene una cuenta vinculada
  if (emp.authUid && emp.emailAcceso) {
    throw new Error(`Este empadronado ya tiene una cuenta vinculada: ${emp.emailAcceso}`);
  }

  try {
    const uid = await createUserAndProfile({
      displayName: opts.displayName,
      email: opts.email,
      username: opts.username,
      phone: opts.phone,
      roleId: opts.roleId || "asociado",
      activo: true,
      password: opts.password,
      empadronadoId,
      tipoUsuario: "asociado",
    });

    return uid;
  } catch (error: any) {
    // Si el email ya existe en Auth, dar un mensaje más claro
    if (error?.code === 'auth/email-already-in-use' || error?.message?.includes('email-already-in-use')) {
      throw new Error(
        `El email ${opts.email} ya está registrado en el sistema. ` +
        `Si es una cuenta existente, contacta al administrador para vincularla a este empadronado.`
      );
    }
    throw error;
  }
};

/* ─────────────────────────────────────────────────────────
   Otros helpers estándar
   ───────────────────────────────────────────────────────── */
export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, normalize(email));
};

export const signOutUser = async () => {
  await signOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
