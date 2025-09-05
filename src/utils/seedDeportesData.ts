import { db } from '@/config/firebase';
import { ref, set } from 'firebase/database';
import { Cancha, ConfiguracionDeportes } from '@/types/deportes';

// Datos de ejemplo para canchas
const canchasEjemplo: Omit<Cancha, 'id'>[] = [
  {
    nombre: 'Cancha Fútbol Boulevard 1',
    tipo: 'futbol',
    ubicacion: 'boulevard',
    activa: true,
    configuracion: {
      precioHora: 50,
      modificadorLuz: {
        '1h': 15,
        '2h': 25,
        '3h': 35
      },
      tarifaAportante: 40, // 40% descuento para aportantes
      horaMinima: 1,
      horaMaxima: 3,
      bufferMinutos: 15,
      horarios: {
        inicio: '06:00',
        fin: '22:00'
      }
    }
  },
  {
    nombre: 'Cancha Fútbol Boulevard 2',
    tipo: 'futbol',
    ubicacion: 'boulevard',
    activa: true,
    configuracion: {
      precioHora: 50,
      modificadorLuz: {
        '1h': 15,
        '2h': 25,
        '3h': 35
      },
      tarifaAportante: 40,
      horaMinima: 1,
      horaMaxima: 3,
      bufferMinutos: 15,
      horarios: {
        inicio: '06:00',
        fin: '22:00'
      }
    }
  },
  {
    nombre: 'Cancha Vóley Boulevard',
    tipo: 'voley',
    ubicacion: 'boulevard',
    activa: true,
    configuracion: {
      precioHora: 30,
      modificadorLuz: {
        '1h': 10,
        '2h': 18,
        '3h': 25
      },
      tarifaAportante: 40,
      horaMinima: 1,
      horaMaxima: 2,
      bufferMinutos: 10,
      horarios: {
        inicio: '06:00',
        fin: '22:00'
      }
    }
  },
  {
    nombre: 'Cancha Fútbol Quinta Llana',
    tipo: 'futbol',
    ubicacion: 'quinta_llana',
    activa: true,
    configuracion: {
      precioHora: 45,
      modificadorLuz: {
        '1h': 12,
        '2h': 22,
        '3h': 30
      },
      tarifaAportante: 40,
      horaMinima: 1,
      horaMaxima: 3,
      bufferMinutos: 15,
      horarios: {
        inicio: '06:00',
        fin: '22:00'
      }
    }
  },
  {
    nombre: 'Cancha Vóley Quinta Llana',
    tipo: 'voley',
    ubicacion: 'quinta_llana',
    activa: true,
    configuracion: {
      precioHora: 25,
      modificadorLuz: {
        '1h': 8,
        '2h': 15,
        '3h': 20
      },
      tarifaAportante: 40,
      horaMinima: 1,
      horaMaxima: 2,
      bufferMinutos: 10,
      horarios: {
        inicio: '06:00',
        fin: '22:00'
      }
    }
  }
];

// Configuración general de deportes
const configuracionDeportes: ConfiguracionDeportes = {
  limitesReservas: {
    reservasPorPersonaPorDia: 2,
    horasAntesParaCancelar: 2,
    horasAntesParaNoShow: 1
  },
  notificaciones: {
    whatsappTemplate: "Hola {nombre}, tu reserva para {cancha} el {fecha} de {horaInicio} a {horaFin} está confirmada. Total: S/{total}",
    recordatorioHoras: [24, 2]
  },
  horarios: {
    apertura: '06:00',
    cierre: '22:00',
    ultimaReserva: '21:00'
  },
  depositos: {
    requiereDeposito: false,
    montoDeposito: 20,
    equipos: {
      red: true,
      pelotas: true,
      tableros: false
    }
  }
};

export const seedDeportesData = async () => {
  try {
    console.log('Creando datos de ejemplo para deportes...');
    
    // Crear canchas de ejemplo
    const canchasRef = ref(db, 'deportes/canchas');
    const canchasData: { [key: string]: any } = {};
    
    canchasEjemplo.forEach((cancha, index) => {
      const id = `cancha_${index + 1}`;
      canchasData[id] = {
        ...cancha,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    });
    
    await set(canchasRef, canchasData);
    
    // Crear configuración de deportes
    const configRef = ref(db, 'deportes/configuracion');
    await set(configRef, configuracionDeportes);
    
    console.log('Datos de deportes creados exitosamente');
    return true;
  } catch (error) {
    console.error('Error al crear datos de deportes:', error);
    throw error;
  }
};