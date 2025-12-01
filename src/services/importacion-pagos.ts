// Servicio para importación masiva de pagos desde Excel
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { getEmpadronados } from "./empadronados";
import { 
  obtenerChargesV2, 
  registrarPagoV2, 
  aprobarPagoV2,
  obtenerConfiguracionV2 
} from "./cobranzas-v2";
import type { Empadronado } from "@/types/empadronados";
import type { ChargeV2 } from "@/types/cobranzas-v2";

// Tipos para el resultado de la importación
export interface ResultadoImportacion {
  exitos: PagoImportado[];
  parciales: PagoParcial[];
  warnings: Warning[];
  errores: ErrorImportacion[];
  resumen: ResumenImportacion;
}

export interface PagoImportado {
  numeroPadron: string;
  empadronadoNombre: string;
  mes: string;
  monto: number;
  cargoId: string;
  pagoId: string;
}

export interface PagoParcial {
  numeroPadron: string;
  empadronadoNombre: string;
  mes: string;
  montoCargo: number;
  montoPagado: number;
  saldoRestante: number;
  cargoId: string;
  pagoId: string;
}

export interface Warning {
  numeroPadron: string;
  mes: string;
  razon: string;
  detalle?: string;
}

export interface ErrorImportacion {
  numeroPadron: string;
  mes?: string;
  razon: string;
  detalle?: string;
}

export interface ResumenImportacion {
  totalFilas: number;
  totalPagosIntentados: number;
  exitosos: number;
  parciales: number;
  warnings: number;
  errores: number;
  montoTotalImportado: number;
}

export interface FilaExcel {
  Padron: string | number;
  Enero?: string | number;
  Febrero?: string | number;
  Marzo?: string | number;
  Abril?: string | number;
  Mayo?: string | number;
  Junio?: string | number;
  Julio?: string | number;
  Agosto?: string | number;
  Septiembre?: string | number;
  Octubre?: string | number;
  Noviembre?: string | number;
  Diciembre?: string | number;
}

// Mapeo de nombres de meses a números
const MESES_MAP: Record<string, string> = {
  'Enero': '01',
  'Febrero': '02',
  'Marzo': '03',
  'Abril': '04',
  'Mayo': '05',
  'Junio': '06',
  'Julio': '07',
  'Agosto': '08',
  'Septiembre': '09',
  'Octubre': '10',
  'Noviembre': '11',
  'Diciembre': '12'
};

/**
 * Limpia y convierte el valor del monto a número
 */
function limpiarMonto(valor: string | number | undefined): number | null {
  if (!valor && valor !== 0) return null;
  
  // Si ya es un número, retornarlo directamente
  if (typeof valor === 'number') {
    return valor > 0 ? valor : null;
  }
  
  // Si es string, procesarlo
  if (typeof valor === 'string') {
    // Quitar comillas múltiples, espacios, y caracteres especiales
    let limpio = valor.trim().replace(/["']+/g, '');
    
    // Si está vacío después de limpiar, es null
    if (!limpio || limpio === '') return null;
    
    // Quitar símbolos de moneda y espacios
    limpio = limpio.replace(/[S\/$\s]/g, '');
    
    // Intentar convertir a número
    const numero = parseFloat(limpio);
    
    // Validar que sea un número válido y mayor a 0
    return !isNaN(numero) && numero > 0 ? numero : null;
  }
  
  return null;
}

/**
 * Busca un empadronado por número de padrón
 */
function buscarEmpadronadoPorPadron(
  numeroPadron: string | number, 
  empadronados: Empadronado[]
): Empadronado | null {
  // Convertir a string si es número
  const padronStr = String(numeroPadron).trim();
  
  return empadronados.find(emp => 
    emp.numeroPadron === padronStr || 
    emp.numeroPadron === numeroPadron.toString()
  ) || null;
}

/**
 * Busca el cargo para un empadronado y período específico
 */
function buscarCargo(
  empadronadoId: string,
  periodo: string, // YYYYMM
  charges: ChargeV2[]
): ChargeV2 | null {
  return charges.find(c => 
    c.empadronadoId === empadronadoId && 
    c.periodo === periodo
  ) || null;
}

/**
 * Valida los datos antes de importar
 */
export async function validarDatosImportacion(
  datos: FilaExcel[]
): Promise<{ valido: boolean; errores: string[] }> {
  const errores: string[] = [];
  
  // Validar que haya datos
  if (!datos || datos.length === 0) {
    errores.push("El archivo está vacío");
    return { valido: false, errores };
  }
  
  // Validar que tenga la columna Padron
  if (!datos[0].hasOwnProperty('Padron')) {
    errores.push("El archivo debe tener una columna 'Padron'");
  }
  
  // Validar que tenga al menos una columna de mes
  const columnasMeses = Object.keys(MESES_MAP);
  const tieneAlgunMes = columnasMeses.some(mes => datos[0].hasOwnProperty(mes));
  
  if (!tieneAlgunMes) {
    errores.push("El archivo debe tener al menos una columna de mes (Enero, Febrero, etc.)");
  }
  
  // Validar padrones no vacíos
  const padronesVacios = datos.filter((fila, idx) => !fila.Padron || fila.Padron.trim() === '');
  if (padronesVacios.length > 0) {
    errores.push(`${padronesVacios.length} fila(s) tienen el número de padrón vacío`);
  }
  
  return { 
    valido: errores.length === 0, 
    errores 
  };
}

/**
 * Procesa la importación masiva de pagos
 */
export async function procesarImportacionPagos(
  datos: FilaExcel[],
  año: number = 2025
): Promise<ResultadoImportacion> {
  
  const resultado: ResultadoImportacion = {
    exitos: [],
    parciales: [],
    warnings: [],
    errores: [],
    resumen: {
      totalFilas: datos.length,
      totalPagosIntentados: 0,
      exitosos: 0,
      parciales: 0,
      warnings: 0,
      errores: 0,
      montoTotalImportado: 0
    }
  };
  
  try {
    // Cargar datos necesarios
    console.log('📥 Cargando empadronados y cargos...');
    const [empadronados, charges, config] = await Promise.all([
      getEmpadronados(),
      obtenerChargesV2(),
      obtenerConfiguracionV2()
    ]);
    
    console.log(`✅ ${empadronados.length} empadronados cargados`);
    console.log(`✅ ${charges.length} cargos cargados`);
    
    // Procesar cada fila del Excel
    for (const fila of datos) {
      // Manejar Padron como string o número
      const numeroPadron = fila.Padron ? String(fila.Padron).trim() : '';
      
      if (!numeroPadron) {
        resultado.errores.push({
          numeroPadron: 'N/A',
          razon: 'Número de padrón vacío'
        });
        continue;
      }
      
      // Buscar empadronado
      const empadronado = buscarEmpadronadoPorPadron(numeroPadron, empadronados);
      
      if (!empadronado) {
        resultado.errores.push({
          numeroPadron,
          razon: 'Empadronado no encontrado en el sistema',
          detalle: `No existe un empadronado con número de padrón: ${numeroPadron}`
        });
        continue;
      }
      
      // Procesar cada mes
      for (const [nombreMes, numeroMes] of Object.entries(MESES_MAP)) {
        const valorMes = fila[nombreMes as keyof FilaExcel];
        const monto = limpiarMonto(valorMes);
        
        // Si no hay monto, saltar (no es error, simplemente no pagó)
        if (monto === null) continue;
        
        resultado.resumen.totalPagosIntentados++;
        
        const periodo = `${año}${numeroMes}`; // Ej: 202501 para Enero 2025
        
        // Buscar el cargo
        const cargo = buscarCargo(empadronado.id, periodo, charges);
        
        if (!cargo) {
          resultado.errores.push({
            numeroPadron,
            mes: nombreMes,
            razon: 'No existe cargo generado para este período',
            detalle: `Debe generar primero los cargos del período ${año}-${numeroMes}`
          });
          continue;
        }
        
        // Verificar si ya está pagado
        if (cargo.estado === 'pagado' || cargo.saldo <= 0) {
          resultado.warnings.push({
            numeroPadron,
            mes: nombreMes,
            razon: 'El cargo ya está completamente pagado',
            detalle: `Saldo actual: S/ ${cargo.saldo.toFixed(2)}`
          });
          continue;
        }
        
        // Verificar si el monto es mayor al saldo
        if (monto > cargo.saldo) {
          resultado.warnings.push({
            numeroPadron,
            mes: nombreMes,
            razon: 'El monto a pagar es mayor al saldo pendiente',
            detalle: `Monto Excel: S/ ${monto.toFixed(2)}, Saldo: S/ ${cargo.saldo.toFixed(2)}`
          });
          continue;
        }
        
        try {
          // Registrar el pago
          const fechaPago = new Date(`${año}-${numeroMes}-01`).getTime();
          
          const pago = await registrarPagoV2(
            cargo.id,
            monto,
            'importacion_masiva',
            fechaPago,
            undefined, // sin comprobante
            `IMPORT-${numeroPadron}-${periodo}`,
            `Importación masiva de pagos - ${nombreMes} ${año}`
          );
          
          // Intentar aprobar automáticamente (puede fallar por permisos)
          try {
            await aprobarPagoV2(pago.id, 'Aprobación automática por importación masiva');
          } catch (approvalError: any) {
            console.warn(`No se pudo aprobar automáticamente el pago ${pago.id}:`, approvalError.message);
            // No es crítico, el pago quedará pendiente de aprobación manual
            resultado.warnings.push({
              numeroPadron,
              mes: nombreMes,
              razon: 'Pago registrado pero quedó pendiente de aprobación manual',
              detalle: 'Aprueba el pago manualmente desde la bandeja de pagos'
            });
          }
          
          // Verificar si es pago total o parcial
          if (monto >= cargo.saldo) {
            // Pago total
            resultado.exitos.push({
              numeroPadron,
              empadronadoNombre: `${empadronado.nombre} ${empadronado.apellidos}`,
              mes: nombreMes,
              monto,
              cargoId: cargo.id,
              pagoId: pago.id
            });
            resultado.resumen.exitosos++;
          } else {
            // Pago parcial
            resultado.parciales.push({
              numeroPadron,
              empadronadoNombre: `${empadronado.nombre} ${empadronado.apellidos}`,
              mes: nombreMes,
              montoCargo: cargo.montoOriginal,
              montoPagado: monto,
              saldoRestante: cargo.saldo - monto,
              cargoId: cargo.id,
              pagoId: pago.id
            });
            resultado.resumen.parciales++;
          }
          
          resultado.resumen.montoTotalImportado += monto;
          
        } catch (error: any) {
          console.error(`Error procesando pago para ${numeroPadron} - ${nombreMes}:`, error);
          resultado.errores.push({
            numeroPadron,
            mes: nombreMes,
            razon: 'Error al registrar el pago',
            detalle: error.message || 'Error desconocido'
          });
        }
      }
    }
    
    // Completar resumen
    resultado.resumen.warnings = resultado.warnings.length;
    resultado.resumen.errores = resultado.errores.length;
    
    console.log('✅ Importación completada:', resultado.resumen);
    
    return resultado;
    
  } catch (error: any) {
    console.error('❌ Error fatal en importación:', error);
    throw new Error(`Error en la importación: ${error.message}`);
  }
}

/**
 * Exporta el resultado a JSON para descarga
 */
export function exportarResultadoJSON(resultado: ResultadoImportacion): string {
  const reporte = {
    fecha: new Date().toISOString(),
    fechaLegible: new Date().toLocaleString('es-PE'),
    ...resultado
  };
  
  return JSON.stringify(reporte, null, 2);
}

