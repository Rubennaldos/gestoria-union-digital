import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileDown, ExternalLink, TrendingUp, TrendingDown, Download, Calendar, User, FileText, CreditCard, UserCircle, Clock } from "lucide-react";
import { MovimientoFinanciero } from "@/types/finanzas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generarComprobantePDF } from "@/lib/pdf/comprobanteFinanciero";
import { toast } from "sonner";
import { useState } from "react";
import { ref as sref, getDownloadURL } from "firebase/storage";
import { storage } from "@/config/firebase";

interface DetalleMovimientoModalProps {
  movimiento: MovimientoFinanciero | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoriasLabels: Record<string, string> = {
  donacion: "Donación",
  multa_externa: "Multa Externa",
  evento: "Evento",
  alquiler: "Alquiler",
  intereses: "Intereses",
  mantenimiento: "Mantenimiento",
  servicios: "Servicios",
  personal: "Personal",
  seguridad: "Seguridad",
  compras: "Compras",
  eventos: "Eventos",
  reparaciones: "Reparaciones",
  otro: "Otro",
};

export const DetalleMovimientoModal = ({
  movimiento,
  open,
  onOpenChange,
}: DetalleMovimientoModalProps) => {
  const [descargando, setDescargando] = useState(false);

  if (!movimiento) return null;

  const descargarComprobante = async () => {
    try {
      setDescargando(true);

      // Pre-descargar la imagen con autenticación ANTES de generar el PDF
      let imageDataUrl: string | undefined;
      if (movimiento.comprobantes && movimiento.comprobantes.length > 0) {
        const comp = movimiento.comprobantes[0];
        try {
          console.log("🔄 Pre-descargando imagen con autenticación...");
          
          // Extraer ruta de storage desde la URL
          let storagePath = "";
          if (comp.url.includes("/o/")) {
            const match = comp.url.match(/\/o\/([^?]+)/);
            if (match) {
              storagePath = decodeURIComponent(match[1]);
            }
          }
          
          console.log("📁 Ruta:", storagePath);
          const storageRef = sref(storage, storagePath);
          
          // Obtener URL autenticada con token largo
          const downloadUrl = await getDownloadURL(storageRef);
          console.log("✅ URL autenticada obtenida");
          
          // Descargar con fetch y timeout largo (2 minutos)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minutos
          
          const response = await fetch(downloadUrl, { signal: controller.signal });
          clearTimeout(timeoutId);
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          
          const blob = await response.blob();
          console.log("✅ Imagen descargada:", (blob.size / 1024).toFixed(2), "KB");
          
          // Convertir a DataURL
          imageDataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          console.log("✅ DataURL listo para PDF");
        } catch (imgError) {
          console.error("⚠️ Error al pre-descargar imagen:", imgError);
          toast.warning("No se pudo incluir la imagen en el PDF");
        }
      }

      // Generar PDF con la imagen ya descargada
      const pdfBlob = await generarComprobantePDF({
        id: movimiento.id,
        tipo: movimiento.tipo,
        categoria: categoriasLabels[movimiento.categoria] || movimiento.categoria,
        monto: movimiento.monto,
        descripcion: movimiento.descripcion,
        fecha: movimiento.fecha,
        numeroComprobante: movimiento.numeroComprobante || "",
        beneficiario: movimiento.beneficiario || movimiento.proveedor || "",
        proveedor: movimiento.proveedor || "",
        observaciones: movimiento.observaciones,
        registradoPorNombre: movimiento.registradoPorNombre,
        createdAt: movimiento.createdAt,
        comprobantes: movimiento.comprobantes,
        imageDataUrl, // 👈 Pasar la imagen pre-descargada
        empadronadoNumeroPadron: movimiento.empadronadoNumeroPadron,
        empadronadoNombres: movimiento.empadronadoNombres,
        empadronadoDni: movimiento.empadronadoDni,
        ...(movimiento.categoria === "evento" && movimiento.observaciones
          ? (() => {
              try {
                const obs = JSON.parse(movimiento.observaciones);
                return {
                  banco: obs.banco || "",
                  numeroPadron: obs.numeroPadron || "",
                  nombreAsociado: obs.nombreAsociado || "",
                };
              } catch {
                return {};
              }
            })()
          : {}),
      });

      // Descargar el PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `comprobante-${movimiento.tipo}-${movimiento.id.slice(-8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Comprobante descargado correctamente");
    } catch (error) {
      console.error("Error al descargar comprobante:", error);
      toast.error("Error al descargar el comprobante");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header Mejorado */}
        <div className={`relative overflow-hidden p-6 pb-8 ${
          movimiento.tipo === "ingreso" 
            ? "bg-gradient-to-br from-success/10 via-success/5 to-transparent" 
            : "bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            {movimiento.tipo === "ingreso" ? (
              <TrendingUp className="w-full h-full" />
            ) : (
              <TrendingDown className="w-full h-full" />
            )}
          </div>
          
          <DialogHeader className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                  movimiento.tipo === "ingreso" 
                    ? "bg-success/20" 
                    : "bg-destructive/20"
                }`}>
                  {movimiento.tipo === "ingreso" ? (
                    <TrendingUp className="h-6 w-6 text-success" />
                  ) : (
                    <TrendingDown className="h-6 w-6 text-destructive" />
                  )}
                </div>
                <div>
                  <DialogTitle className="text-2xl mb-2">
                    Detalle de {movimiento.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                  </DialogTitle>
                  <Badge 
                    variant={movimiento.tipo === "ingreso" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {categoriasLabels[movimiento.categoria]}
                  </Badge>
                </div>
              </div>
              <Button 
                onClick={descargarComprobante} 
                disabled={descargando}
                size="sm" 
                className="gap-2 shrink-0"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {descargando ? "Descargando..." : "Descargar PDF"}
                </span>
              </Button>
            </div>
            <DialogDescription className="sr-only">
              Información detallada del movimiento financiero
            </DialogDescription>
          </DialogHeader>
          
          {/* Monto Destacado */}
          <div className="mt-4 relative">
            <div className={`inline-flex items-baseline gap-2 px-4 py-2 rounded-lg ${
              movimiento.tipo === "ingreso" 
                ? "bg-success/10 border border-success/20" 
                : "bg-destructive/10 border border-destructive/20"
            }`}>
              <span className="text-sm text-muted-foreground">S/</span>
              <span className={`text-3xl font-bold ${
                movimiento.tipo === "ingreso" ? "text-success" : "text-destructive"
              }`}>
                {movimiento.monto.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Información General */}
          <Card className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Información General</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fecha</p>
                    <p className="font-medium text-sm">
                      {format(new Date(movimiento.fecha), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                {movimiento.numeroComprobante && (
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">N° Comprobante</p>
                      <p className="font-medium text-sm">{movimiento.numeroComprobante}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Datos del Empadronado */}
          {movimiento.empadronadoNumeroPadron && (
            <Card className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserCircle className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">Datos del Empadronado</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">N° Padrón</p>
                      <p className="font-medium text-sm">{movimiento.empadronadoNumeroPadron}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Nombres Completos</p>
                      <p className="font-medium text-sm">{movimiento.empadronadoNombres}</p>
                    </div>
                  </div>
                  {movimiento.empadronadoDni && (
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">DNI</p>
                        <p className="font-medium text-sm">{movimiento.empadronadoDni}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Descripción */}
          <Card className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Descripción</h3>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {movimiento.descripcion}
              </p>
            </CardContent>
          </Card>

          {/* Información Adicional */}
          {(movimiento.proveedor || movimiento.beneficiario || movimiento.observaciones) && (
            <Card className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">Información Adicional</h3>
                </div>
                <div className="space-y-3">
                  {movimiento.proveedor && (
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Proveedor</p>
                        <p className="font-medium text-sm">{movimiento.proveedor}</p>
                      </div>
                    </div>
                  )}
                  {movimiento.beneficiario && (
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Beneficiario</p>
                        <p className="font-medium text-sm">{movimiento.beneficiario}</p>
                      </div>
                    </div>
                  )}
                  {movimiento.observaciones && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground mb-2">Observaciones</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {movimiento.observaciones}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Comprobantes */}
          {movimiento.comprobantes && movimiento.comprobantes.length > 0 && (
            <Card className="border-primary/20 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold">
                    Comprobantes ({movimiento.comprobantes.length})
                  </h3>
                </div>
                <div className="space-y-2">
                  {movimiento.comprobantes.map((comprobante, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/50 to-transparent rounded-lg border hover:border-primary/30 transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{comprobante.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {(comprobante.tamano / 1024).toFixed(2)} KB •{" "}
                          {format(comprobante.fechaSubida, "dd/MM/yyyy HH:mm", { locale: es })}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-3">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(comprobante.url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = comprobante.url;
                            link.download = comprobante.nombre;
                            link.click();
                          }}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información de Registro */}
          <Card className="border-muted shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-sm">Información de Registro</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Registrado por</p>
                    <p className="font-medium text-sm">{movimiento.registradoPorNombre}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Fecha de Registro</p>
                    <p className="font-medium text-sm">
                      {format(movimiento.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};
