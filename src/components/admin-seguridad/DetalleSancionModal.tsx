import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDown, Printer } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Sancion {
  id: string;
  numeroSancion: string;
  numeroResolucion: string;
  tipoEntidad: "empadronado" | "maestro_obra";
  entidadNombre: string;
  entidadDocumento?: string;
  tipoSancion: string;
  motivo: string;
  descripcion: string;
  montoMulta?: number;
  fechaAplicacion: string;
  fechaVencimiento?: string;
  estado: string;
  aplicadoPorNombre: string;
  observaciones?: string;
  createdAt: number;
}

interface DetalleSancionModalProps {
  sancion: Sancion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DetalleSancionModal = ({ sancion, open, onOpenChange }: DetalleSancionModalProps) => {
  if (!sancion) return null;

  const getTipoSancionLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      amonestacion: "Amonestación",
      multa: "Multa",
      suspension_temporal: "Suspensión Temporal",
      suspension_permanente: "Suspensión Permanente",
      inhabilitacion: "Inhabilitación",
      otros: "Otros",
    };
    return labels[tipo] || tipo;
  };

  const handleImprimir = () => {
    const contenido = document.getElementById("sancion-print-content");
    if (!contenido) return;

    const ventanaImpresion = window.open("", "_blank");
    if (!ventanaImpresion) return;

    ventanaImpresion.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sanción ${sancion.numeroResolucion}</title>
          <style>
            @page {
              size: A4;
              margin: 2cm;
            }
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #000;
              max-width: 21cm;
              margin: 0 auto;
              padding: 20px;
            }
            h1 {
              text-align: center;
              font-size: 24px;
              margin-bottom: 10px;
            }
            h2 {
              font-size: 18px;
              margin-top: 20px;
              margin-bottom: 10px;
              border-bottom: 2px solid #333;
              padding-bottom: 5px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .info-row {
              display: flex;
              margin-bottom: 15px;
            }
            .info-label {
              font-weight: bold;
              width: 180px;
            }
            .info-value {
              flex: 1;
            }
            .section {
              margin-bottom: 25px;
            }
            .footer {
              margin-top: 50px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RESOLUCIÓN DE SANCIÓN</h1>
            <p><strong>${sancion.numeroResolucion}</strong></p>
          </div>

          <div class="section">
            <h2>INFORMACIÓN GENERAL</h2>
            <div class="info-row">
              <div class="info-label">Número de Sanción:</div>
              <div class="info-value">${sancion.numeroSancion}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Tipo de Sanción:</div>
              <div class="info-value">${getTipoSancionLabel(sancion.tipoSancion)}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Estado:</div>
              <div class="info-value">${sancion.estado.toUpperCase()}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Fecha de Aplicación:</div>
              <div class="info-value">${format(new Date(sancion.fechaAplicacion), "dd 'de' MMMM 'de' yyyy, HH:mm 'hrs'", { locale: es })}</div>
            </div>
            ${sancion.fechaVencimiento ? `
            <div class="info-row">
              <div class="info-label">Fecha de Vencimiento:</div>
              <div class="info-value">${format(new Date(sancion.fechaVencimiento), "dd 'de' MMMM 'de' yyyy", { locale: es })}</div>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>SANCIONADO</h2>
            <div class="info-row">
              <div class="info-label">Nombre Completo:</div>
              <div class="info-value">${sancion.entidadNombre}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Tipo:</div>
              <div class="info-value">${sancion.tipoEntidad === "maestro_obra" ? "Maestro de Obra" : "Empadronado"}</div>
            </div>
            ${sancion.entidadDocumento ? `
            <div class="info-row">
              <div class="info-label">Documento (DNI):</div>
              <div class="info-value">${sancion.entidadDocumento}</div>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>DETALLE DE LA SANCIÓN</h2>
            <div class="info-row">
              <div class="info-label">Motivo:</div>
              <div class="info-value">${sancion.motivo}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Descripción:</div>
              <div class="info-value">${sancion.descripcion}</div>
            </div>
            ${sancion.montoMulta ? `
            <div class="info-row">
              <div class="info-label">Monto de Multa:</div>
              <div class="info-value">S/ ${sancion.montoMulta.toFixed(2)}</div>
            </div>
            ` : ''}
            ${sancion.observaciones ? `
            <div class="info-row">
              <div class="info-label">Observaciones:</div>
              <div class="info-value">${sancion.observaciones}</div>
            </div>
            ` : ''}
          </div>

          <div class="section">
            <h2>INFORMACIÓN ADMINISTRATIVA</h2>
            <div class="info-row">
              <div class="info-label">Aplicado por:</div>
              <div class="info-value">${sancion.aplicadoPorNombre}</div>
            </div>
            <div class="info-row">
              <div class="info-label">Fecha de Registro:</div>
              <div class="info-value">${format(sancion.createdAt, "dd 'de' MMMM 'de' yyyy, HH:mm 'hrs'", { locale: es })}</div>
            </div>
          </div>

          <div class="footer">
            <p>Documento generado el ${format(new Date(), "dd 'de' MMMM 'de' yyyy, HH:mm 'hrs'", { locale: es })}</p>
            <p>Este documento es una copia fiel del registro en el sistema</p>
          </div>
        </body>
      </html>
    `);

    ventanaImpresion.document.close();
    ventanaImpresion.focus();
    
    setTimeout(() => {
      ventanaImpresion.print();
    }, 250);
  };

  const handleDescargarPDF = () => {
    handleImprimir();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detalle de Sanción - {sancion.numeroResolucion}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDescargarPDF}>
                <FileDown className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleImprimir}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div id="sancion-print-content" className="space-y-6">
          {/* Información General */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Información General</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número de Sanción</p>
                <p className="font-medium">{sancion.numeroSancion}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Número de Resolución</p>
                <p className="font-medium">{sancion.numeroResolucion}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo de Sanción</p>
                <p className="font-medium">{getTipoSancionLabel(sancion.tipoSancion)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <Badge variant={sancion.estado === "activa" ? "destructive" : "secondary"}>
                  {sancion.estado.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>

          <Separator />

          {/* Sancionado */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Sancionado</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre Completo</p>
                <p className="font-medium">{sancion.entidadNombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <p className="font-medium">
                  {sancion.tipoEntidad === "maestro_obra" ? "Maestro de Obra" : "Empadronado"}
                </p>
              </div>
              {sancion.entidadDocumento && (
                <div>
                  <p className="text-sm text-muted-foreground">Documento (DNI)</p>
                  <p className="font-medium">{sancion.entidadDocumento}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Detalle */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Detalle de la Sanción</h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Motivo</p>
                <p className="font-medium">{sancion.motivo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Descripción</p>
                <p className="text-sm whitespace-pre-wrap">{sancion.descripcion}</p>
              </div>
              {sancion.montoMulta && (
                <div>
                  <p className="text-sm text-muted-foreground">Monto de Multa</p>
                  <p className="font-medium text-lg">S/ {sancion.montoMulta.toFixed(2)}</p>
                </div>
              )}
              {sancion.observaciones && (
                <div>
                  <p className="text-sm text-muted-foreground">Observaciones</p>
                  <p className="text-sm whitespace-pre-wrap">{sancion.observaciones}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Fechas */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Fechas</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Aplicación</p>
                <p className="font-medium">
                  {format(new Date(sancion.fechaAplicacion), "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
              {sancion.fechaVencimiento && (
                <div>
                  <p className="text-sm text-muted-foreground">Fecha de Vencimiento</p>
                  <p className="font-medium">
                    {format(new Date(sancion.fechaVencimiento), "dd/MM/yyyy", { locale: es })}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                <p className="font-medium">
                  {format(sancion.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información Administrativa */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Información Administrativa</h3>
            <div>
              <p className="text-sm text-muted-foreground">Aplicado por</p>
              <p className="font-medium">{sancion.aplicadoPorNombre}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
