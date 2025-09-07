import { ref, set, get } from "firebase/database";
import { db } from "@/config/firebase";
import { Role, Module } from "@/types/auth";

export const isBootstrapInitialized = async (): Promise<boolean> => {
  const bootstrapRef = ref(db, 'bootstrap/initialized');
  const snapshot = await get(bootstrapRef);
  return snapshot.exists() ? snapshot.val() : false;
};

export const setBootstrapInitialized = async () => {
  const bootstrapRef = ref(db, 'bootstrap/initialized');
  await set(bootstrapRef, true);
};

export const seedRoles = async () => {
  const roles: Record<string, Role> = {
    presidencia: {
      id: 'presidencia',
      nombre: 'Presidente',
      descripcion: 'Presidente de la Junta Vecinal - Administrador General del Sistema',
      orden: 1
    },
    vicepresidencia: {
      id: 'vicepresidencia',
      nombre: 'Vicepresidencia',
      descripcion: 'Vicepresidente de la Junta Vecinal',
      orden: 2
    },
    economia: {
      id: 'economia',
      nombre: 'Economía',
      descripcion: 'Responsable de finanzas y tesorería',
      orden: 3
    },
    seguridad: {
      id: 'seguridad',
      nombre: 'Seguridad',
      descripcion: 'Coordinador de seguridad vecinal',
      orden: 4
    },
    actas_archivos: {
      id: 'actas_archivos',
      nombre: 'Actas y Archivos',
      descripcion: 'Secretario de actas y archivo',
      orden: 5
    },
    fiscal: {
      id: 'fiscal',
      nombre: 'Fiscal',
      descripcion: 'Órgano de control y fiscalización',
      orden: 6
    },
    deportes: {
      id: 'deportes',
      nombre: 'Deportes',
      descripcion: 'Coordinador de actividades deportivas',
      orden: 7
    },
    comunicaciones: {
      id: 'comunicaciones',
      nombre: 'Comunicaciones',
      descripcion: 'Responsable de comunicación vecinal',
      orden: 8
    },
    salud_medioambiente: {
      id: 'salud_medioambiente',
      nombre: 'Salud y Medio Ambiente',
      descripcion: 'Coordinador de salud y medio ambiente',
      orden: 9
    },
    educacion_cultura: {
      id: 'educacion_cultura',
      nombre: 'Educación y Cultura',
      descripcion: 'Responsable de educación y cultura',
      orden: 10
    },
    vocal: {
      id: 'vocal',
      nombre: 'Vocal',
      descripcion: 'Vocal de la Junta Vecinal',
      orden: 11
    },
    asociado: {
      id: 'asociado',
      nombre: 'Asociado',
      descripcion: 'Empadronado con acceso al portal',
      orden: 12
    }
  };

  const rolesRef = ref(db, 'roles');
  await set(rolesRef, roles);
};

export const seedModules = async () => {
  const modules: Record<string, Module> = {
    sesiones: {
      id: 'sesiones',
      nombre: 'Sesiones',
      icon: 'Users',
      orden: 1,
      requiereAprobacion: true
    },
    actas: {
      id: 'actas',
      nombre: 'Actas',
      icon: 'FileText',
      orden: 2,
      requiereAprobacion: true
    },
    archivos: {
      id: 'archivos',
      nombre: 'Archivos',
      icon: 'Archive',
      orden: 3,
      requiereAprobacion: false
    },
    finanzas: {
      id: 'finanzas',
      nombre: 'Finanzas',
      icon: 'DollarSign',
      orden: 4,
      requiereAprobacion: true
    },
    seguridad: {
      id: 'seguridad',
      nombre: 'Seguridad',
      icon: 'Shield',
      orden: 5,
      requiereAprobacion: false
    },
    comunicaciones: {
      id: 'comunicaciones',
      nombre: 'Comunicaciones',
      icon: 'MessageSquare',
      orden: 6,
      requiereAprobacion: false
    },
    deportes: {
      id: 'deportes',
      nombre: 'Deportes',
      icon: 'Trophy',
      orden: 7,
      requiereAprobacion: false
    },
    cobranzas: {
      id: 'cobranzas',
      nombre: 'Cobranzas',
      icon: 'DollarSign',
      orden: 7,
      requiereAprobacion: true
    },
    salud: {
      id: 'salud',
      nombre: 'Salud',
      icon: 'Heart',
      orden: 8,
      requiereAprobacion: false
    },
    ambiente: {
      id: 'ambiente',
      nombre: 'Medio Ambiente',
      icon: 'Leaf',
      orden: 9,
      requiereAprobacion: false
    },
    educacion: {
      id: 'educacion',
      nombre: 'Educación',
      icon: 'GraduationCap',
      orden: 10,
      requiereAprobacion: false
    },
    cultura: {
      id: 'cultura',
      nombre: 'Cultura',
      icon: 'Music',
      orden: 11,
      requiereAprobacion: false
    },
    auditoria: {
      id: 'auditoria',
      nombre: 'Auditoría',
      icon: 'Search',
      orden: 12,
      requiereAprobacion: false
    },
    padron: {
      id: 'padron',
      nombre: 'Padrón',
      icon: 'UserCheck',
      orden: 13,
      requiereAprobacion: true
    },
    sanciones: {
      id: 'sanciones',
      nombre: 'Sanciones',
      icon: 'AlertTriangle',
      orden: 14,
      requiereAprobacion: true
    },
    patrimonio: {
      id: 'patrimonio',
      nombre: 'Patrimonio',
      icon: 'Building',
      orden: 15,
      requiereAprobacion: true
    },
    planTrabajo: {
      id: 'planTrabajo',
      nombre: 'Plan de Trabajo',
      icon: 'Calendar',
      orden: 16,
      requiereAprobacion: true
    },
    electoral: {
      id: 'electoral',
      nombre: 'Electoral',
      icon: 'Vote',
      orden: 17,
      requiereAprobacion: true
    },
    acceso: {
      id: 'acceso',
      nombre: 'Control de Acceso',
      icon: 'Users',
      orden: 18,
      requiereAprobacion: false
    }
  };

  const modulesRef = ref(db, 'modules');
  await set(modulesRef, modules);
};

export const seedAuthData = async () => {
  try {
    await Promise.all([
      seedRoles(),
      seedModules()
    ]);
    console.log('Auth seed data loaded successfully');
  } catch (error) {
    console.error('Error seeding auth data:', error);
    throw error;
  }
};