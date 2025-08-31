import {
  ref,
  set,
  get,
  push,
  update,
  onValue,
  off,
} from "firebase/database";
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
const lower = (v?: string | null) => (v || "").trim().toLowerCase();

/* ──────────────────────────────────────────────────────────
   USER OPERATIONS
   ────────────────────────────────────────────────────────── */

/**
 * Crea el perfil del usuario en RTDB.
 * @param uid UID del usuario (Firebase Auth)
 * @param userData Datos del perfil (incluye uid dentro del objeto)
 * @param actorUid (opcional) UID del actor que crea el perfil (para auditoría)
 */
export const createUserProfile = async (
  uid: string,
  userData: Omit<UserProfile, "uid"> & { uid: string },
  actorUid?: string
) => {
  const userRef = ref(db, `users/${uid}`);
  const payload: UserProfile = {
    ...userData,
    email: lower(userData.email),
    createdAt: userData.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
  await set(userRef, payload);

  // Si tiene username, crear mapping
  if (payload.username) {
    const usernameRef = ref(db, `usernames/${payload.username}`);
    await set(usernameRef, { uid, email: payload.email });
  }

  await writeAuditLog({
    actorUid: actorUid || userData.uid,
    targetUid: uid,
    accion: "USUARIO_CREADO",
    new: payload,
  });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = ref(db, `users/${uid}`);
  const snapshot = await get(userRef);
  return snapshot.exists() ? (snapshot.val() as UserProfile) : null;
};

export const updateUserProfile = async (
  uid: string,
  updates: UpdateUserForm,
  actorUid: string
) => {
  const userRef = ref(db, `users/${uid}`);
  const oldData = await getUserProfile(uid);

  const normalized: UpdateUserForm = {
    ...updates,
    email: updates.email ? lower(updates.email) : undefined,
    updatedAt: Date.now(),
  };

  await update(userRef, normalized);

  // Si cambió username, actualizar mapping
  if (normalized.username && oldData?.username !== normalized.username) {
    // Remover username anterior
    if (oldData?.username) {
      const oldUsernameRef = ref(db, `usernames/${oldData.username}`);
      await set(oldUsernameRef, null);
    }
    // Crear nuevo mapping
    const newUsernameRef = ref(db, `usernames/${normalized.username}`);
    await set(newUsernameRef, { uid, email: oldData?.email ?? "" });
  }

  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "USUARIO_ACTUALIZADO",
    old: oldData || undefined,
    new: normalized,
  });
};

export const toggleUserActive = async (
  uid: string,
  activo: boolean,
  actorUid: string
) => {
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

  let users: UserProfile[] = Object.values(
    snapshot.val() as Record<string, UserProfile>
  );

  if (filters) {
    if (filters.roleId) {
      users = users.filter((u) => u.roleId === filters.roleId);
    }
    if (filters.activo !== undefined) {
      users = users.filter((u) => u.activo === filters.activo);
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s) ||
          (u.username || "").toLowerCase().includes(s)
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

export const getPermission = async (
  uid: string,
  moduleId: string
): Promise<PermissionLevel> => {
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
    updates[`permissions/${uid}/${moduleId}`] = level;
  }
  await update(ref(db), updates);

  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "PERMISOS_ESPEJO_APLICADOS",
    new: mirrorConfig,
  });
};

export const getEffectivePermissions = async (
  uid: string
): Promise<EffectivePermissions> => {
  const basePermissions = await getUserPermissions(uid);
  const delegation = await getActiveDelegation(uid);

  if (!delegation) return basePermissions;

  // Aplicar delegación: solo elevamos, nunca reducimos
  const effective: EffectivePermissions = { ...basePermissions };
  if (delegation.modules) {
    for (const [moduleId, level] of Object.entries(delegation.modules)) {
      const current = effective[moduleId] || "none";
      const rank: PermissionLevel[] = ["none", "read", "write", "approve", "admin"];
      if (rank.indexOf(level) > rank.indexOf(current)) {
        effective[moduleId] = level;
      }
    }
  }

  return effective;
};

/* ──────────────────────────────────────────────────────────
   DELEGATIONS
   ────────────────────────────────────────────────────────── */

export const setDelegation = async (
  delegationData: CreateDelegationForm,
  actorUid: string
) => {
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

export const getActiveDelegation = async (
  uid: string
): Promise<Delegation | null> => {
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
    old: oldDelegation,
  });
};

/* ──────────────────────────────────────────────────────────
   ROLES & MODULES
   ────────────────────────────────────────────────────────── */

export const listRoles = async (): Promise<Role[]> => {
  const rolesRef = ref(db, "roles");
  const snapshot = await get(rolesRef);
  const roles: Role[] = snapshot.exists()
    ? Object.values(snapshot.val() as Record<string, Role>)
    : [];
  // Ordenar si tienen "orden"
  return roles.sort((a, b) => (a as any).orden - (b as any).orden);
};

export const listModules = async (): Promise<Module[]> => {
  const modulesRef = ref(db, "modules");
  const snapshot = await get(modulesRef);
  const modules: Module[] = snapshot.exists()
    ? Object.values(snapshot.val() as Record<string, Module>)
    : [];
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

  let logs: AuditLog[] = Object.values(
    snapshot.val() as Record<string, AuditLog>
  );

  logs.sort((a, b) => b.ts - a.ts);

  if (filters) {
    if (filters.actorUid) logs = logs.filter((l) => l.actorUid === filters.actorUid);
    if (filters.targetUid) logs = logs.filter((l) => l.targetUid === filters.targetUid);
    if (filters.moduloId) logs = logs.filter((l) => l.moduloId === filters.moduloId);
    if (filters.startTs) logs = logs.filter((l) => l.ts >= (filters.startTs as number));
    if (filters.endTs) logs = logs.filter((l) => l.ts <= (filters.endTs as number));
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
  const bootstrapRef = ref(db, "bootstrap");
  await update(bootstrapRef, {
    initialized: true,
    initializedAt: Date.now(),
  });
};

/* ──────────────────────────────────────────────────────────
   REAL-TIME SUBSCRIPTIONS (con desuscripción limpia)
   ────────────────────────────────────────────────────────── */

export const onPermissions = (
  uid: string,
  callback: (permissions: Permission) => void
) => {
  const permRef = ref(db, `permissions/${uid}`);
  const handler = (snapshot: any) => {
    callback(snapshot.exists() ? (snapshot.val() as Permission) : {});
  };
  onValue(permRef, handler);
  return () => off(permRef, "value", handler as any);
};

export const onUserProfile = (
  uid: string,
  callback: (profile: UserProfile | null) => void
) => {
  const userRef = ref(db, `users/${uid}`);
  const handler = (snapshot: any) => {
    callback(snapshot.exists() ? (snapshot.val() as UserProfile) : null);
  };
  onValue(userRef, handler);
  return () => off(userRef, "value", handler as any);
};
