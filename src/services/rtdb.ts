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
  EffectivePermissions
} from "@/types/auth";

/* ────────────────────────────────
   Helpers
   ──────────────────────────────── */
const cleanUndefined = <T extends Record<string, any>>(obj: T): T => {
  const out: Record<string, any> = {};
  Object.entries(obj || {}).forEach(([k, v]) => {
    if (v !== undefined) {
      if (v && typeof v === "object" && !Array.isArray(v)) {
        out[k] = cleanUndefined(v as any);
      } else {
        out[k] = v;
      }
    }
  });
  return out as T;
};

/* ────────────────────────────────
   Users
   ──────────────────────────────── */
export const createUserProfile = async (
  uid: string,
  userData: Omit<UserProfile, "uid"> & { uid: string }
) => {
  const userRef = ref(db, `users/${uid}`);
  const data = cleanUndefined(userData);
  await set(userRef, data);

  if (data.username) {
    const usernameRef = ref(db, `usernames/${data.username}`);
    await set(usernameRef, { uid, email: data.email });
  }

  await writeAuditLog({
    actorUid: data.uid,
    targetUid: uid,
    accion: "USUARIO_CREADO",
    new: data
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

  const changes = cleanUndefined(updates);
  await update(userRef, changes);

  // Si cambió el username, actualizar mapping
  if (changes.username && oldData?.username !== changes.username) {
    if (oldData?.username) {
      const oldUsernameRef = ref(db, `usernames/${oldData.username}`);
      await set(oldUsernameRef, null);
    }
    const newUsernameRef = ref(db, `usernames/${changes.username}`);
    await set(newUsernameRef, { uid, email: oldData?.email });
  }

  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "USUARIO_ACTUALIZADO",
    old: oldData || undefined,
    new: changes
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

  let users: UserProfile[] = Object.values(snapshot.val() as Record<string, UserProfile>);

  if (filters) {
    if (filters.roleId) users = users.filter((u) => u.roleId === filters.roleId);
    if (filters.activo !== undefined) users = users.filter((u) => u.activo === filters.activo);
    if (filters.search) {
      const s = filters.search.toLowerCase();
      users = users.filter(
        (u) =>
          u.displayName?.toLowerCase().includes(s) ||
          u.email?.toLowerCase().includes(s) ||
          u.username?.toLowerCase().includes(s)
      );
    }
  }

  return users;
};

/* ────────────────────────────────
   Permissions
   ──────────────────────────────── */
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
    new: level
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
  const updates: Record<string, PermissionLevel> = {};
  for (const [moduleId, level] of Object.entries(mirrorConfig)) {
    updates[`permissions/${uid}/${moduleId}`] = level as PermissionLevel;
  }
  await update(ref(db), updates);

  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "PERMISOS_ESPEJO_APLICADOS",
    new: mirrorConfig
  });
};

export const getEffectivePermissions = async (uid: string): Promise<EffectivePermissions> => {
  const base = await getUserPermissions(uid);
  const delegation = await getActiveDelegation(uid);
  if (!delegation) return base;

  const effective: EffectivePermissions = { ...base };
  if (delegation.modules) {
    for (const [moduleId, level] of Object.entries(delegation.modules)) {
      const cur = effective[moduleId] || "none";
      if (
        cur === "none" ||
        level === "admin" ||
        (level === "approve" && cur !== "admin") ||
        (level === "write" && !["admin", "approve"].includes(cur)) ||
        (level === "read" && cur === "none")
      ) {
        effective[moduleId] = level;
      }
    }
  }
  return effective;
};

/* ────────────────────────────────
   Delegations
   ──────────────────────────────── */
export const setDelegation = async (delegationData: CreateDelegationForm, actorUid: string) => {
  const delegationRef = ref(db, `delegations/${delegationData.targetUid}`);
  const delegation: Delegation = {
    uid: delegationData.targetUid,
    ...delegationData,
    grantedByUid: actorUid
  };
  await set(delegationRef, cleanUndefined(delegation));

  await writeAuditLog({
    actorUid,
    targetUid: delegationData.targetUid,
    accion: "DELEGACION_CREADA",
    new: delegation
  });
};

export const getActiveDelegation = async (uid: string): Promise<Delegation | null> => {
  const delegationRef = ref(db, `delegations/${uid}`);
  const snapshot = await get(delegationRef);
  if (!snapshot.exists()) return null;

  const delegation = snapshot.val() as Delegation;
  const now = Date.now();
  if (now >= (delegation.startTs || 0) && now <= (delegation.endTs || 0)) {
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
    old: oldDelegation || undefined
  });
};

/* ────────────────────────────────
   Roles & Modules
   ──────────────────────────────── */
export const listRoles = async (): Promise<Role[]> => {
  const rolesRef = ref(db, "roles");
  const snapshot = await get(rolesRef);
  return snapshot.exists() ? (Object.values(snapshot.val()) as Role[]) : [];
};

export const listModules = async (): Promise<Module[]> => {
  const modulesRef = ref(db, "modules");
  const snapshot = await get(modulesRef);
  const modules: Module[] = snapshot.exists()
    ? (Object.values(snapshot.val()) as Module[])
    : [];
  return modules.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
};

/* ────────────────────────────────
   Audit
   ──────────────────────────────── */
export const writeAuditLog = async (entry: Omit<AuditLog, "id" | "ts">) => {
  const logsRef = ref(db, "auditLogs");
  const newLogRef = push(logsRef);

  const auditEntry: AuditLog = cleanUndefined({
    ...entry,
    id: newLogRef.key!,
    ts: Date.now()
  } as AuditLog);

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

  let logs: AuditLog[] = Object.values(snapshot.val() as Record<string, AuditLog>);
  logs.sort((a, b) => (b.ts || 0) - (a.ts || 0));

  if (filters) {
    if (filters.actorUid) logs = logs.filter((l) => l.actorUid === filters.actorUid);
    if (filters.targetUid) logs = logs.filter((l) => l.targetUid === filters.targetUid);
    if (filters.moduloId) logs = logs.filter((l) => l.moduloId === filters.moduloId);
    if (filters.startTs) logs = logs.filter((l) => (l.ts || 0) >= filters.startTs!);
    if (filters.endTs) logs = logs.filter((l) => (l.ts || 0) <= filters.endTs!);
  }

  return logs;
};

/* ────────────────────────────────
   Bootstrap
   ──────────────────────────────── */
export const isBootstrapInitialized = async (): Promise<boolean> => {
  const bootstrapRef = ref(db, "bootstrap/initialized");
  const snapshot = await get(bootstrapRef);
  return snapshot.exists() ? (snapshot.val() as boolean) : false;
};

export const setBootstrapInitialized = async () => {
  const bootstrapRef = ref(db, "bootstrap/initialized");
  await set(bootstrapRef, true);
};

/* ────────────────────────────────
   Subscriptions (con unsubscribe)
   ──────────────────────────────── */
export const onPermissions = (uid: string, callback: (permissions: Permission) => void) => {
  const permRef = ref(db, `permissions/${uid}`);
  const handler = (snapshot: any) => {
    callback(snapshot.exists() ? (snapshot.val() as Permission) : {});
  };
  onValue(permRef, handler);
  return () => off(permRef, "value", handler);
};

export const onUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  const userRef = ref(db, `users/${uid}`);
  const handler = (snapshot: any) => {
    callback(snapshot.exists() ? (snapshot.val() as UserProfile) : null);
  };
  onValue(userRef, handler);
  return () => off(userRef, "value", handler);
};
