import * as XLSX from 'xlsx';

export interface EmpadronadoExcelRow {
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  dni: string;
  familia: string;
  manzana: string;
  lote: string;
  etapa: string;
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
  // Crear las instrucciones
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
    ['- Fechas: DD/MM/YYYY (ej: 15/03/1985)'],
    ['- Género: masculino o femenino'],
    ['- Vive: SI o NO'],
    ['- Estado Vivienda: construida, construccion o terreno'],
    ['- Habilitado: SI o NO'],
    ['- Teléfonos: separados por comas (ej: 123456789,987654321)'],
    ['- Vehículos: PLACA:tipo,PLACA:tipo (ej: ABC123:vehiculo,XYZ789:moto)'],
    ['- Miembros Familia: NOMBRE:APELLIDOS:parentezco:cumpleanos|... (ej: Juan:Perez:hijo:15/03/2010|Maria:Perez:hija:20/08/2012)'],
    [''],
    ['DATOS DE EJEMPLO:'],
  ];

  // Datos de ejemplo
  const exampleData: EmpadronadoExcelRow[] = [
    {
      numeroPadron: 'P001',
      nombre: 'Juan Carlos',
      apellidos: 'García López',
      dni: '12345678',
      familia: 'García',
      manzana: 'A',
      lote: '15',
      etapa: '1',
      genero: 'masculino',
      vive: 'SI',
      estadoVivienda: 'construida',
      cumpleanos: '15/03/1980',
      fechaIngreso: '01/01/2020',
      habilitado: 'SI',
      telefonos: '987654321,123456789',
      vehiculos: 'ABC123:vehiculo,XYZ789:moto',
      miembrosFamilia: 'María:García:esposa:20/05/1982|Carlos:García:hijo:10/12/2010',
      observaciones: 'Propietario principal'
    }
  ];

  // Crear headers
  const headers = [
    'numeroPadron (*)',
    'nombre (*)',
    'apellidos (*)', 
    'dni (*)',
    'familia (*)',
    'manzana',
    'lote',
    'etapa',
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
      row.numeroPadron,
      row.nombre,
      row.apellidos,
      row.dni,
      row.familia,
      row.manzana,
      row.lote,
      row.etapa,
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
    [''], // Otra línea vacía
    ['← Complete aquí los nuevos empadronados →']
  ];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Ajustar ancho de columnas
  const colWidths = [
    { wch: 15 }, // numeroPadron
    { wch: 20 }, // nombre
    { wch: 25 }, // apellidos
    { wch: 12 }, // dni
    { wch: 15 }, // familia
    { wch: 10 }, // manzana
    { wch: 8 },  // lote
    { wch: 8 },  // etapa
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