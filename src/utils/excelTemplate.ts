import * as XLSX from 'xlsx';

export interface EmpadronadoExcelRow {
  id: string;
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  manzana: string;
  lote: string;
  etapa: string;
  // Campos adicionales para múltiples terrenos
  manzana2?: string;
  lote2?: string;
  etapa2?: string;
  manzana3?: string;
  lote3?: string;
  etapa3?: string;
  genero: 'masculino' | 'femenino';
  vive: 'SI' | 'NO';
  estadoVivienda: 'construida' | 'construccion' | 'terreno';
  cumpleanos: string; // DD/MM/YYYY
  fechaIngreso: string; // DD/MM/YYYY
  habilitado: 'SI' | 'NO';
  telefonos: string; // separados por comas
  vehiculos: string; // formato: PLACA1:vehiculo,PLACA2:moto
  miembrosFamilia: string; // formato: NOMBRE1:APELLIDOS1:parentezco1:DD/MM/YYYY|NOMBRE2:APELLIDOS2:parentezco2:DD/MM/YYYY
  observaciones: string;
}

export function generateEmpadronadosTemplate(): void {
  // Crear las instrucciones mejoradas
  const instructions = [
    ['PLANTILLA PARA CARGA MASIVA DE EMPADRONADOS'],
    [''],
    ['INSTRUCCIONES:'],
    ['1. Complete todos los campos obligatorios marcados con (*)'],
    ['2. Respete exactamente los formatos indicados'],
    ['3. No modifique los nombres de las columnas'],
    ['4. Elimine estas filas de instrucciones antes de subir el archivo'],
    [''],
    ['FORMATOS ESPECÍFICOS:'],
    ['- ID: Un identificador único para cada fila (ej: EMP001, EMP002)'],
    ['- # Padrón: Número de padrón del asociado (ej: P001, P002)'],
    ['- Fechas: DD/MM/YYYY (ej: 15/03/1985)'],
    ['- Género: masculino o femenino'],
    ['- Vive: SI o NO (indica si vive actualmente en la urbanización)'],
    ['- Estado Vivienda: construida, construccion o terreno'],
    ['- Habilitado: SI=Puede usar servicios/NO=Suspendido por morosidad/sanciones'],
    ['- Teléfonos: separados por comas (ej: 123456789,987654321)'],
    ['- Vehículos: PLACA:tipo,PLACA:tipo (ej: ABC123:vehiculo,XYZ789:moto)'],
    ['- Miembros Familia: NOMBRE:APELLIDOS:parentezco:cumpleanos|... (ej: Juan:Perez:hijo:15/03/2010)'],
    [''],
    ['MÚLTIPLES TERRENOS:'],
    ['- Un asociado puede tener hasta 3 terrenos'],
    ['- Complete manzana, lote, etapa para el primer terreno'],
    ['- Si tiene más terrenos, use manzana2/lote2/etapa2 y manzana3/lote3/etapa3'],
    ['- Deje vacías las columnas adicionales si solo tiene un terreno'],
    [''],
    ['MENORES DE EDAD:'],
    ['- Si el titular es menor: marque "si" en la columna "esMenor"'],
    ['- Para menores NO es obligatorio completar DNI, teléfonos ni vehículos'],
    ['- Los demás campos (nombre, apellidos, etc.) SÍ son obligatorios'],
    [''],
    ['DATOS DE EJEMPLO:'],
  ];

  // Datos de ejemplo mejorados
  const exampleData: EmpadronadoExcelRow[] = [
    {
      id: 'EMP001',
      numeroPadron: 'P001',
      nombre: 'Juan Carlos',
      apellidos: 'García López',
      dni: '12345678',
      familia: 'García',
      manzana: 'A',
      lote: '15',
      etapa: '1',
      manzana2: 'B',
      lote2: '20',
      etapa2: '2',
      manzana3: '',
      lote3: '',
      etapa3: '',
      genero: 'masculino',
      vive: 'SI',
      estadoVivienda: 'construida',
      cumpleanos: '15/03/1980',
      fechaIngreso: '01/01/2020',
      habilitado: 'SI',
      telefonos: '987654321,123456789',
      vehiculos: 'ABC123:vehiculo,XYZ789:moto',
      miembrosFamilia: 'María:García:esposa:20/05/1982|Carlos:García:hijo:10/12/2010',
      observaciones: 'Propietario con 2 terrenos'
    }
  ];

  // Crear headers mejorados
  const headers = [
    'id (*)',
    'numeroPadron (*)',
    'nombre (*)',
    'apellidos (*)', 
    'dni (*)',
    'familia (*)',
    'manzana (*)',
    'lote (*)',
    'etapa (*)',
    'manzana2',
    'lote2',
    'etapa2',
    'manzana3',
    'lote3',
    'etapa3',
    'genero (*)',
    'vive (*)',
    'estadoVivienda (*)',
    'cumpleanos (*)',
    'fechaIngreso (*)',
    'habilitado (*)',
    'telefonos',
    'vehiculos',
    'miembrosFamilia',
    'observaciones'
  ];

  // Crear workbook
  const wb = XLSX.utils.book_new();
  
  // Crear worksheet con instrucciones
  const wsData = [
    ...instructions,
    [''], // Línea vacía
    headers, // Headers
    ...exampleData.map(row => [
      row.id,
      row.numeroPadron,
      row.nombre,
      row.apellidos,
      row.dni,
      row.familia,
      row.manzana,
      row.lote,
      row.etapa,
      row.manzana2 || '',
      row.lote2 || '',
      row.etapa2 || '',
      row.manzana3 || '',
      row.lote3 || '',
      row.etapa3 || '',
      row.genero,
      row.vive,
      row.estadoVivienda,
      row.cumpleanos,
      row.fechaIngreso,
      row.habilitado,
      row.telefonos,
      row.vehiculos,
      row.miembrosFamilia,
      row.observaciones
    ]),
    [''], // Línea vacía para nuevos datos
    ['EMP002', 'P002', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '← Complete aquí los nuevos empadronados →'],
    ['EMP003', 'P003', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['EMP004', 'P004', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Ajustar ancho de columnas mejorado
  const colWidths = [
    { wch: 10 }, // id
    { wch: 12 }, // numeroPadron
    { wch: 20 }, // nombre
    { wch: 25 }, // apellidos
    { wch: 12 }, // dni
    { wch: 15 }, // familia
    { wch: 10 }, // manzana
    { wch: 8 },  // lote
    { wch: 8 },  // etapa
    { wch: 10 }, // manzana2
    { wch: 8 },  // lote2
    { wch: 8 },  // etapa2
    { wch: 10 }, // manzana3
    { wch: 8 },  // lote3
    { wch: 8 },  // etapa3
    { wch: 12 }, // genero
    { wch: 8 },  // vive
    { wch: 15 }, // estadoVivienda
    { wch: 12 }, // cumpleanos
    { wch: 12 }, // fechaIngreso
    { wch: 12 }, // habilitado
    { wch: 20 }, // telefonos
    { wch: 25 }, // vehiculos
    { wch: 40 }, // miembrosFamilia
    { wch: 25 }  // observaciones
  ];
  
  ws['!cols'] = colWidths;

  // Agregar worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Empadronados');

  // Generar y descargar archivo
  const fileName = `template_empadronados_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function parseEmpadronadosExcel(file: File): Promise<EmpadronadoExcelRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Buscar la fila de headers (buscar la que contiene "numeroPadron")
        let headerRowIndex = -1;
        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i] as string[];
          if (row.some(cell => cell && cell.toString().includes('numeroPadron'))) {
            headerRowIndex = i;
            break;
          }
        }
        
        if (headerRowIndex === -1) {
          throw new Error('No se encontraron los headers en el archivo');
        }
        
        // Obtener headers y datos
        const headers = jsonData[headerRowIndex] as string[];
        const dataRows = jsonData.slice(headerRowIndex + 1) as string[][];
        
        // Filtrar filas vacías y procesar datos
        const processedData = dataRows
          .filter(row => row.some(cell => cell !== undefined && cell !== ''))
          .map(row => {
            const rowData: any = {};
            headers.forEach((header, index) => {
              const cleanHeader = header.replace(/\s*\(\*\)\s*/, '').trim();
              rowData[cleanHeader] = row[index] || '';
            });
            
            // Validar campos requeridos para el ID único
            if (!rowData.id) {
              rowData.id = `EMP${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            }
            
            return rowData as EmpadronadoExcelRow;
          });
        
        resolve(processedData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}