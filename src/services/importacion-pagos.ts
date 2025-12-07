// Servicio para importación masiva de pagos desde Excel
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { getEmpadronados } from "./empadronados";
import { 
  obtenerChargesV2, 
  registrarPagoV2, 
  aprobarPagoV2,
  obtenerConfiguracionV2,
  generarCargoMensual
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
  [key: string]: string | number | undefined;
}

// Alias para nombres de columna de padrón
const PADRON_ALIASES = ['Padron', 'Padrón', 'padron', 'padrón', 'PADRON', 'NumeroPadron', 'Numero Padron', 'N° Padron', 'Nro Padron', 'Nro', 'N°', 'Numero'];

// Alias para nombres de meses (con y sin tilde)
const MESES_ALIASES: Record<string, string[]> = {
  'Enero': ['Enero', 'enero', 'ENERO', 'Ene', 'ENE', '01', '1'],
  'Febrero': ['Febrero', 'febrero', 'FEBRERO', 'Feb', 'FEB', '02', '2'],
  'Marzo': ['Marzo', 'marzo', 'MARZO', 'Mar', 'MAR', '03', '3'],
  'Abril': ['Abril', 'abril', 'ABRIL', 'Abr', 'ABR', '04', '4'],
  'Mayo': ['Mayo', 'mayo', 'MAYO', 'May', 'MAY', '05', '5'],
  'Junio': ['Junio', 'junio', 'JUNIO', 'Jun', 'JUN', '06', '6'],
  'Julio': ['Julio', 'julio', 'JULIO', 'Jul', 'JUL', '07', '7'],
  'Agosto': ['Agosto', 'agosto', 'AGOSTO', 'Ago', 'AGO', '08', '8'],
  'Septiembre': ['Septiembre', 'septiembre', 'SEPTIEMBRE', 'Sep', 'SEP', 'Sept', '09', '9'],
  'Octubre': ['Octubre', 'octubre', 'OCTUBRE', 'Oct', 'OCT', '10'],
  'Noviembre': ['Noviembre', 'noviembre', 'NOVIEMBRE', 'Nov', 'NOV', '11'],
  'Diciembre': ['Diciembre', 'diciembre', 'DICIEMBRE', 'Dic', 'DIC', '12']
};

/**
 * Busca el valor de padrón en una fila usando múltiples alias
 */
function obtenerPadronDeFila(fila: FilaExcel): string | number | undefined {
  for (const alias of PADRON_ALIASES) {
    if (fila[alias] !== undefined && fila[alias] !== null && String(fila[alias]).trim() !== '') {
      return fila[alias];
    }
  }
  // También buscar cualquier columna que contenga "padron" en el nombre
  for (const key of Object.keys(fila)) {
    if (key.toLowerCase().includes('padron') || key.toLowerCase().includes('padrón')) {
      if (fila[key] !== undefined && fila[key] !== null && String(fila[key]).trim() !== '') {
        return fila[key];
      }
    }
  }
  return undefined;
}

/**
 * Busca el valor de un mes en una fila usando múltiples alias
 */
function obtenerMesDeFila(fila: FilaExcel, mesNombre: string): string | number | undefined {
  const aliases = MESES_ALIASES[mesNombre] || [mesNombre];
  for (const alias of aliases) {
    if (fila[alias] !== undefined && fila[alias] !== null) {
      return fila[alias];
    }
  }
  return undefined;
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
 * Normaliza un número de padrón para comparación
 * Extrae solo la parte numérica y la convierte a número
 * "P00123" -> 123, "123" -> 123, "P123" -> 123
 */
function normalizarPadron(padron: string | number): { original: string; numero: number } {
  const original = String(padron).trim().toUpperCase();
  // Extraer solo dígitos
  const soloNumeros = original.replace(/\D/g, '');
  const numero = parseInt(soloNumeros, 10) || 0;
  return { original, numero };
}

/**
 * Busca un empadronado por número de padrón (búsqueda inteligente)
 * Soporta múltiples formatos: "123", "P123", "P00123", "p00123", etc.
 */
function buscarEmpadronadoPorPadron(
  numeroPadron: string | number, 
  empadronados: Empadronado[]
): Empadronado | null {
  const { original, numero: numBuscado } = normalizarPadron(numeroPadron);
  
  // Primero intentar coincidencia exacta
  const exacto = empadronados.find(emp => 
    emp.numeroPadron?.toUpperCase() === original
  );
  if (exacto) return exacto;
  
  // Si no hay coincidencia exacta, buscar por número
  if (numBuscado > 0) {
    const porNumero = empadronados.find(emp => {
      const { numero: numEmp } = normalizarPadron(emp.numeroPadron || '');
      return numEmp === numBuscado;
    });
    if (porNumero) return porNumero;
  }
  
  return null;
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
): Promise<{ valido: boolean; errores: string[]; columnas: string[] }> {
  const errores: string[] = [];
  
  // Validar que haya datos
  if (!datos || datos.length === 0) {
    errores.push("El archivo está vacío");
    return { valido: false, errores, columnas: [] };
  }
  
  // Mostrar columnas detectadas
  const columnasDetectadas = Object.keys(datos[0]);
  
  // Validar que tenga alguna columna de padrón
  const tienePadron = obtenerPadronDeFila(datos[0]) !== undefined || 
    columnasDetectadas.some(col => 
      col.toLowerCase().includes('padron') || col.toLowerCase().includes('padrón')
    );
  
  if (!tienePadron) {
    errores.push(`No se encontró columna de padrón. Columnas detectadas: ${columnasDetectadas.join(', ')}`);
  }
  
  // Validar que tenga al menos una columna de mes
  const mesesEncontrados: string[] = [];
  for (const mesNombre of Object.keys(MESES_ALIASES)) {
    if (obtenerMesDeFila(datos[0], mesNombre) !== undefined) {
      mesesEncontrados.push(mesNombre);
    }
  }
  
  if (mesesEncontrados.length === 0) {
    errores.push(`No se encontraron columnas de meses. Columnas detectadas: ${columnasDetectadas.join(', ')}`);
  }
  
  // Validar padrones no vacíos
  const padronesVacios = datos.filter(fila => {
    const padron = obtenerPadronDeFila(fila);
    return !padron || String(padron).trim() === '';
  });
  
  if (padronesVacios.length > 0) {
    errores.push(`${padronesVacios.length} fila(s) tienen el número de padrón vacío`);
  }
  
  return { 
    valido: errores.length === 0, 
    errores,
    columnas: columnasDetectadas
  };
}

// Callback para reportar progreso
export type ProgresoCallback = (progreso: {
  porcentaje: number;
  filaActual: number;
  totalFilas: number;
  mensaje: string;
}) => void;

/**
 * Procesa la importación masiva de pagos
 */
export async function procesarImportacionPagos(
  datos: FilaExcel[],
  año: number = 2025,
  onProgreso?: ProgresoCallback
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
    // Cargar datos necesarios (sin logs en consola)
    const [empadronados, charges, config] = await Promise.all([
      getEmpadronados(),
      obtenerChargesV2(),
      obtenerConfiguracionV2()
    ]);
    
    // Procesar cada fila del Excel
    let filaActual = 0;
    const totalFilas = datos.length;
    
    for (const fila of datos) {
      filaActual++;
      
      // Reportar progreso
      if (onProgreso) {
        const porcentaje = Math.round((filaActual / totalFilas) * 100);
        onProgreso({
          porcentaje,
          filaActual,
          totalFilas,
          mensaje: `Procesando fila ${filaActual} de ${totalFilas}...`
        });
      }
      
      // Buscar padrón usando aliases flexibles
      const padronRaw = obtenerPadronDeFila(fila);
      const numeroPadron = padronRaw ? String(padronRaw).trim() : '';
      
      if (!numeroPadron) {
        resultado.errores.push({
          numeroPadron: 'N/A',
          razon: 'Número de padrón vacío',
          detalle: `Fila: ${JSON.stringify(fila).substring(0, 100)}`
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
        const valorMes = obtenerMesDeFila(fila, nombreMes);
        const monto = limpiarMonto(valorMes);
        
        // Si no hay monto, saltar (no es error, simplemente no pagó)
        if (monto === null) continue;
        
        resultado.resumen.totalPagosIntentados++;
        
        const periodo = `${año}${numeroMes}`; // Ej: 202501 para Enero 2025
        
        // Buscar el cargo
        let cargo = buscarCargo(empadronado.id, periodo, charges);
        
        // Si no existe el cargo, crearlo automáticamente
        if (!cargo) {
          try {
            const nuevoCargo = await generarCargoMensual(empadronado.id, periodo, config);
            if (nuevoCargo) {
              cargo = nuevoCargo;
              // Agregar a la lista local para futuras referencias
              charges.push(nuevoCargo);
            } else {
              // El cargo ya existía o no se pudo crear
              resultado.warnings.push({
                numeroPadron,
                mes: nombreMes,
                razon: 'No se pudo crear el cargo automáticamente',
                detalle: `El empadronado podría no estar habilitado o el cargo ya existe`
              });
              continue;
            }
          } catch (errorCargo) {
            resultado.errores.push({
              numeroPadron,
              mes: nombreMes,
              razon: 'Error al crear cargo automáticamente',
              detalle: `${errorCargo}`
            });
            continue;
          }
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
          
          // Aprobar automáticamente el pago importado
          try {
            await aprobarPagoV2(pago.id, 'Aprobado automáticamente por importación masiva');
          } catch (approveError) {
            // Si falla la aprobación, el pago queda pendiente (no es crítico)
            console.warn(`No se pudo aprobar automáticamente el pago ${pago.id}`);
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
          // SILENCIAR ERROR EN CONSOLA - Solo agregarlo al reporte
          
          // Detectar si es un error de "Ya existe un pago"
          const mensajeError = error.message || '';
          
          if (mensajeError.includes('Ya existe un pago para este período')) {
            // Este es un warning, no un error crítico
            resultado.warnings.push({
              numeroPadron,
              mes: nombreMes,
              razon: 'Ya existe un pago registrado para este período',
              detalle: 'Este pago ya fue importado anteriormente'
            });
          } else {
            // Error real
            resultado.errores.push({
              numeroPadron,
              mes: nombreMes,
              razon: 'Error al registrar el pago',
              detalle: mensajeError || 'Error desconocido'
            });
          }
        }
      }
    }
    
    // Completar resumen
    resultado.resumen.warnings = resultado.warnings.length;
    resultado.resumen.errores = resultado.errores.length;
    
    // Importación completada silenciosamente
    return resultado;
    
  } catch (error: any) {
    // Error fatal - solo lanzar excepción
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

/**
 * Exporta el resultado a formato Excel-compatible (CSV)
 */
export function exportarResultadoExcel(resultado: ResultadoImportacion): string {
  const lineas: string[] = [];
  
  // Encabezado
  lineas.push('=== REPORTE DE IMPORTACIÓN MASIVA DE PAGOS ===');
  lineas.push(`Fecha: ${new Date().toLocaleString('es-PE')}`);
  lineas.push('');
  
  // Resumen
  lineas.push('=== RESUMEN ===');
  lineas.push(`Total de filas procesadas: ${resultado.resumen.totalFilas}`);
  lineas.push(`Total de pagos intentados: ${resultado.resumen.totalPagosIntentados}`);
  lineas.push(`Pagos exitosos: ${resultado.resumen.exitosos}`);
  lineas.push(`Pagos parciales: ${resultado.resumen.parciales}`);
  lineas.push(`Advertencias: ${resultado.resumen.warnings}`);
  lineas.push(`Errores: ${resultado.resumen.errores}`);
  lineas.push(`Monto total importado: S/ ${resultado.resumen.montoTotalImportado.toFixed(2)}`);
  lineas.push('');
  
  // Éxitos
  if (resultado.exitos.length > 0) {
    lineas.push('=== PAGOS COMPLETOS ===');
    lineas.push('Padrón,Nombre,Mes,Monto,ID Pago');
    resultado.exitos.forEach(item => {
      lineas.push(`${item.numeroPadron},${item.empadronadoNombre},${item.mes},${item.monto.toFixed(2)},${item.pagoId}`);
    });
    lineas.push('');
  }
  
  // Parciales
  if (resultado.parciales.length > 0) {
    lineas.push('=== PAGOS PARCIALES ===');
    lineas.push('Padrón,Nombre,Mes,Monto Cargo,Monto Pagado,Saldo Restante,ID Pago');
    resultado.parciales.forEach(item => {
      lineas.push(`${item.numeroPadron},${item.empadronadoNombre},${item.mes},${item.montoCargo.toFixed(2)},${item.montoPagado.toFixed(2)},${item.saldoRestante.toFixed(2)},${item.pagoId}`);
    });
    lineas.push('');
  }
  
  // Warnings
  if (resultado.warnings.length > 0) {
    lineas.push('=== ADVERTENCIAS ===');
    lineas.push('Padrón,Mes,Razón,Detalle');
    resultado.warnings.forEach(item => {
      lineas.push(`${item.numeroPadron},${item.mes},${item.razon},"${item.detalle || ''}"`);
    });
    lineas.push('');
  }
  
  // Errores
  if (resultado.errores.length > 0) {
    lineas.push('=== ERRORES ===');
    lineas.push('Padrón,Mes,Razón,Detalle');
    resultado.errores.forEach(item => {
      lineas.push(`${item.numeroPadron},${item.mes || 'N/A'},${item.razon},"${item.detalle || ''}"`);
    });
    lineas.push('');
  }
  
  return lineas.join('\n');
}

