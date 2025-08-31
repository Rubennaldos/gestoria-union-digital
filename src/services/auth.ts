// src/services/auth.ts
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  User as FirebaseUser,
} from "firebase/auth";
import { auth, adminAuth, db } from "@/config/firebase";
import { get, ref, set } from "firebase/database";
import { UserProfile, CreateUserForm } from "@/types/auth";
import { createUserProfile, getUserProfile, updateUserProfile } from "./rtdb";

const SUPER_EMAIL = "presidencia@jpusap.com";
const normalize = (v?: string | null) => (v || "").trim().toLowerCase();

/** Garantiza que el super admin tenga perfil activo y rol correcto */
const ensureSuperAdminProfile = async (uid: string, email?: string | null) => {
  if (normalize(email) !== SUPER_EMAIL) return;

  const current = await getUserProfile(uid);
  if (!current) {
    // Crear perfil base para super admin
    const profile: Partial<UserProfile> = {
      uid,
      email: email || SUPER_EMAIL,
      displayName: "Presidencia",
      roleId: "presidencia",
      activo: true,
      createdAt: Date.now(),
    } as any;

    await createUserProfile(uid, profile);

    // Crear alias de username por defecto (opcional)
    await set(ref(db, `usernames/presidencia`), {
      uid,
      email: email || SUPER_EMAIL,
    });
    return;
  }

  const updates: Partial<UserProfile> = {};
  let changed = false;

  if (normalize(current.roleId) !== "presidencia") {
    updates.roleId = "presidencia";
    changed = true;
  }
  if (current.activo !== true) {
    updates.activo = true;
    changed = true;
  }

  if (changed) {
    await updateUserProfile(uid, updates, uid);
  }
};

export const signInWithEmailOrUsername = async (identifier: string, password: string) => {
  let email = identifier.trim();

  // Si el identificador NO es email, resolver por username
  if (!email.includes("@")) {
    const usernameKey = normalize(email);
    const usernameRef = ref(db, `usernames/${usernameKey}`);
    const snapshot = await get(usernameRef);

    if (!snapshot.exists()) {
      throw new Error("Usuario no encontrado");
    }
    email = snapshot.val().email;
  }

  // Autenticación con Firebase
  const result = await signInWithEmailAndPassword(auth, email, password);

  // Asegurar estado/rol del super admin si corresponde
  await ensureSuperAdminProfile(result.user.uid, result.user.email);

  // Verificar perfil y activo
  let profile = await getUserProfile(result.user.uid);

  if (!profile) {
    // Si es super admin, ensureSuperAdminProfile ya lo creó; recargar
    profile = await getUserProfile(result.user.uid);
  }

  if (!profile?.activo) {
    // Intento de activación automática si es presidencia
    if (normalize(profile?.roleId) === "presidencia" || normalize(result.user.email) === SUPER_EMAIL) {
      await updateUserProfile(result.user.uid, { activo: true }, result.user.uid);
    } else {
      await signOut(auth);
      throw new Error("USUARIO_SUSPENDIDO: Tu acceso está deshabilitado, contacta a Presidencia.");
    }
  }

  return result;
};

export const createUserAndProfile = async (userData: CreateUserForm): Promise<string> => {
  const { password, username, ...profileData } = userData;

  // Si trae username, ideal guardarlo en /usernames después de crear
  const usernameKey = username ? normalize(username) : null;

  // Crear en Auth usando app secundaria para no afectar la sesión actual
  const cred = await createUserWithEmailAndPassword(adminAuth, userData.email, password);
  const uid = cred.user.uid;

  try {
    // Crear perfil en RTDB
    const baseProfile: Partial<UserProfile> = {
      ...profileData,
      uid,
      activo: profileData.activo ?? true, // por defecto activo
      createdAt: Date.now(),
    } as any;

    await createUserProfile(uid, baseProfile);

    // Mapear username -> {uid, email}
    if (usernameKey) {
      await set(ref(db, `usernames/${usernameKey}`), {
        uid,
        email: userData.email,
      });
    }

    return uid;
  } finally {
    // Cerrar sesión de la app secundaria
    await signOut(adminAuth);
  }
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const signOutUser = async () => {
  await signOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
