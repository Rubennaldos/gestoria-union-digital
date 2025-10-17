// Firebase Auth & RTDB Types for Users & Permissions Module

/* ──────────────────────────────────────────────────────────
   Permission model
   ────────────────────────────────────────────────────────── */
export type PermissionLevel = "none" | "read" | "write" | "approve" | "admin";
export type Permission = Record<string, PermissionLevel>;
export type EffectivePermissions = Permission;

/* ──────────────────────────────────────────────────────────
   User model
   ────────────────────────────────────────────────────────── */
export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  roleId: string; // p.ej. 'asociado' | 'presidencia' | ...
  activo: boolean;

  // opcionales / metadatos
  username?: string;
  phone?: string;
  empadronadoId?: string; // Relación con empadronado
  tipoUsuario?: "administrador" | "presidente" | "directivo" | "delegado" | "asociado";
  fechaInicioMandato?: number; // Para directivos/delegados
  fechaFinMandato?: number;    // Para directivos/delegados
  createdAt?: number;
  updatedAt?: number;
}

export interface UsernameMapping {
  uid: string;
  email: string;
}

/* ──────────────────────────────────────────────────────────
   RBAC models
   ────────────────────────────────────────────────────────── */
export interface Role {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number; // para ordenar en UI
}

export interface Module {
  id: string;
  nombre: string;
  orden: number;
  icon?: string;
  requiereAprobacion?: boolean;
}

/* ──────────────────────────────────────────────────────────
   Delegations / Audit
   ────────────────────────────────────────────────────────── */
export interface Delegation {
  uid: string;            // = targetUid
  startTs: number;
  endTs: number;
  grantedByUid: string;
  modules?: Permission;   // específicos o total
}

export interface AuditLog {
  id: string;
  ts: number;
  actorUid: string;
  targetUid?: string;
  accion: string;
  moduloId?: string;
  old?: any;
  new?: any;
}

/* ──────────────────────────────────────────────────────────
   Bootstrap
   ────────────────────────────────────────────────────────── */
export interface BootstrapData {
  initialized: boolean;
}

/* ──────────────────────────────────────────────────────────
   Auth wrappers & forms
   ────────────────────────────────────────────────────────── */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  profile?: UserProfile;
  modules?: {
    [key: string]: boolean | string;
  };
}

export interface CreateUserForm {
  displayName: string;
  email: string;
  password: string;
  roleId: string;
  activo: boolean;

  username?: string;
  phone?: string;
  empadronadoId?: string;
  tipoUsuario?: "administrador" | "presidente" | "directivo" | "delegado" | "asociado";
  fechaInicioMandato?: number;
  fechaFinMandato?: number;
}

export interface UpdateUserForm {
  email?: string;
  displayName?: string;
  username?: string;
  phone?: string;
  roleId?: string;
  activo?: boolean;
  empadronadoId?: string;
  tipoUsuario?: "administrador" | "presidente" | "directivo" | "delegado" | "asociado";
  fechaInicioMandato?: number;
  fechaFinMandato?: number;
  updatedAt?: number;
}

export interface CreateDelegationForm {
  targetUid: string;
  startTs: number;
  endTs: number;
  modules?: Permission;
}
