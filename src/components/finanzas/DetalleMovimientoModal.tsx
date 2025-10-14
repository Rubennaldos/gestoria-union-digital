import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDown, ExternalLink, TrendingUp, TrendingDown, Download } from "lucide-react";
import { MovimientoFinanciero } from "@/types/finanzas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generarComprobanteFinanciero } from "@/lib/pdf/comprobanteFinanciero";
import { toast } from "sonner";
import { useState } from "react";

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
      
      const pdfBlob = await generarComprobanteFinanciero({
        id: movimiento.id,
        tipo: movimiento.tipo,
        categoria: categoriasLabels[movimiento.categoria] || movimiento.categoria,
        monto: movimiento.monto,
        descripcion: movimiento.descripcion,
        fecha: movimiento.fecha,
        numeroComprobante: movimiento.numeroComprobante,
        beneficiario: movimiento.beneficiario,
        proveedor: movimiento.proveedor,
        observaciones: movimiento.observaciones,
        registradoPorNombre: movimiento.registradoPorNombre,
        createdAt: movimiento.createdAt,
        comprobantes: movimiento.comprobantes,
        // Extraer información adicional de observaciones si es un evento
        ...(movimiento.categoria === "evento" && movimiento.observaciones ? (() => {
          try {
            const obs = JSON.parse(movimiento.observaciones);
            return {
              banco: obs.banco || "",
              numeroPadron: obs.numeroPadron || "",
              nombreAsociado: obs.nombreAsociado || ""
            };
          } catch {
            return {};
          }
        })() : {}),
      });

      // Descargar el PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {movimiento.tipo === "ingreso" ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
              <DialogTitle>
                Detalle de {movimiento.tipo === "ingreso" ? "Ingreso" : "Egreso"}
              </DialogTitle>
            </div>
            <Button
              onClick={descargarComprobante}
              disabled={descargando}
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {descargando ? "Descargando..." : "Descargar PDF"}
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Información detallada del movimiento financiero
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Principal */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Información General</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge
                  variant={movimiento.tipo === "ingreso" ? "default" : "destructive"}
                  className="mt-1"
                >
                  {movimiento.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-medium">{categoriasLabels[movimiento.categoria]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto</p>
                <p className="text-2xl font-bold">
                  <span
                    className={
                      movimiento.tipo === "ingreso" ? "text-green-600" : "text-red-600"
                    }
                  >
                    S/ {movimiento.monto.toFixed(2)}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {format(new Date(movimiento.fecha), "dd 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Descripción */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Descripción</h3>
            <p className="text-sm whitespace-pre-wrap">{movimiento.descripcion}</p>
          </div>

          {/* Información Adicional */}
          {(movimiento.numeroComprobante ||
            movimiento.proveedor ||
            movimiento.beneficiario ||
            movimiento.observaciones) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">Información Adicional</h3>
                <div className="grid grid-cols-2 gap-4">
                  {movimiento.numeroComprobante && (
                    <div>
                      <p className="text-sm text-muted-foreground">N° Comprobante</p>
                      <p className="font-medium">{movimiento.numeroComprobante}</p>
                    </div>
                  )}
                  {movimiento.proveedor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Proveedor</p>
                      <p className="font-medium">{movimiento.proveedor}</p>
                    </div>
                  )}
                  {movimiento.beneficiario && (
                    <div>
                      <p className="text-sm text-muted-foreground">Beneficiario</p>
                      <p className="font-medium">{movimiento.beneficiario}</p>
                    </div>
                  )}
                </div>
                {movimiento.observaciones && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Observaciones</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {movimiento.observaciones}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Comprobantes */}
          {movimiento.comprobantes && movimiento.comprobantes.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  Comprobantes ({movimiento.comprobantes.length})
                </h3>
                <div className="space-y-2">
                  {movimiento.comprobantes.map((comprobante, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{comprobante.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {(comprobante.tamano / 1024).toFixed(2)} KB •{" "}
                          {format(comprobante.fechaSubida, "dd/MM/yyyy HH:mm", {
                            locale: es,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(comprobante.url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
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
              </div>
            </>
          )}

          <Separator />

          {/* Información de Registro */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Información de Registro</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Registrado por</p>
                <p className="font-medium">{movimiento.registradoPorNombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                <p className="font-medium">
                  {format(movimiento.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
