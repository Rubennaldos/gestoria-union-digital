// Firebase Auth & RTDB Types for Users & Permissions Module

export type PermissionLevel = "none" | "read" | "write" | "approve" | "admin";

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  displayName: string;
  roleId: string;
  activo: boolean;
  phone?: string;
  createdAt: number;
}

export interface UsernameMapping {
  uid: string;
  email: string;
}

export interface Role {
  id: string;
  nombre: string;
  descripcion: string;
}

export interface Module {
  id: string;
  nombre: string;
  icon: string;
  orden: number;
  requiereAprobacion: boolean;
}

export interface Permission {
  [moduleId: string]: PermissionLevel;
}

export interface Delegation {
  uid: string;
  startTs: number;
  endTs: number;
  grantedByUid: string;
  modules?: Permission; // específicos o total
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

export interface BootstrapData {
  initialized: boolean;
}

export interface EffectivePermissions {
  [moduleId: string]: PermissionLevel;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  profile?: UserProfile;
}

// Form types
export interface CreateUserForm {
  displayName: string;
  email: string;
  username?: string;
  phone?: string;
  roleId: string;
  activo: boolean;
  password: string;
}

export interface UpdateUserForm {
  displayName?: string;
  username?: string;
  phone?: string;
  roleId?: string;
  activo?: boolean;
}

export interface CreateDelegationForm {
  targetUid: string;
  startTs: number;
  endTs: number;
  modules?: Permission;
}