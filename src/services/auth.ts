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
import {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
} from "./rtdb";

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */
const normalize = (v?: string | null) => (v || "").trim().toLowerCase();
const SUPER_EMAIL = "presidencia@jpusap.com";

/* ──────────────────────────────────────────────────────────
   Login con email o username
   ────────────────────────────────────────────────────────── */
export const signInWithEmailOrUsername = async (
  identifier: string,
  password: string
) => {
  let email = normalize(identifier);

  console.log("🔐 Login attempt with identifier:", identifier);

  // Si no es un email, buscar mapping por username
  if (!email.includes("@")) {
    console.log("🔍 Looking up username in database...");
    const usernameRef = ref(db, `usernames/${identifier}`);
    const snapshot = await get(usernameRef);

    if (!snapshot.exists()) {
      console.log("❌ Username not found in database");
      // Debug opcional de todos los usernames
      const allUsernamesRef = ref(db, "usernames");
      const allSnapshot = await get(allUsernamesRef);
      if (allSnapshot.exists()) {
        console.log("🔍 Available usernames:", Object.keys(allSnapshot.val()));
      } else {
        console.log("❌ No usernames found in database at all");
      }
      throw new Error("Usuario no encontrado");
    }

    email = normalize(snapshot.val().email);
    console.log("✅ Username resolved to email:", email);
  }

  console.log("🔑 Attempting Firebase authentication...");
  const result = await signInWithEmailAndPassword(auth, email, password);
  console.log("✅ Firebase auth successful, checking user profile...");

  // Verificar/crear perfil
  let profile = await getUserProfile(result.user.uid);
  console.log("👤 User profile:", profile);

  // Si NO hay perfil y es el superusuario → crear perfil automático
  if (!profile && normalize(result.user.email) === SUPER_EMAIL) {
    console.log("🆕 No profile for presidencia; creating default profile...");
    await createUserProfile(
      result.user.uid,
      {
        uid: result.user.uid,
        email: normalize(result.user.email || SUPER_EMAIL),
        username: "presidencia",
        displayName: result.user.displayName || "Administrador Presidencia",
        roleId: "presidencia",
        activo: true,
        createdAt: Date.now(),
        tipoUsuario: "presidente",
        fechaInicioMandato: Date.now(),
        fechaFinMandato: Date.now() + 365 * 24 * 60 * 60 * 1000,
      },
      result.user.uid
    );
    profile = await getUserProfile(result.user.uid);
    console.log("✅ Auto profile created:", profile);
  }

  // Si está inactivo y es presidencia, activar
  if (!profile?.activo) {
    console.log("❌ User is not active");

    if (profile?.roleId === "presidencia" || email === SUPER_EMAIL) {
      console.log("🔧 Auto-activating presidencia user...");
      try {
        await updateUserProfile(
          result.user.uid,
          { activo: true },
          result.user.uid
        );
        console.log("✅ Presidencia user activated successfully");
        const updatedProfile = await getUserProfile(result.user.uid);
        console.log("✅ Updated profile:", updatedProfile);
        return result;
      } catch (error) {
        console.error("❌ Error activating presidencia user:", error);
      }
    }

    await signOut(auth);
    throw new Error(
      "USUARIO_SUSPENDIDO: Tu acceso está deshabilitado, contacta a Presidencia."
    );
  }

  console.log("✅ Login successful");
  return result;
};

/* ──────────────────────────────────────────────────────────
   Crear usuario (Auth) + perfil (RTDB)
   ────────────────────────────────────────────────────────── */
export const createUserAndProfile = async (
  userData: CreateUserForm
): Promise<string> => {
  const { password, ...profileData } = userData;

  console.log("🔧 createUserAndProfile called with:", {
    email: userData.email,
    username: userData.username,
    displayName: userData.displayName,
    roleId: userData.roleId,
  });

  // Validar username único si viene
  if (userData.username) {
    console.log("🔍 Checking username uniqueness:", userData.username);
    const usernameRef = ref(db, `usernames/${userData.username}`);
    const snapshot = await get(usernameRef);

    if (snapshot.exists()) {
      console.log("❌ Username already exists");
      throw new Error(`El usuario "${userData.username}" ya está en uso`);
    }
    console.log("✅ Username is available");
  }

  // Normalizar email
  const email = normalize(userData.email);

  console.log("🔐 Creating user in Firebase Auth with adminAuth...");
  const result = await createUserWithEmailAndPassword(
    adminAuth,
    email,
    password
  );
  const uid = result.user.uid;
  console.log("✅ Firebase Auth user created with UID:", uid);

  try {
    console.log("💾 Creating user profile in RTDB...");
    await createUserProfile(
      uid,
      {
        ...profileData,
        uid,
        email,
        createdAt: Date.now(),
      },
      uid // actorUid = el mismo usuario creado (si fuese un administrador, podrías pasar su uid)
    );
    console.log("✅ User profile created in RTDB");

    return uid;
  } finally {
    // Importante: cerrar sesión de la app secundaria
    console.log("🚪 Signing out from adminAuth...");
    await signOut(adminAuth);
    console.log("✅ Signed out from adminAuth");
  }
};

/* ──────────────────────────────────────────────────────────
   Utilidades de Auth
   ────────────────────────────────────────────────────────── */
export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, normalize(email));
};

export const signOutUser = async () => {
  await signOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};
