import { useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, AlertTriangle, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { 
  procesarImportacionPagos, 
  validarDatosImportacion,
  exportarResultadoJSON,
  type ResultadoImportacion,
  type FilaExcel
} from "@/services/importacion-pagos";
import * as XLSX from 'xlsx';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportacionCompleta: () => void;
}

export default function ImportarPagosMasivosModal({ open, onOpenChange, onImportacionCompleta }: Props) {
  const { toast } = useToast();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [datos, setDatos] = useState<FilaExcel[]>([]);
  const [procesando, setProcesando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null);
  const [año, setAño] = useState(2025);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar que sea Excel
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      toast({
        title: "Archivo inválido",
        description: "Por favor, selecciona un archivo Excel (.xlsx, .xls) o CSV",
        variant: "destructive"
      });
      return;
    }

    setArchivo(file);
    setResultado(null);

    try {
      // Leer el archivo
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON
      const jsonData: FilaExcel[] = XLSX.utils.sheet_to_json(worksheet);
      
      setDatos(jsonData);
      
      toast({
        title: "Archivo cargado",
        description: `${jsonData.length} filas detectadas`,
      });
      
    } catch (error) {
      console.error('Error leyendo archivo:', error);
      toast({
        title: "Error",
        description: "No se pudo leer el archivo",
        variant: "destructive"
      });
    }
  };

  const handleValidar = async () => {
    if (datos.length === 0) {
      toast({
        title: "Sin datos",
        description: "Por favor, carga primero un archivo",
        variant: "destructive"
      });
      return;
    }

    setValidando(true);

    try {
      const { valido, errores } = await validarDatosImportacion(datos);
      
      if (valido) {
        toast({
          title: "✅ Validación exitosa",
          description: "Los datos están listos para importar",
        });
      } else {
        toast({
          title: "❌ Errores de validación",
          description: errores.join(', '),
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setValidando(false);
    }
  };

  const handleImportar = async () => {
    if (datos.length === 0) {
      toast({
        title: "Sin datos",
        description: "Por favor, carga primero un archivo",
        variant: "destructive"
      });
      return;
    }

    setProcesando(true);

    try {
      const result = await procesarImportacionPagos(datos, año);
      setResultado(result);
      
      toast({
        title: "✅ Importación completada",
        description: `${result.resumen.exitosos} pagos importados correctamente`,
      });

      // Notificar al padre para recargar datos
      onImportacionCompleta();
      
    } catch (error: any) {
      console.error('Error en importación:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleDescargarReporte = () => {
    if (!resultado) return;

    const json = exportarResultadoJSON(resultado);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-importacion-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCerrar = () => {
    setArchivo(null);
    setDatos([]);
    setResultado(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Pagos Masivos desde Excel
          </DialogTitle>
          <DialogDescription>
            Carga un archivo Excel con los pagos de los asociados. El sistema validará y procesará automáticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Selector de año */}
          <div className="flex items-center gap-4">
            <label className="font-medium">Año:</label>
            <input
              type="number"
              value={año}
              onChange={(e) => setAño(parseInt(e.target.value))}
              className="border rounded px-3 py-2 w-24"
              min="2020"
              max="2030"
            />
          </div>

          {/* Carga de archivo */}
          {!resultado && !procesando && (
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">
                  Arrastra un archivo Excel o haz click para seleccionar
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>Seleccionar archivo</span>
                  </Button>
                </label>
                {archivo && (
                  <p className="mt-2 text-sm text-green-600">
                    ✓ {archivo.name} ({datos.length} filas)
                  </p>
                )}
              </div>

              {/* Formato esperado */}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Formato esperado:</strong> El Excel debe tener las columnas: Padron, Enero, Febrero, Marzo, etc.
                  <br />
                  Los montos deben ser números (ej: 50, 50.00). Las celdas vacías se consideran meses no pagados.
                </AlertDescription>
              </Alert>

              {/* Botones de acción */}
              {datos.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleValidar}
                    disabled={validando}
                    variant="outline"
                  >
                    {validando ? "Validando..." : "Validar Datos"}
                  </Button>
                  <Button
                    onClick={handleImportar}
                    disabled={procesando}
                  >
                    {procesando ? "Importando..." : `Importar ${datos.length} Filas`}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Indicador de progreso mientras procesa */}
          {procesando && !resultado && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                <h3 className="text-lg font-semibold mb-2">Procesando importación...</h3>
                <p className="text-sm text-muted-foreground">
                  Esto puede tomar varios minutos dependiendo del tamaño del archivo.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Por favor, no cierres esta ventana.
                </p>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Los errores "Ya existe un pago" son normales si ya importaste estos datos antes.
                  El sistema los saltará automáticamente.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Resultado de la importación */}
          {resultado && (
            <div className="space-y-4">
              {/* Alert importante sobre aprobación */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900">
                  <strong>✅ Importación Completada:</strong> Los pagos han sido registrados como <strong>"PENDIENTES"</strong>.
                  <br />
                  <strong>Próximo paso:</strong> Ve a la pestaña "Pagos" para revisar y aprobar los pagos importados.
                </AlertDescription>
              </Alert>

              {/* Resumen */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Exitosos</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600">{resultado.resumen.exitosos}</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Parciales</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">{resultado.resumen.parciales}</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium">Warnings</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">{resultado.resumen.warnings}</p>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Errores</span>
                  </div>
                  <p className="text-2xl font-bold text-red-600">{resultado.resumen.errores}</p>
                </div>

                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 col-span-2">
                  <span className="text-sm font-medium">Monto Total Importado</span>
                  <p className="text-2xl font-bold text-primary">
                    S/ {resultado.resumen.montoTotalImportado.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Detalles de éxitos */}
              {resultado.exitos.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-green-600">✅ Pagos Completos ({resultado.exitos.length})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                    {resultado.exitos.slice(0, 10).map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{item.numeroPadron} - {item.mes}</span>
                        <span className="font-medium">S/ {item.monto.toFixed(2)}</span>
                      </div>
                    ))}
                    {resultado.exitos.length > 10 && (
                      <p className="text-muted-foreground italic">... y {resultado.exitos.length - 10} más</p>
                    )}
                  </div>
                </div>
              )}

              {/* Detalles de parciales */}
              {resultado.parciales.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-blue-600">💰 Pagos Parciales ({resultado.parciales.length})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-2 text-sm">
                    {resultado.parciales.map((item, idx) => (
                      <div key={idx} className="border-b pb-1">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.numeroPadron} - {item.mes}</span>
                          <span className="text-red-600">Saldo: S/ {item.saldoRestante.toFixed(2)}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Pagado: S/ {item.montoPagado.toFixed(2)} de S/ {item.montoCargo.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Warnings */}
              {resultado.warnings.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-yellow-600">⚠️ Advertencias ({resultado.warnings.length})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                    {resultado.warnings.slice(0, 10).map((item, idx) => (
                      <div key={idx}>
                        <span className="font-medium">{item.numeroPadron}</span> - {item.mes}: {item.razon}
                      </div>
                    ))}
                    {resultado.warnings.length > 10 && (
                      <p className="text-muted-foreground italic">... y {resultado.warnings.length - 10} más</p>
                    )}
                  </div>
                </div>
              )}

              {/* Errores */}
              {resultado.errores.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-red-600">❌ Errores ({resultado.errores.length})</h3>
                  <div className="max-h-40 overflow-y-auto space-y-1 text-sm">
                    {resultado.errores.slice(0, 10).map((item, idx) => (
                      <div key={idx}>
                        <span className="font-medium">{item.numeroPadron}</span>
                        {item.mes && ` - ${item.mes}`}: {item.razon}
                      </div>
                    ))}
                    {resultado.errores.length > 10 && (
                      <p className="text-muted-foreground italic">... y {resultado.errores.length - 10} más</p>
                    )}
                  </div>
                </div>
              )}

              {/* Botones finales */}
              <div className="flex gap-2">
                <Button onClick={handleDescargarReporte} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Reporte Completo
                </Button>
                <Button onClick={handleCerrar}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

