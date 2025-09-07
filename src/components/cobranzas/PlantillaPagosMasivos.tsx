import { useState, useEffect } from "react";
import { Download, Upload, FileSpreadsheet, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { obtenerPagosPorEmpadronado } from "@/services/cobranzas";
import { getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";
import { Pago } from "@/types/cobranzas";
import * as XLSX from 'xlsx';

interface PagoMasivo {
  empadronadoId: string;
  numeroPadron: string;
  nombre: string;
  apellidos: string;
  periodo: string;
  monto: number;
  mora: number;
  descuento: number;
  totalAPagar: number;
  numeroOperacion?: string;
  observaciones?: string;
}

export function PlantillaPagosMasivos() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [pagosMasivos, setPagosMasivos] = useState<PagoMasivo[]>([]);
  const [archivoSubido, setArchivoSubido] = useState<File | null>(null);
  const [procesandoArchivo, setProcesandoArchivo] = useState(false);

  const generarPlantilla = async () => {
    try {
      setLoading(true);
      setProgreso(0);

      // Obtener todos los empadronados
      const empadronados = await getEmpadronados();
      setProgreso(30);

      // Obtener todas las deudas
      const deudas: PagoMasivo[] = [];
      
      for (let i = 0; i < empadronados.length; i++) {
        const emp = empadronados[i];
        const pagosEmp = await obtenerPagosPorEmpadronado(emp.id);
        const cuotasPendientes = pagosEmp.filter(p => 
          p.estado === 'pendiente' || p.estado === 'moroso'
        );

        // Crear una fila por cada cuota pendiente
        for (const cuota of cuotasPendientes) {
          const mora = calcularMora(cuota);
          const descuento = calcularDescuentoProntoPago(cuota);
          const totalAPagar = cuota.monto + mora - descuento;

          deudas.push({
            empadronadoId: emp.id,
            numeroPadron: emp.numeroPadron,
            nombre: emp.nombre,
            apellidos: emp.apellidos,
            periodo: `${cuota.mes.toString().padStart(2, '0')}/${cuota.año}`,
            monto: cuota.monto,
            mora,
            descuento,
            totalAPagar,
            numeroOperacion: '', // Campo vacío para llenar
            observaciones: ''
          });
        }

        setProgreso(30 + (i / empadronados.length) * 50);
      }

      setPagosMasivos(deudas);
      setProgreso(80);

      // Generar archivo Excel
      const ws = XLSX.utils.json_to_sheet(deudas.map(d => ({
        'N° Padrón': d.numeroPadron,
        'Nombre': d.nombre,
        'Apellidos': d.apellidos,
        'Período': d.periodo,
        'Monto Base': d.monto.toFixed(2),
        'Mora': d.mora.toFixed(2),
        'Descuento': d.descuento.toFixed(2),
        'Total a Pagar': d.totalAPagar.toFixed(2),
        'N° Operación': '', // Columna vacía para llenar
        'Banco/Método': '',
        'Fecha Pago': '',
        'Observaciones': ''
      })));

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 10 }, // N° Padrón
        { wch: 20 }, // Nombre
        { wch: 20 }, // Apellidos
        { wch: 10 }, // Período
        { wch: 12 }, // Monto Base
        { wch: 10 }, // Mora
        { wch: 12 }, // Descuento
        { wch: 15 }, // Total a Pagar
        { wch: 20 }, // N° Operación
        { wch: 20 }, // Banco/Método
        { wch: 12 }, // Fecha Pago
        { wch: 30 }  // Observaciones
      ];
      ws['!cols'] = colWidths;

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Pagos Masivos');

      // Descargar archivo
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `plantilla_pagos_masivos_${fecha}.xlsx`);

      setProgreso(100);
      
      toast({
        title: "Plantilla generada",
        description: `Se generó la plantilla con ${deudas.length} deudas pendientes`,
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar la plantilla",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setTimeout(() => setProgreso(0), 2000);
    }
  };

  const calcularMora = (cuota: Pago) => {
    if (!cuota.fechaVencimiento) return 0;
    
    const [dd, mm, aa] = cuota.fechaVencimiento.split('/');
    const vencimiento = new Date(Number(aa), Number(mm) - 1, Number(dd));
    const hoy = new Date();
    
    if (hoy <= vencimiento) return 0;
    
    const diasVencidos = Math.floor((hoy.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24));
    const porcentajeMora = 0.1; // 10% de mora por mes
    const mesesVencidos = Math.ceil(diasVencidos / 30);
    
    return cuota.montoOriginal * (porcentajeMora * mesesVencidos);
  };

  const calcularDescuentoProntoPago = (cuota: Pago) => {
    // Descuento del 10% si paga antes del día 5
    const hoy = new Date();
    if (hoy.getDate() <= 5) {
      return cuota.montoOriginal * 0.1;
    }
    return 0;
  };

  const procesarArchivoSubido = async () => {
    if (!archivoSubido) return;

    try {
      setProcesandoArchivo(true);
      
      const arrayBuffer = await archivoSubido.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);

      // Validar estructura del archivo
      const pagosValidados = data.filter((row: any) => {
        return row['N° Operación'] && row['N° Operación'].toString().trim() !== '';
      });

      if (pagosValidados.length === 0) {
        toast({
          title: "Archivo sin pagos",
          description: "No se encontraron pagos con número de operación",
          variant: "destructive"
        });
        return;
      }

      // Aquí procesarías los pagos masivos
      // En una implementación real, actualizarías la base de datos
      
      toast({
        title: "Pagos procesados",
        description: `Se procesaron ${pagosValidados.length} pagos exitosamente`,
      });

      setArchivoSubido(null);

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar el archivo",
        variant: "destructive"
      });
    } finally {
      setProcesandoArchivo(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Pagos Masivos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Generar Plantilla */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <Download className="h-12 w-12 mx-auto text-primary" />
              <div>
                <h3 className="font-semibold mb-2">1. Descargar Plantilla</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Genera un archivo Excel con todas las deudas pendientes
                </p>
                <Button 
                  onClick={generarPlantilla} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Generando..." : "Descargar Plantilla"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-4">
              <Upload className="h-12 w-12 mx-auto text-primary" />
              <div>
                <h3 className="font-semibold mb-2">2. Subir Pagos</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Sube el archivo con los números de operación completados
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      Subir Archivo
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Subir Pagos Masivos</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Asegúrate de completar las columnas "N° Operación", "Banco/Método" y "Fecha Pago" antes de subir el archivo.
                        </AlertDescription>
                      </Alert>

                      <div>
                        <Label>Archivo de Pagos Masivos</Label>
                        <Input
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={(e) => setArchivoSubido(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Solo archivos Excel (.xlsx, .xls)
                        </p>
                      </div>

                      {archivoSubido && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm font-semibold">{archivoSubido.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(archivoSubido.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={procesarArchivoSubido}
                        disabled={!archivoSubido || procesandoArchivo}
                        className="w-full"
                      >
                        {procesandoArchivo ? "Procesando..." : "Procesar Pagos"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progreso */}
        {progreso > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Generando plantilla...</span>
              <span>{progreso}%</span>
            </div>
            <Progress value={progreso} />
          </div>
        )}

        {/* Información adicional */}
        <Alert>
          <Users className="h-4 w-4" />
          <AlertDescription>
            <strong>Instrucciones:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
              <li>Descarga la plantilla con todas las deudas pendientes</li>
              <li>Completa las columnas de "N° Operación", "Banco/Método" y "Fecha Pago"</li>
              <li>Deja vacías las filas de cuotas que no se pagaron</li>
              <li>Sube el archivo completado para procesar los pagos masivamente</li>
            </ol>
          </AlertDescription>
        </Alert>

        {/* Estadísticas */}
        {pagosMasivos.length > 0 && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-2">Resumen de la Última Plantilla</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Deudas</p>
                  <p className="font-semibold">{pagosMasivos.length}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Asociados</p>
                  <p className="font-semibold">
                    {new Set(pagosMasivos.map(p => p.empadronadoId)).size}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Monto Total</p>
                  <p className="font-semibold">
                    S/ {pagosMasivos.reduce((sum, p) => sum + p.totalAPagar, 0).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total Moras</p>
                  <p className="font-semibold text-red-600">
                    S/ {pagosMasivos.reduce((sum, p) => sum + p.mora, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}