import { ref, set, get, push, update, onValue, off } from "firebase/database";
import { db } from "@/config/firebase";
import {
  UserProfile,
  Permission,
  Delegation,
  AuditLog,
  Role,
  Module,
  PermissionLevel,
  UpdateUserForm,
  CreateDelegationForm,
  EffectivePermissions,
} from "@/types/auth";

/* ──────────────────────────────────────────────────────────
   Helpers
   ────────────────────────────────────────────────────────── */
const usernamesPath = (u: string) => `usernames/${u}`;
const userPath = (uid: string) => `users/${uid}`;

/* ──────────────────────────────────────────────────────────
   USERS
   ────────────────────────────────────────────────────────── */
export const createUserProfile = async (
  uid: string,
  userData: Omit<UserProfile, "uid"> & { uid: string }
) => {
  // 1) Si viene username, validar que no exista
  if (userData.username) {
    const unameRef = ref(db, usernamesPath(userData.username));
    const unameSnap = await get(unameRef);
    if (unameSnap.exists()) {
      throw new Error(`El usuario "${userData.username}" ya está en uso`);
    }
  }

  // 2) Guardar perfil
  const userRef = ref(db, userPath(uid));
  await set(userRef, userData);

  // 3) Mapping username -> { uid, email }
  if (userData.username) {
    const usernameRef = ref(db, usernamesPath(userData.username));
    await set(usernameRef, { uid, email: userData.email });
  }

  await writeAuditLog({
    actorUid: userData.uid,
    targetUid: uid,
    accion: "USUARIO_CREADO",
    new: userData,
  });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = ref(db, userPath(uid));
  const snapshot = await get(userRef);
  return snapshot.exists() ? (snapshot.val() as UserProfile) : null;
};

export const updateUserProfile = async (
  uid: string,
  updates: UpdateUserForm,
  actorUid: string
) => {
  const userRef = ref(db, userPath(uid));
  const oldData = await getUserProfile(uid);

  // Validación de cambio de username (único)
  if (updates.username && updates.username !== oldData?.username) {
    const newUsernameRef = ref(db, usernamesPath(updates.username));
    const newUnameSnap = await get(newUsernameRef);
    if (newUnameSnap.exists()) {
      const { uid: existingUid } = newUnameSnap.val() || {};
      if (existingUid && existingUid !== uid) {
        throw new Error(`El usuario "${updates.username}" ya está en uso`);
      }
    }
  }

  await update(userRef, updates);

  // Mantener mapping de username en sync:
  // a) Si cambió username → eliminar anterior y crear nuevo
  if (updates.username && updates.username !== oldData?.username) {
    if (oldData?.username) {
      await set(ref(db, usernamesPath(oldData.username)), null);
    }
    await set(ref(db, usernamesPath(updates.username)), {
      uid,
      email: updates.email ?? oldData?.email ?? null,
    });
  }

  // b) Si NO cambió username pero cambió email → actualizar email en mapping
  if (!updates.username && updates.email && oldData?.username) {
    await set(ref(db, usernamesPath(oldData.username)), {
      uid,
      email: updates.email,
    });
  }

  // c) Si se removió el username (lo ponen vacío/null)
  if (updates.username === "" || updates.username === null) {
    if (oldData?.username) {
      await set(ref(db, usernamesPath(oldData.username)), null);
    }
  }

  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "USUARIO_ACTUALIZADO",
    old: oldData || undefined,
    new: updates,
  });
};

export const toggleUserActive = async (uid: string, activo: boolean, actorUid: string) => {
  await updateUserProfile(uid, { activo }, actorUid);
};

export const listUsers = async (filters?: {
  roleId?: string;
  activo?: boolean;
  search?: string;
}): Promise<UserProfile[]> => {
  const usersRef = ref(db, "users");
  const snapshot = await get(usersRef);

  if (!snapshot.exists()) return [];

  let users: UserProfile[] = Object.values(snapshot.val());

  if (filters) {
    if (filters.roleId) {
      users = users.filter((u) => u.roleId === filters.roleId);
    }
    if (filters.activo !== undefined) {
      users = users.filter((u) => u.activo === filters.activo);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(search) ||
          u.email.toLowerCase().includes(search) ||
          (u.username ? u.username.toLowerCase().includes(search) : false)
      );
    }
  }

  return users;
};

/* ──────────────────────────────────────────────────────────
   PERMISSIONS
   ────────────────────────────────────────────────────────── */
export const setPermission = async (
  uid: string,
  moduleId: string,
  level: PermissionLevel,
  actorUid: string
) => {
  const permRef = ref(db, `permissions/${uid}/${moduleId}`);
  const oldLevel = await getPermission(uid, moduleId);

  await set(permRef, level);

  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "PERMISO_CAMBIADO",
    moduloId: moduleId,
    old: oldLevel,
    new: level,
  });
};

export const getPermission = async (uid: string, moduleId: string): Promise<PermissionLevel> => {
  const permRef = ref(db, `permissions/${uid}/${moduleId}`);
  const snapshot = await get(permRef);
  return snapshot.exists() ? (snapshot.val() as PermissionLevel) : "none";
};

export const getUserPermissions = async (uid: string): Promise<Permission> => {
  const permRef = ref(db, `permissions/${uid}`);
  const snapshot = await get(permRef);
  return snapshot.exists() ? (snapshot.val() as Permission) : {};
};

export const applyMirrorPermissions = async (
  uid: string,
  mirrorConfig: Permission,
  actorUid: string
) => {
  const updates: { [key: string]: PermissionLevel } = {};
  for (const [moduleId, level] of Object.entries(mirrorConfig)) {
    updates[`permissions/${uid}/${moduleId}`] = level as PermissionLevel;
  }
  // update(root) con paths absolutos
  await update(ref(db), updates);

  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "PERMISOS_ESPEJO_APLICADOS",
    new: mirrorConfig,
  });
};

export const getEffectivePermissions = async (uid: string): Promise<EffectivePermissions> => {
  const basePermissions = await getUserPermissions(uid);
  const delegation = await getActiveDelegation(uid);

  if (!delegation) return basePermissions;

  const effective: EffectivePermissions = { ...basePermissions };
  if (delegation.modules) {
    for (const [moduleId, level] of Object.entries(delegation.modules)) {
      const current = effective[moduleId] || "none";
      // Solo elevar permisos (nunca reducir)
      const rank = (lvl: PermissionLevel) =>
        ({ none: 0, read: 1, write: 2, approve: 3, admin: 4 }[lvl]);

      if (rank(level as PermissionLevel) > rank(current)) {
        effective[moduleId] = level as PermissionLevel;
      }
    }
  }

  return effective;
};

/* ──────────────────────────────────────────────────────────
   DELEGATIONS
   ────────────────────────────────────────────────────────── */
export const setDelegation = async (delegationData: CreateDelegationForm, actorUid: string) => {
  const delegationRef = ref(db, `delegations/${delegationData.targetUid}`);
  const delegation: Delegation = {
    uid: delegationData.targetUid,
    ...delegationData,
    grantedByUid: actorUid,
  };

  await set(delegationRef, delegation);

  await writeAuditLog({
    actorUid,
    targetUid: delegationData.targetUid,
    accion: "DELEGACION_CREADA",
    new: delegation,
  });
};

export const getActiveDelegation = async (uid: string): Promise<Delegation | null> => {
  const delegationRef = ref(db, `delegations/${uid}`);
  const snapshot = await get(delegationRef);
  if (!snapshot.exists()) return null;

  const delegation = snapshot.val() as Delegation;
  const now = Date.now();

  if (now >= delegation.startTs && now <= delegation.endTs) {
    return delegation;
  }
  return null;
};

export const revokeDelegation = async (uid: string, actorUid: string) => {
  const delegationRef = ref(db, `delegations/${uid}`);
  const oldDelegation = (await get(delegationRef)).val();

  await set(delegationRef, null);

  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "DELEGACION_REVOCADA",
    old: oldDelegation || undefined,
  });
};

/* ──────────────────────────────────────────────────────────
   ROLES & MODULES
   ────────────────────────────────────────────────────────── */
export const listRoles = async (): Promise<Role[]> => {
  const rolesRef = ref(db, "roles");
  const snapshot = await get(rolesRef);
  return snapshot.exists() ? (Object.values(snapshot.val()) as Role[]) : [];
};

export const listModules = async (): Promise<Module[]> => {
  const modulesRef = ref(db, "modules");
  const snapshot = await get(modulesRef);
  const modules: Module[] = snapshot.exists() ? (Object.values(snapshot.val()) as Module[]) : [];
  return modules.sort((a, b) => a.orden - b.orden);
};

/* ──────────────────────────────────────────────────────────
   AUDIT
   ────────────────────────────────────────────────────────── */
export const writeAuditLog = async (entry: Omit<AuditLog, "id" | "ts">) => {
  const logsRef = ref(db, "auditLogs");
  const newLogRef = push(logsRef);

  const auditEntry: AuditLog = {
    ...entry,
    id: newLogRef.key!,
    ts: Date.now(),
  };

  await set(newLogRef, auditEntry);
};

export const listAuditLogs = async (filters?: {
  actorUid?: string;
  targetUid?: string;
  moduloId?: string;
  startTs?: number;
  endTs?: number;
}): Promise<AuditLog[]> => {
  const logsRef = ref(db, "auditLogs");
  const snapshot = await get(logsRef);

  if (!snapshot.exists()) return [];

  let logs: AuditLog[] = Object.values(snapshot.val());

  logs.sort((a, b) => b.ts - a.ts);

  if (filters) {
    if (filters.actorUid) logs = logs.filter((l) => l.actorUid === filters.actorUid);
    if (filters.targetUid) logs = logs.filter((l) => l.targetUid === filters.targetUid);
    if (filters.moduloId) logs = logs.filter((l) => l.moduloId === filters.moduloId);
    if (filters.startTs) logs = logs.filter((l) => l.ts >= filters.startTs!);
    if (filters.endTs) logs = logs.filter((l) => l.ts <= filters.endTs!);
  }

  return logs;
};

/* ──────────────────────────────────────────────────────────
   BOOTSTRAP
   ────────────────────────────────────────────────────────── */
export const isBootstrapInitialized = async (): Promise<boolean> => {
  const bootstrapRef = ref(db, "bootstrap/initialized");
  const snapshot = await get(bootstrapRef);
  return snapshot.exists() ? Boolean(snapshot.val()) : false;
};

export const setBootstrapInitialized = async () => {
  const bootstrapRef = ref(db, "bootstrap/initialized");
  await set(bootstrapRef, true);
};

/* ──────────────────────────────────────────────────────────
   REAL-TIME SUBSCRIPTIONS
   (Devolvemos función para desuscribir)
   ────────────────────────────────────────────────────────── */
export const onPermissions = (uid: string, callback: (permissions: Permission) => void) => {
  const permRef = ref(db, `permissions/${uid}`);
  const unsubscribe = onValue(permRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as Permission) : {});
  });
  return () => off(permRef) || (typeof unsubscribe === "function" ? unsubscribe() : undefined);
};

export const onUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  const uRef = ref(db, `users/${uid}`);
  const unsubscribe = onValue(uRef, (snapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as UserProfile) : null);
  });
  return () => off(uRef) || (typeof unsubscribe === "function" ? unsubscribe() : undefined);
};
