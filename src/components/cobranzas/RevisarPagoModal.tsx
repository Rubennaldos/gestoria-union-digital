import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, FileText, Calendar, CreditCard, User } from "lucide-react";
import { PagoV2 } from "@/types/cobranzas-v2";
import { Empadronado } from "@/types/empadronados";

interface RevisarPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago: PagoV2 | null;
  empadronado: Empadronado | null;
  onAprobar: (comentario: string) => Promise<void>;
  onRechazar: (motivo: string) => Promise<void>;
}

export const RevisarPagoModal = ({
  open,
  onOpenChange,
  pago,
  empadronado,
  onAprobar,
  onRechazar
}: RevisarPagoModalProps) => {
  const [accion, setAccion] = useState<'aprobar' | 'rechazar' | null>(null);
  const [comentario, setComentario] = useState("");
  const [procesando, setProcesando] = useState(false);

  if (!pago || !empadronado) return null;

  const handleConfirmar = async () => {
    if (accion === 'rechazar' && !comentario.trim()) {
      alert('Debes ingresar un motivo para rechazar el pago');
      return;
    }

    try {
      setProcesando(true);
      
      if (accion === 'aprobar') {
        await onAprobar(comentario);
      } else if (accion === 'rechazar') {
        await onRechazar(comentario);
      }

      setAccion(null);
      setComentario("");
      onOpenChange(false);
    } catch (error) {
      console.error('Error procesando pago:', error);
    } finally {
      setProcesando(false);
    }
  };

  const formatFecha = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPeriodo = (periodo: string) => {
    const year = periodo.substring(0, 4);
    const month = parseInt(periodo.substring(4, 6));
    return new Date(parseInt(year), month - 1).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Revisar Pago - {pago.estado === 'pendiente' ? 'Pendiente' : pago.estado}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Empadronado */}
          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <User className="h-4 w-4" />
              <h3 className="font-semibold">Información del Empadronado</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Nombre:</span>
                <p className="font-medium">{empadronado.nombre} {empadronado.apellidos}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Padrón:</span>
                <p className="font-medium">{empadronado.numeroPadron}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <p className="font-medium">{empadronado.emailAcceso || 'No registrado'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Teléfono:</span>
                <p className="font-medium">
                  {typeof empadronado.telefonos?.[0] === 'string' 
                    ? empadronado.telefonos[0] 
                    : empadronado.telefonos?.[0]?.numero || 'No registrado'}
                </p>
              </div>
            </div>
          </div>

          {/* Detalles del Pago */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard className="h-4 w-4" />
              <h3 className="font-semibold">Detalles del Pago</h3>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Período:</span>
                <span className="font-medium">{formatPeriodo(pago.periodo)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha de Pago:</span>
                <span className="font-medium">{formatFecha(pago.fechaPagoRegistrada)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método de Pago:</span>
                <Badge variant="outline">{pago.metodoPago}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monto:</span>
                <span className="font-bold text-lg">S/ {pago.monto.toFixed(2)}</span>
              </div>
              {pago.numeroOperacion && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">N° Operación:</span>
                  <span className="font-medium">{pago.numeroOperacion}</span>
                </div>
              )}
              {pago.descuentoProntoPago && pago.descuentoProntoPago > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento aplicado:</span>
                  <span className="font-medium">- S/ {pago.descuentoProntoPago.toFixed(2)}</span>
                </div>
              )}
              {pago.observaciones && (
                <div className="pt-2 border-t">
                  <span className="text-muted-foreground block mb-1">Observaciones:</span>
                  <p className="bg-muted p-2 rounded text-sm">{pago.observaciones}</p>
                </div>
              )}
            </div>
          </div>

          {/* Comprobante */}
          {pago.archivoComprobante && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4" />
                <h3 className="font-semibold">Comprobante de Pago</h3>
              </div>
              <div className="space-y-3">
                {/* Mostrar imagen si es imagen */}
                {(pago.archivoComprobante.includes('.jpg') || 
                  pago.archivoComprobante.includes('.jpeg') || 
                  pago.archivoComprobante.includes('.png') ||
                  pago.archivoComprobante.includes('image')) ? (
                  <div className="rounded-lg overflow-hidden border bg-muted">
                    <img 
                      src={pago.archivoComprobante} 
                      alt="Comprobante de pago"
                      className="w-full max-h-[400px] object-contain cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(pago.archivoComprobante, '_blank')}
                    />
                  </div>
                ) : (
                  <div className="bg-muted p-4 rounded flex flex-col items-center justify-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      📎 Archivo PDF adjunto
                    </p>
                  </div>
                )}
                <a 
                  href={pago.archivoComprobante} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="h-4 w-4" />
                  Ver comprobante en nueva pestaña
                </a>
              </div>
            </div>
          )}

          {/* Información de aprobación (si ya fue aprobado) */}
          {pago.estado === 'aprobado' && pago.fechaAprobacion && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <h3 className="font-semibold text-green-800 dark:text-green-200">Pago Aprobado</h3>
              </div>
              <div className="text-sm space-y-1 text-green-700 dark:text-green-300">
                <p>
                  <span className="text-muted-foreground">Aprobado por:</span>{' '}
                  <span className="font-medium">{pago.aprobadoPorNombre || 'Sistema'}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Fecha:</span>{' '}
                  <span className="font-medium">
                    {new Date(pago.fechaAprobacion).toLocaleString('es-PE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </p>
                {pago.comentarioAprobacion && (
                  <p>
                    <span className="text-muted-foreground">Comentario:</span>{' '}
                    <span className="font-medium">{pago.comentarioAprobacion}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Acciones */}
          {pago.estado === 'pendiente' && !accion && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => setAccion('rechazar')}
              >
                <XCircle className="h-4 w-4" />
                Rechazar
              </Button>
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => setAccion('aprobar')}
              >
                <CheckCircle className="h-4 w-4" />
                Aprobar
              </Button>
            </div>
          )}

          {/* Formulario de Confirmación */}
          {accion && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <Label>
                  {accion === 'aprobar' ? 'Comentarios (opcional)' : 'Motivo del rechazo *'}
                </Label>
                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder={
                    accion === 'aprobar' 
                      ? 'Agrega un comentario si lo deseas...' 
                      : 'Explica el motivo del rechazo...'
                  }
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAccion(null);
                    setComentario("");
                  }}
                  disabled={procesando}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmar}
                  disabled={procesando || (accion === 'rechazar' && !comentario.trim())}
                  className={`flex-1 ${
                    accion === 'aprobar' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {procesando ? 'Procesando...' : `Confirmar ${accion === 'aprobar' ? 'Aprobación' : 'Rechazo'}`}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
