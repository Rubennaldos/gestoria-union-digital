// src/pages/ImportacionRTDB.tsx
import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle, Users, Phone, Car, UserCheck, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { generateTemplate, parseExcelFile, PersonaProcessed, ValidationError } from '@/lib/excelImport';
import { generateEmpadronadosTemplate } from '@/utils/excelTemplate';
import { getDatabase, ref, update } from 'firebase/database';

const ImportacionRTDB: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<PersonaProcessed[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [fileName, setFileName] = useState('');
  
  // Descargar plantilla original mejorada
  const handleDownloadTemplate = () => {
    try {
      // Usar la plantilla original con los campos nuevos
      const templateBuffer = generateTemplate();
      const blob = new Blob([templateBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'plantilla-importacion-empadronados.xlsx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Plantilla descargada",
        description: "Plantilla con soporte para múltiples terrenos y # de padrón"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo descargar la plantilla",
        variant: "destructive"
      });
    }
  };
  
  // Seleccionar archivo
  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };
  
  // Procesar archivo
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: "Archivo inválido",
        description: "Solo se permiten archivos .xlsx",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    setFileName(file.name);
    setParsedData([]);
    setErrors([]);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseExcelFile(arrayBuffer);
      
      setParsedData(result.data);
      setErrors(result.errors);
      
      if (result.errors.length > 0) {
        toast({
          title: "Errores en el archivo",
          description: `Se encontraron ${result.errors.length} errores. Revisa la lista.`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Archivo procesado",
          description: `${result.data.length} personas cargadas correctamente`
        });
      }
    } catch (error) {
      toast({
        title: "Error al procesar",
        description: "No se pudo leer el archivo Excel",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      // Limpiar input para permitir seleccionar el mismo archivo
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Importar a RTDB
  const handleImport = async () => {
    if (parsedData.length === 0) {
      toast({
        title: "Sin datos",
        description: "No hay datos para importar",
        variant: "destructive"
      });
      return;
    }
    
    if (errors.length > 0) {
      toast({
        title: "Errores pendientes",
        description: "Corrige los errores antes de importar",
        variant: "destructive"
      });
      return;
    }
    
    setImporting(true);
    setProgress(0);
    
    try {
      const db = getDatabase();
      const batchSize = 200;
      const totalBatches = Math.ceil(parsedData.length / batchSize);
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIndex = batchIndex * batchSize;
        const endIndex = Math.min(startIndex + batchSize, parsedData.length);
        const batch = parsedData.slice(startIndex, endIndex);
        
        // Construir updates para este lote
        const updates: Record<string, any> = {};
        
        batch.forEach(persona => {
          // Convertir a formato RTDB
          const empadronadoData = {
            id: persona.persona_id,
            numeroPadron: persona.persona_id,
            nombre: persona.nombres,
            apellidos: persona.apellidos,
            dni: '', // No viene en el Excel, dejar vacío
            familia: `${persona.nombres} ${persona.apellidos}`,
            manzana: persona.manzana,
            lote: persona.lote,
            etapa: persona.etapa,
            habilitado: persona.habilitado,
            observaciones: persona.observaciones,
            
            // Arrays de objetos - asegurar que telefonos tenga formato correcto
            telefonos: persona.telefonos && persona.telefonos.length > 0 
              ? persona.telefonos.map(tel => ({ numero: tel }))
              : [],
            vehiculos: persona.vehiculos.map(veh => ({ 
              placa: veh.placa, 
              tipo: veh.tipo 
            })),
            miembrosFamilia: persona.miembrosFamilia.map(miembro => ({
              nombre: miembro.nombre,
              apellidos: miembro.apellidos,
              parentezco: miembro.parentesco,
              cumpleanos: miembro.fecha_nac,
              menor: miembro.menor
            })),
            
            // Campos requeridos por el sistema
            genero: 'masculino', // Default, se puede cambiar después
            vive: true,
            estadoVivienda: 'construida', // Default
            cumpleanos: '01/01/1980', // Default
            fechaIngreso: Date.now(),
            createdAt: Date.now(),
            updatedAt: Date.now(),
            creadoPor: 'importacion-masiva',
            modificadoPor: 'importacion-masiva'
          };
          
          updates[`/empadronados/${persona.persona_id}`] = empadronadoData;
        });
        
        // Ejecutar update
        await update(ref(db), updates);
        
        // Actualizar progreso
        const progressPercent = ((batchIndex + 1) / totalBatches) * 100;
        setProgress(progressPercent);
        
        // Pequeña pausa entre lotes
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      toast({
        title: "Importación exitosa",
        description: `${parsedData.length} personas importadas correctamente`
      });
      
      // Limpiar datos
      setParsedData([]);
      setErrors([]);
      setFileName('');
      setProgress(0);
      
    } catch (error) {
      toast({
        title: "Error en la importación",
        description: "No se pudieron guardar los datos en la base de datos",
        variant: "destructive"
      });
      console.error('Error importing data:', error);
    } finally {
      setImporting(false);
    }
  };
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/padron')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Atrás
          </Button>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Importación Masiva (RTDB)</h1>
        <p className="text-muted-foreground">
          Importa múltiples empadronados desde un archivo Excel con estructura específica
        </p>
      </div>
      
      {/* Acciones principales */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Descargar Plantilla
            </CardTitle>
            <CardDescription>
              Descarga la plantilla Excel con el formato requerido e instrucciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleDownloadTemplate} className="w-full">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Descargar plantilla.xlsx
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Cargar Archivo
            </CardTitle>
            <CardDescription>
              Selecciona el archivo Excel completado para procesar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleFileSelect} disabled={loading} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {loading ? 'Procesando...' : 'Seleccionar .xlsx'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
          </CardContent>
        </Card>
      </div>
      
      {/* Archivo seleccionado */}
      {fileName && (
        <Alert>
          <FileSpreadsheet className="h-4 w-4" />
          <AlertDescription>
            Archivo procesado: <strong>{fileName}</strong>
            {parsedData.length > 0 && (
              <span className="ml-2">
                • {parsedData.length} personas detectadas
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Errores */}
      {errors.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Errores encontrados ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {errors.map((error, index) => (
                <Alert key={index} variant="destructive">
                  <AlertDescription>
                    <strong>{error.sheet}</strong>
                    {error.row > 0 && ` (fila ${error.row})`}: {error.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Previsualización */}
      {parsedData.length > 0 && errors.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Previsualización ({parsedData.length} personas)
            </CardTitle>
            <CardDescription>
              Revisa los datos antes de importar a la base de datos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="max-h-96 overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre Completo</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-center">
                        <Phone className="h-4 w-4 inline" />
                      </TableHead>
                      <TableHead className="text-center">
                        <Car className="h-4 w-4 inline" />
                      </TableHead>
                      <TableHead className="text-center">
                        <Users className="h-4 w-4 inline" />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 50).map((persona) => (
                      <TableRow key={persona.persona_id}>
                        <TableCell className="font-medium">
                          {persona.persona_id}
                        </TableCell>
                        <TableCell>
                          {persona.nombres} {persona.apellidos}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {persona.manzana && `Mza ${persona.manzana}`}
                            {persona.lote && ` Lote ${persona.lote}`}
                            {persona.etapa && ` Et. ${persona.etapa}`}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={persona.habilitado ? "default" : "secondary"}>
                            {persona.habilitado ? "Habilitado" : "Deshabilitado"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {persona.telefonos.length}
                        </TableCell>
                        <TableCell className="text-center">
                          {persona.vehiculos.length}
                        </TableCell>
                        <TableCell className="text-center">
                          {persona.miembrosFamilia.length}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {parsedData.length > 50 && (
                <p className="text-sm text-muted-foreground text-center">
                  Mostrando los primeros 50 de {parsedData.length} registros
                </p>
              )}
              
              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  {parsedData.length} personas listas para importar
                </div>
                <Button 
                  onClick={handleImport} 
                  disabled={importing}
                  size="lg"
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  {importing ? 'Importando...' : 'Importar a RTDB'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Barra de progreso */}
      {importing && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Importando datos...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información importante</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Formato requerido:</strong> El archivo debe tener exactamente 4 hojas: 
              Personas, Telefonos, Vehiculos, MiembrosFamilia
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Datos existentes:</strong> Si ya existe un empadronado con el mismo ID, 
              será reemplazado completamente por los datos del Excel
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <strong>Procesamiento por lotes:</strong> Los datos se importan en grupos de 200 
              para optimizar el rendimiento
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ImportacionRTDB;