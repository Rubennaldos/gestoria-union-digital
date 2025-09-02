import { ref, set, get, push, update, onValue, off, query, orderByChild, equalTo } from "firebase/database";
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

// User operations
export const createUserProfile = async (uid: string, userData: Omit<UserProfile, 'uid'> & { uid: string }) => {
  // Filtrar campos undefined para evitar errores en Firebase RTDB
  const cleanUserData = Object.fromEntries(
    Object.entries(userData).filter(([_, value]) => value !== undefined)
  );
  
  const userRef = ref(db, `users/${uid}`);
  await set(userRef, cleanUserData);
  
  // Si tiene username, crear mapping
  if (userData.username) {
    const usernameRef = ref(db, `usernames/${userData.username}`);
    await set(usernameRef, { uid, email: userData.email });
  }
  
  await writeAuditLog({
    actorUid: userData.uid,
    targetUid: uid,
    accion: "USUARIO_CREADO",
    new: userData
  });
};

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const userRef = ref(db, `users/${uid}`);
  const snapshot = await get(userRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const updateUserProfile = async (uid: string, updates: UpdateUserForm, actorUid: string) => {
  const userRef = ref(db, `users/${uid}`);
  const oldData = await getUserProfile(uid);
  
  await update(userRef, updates);
  
  // Si cambió username, actualizar mapping
  if (updates.username && oldData?.username !== updates.username) {
    // Remover username anterior
    if (oldData?.username) {
      const oldUsernameRef = ref(db, `usernames/${oldData.username}`);
      await set(oldUsernameRef, null);
    }
    
    // Crear nuevo mapping
    const newUsernameRef = ref(db, `usernames/${updates.username}`);
    await set(newUsernameRef, { uid, email: oldData?.email });
  }
  
  await writeAuditLog({
    actorUid,
    targetUid: uid,
    accion: "USUARIO_ACTUALIZADO",
    old: oldData,
    new: updates
  });
};

export const toggleUserActive = async (uid: string, activo: boolean, actorUid: string) => {
  await updateUserProfile(uid, { activo }, actorUid);
};

export const listUsers = async (filters?: { roleId?: string; activo?: boolean; search?: string }): Promise<UserProfile[]> => {
  const usersRef = ref(db, 'users');
  const snapshot = await get(usersRef);
  
  if (!snapshot.exists()) return [];
  
  let users: UserProfile[] = Object.values(snapshot.val());
  
  if (filters) {
    if (filters.roleId) {
      users = users.filter(u => u.roleId === filters.roleId);
    }
    if (filters.activo !== undefined) {
      users = users.filter(u => u.activo === filters.activo);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      users = users.filter(u => 
        u.displayName.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search) ||
        u.username?.toLowerCase().includes(search)
      );
    }
  }
  
  return users;
};

// Permission operations
export const setPermission = async (uid: string, moduleId: string, level: PermissionLevel, actorUid: string) => {
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

export const getPermission = async (uid: string, moduleId: string): Promise<PermissionLevel> => {
  const permRef = ref(db, `permissions/${uid}/${moduleId}`);
  const snapshot = await get(permRef);
  return snapshot.exists() ? snapshot.val() : "none";
};

export const getUserPermissions = async (uid: string): Promise<Permission> => {
  const permRef = ref(db, `permissions/${uid}`);
  const snapshot = await get(permRef);
  return snapshot.exists() ? snapshot.val() : {};
};

export const setUserPermissions = async (uid: string, permissions: Permission, actorUid?: string) => {
  const permRef = ref(db, `permissions/${uid}`);
  await set(permRef, permissions);
  
  if (actorUid) {
    await writeAuditLog({
      actorUid,
      targetUid: uid,
      accion: "PERMISOS_ACTUALIZADOS",
      new: permissions
    });
  }
};

export const applyMirrorPermissions = async (uid: string, mirrorConfig: Permission, actorUid: string) => {
  const updates: { [key: string]: PermissionLevel } = {};
  
  for (const [moduleId, level] of Object.entries(mirrorConfig)) {
    updates[`permissions/${uid}/${moduleId}`] = level;
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
  const basePermissions = await getUserPermissions(uid);
  const delegation = await getActiveDelegation(uid);
  
  if (!delegation) return basePermissions;
  
  // Aplicar delegación
  const effective = { ...basePermissions };
  if (delegation.modules) {
    for (const [moduleId, level] of Object.entries(delegation.modules)) {
      // Solo elevar permisos, no reducir
      if (!effective[moduleId] || level === "admin" || 
          (level === "approve" && effective[moduleId] !== "admin") ||
          (level === "write" && !["admin", "approve"].includes(effective[moduleId])) ||
          (level === "read" && effective[moduleId] === "none")) {
        effective[moduleId] = level;
      }
    }
  }
  
  return effective;
};

// Delegation operations
export const setDelegation = async (delegationData: CreateDelegationForm, actorUid: string) => {
  const delegationRef = ref(db, `delegations/${delegationData.targetUid}`);
  const delegation: Delegation = {
    uid: delegationData.targetUid,
    ...delegationData,
    grantedByUid: actorUid
  };
  
  await set(delegationRef, delegation);
  
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
  
  const delegation: Delegation = snapshot.val();
  const now = Date.now();
  
  // Verificar si está vigente
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
    old: oldDelegation
  });
};

// Roles and Modules
export const listRoles = async (): Promise<Role[]> => {
  const rolesRef = ref(db, 'roles');
  const snapshot = await get(rolesRef);
  return snapshot.exists() ? Object.values(snapshot.val()) : [];
};

export const listModules = async (): Promise<Module[]> => {
  const modulesRef = ref(db, 'modules');
  const snapshot = await get(modulesRef);
  const modules: Module[] = snapshot.exists() ? Object.values(snapshot.val()) : [];
  return modules.sort((a, b) => a.orden - b.orden);
};

// Audit operations
export const writeAuditLog = async (entry: Omit<AuditLog, 'id' | 'ts'>) => {
  const logsRef = ref(db, 'auditLogs');
  const newLogRef = push(logsRef);
  
  const auditEntry: AuditLog = {
    ...entry,
    id: newLogRef.key!,
    ts: Date.now()
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
  const logsRef = ref(db, 'auditLogs');
  const snapshot = await get(logsRef);
  
  if (!snapshot.exists()) return [];
  
  let logs: AuditLog[] = Object.values(snapshot.val());
  
  // Ordenar por timestamp descendente
  logs.sort((a, b) => b.ts - a.ts);
  
  if (filters) {
    if (filters.actorUid) {
      logs = logs.filter(l => l.actorUid === filters.actorUid);
    }
    if (filters.targetUid) {
      logs = logs.filter(l => l.targetUid === filters.targetUid);
    }
    if (filters.moduloId) {
      logs = logs.filter(l => l.moduloId === filters.moduloId);
    }
    if (filters.startTs) {
      logs = logs.filter(l => l.ts >= filters.startTs!);
    }
    if (filters.endTs) {
      logs = logs.filter(l => l.ts <= filters.endTs!);
    }
  }
  
  return logs;
};

// Bootstrap operations
export const isBootstrapInitialized = async (): Promise<boolean> => {
  const bootstrapRef = ref(db, 'bootstrap/initialized');
  const snapshot = await get(bootstrapRef);
  return snapshot.exists() ? snapshot.val() : false;
};

export const setBootstrapInitialized = async () => {
  const bootstrapRef = ref(db, 'bootstrap/initialized');
  await set(bootstrapRef, true);
};

// Real-time subscriptions
export const onPermissions = (uid: string, callback: (permissions: Permission) => void) => {
  const permRef = ref(db, `permissions/${uid}`);
  return onValue(permRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : {});
  });
};

export const onUserProfile = (uid: string, callback: (profile: UserProfile | null) => void) => {
  const userRef = ref(db, `users/${uid}`);
  return onValue(userRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
};

/* ──────────────────────────────────────────────────────────────
   VINCULAR USUARIO EXISTENTE A UN EMPADRONADO (DESIGNAR)
   ────────────────────────────────────────────────────────────── */

/**
 * Busca perfil por identificador: email o username.
 * - Si es email: recorre 'users' y compara por email (case-insensitive).
 * - Si es username: usa índice 'usernames/{username}' -> {uid} -> users/{uid}.
 */
export const findUserByIdentifier = async (identifier: string): Promise<UserProfile | null> => {
  const raw = (identifier || "").trim();
  if (!raw) return null;

  // Si no es email, tratamos como username (probar tal cual y en minúsculas)
  if (!raw.includes("@")) {
    let mapSnap = await get(ref(db, `usernames/${raw}`));
    if (!mapSnap.exists()) {
      mapSnap = await get(ref(db, `usernames/${raw.toLowerCase()}`));
    }
    if (!mapSnap.exists()) return null;
    const { uid } = mapSnap.val() || {};
    if (!uid) return null;
    return await getUserProfile(uid);
  }

  // Es email
  const email = raw.toLowerCase();
  const usersSnap = await get(ref(db, "users"));
  if (!usersSnap.exists()) return null;
  const all: Record<string, UserProfile> = usersSnap.val();
  const found = Object.values(all).find(u => (u.email || "").toLowerCase() === email);
  return found || null;
};

/**
 * Designa (vincula) un usuario existente (por email o username) a un empadronado.
 * Reglas:
 *  - 1 empadronado -> 1 usuario (reemplaza si ya tenía otro)
 *  - 1 usuario -> 1 empadronado (si estaba en otro, lo desvincula de aquel)
 * Índices usados:
 *  - users/{uid}/empadronadoId
 *  - empadronado_user_index/{empadronadoId} = { uid, at }
 */
export const designarUsuarioAEmpadronado = async (
  empadronadoId: string,
  identifier: string,
  actorUid: string
): Promise<UserProfile> => {
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    throw new Error("USUARIO_NO_ENCONTRADO");
  }

  // Usuario previamente vinculado a otro empadronado (si aplica)
  const prevEmpId: string | null = user.empadronadoId ?? null;

  // Empadronado tenía usuario antes (índice)
  const idxSnap = await get(ref(db, `empadronado_user_index/${empadronadoId}`));
  const prevUserUid: string | null = idxSnap.exists() ? (idxSnap.val()?.uid ?? null) : null;

  const updates: Record<string, any> = {};
  // Vincular nuevo usuario -> empadronado
  updates[`users/${user.uid}/empadronadoId`] = empadronadoId;
  updates[`empadronado_user_index/${empadronadoId}`] = { uid: user.uid, at: Date.now() };

  // Si el empadronado tenía otro usuario, desvincularlo
  if (prevUserUid && prevUserUid !== user.uid) {
    updates[`users/${prevUserUid}/empadronadoId`] = null;
  }

  // Si el usuario estaba vinculado a otro empadronado diferente, limpiar ese índice
  if (prevEmpId && prevEmpId !== empadronadoId) {
    updates[`empadronado_user_index/${prevEmpId}`] = null;
  }

  await update(ref(db), updates);

  await writeAuditLog({
    actorUid,
    targetUid: user.uid,
    accion: "USUARIO_DESIGNADO_A_EMP",
    moduloId: "padron",
    old: { prevUserUid, prevEmpId },
    new: { empadronadoId, userUid: user.uid, identifier }
  });

  return { ...user, empadronadoId };
};
