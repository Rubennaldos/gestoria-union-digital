import { db } from '@/config/firebase';
import { ref, set } from 'firebase/database';
import { Usuario, Sesion, Finanza, Cuota, IncidenteSeguridad, Comunicado, Alert } from '@/types/firebase';
import { seedDeportesData } from './seedDeportesData';

// Seed data for Firebase RTDB
export const seedFirebaseData = async () => {
  try {
    // Users seed data
    const usuarios: { [key: string]: Usuario } = {
      'user1': {
        uid: 'user1',
        nombre: 'Juan Pérez',
        email: 'presidente@jpusap.com',
        telefono: '987654321',
        etapa: 'Etapa 1',
        rol: 'presidencia',
        permisos: {
          usuarios: { ver: true, crear: true, editar: true, aprobar: true },
          finanzas: { ver: true, crear: true, editar: true, aprobar: true },
          sesiones: { ver: true, crear: true, editar: true, aprobar: true },
          seguridad: { ver: true, crear: true, editar: true, aprobar: true },
          comunicaciones: { ver: true, crear: true, editar: true, aprobar: true }
        },
        activo: true,
        fechaCreacion: '2024-01-01',
        ultimoAcceso: '2024-01-15'
      },
      'user2': {
        uid: 'user2',
        nombre: 'María García',
        email: 'economia@jpusap.com',
        telefono: '987654322',
        etapa: 'Etapa 2',
        rol: 'economia',
        permisos: {
          finanzas: { ver: true, crear: true, editar: true, aprobar: true },
          sesiones: { ver: true, crear: false, editar: false, aprobar: false },
          comunicaciones: { ver: true, crear: false, editar: false, aprobar: false }
        },
        activo: true,
        fechaCreacion: '2024-01-02',
        ultimoAcceso: '2024-01-14'
      }
    };

    // Alerts seed data
    const alerts: { [key: string]: Alert } = {
      'alert1': {
        id: 'alert1',
        tipo: 'cuota_vencida',
        titulo: 'Cuotas Vencidas',
        mensaje: '15 asociados tienen cuotas pendientes de pago',
        prioridad: 'alta',
        fecha: '2024-01-15T10:30:00Z',
        leida: false,
        accion_requerida: 'Revisar pagos pendientes',
        enlace: '/finanzas'
      },
      'alert2': {
        id: 'alert2',
        tipo: 'sesion_proxima',
        titulo: 'Sesión Próxima',
        mensaje: 'Sesión ordinaria programada para el 20 de enero',
        prioridad: 'media',
        fecha: '2024-01-15T08:00:00Z',
        leida: false,
        enlace: '/sesiones'
      },
      'alert3': {
        id: 'alert3',
        tipo: 'incidente_seguridad',
        titulo: 'Incidente de Seguridad',
        mensaje: 'Reporte de robo en Etapa 3, requiere seguimiento',
        prioridad: 'urgente',
        fecha: '2024-01-15T14:20:00Z',
        etapa: 'Etapa 3',
        leida: false,
        accion_requerida: 'Coordinar con seguridad',
        enlace: '/seguridad'
      }
    };

    // Finances seed data
    const finanzas: { [key: string]: Finanza } = {
      'fin1': {
        id: 'fin1',
        tipo: 'ingreso',
        concepto: 'Cuota ordinaria enero 2024',
        monto: 50,
        fecha: '2024-01-10',
        asociado_id: 'user1',
        voucher_numero: 'V001234',
        banco: 'BCP',
        metodo_pago: 'transferencia',
        categoria: 'cuotas',
        estado: 'aprobado'
      },
      'fin2': {
        id: 'fin2',
        tipo: 'egreso',
        concepto: 'Mantenimiento área verde',
        monto: 300,
        fecha: '2024-01-12',
        metodo_pago: 'efectivo',
        categoria: 'mantenimiento',
        comprobante_numero: 'R001',
        aprobado_por: 'user1',
        estado: 'aprobado'
      }
    };

    // Sessions seed data
    const sesiones: { [key: string]: Sesion } = {
      'ses1': {
        id: 'ses1',
        tipo: 'ordinaria',
        fecha: '2024-01-20',
        hora: '19:00',
        lugar: 'Salón comunal',
        agenda: [
          'Lectura del acta anterior',
          'Informe de tesorería',
          'Proyectos de mantenimiento',
          'Varios'
        ],
        quorum: {
          requerido: 7,
          presente: 0,
          alcanzado: false
        },
        asistentes: {},
        acuerdos: [],
        estado: 'programada',
        convocatoria_enviada: true,
        fecha_convocatoria: '2024-01-15'
      }
    };

    // Write all seed data to Firebase
    await Promise.all([
      set(ref(db, 'users'), usuarios),
      set(ref(db, 'alerts'), alerts),
      set(ref(db, 'finanzas'), finanzas),
      set(ref(db, 'sesiones'), sesiones),
      seedDeportesData() // Agregar datos de deportes
    ]);

    console.log('Seed data uploaded successfully to Firebase RTDB');
    return true;
  } catch (error) {
    console.error('Error seeding Firebase data:', error);
    return false;
  }
};