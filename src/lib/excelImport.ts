// src/lib/excelImport.ts
import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

// Tipos para el parseo
export type PersonaRaw = {
  persona_id: string;
  numero_padron: string;
  nombres: string;
  apellidos: string;
  manzana: string;
  lote: string;
  etapa: string;
  manzana2?: string;
  lote2?: string;
  etapa2?: string;
  manzana3?: string;
  lote3?: string;
  etapa3?: string;
  habilitado: string;
  observaciones: string;
};

export type TelefonoRaw = {
  persona_id: string;
  telefono: string;
};

export type VehiculoRaw = {
  persona_id: string;
  placa: string;
  tipo: string;
};

export type MiembroRaw = {
  persona_id: string;
  nombre: string;
  apellidos: string;
  parentesco: string;
  fecha_nac: string;
  menor: string;
};

export type PersonaProcessed = {
  persona_id: string;
  numero_padron: string;
  nombres: string;
  apellidos: string;
  manzana: string;
  lote: string;
  etapa: string;
  manzana2?: string;
  lote2?: string;
  etapa2?: string;
  manzana3?: string;
  lote3?: string;
  etapa3?: string;
  habilitado: boolean;
  observaciones: string;
  telefonos: string[];
  vehiculos: Array<{ placa: string; tipo: string }>;
  miembrosFamilia: Array<{
    nombre: string;
    apellidos: string;
    parentesco: string;
    fecha_nac: string;
    menor: boolean;
  }>;
};

export type ValidationError = {
  sheet: string;
  row: number;
  message: string;
};

// Validar que existan las hojas requeridas
export const validateSheets = (workbook: XLSX.WorkBook): ValidationError[] => {
  const errors: ValidationError[] = [];
  const requiredSheets = ['Personas', 'Telefonos', 'Vehiculos', 'MiembrosFamilia'];
  
  for (const sheetName of requiredSheets) {
    if (!workbook.Sheets[sheetName]) {
      errors.push({
        sheet: 'General',
        row: 0,
        message: `Falta la hoja requerida: ${sheetName}`
      });
    }
  }
  
  return errors;
};

// Normalizar fecha DD/MM/YYYY
const normalizeFecha = (fecha: string): string => {
  if (!fecha || typeof fecha !== 'string') return '';
  
  // Intentar diferentes formatos
  const formats = ['DD/MM/YYYY', 'D/MM/YYYY', 'DD/M/YYYY', 'D/M/YYYY'];
  
  for (const format of formats) {
    const parsed = dayjs(fecha.trim(), format, true);
    if (parsed.isValid()) {
      return parsed.format('DD/MM/YYYY');
    }
  }
  
  return fecha; // Si no se puede parsear, devolver original
};

// Normalizar booleano SI/NO
const normalizeBoolean = (value: string): boolean => {
  if (!value || typeof value !== 'string') return false;
  const v = value.trim().toLowerCase();
  return v === 'si' || v === 'sí' || v === 's' || v === 'true' || v === '1';
};

// Parsear Excel y validar
export const parseExcelFile = (fileBuffer: ArrayBuffer): {
  data: PersonaProcessed[];
  errors: ValidationError[];
} => {
  const errors: ValidationError[] = [];
  
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    
    // Validar hojas
    const sheetErrors = validateSheets(workbook);
    if (sheetErrors.length > 0) {
      return { data: [], errors: sheetErrors };
    }
    
    // Convertir hojas a JSON
    const toJson = (sheetName: string) => 
      XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
    
    const personasRaw = toJson('Personas') as PersonaRaw[];
    const telefonosRaw = toJson('Telefonos') as TelefonoRaw[];
    const vehiculosRaw = toJson('Vehiculos') as VehiculoRaw[];
    const miembrosRaw = toJson('MiembrosFamilia') as MiembroRaw[];
    
    // Validar columnas mínimas en Personas
    if (personasRaw.length === 0) {
      errors.push({
        sheet: 'Personas',
        row: 0,
        message: 'La hoja Personas está vacía'
      });
      return { data: [], errors };
    }
    
    const firstPerson = personasRaw[0];
    const requiredColumns = ['persona_id', 'numero_padron', 'nombres', 'apellidos'];
    for (const col of requiredColumns) {
      if (!(col in firstPerson)) {
        errors.push({
          sheet: 'Personas',
          row: 1,
          message: `Falta la columna requerida: ${col}`
        });
      }
    }
    
    if (errors.length > 0) {
      return { data: [], errors };
    }
    
    // Crear mapas para agrupar
    const personasMap = new Map<string, PersonaRaw>();
    const telefonosMap = new Map<string, string[]>();
    const vehiculosMap = new Map<string, Array<{ placa: string; tipo: string }>>();
    const miembrosMap = new Map<string, Array<{
      nombre: string;
      apellidos: string;
      parentesco: string;
      fecha_nac: string;
      menor: boolean;
    }>>();
    
    // Procesar personas
    personasRaw.forEach((persona, index) => {
      const personaId = String(persona.persona_id || '').trim();
      if (!personaId) {
        errors.push({
          sheet: 'Personas',
          row: index + 2,
          message: 'persona_id vacío'
        });
        return;
      }
      
      personasMap.set(personaId, persona);
    });
    
    // Procesar teléfonos
    telefonosRaw.forEach((tel, index) => {
      const personaId = String(tel.persona_id || '').trim();
      const telefono = String(tel.telefono || '').trim();
      
      if (!personaId) {
        errors.push({
          sheet: 'Telefonos',
          row: index + 2,
          message: 'persona_id vacío'
        });
        return;
      }
      
      if (!telefono) return; // teléfono vacío es opcional
      
      if (!telefonosMap.has(personaId)) {
        telefonosMap.set(personaId, []);
      }
      
      const existingTels = telefonosMap.get(personaId)!;
      if (!existingTels.includes(telefono)) {
        existingTels.push(telefono);
      }
    });
    
    // Procesar vehículos
    vehiculosRaw.forEach((veh, index) => {
      const personaId = String(veh.persona_id || '').trim();
      const placa = String(veh.placa || '').trim();
      const tipo = String(veh.tipo || '').trim();
      
      if (!personaId) {
        errors.push({
          sheet: 'Vehiculos',
          row: index + 2,
          message: 'persona_id vacío'
        });
        return;
      }
      
      if (!placa) return; // vehículo vacío es opcional
      
      if (!vehiculosMap.has(personaId)) {
        vehiculosMap.set(personaId, []);
      }
      
      vehiculosMap.get(personaId)!.push({
        placa,
        tipo: tipo || 'vehiculo'
      });
    });
    
    // Procesar miembros familia
    miembrosRaw.forEach((miembro, index) => {
      const personaId = String(miembro.persona_id || '').trim();
      const nombre = String(miembro.nombre || '').trim();
      const apellidos = String(miembro.apellidos || '').trim();
      const parentesco = String(miembro.parentesco || '').trim();
      const fechaNac = String(miembro.fecha_nac || '').trim();
      const menor = String(miembro.menor || '').trim();
      
      if (!personaId) {
        errors.push({
          sheet: 'MiembrosFamilia',
          row: index + 2,
          message: 'persona_id vacío'
        });
        return;
      }
      
      if (!nombre) return; // miembro vacío es opcional
      
      if (!miembrosMap.has(personaId)) {
        miembrosMap.set(personaId, []);
      }
      
      miembrosMap.get(personaId)!.push({
        nombre,
        apellidos,
        parentesco,
        fecha_nac: normalizeFecha(fechaNac),
        menor: normalizeBoolean(menor)
      });
    });
    
    // Construir resultado final
    const data: PersonaProcessed[] = [];
    
    for (const [personaId, persona] of personasMap) {
      data.push({
        persona_id: personaId,
        numero_padron: String(persona.numero_padron || '').trim(),
        nombres: String(persona.nombres || '').trim(),
        apellidos: String(persona.apellidos || '').trim(),
        manzana: String(persona.manzana || '').trim(),
        lote: String(persona.lote || '').trim(),
        etapa: String(persona.etapa || '').trim(),
        manzana2: String(persona.manzana2 || '').trim(),
        lote2: String(persona.lote2 || '').trim(),
        etapa2: String(persona.etapa2 || '').trim(),
        manzana3: String(persona.manzana3 || '').trim(),
        lote3: String(persona.lote3 || '').trim(),
        etapa3: String(persona.etapa3 || '').trim(),
        habilitado: normalizeBoolean(String(persona.habilitado || '')),
        observaciones: String(persona.observaciones || '').trim(),
        telefonos: telefonosMap.get(personaId) || [],
        vehiculos: vehiculosMap.get(personaId) || [],
        miembrosFamilia: miembrosMap.get(personaId) || []
      });
    }
    
    return { data, errors };
    
  } catch (error) {
    return {
      data: [],
      errors: [{
        sheet: 'General',
        row: 0,
        message: `Error al procesar archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      }]
    };
  }
};

// Generar plantilla Excel de ejemplo
export const generateTemplate = (): ArrayBuffer => {
  const wb = XLSX.utils.book_new();
  
  // Hoja Personas con campos nuevos
  const personasData = [
    {
      persona_id: 'P001',
      numero_padron: 'P001',
      nombres: 'Juan Carlos',
      apellidos: 'Pérez García',
      manzana: 'A',
      lote: '15',
      etapa: '1',
      manzana2: 'B',
      lote2: '20',
      etapa2: '2',
      manzana3: '',
      lote3: '',
      etapa3: '',
      habilitado: 'SI',
      observaciones: 'Ejemplo de persona con 2 terrenos'
    },
    {
      persona_id: 'P002',
      numero_padron: 'P002',
      nombres: 'María Elena',
      apellidos: 'Rodríguez López',
      manzana: 'B',
      lote: '22',
      etapa: '2',
      manzana2: '',
      lote2: '',
      etapa2: '',
      manzana3: '',
      lote3: '',
      etapa3: '',
      habilitado: 'NO',
      observaciones: 'Solo tiene 1 terreno'
    }
  ];
  
  // Hoja Telefonos
  const telefonosData = [
    { persona_id: 'P001', telefono: '987654321' },
    { persona_id: 'P001', telefono: '956123456' },
    { persona_id: 'P002', telefono: '945678901' }
  ];
  
  // Hoja Vehiculos
  const vehiculosData = [
    { persona_id: 'P001', placa: 'ABC-123', tipo: 'vehiculo' },
    { persona_id: 'P002', placa: 'XYZ-789', tipo: 'moto' }
  ];
  
  // Hoja MiembrosFamilia
  const miembrosData = [
    {
      persona_id: 'P001',
      nombre: 'Ana',
      apellidos: 'Pérez Torres',
      parentesco: 'Esposa',
      fecha_nac: '15/03/1985',
      menor: 'NO'
    },
    {
      persona_id: 'P001',
      nombre: 'Luis',
      apellidos: 'Pérez Torres',
      parentesco: 'Hijo',
      fecha_nac: '22/07/2010',
      menor: 'SI'
    }
  ];
  
  // Crear hojas
  const wsPersonas = XLSX.utils.json_to_sheet(personasData);
  const wsTelefonos = XLSX.utils.json_to_sheet(telefonosData);
  const wsVehiculos = XLSX.utils.json_to_sheet(vehiculosData);
  const wsMiembros = XLSX.utils.json_to_sheet(miembrosData);
  
  // Agregar hoja de instrucciones mejoradas
  const instrucciones = [
    ['INSTRUCCIONES PARA USO DE LA PLANTILLA'],
    [''],
    ['1. HOJAS REQUERIDAS:'],
    ['   - Personas: Datos básicos de cada empadronado'],
    ['   - Telefonos: Números telefónicos (puede tener múltiples por persona)'],
    ['   - Vehiculos: Vehículos registrados (puede tener múltiples por persona)'],
    ['   - MiembrosFamilia: Familiares (puede tener múltiples por persona)'],
    [''],
    ['2. COLUMNAS OBLIGATORIAS:'],
    ['   Personas: persona_id, numero_padron, nombres, apellidos'],
    ['   Telefonos: persona_id, telefono'],
    ['   Vehiculos: persona_id, placa, tipo'],
    ['   MiembrosFamilia: persona_id, nombre, apellidos, parentesco, fecha_nac, menor'],
    [''],
    ['3. MÚLTIPLES TERRENOS:'],
    ['   - Un asociado puede tener hasta 3 terrenos'],
    ['   - Terreno 1: manzana, lote, etapa (obligatorios si tiene terreno)'],
    ['   - Terreno 2: manzana2, lote2, etapa2 (opcionales)'],
    ['   - Terreno 3: manzana3, lote3, etapa3 (opcionales)'],
    ['   - Dejar vacías las columnas adicionales si solo tiene un terreno'],
    [''],
    ['4. FORMATOS ESPECIALES:'],
    ['   - habilitado: SI/NO (SI=Puede usar servicios, NO=Suspendido por morosidad/sanciones)'],
    ['   - menor: SI/NO (se convierte a verdadero/falso)'],
    ['   - fecha_nac: DD/MM/YYYY (ej: 15/03/1985)'],
    ['   - tipo vehiculo: vehiculo, moto, etc.'],
    [''],
    ['5. NOTAS IMPORTANTES:'],
    ['   - persona_id debe ser único y aparecer en todas las hojas'],
    ['   - numero_padron es el # de padrón del asociado (puede ser igual al persona_id)'],
    ['   - Los campos vacíos son permitidos excepto los obligatorios'],
    ['   - Se eliminan espacios al inicio y final automáticamente'],
    ['   - Se eliminan teléfonos duplicados automáticamente'],
    [''],
    ['6. EJEMPLOS DE DATOS:'],
    ['   Ver las otras hojas para ejemplos de formato correcto']
  ];
  
  const wsInstrucciones = XLSX.utils.aoa_to_sheet(instrucciones);
  
  // Agregar hojas al workbook
  XLSX.utils.book_append_sheet(wb, wsInstrucciones, 'Instrucciones');
  XLSX.utils.book_append_sheet(wb, wsPersonas, 'Personas');
  XLSX.utils.book_append_sheet(wb, wsTelefonos, 'Telefonos');
  XLSX.utils.book_append_sheet(wb, wsVehiculos, 'Vehiculos');
  XLSX.utils.book_append_sheet(wb, wsMiembros, 'MiembrosFamilia');
  
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
};