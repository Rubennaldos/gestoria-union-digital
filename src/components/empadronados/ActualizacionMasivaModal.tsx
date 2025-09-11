import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import { updateEmpadronado, getEmpadronados } from '@/services/empadronados';
import { Empadronado } from '@/types/empadronados';

interface ActualizacionMasivaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

type ActualizacionData = {
  numeroPadron: string;
  dni?: string;
  telefonos?: string[];
};

export const ActualizacionMasivaModal: React.FC<ActualizacionMasivaModalProps> = ({
  open,
  onOpenChange,
  onComplete
}) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [parsedData, setParsedData] = useState<ActualizacionData[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  // Generar plantilla de actualización
  const generateUpdateTemplate = async () => {
    try {
      const empadronados = await getEmpadronados();
      const templateData = empadronados.map(emp => ({
        numero_padron: emp.numeroPadron,
        nombres: emp.nombre,
        apellidos: emp.apellidos,
        dni_actual: emp.dni || '',
        dni_nuevo: '', // Campo para completar
        telefono1: emp.telefonos?.[0]?.numero || '',
        telefono2: emp.telefonos?.[1]?.numero || '',
        telefono3: emp.telefonos?.[2]?.numero || '',
        telefono_nuevo1: '', // Campo para completar
        telefono_nuevo2: '', // Campo para completar
        telefono_nuevo3: ''  // Campo para completar
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(templateData);
      
      // Instrucciones
      const instructions = [
        ['INSTRUCCIONES PARA ACTUALIZACIÓN MASIVA'],
        [''],
        ['1. Complete SOLO las columnas que quiere actualizar:'],
        ['   - dni_nuevo: Nuevo DNI (8 dígitos)'],
        ['   - telefono_nuevo1, telefono_nuevo2, telefono_nuevo3: Nuevos teléfonos'],
        [''],
        ['2. NO modifique las columnas de referencia:'],
        ['   - numero_padron, nombres, apellidos (solo para referencia)'],
        ['   - dni_actual, telefono1, telefono2, telefono3 (valores actuales)'],
        [''],
        ['3. Deje vacías las celdas que no quiere cambiar'],
        [''],
        ['4. Guarde el archivo y súbalo de vuelta al sistema']
      ];
      
      const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
      
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');
      XLSX.utils.book_append_sheet(wb, ws, 'Actualizaciones');
      
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `actualizacion_empadronados_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast({
        title: "Plantilla descargada",
        description: "Complete los datos y súbala de vuelta para actualizar"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar la plantilla",
        variant: "destructive"
      });
    }
  };

  // Procesar archivo de actualización
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setParsedData([]);
    setErrors([]);

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      
      if (!workbook.SheetNames.includes('Actualizaciones')) {
        throw new Error('No se encontró la hoja "Actualizaciones"');
      }

      const worksheet = workbook.Sheets['Actualizaciones'];
      const data = XLSX.utils.sheet_to_json(worksheet) as any[];

      const updates: ActualizacionData[] = [];
      const newErrors: string[] = [];

      data.forEach((row, index) => {
        const numeroPadron = String(row.numero_padron || '').trim();
        if (!numeroPadron) {
          newErrors.push(`Fila ${index + 2}: numero_padron vacío`);
          return;
        }

        const dniNuevo = String(row.dni_nuevo || '').trim();
        const telefono1 = String(row.telefono_nuevo1 || '').trim();
        const telefono2 = String(row.telefono_nuevo2 || '').trim();
        const telefono3 = String(row.telefono_nuevo3 || '').trim();

        // Solo procesar si hay algo que actualizar
        if (!dniNuevo && !telefono1 && !telefono2 && !telefono3) {
          return; // Saltar filas sin cambios
        }

        // Validar DNI si se proporciona
        if (dniNuevo && !/^\d{8}$/.test(dniNuevo)) {
          newErrors.push(`Fila ${index + 2}: DNI debe tener 8 dígitos`);
          return;
        }

        const telefonos = [telefono1, telefono2, telefono3].filter(Boolean);

        updates.push({
          numeroPadron,
          ...(dniNuevo && { dni: dniNuevo }),
          ...(telefonos.length > 0 && { telefonos })
        });
      });

      if (newErrors.length > 0) {
        setErrors(newErrors);
      }

      setParsedData(updates);
      
      if (updates.length === 0 && newErrors.length === 0) {
        toast({
          title: "Sin cambios",
          description: "No se encontraron datos para actualizar",
          variant: "destructive"
        });
      }

    } catch (error) {
      toast({
        title: "Error al procesar archivo",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Ejecutar actualización masiva
  const executeUpdate = async () => {
    if (parsedData.length === 0) return;

    setUpdating(true);
    setProgress(0);

    try {
      const empadronados = await getEmpadronados();
      let processed = 0;
      let updated = 0;

      for (const updateData of parsedData) {
        const empadronado = empadronados.find(e => e.numeroPadron === updateData.numeroPadron);
        
        if (empadronado) {
          const updates: any = {};
          
          if (updateData.dni) {
            updates.dni = updateData.dni;
          }
          
          if (updateData.telefonos) {
            updates.telefonos = updateData.telefonos.map(tel => ({ numero: tel }));
          }

          if (Object.keys(updates).length > 0) {
            const success = await updateEmpadronado(empadronado.id, updates, 'admin-user');
            if (success) updated++;
          }
        }

        processed++;
        setProgress((processed / parsedData.length) * 100);
      }

      toast({
        title: "Actualización completada",
        description: `Se actualizaron ${updated} de ${processed} registros`
      });

      onComplete();
      onOpenChange(false);

    } catch (error) {
      toast({
        title: "Error en actualización",
        description: "No se pudo completar la actualización masiva",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Actualización Masiva de Datos</DialogTitle>
          <DialogDescription>
            Actualiza DNI y teléfonos de múltiples empadronados usando un archivo Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Paso 1: Descargar plantilla */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Paso 1: Descargar Plantilla
              </CardTitle>
              <CardDescription>
                Descarga un Excel con los datos actuales para completar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={generateUpdateTemplate} className="w-full">
                <FileText className="h-4 w-4 mr-2" />
                Descargar Plantilla de Actualización
              </Button>
            </CardContent>
          </Card>

          {/* Paso 2: Subir archivo completado */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Paso 2: Subir Archivo Completado
              </CardTitle>
              <CardDescription>
                Sube el Excel con los datos actualizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="w-full"
                variant="outline"
              >
                <Upload className="h-4 w-4 mr-2" />
                {loading ? 'Procesando...' : 'Seleccionar Archivo Excel'}
              </Button>
            </CardContent>
          </Card>

          {/* Errores */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <strong>Se encontraron errores:</strong>
                  {errors.slice(0, 5).map((error, index) => (
                    <div key={index} className="text-sm">• {error}</div>
                  ))}
                  {errors.length > 5 && (
                    <div className="text-sm">... y {errors.length - 5} errores más</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Datos procesados */}
          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Paso 3: Confirmar Actualización
                </CardTitle>
                <CardDescription>
                  Se encontraron {parsedData.length} registros para actualizar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {parsedData.slice(0, 10).map((item, index) => (
                    <div key={index} className="text-sm py-1 border-b last:border-b-0">
                      <strong>{item.numeroPadron}</strong>
                      {item.dni && <span className="ml-2 text-blue-600">DNI: {item.dni}</span>}
                      {item.telefonos && <span className="ml-2 text-green-600">Tels: {item.telefonos.join(', ')}</span>}
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <div className="text-sm text-muted-foreground py-1">
                      ... y {parsedData.length - 10} más
                    </div>
                  )}
                </div>

                {updating && (
                  <div className="space-y-2">
                    <Progress value={progress} />
                    <p className="text-sm text-center">{Math.round(progress)}% completado</p>
                  </div>
                )}

                <Button 
                  onClick={executeUpdate}
                  disabled={updating || errors.length > 0}
                  className="w-full"
                >
                  {updating ? 'Actualizando...' : 'Ejecutar Actualización Masiva'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};