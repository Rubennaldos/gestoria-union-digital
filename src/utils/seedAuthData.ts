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
      nombre: 'Presidencia',
      descripcion: 'Presidente de la Junta Vecinal'
    },
    vicepresidencia: {
      id: 'vicepresidencia',
      nombre: 'Vicepresidencia',
      descripcion: 'Vicepresidente de la Junta Vecinal'
    },
    economia: {
      id: 'economia',
      nombre: 'Economía',
      descripcion: 'Responsable de finanzas y tesorería'
    },
    seguridad: {
      id: 'seguridad',
      nombre: 'Seguridad',
      descripcion: 'Coordinador de seguridad vecinal'
    },
    actas_archivos: {
      id: 'actas_archivos',
      nombre: 'Actas y Archivos',
      descripcion: 'Secretario de actas y archivo'
    },
    fiscal: {
      id: 'fiscal',
      nombre: 'Fiscal',
      descripcion: 'Órgano de control y fiscalización'
    },
    deportes: {
      id: 'deportes',
      nombre: 'Deportes',
      descripcion: 'Coordinador de actividades deportivas'
    },
    comunicaciones: {
      id: 'comunicaciones',
      nombre: 'Comunicaciones',
      descripcion: 'Responsable de comunicación vecinal'
    },
    salud_medioambiente: {
      id: 'salud_medioambiente',
      nombre: 'Salud y Medio Ambiente',
      descripcion: 'Coordinador de salud y medio ambiente'
    },
    educacion_cultura: {
      id: 'educacion_cultura',
      nombre: 'Educación y Cultura',
      descripcion: 'Responsable de educación y cultura'
    },
    vocal: {
      id: 'vocal',
      nombre: 'Vocal',
      descripcion: 'Vocal de la Junta Vecinal'
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