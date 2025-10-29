import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Reserva } from "@/types/deportes";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, Clock, MapPin, CreditCard, User, Phone, FileText } from "lucide-react";

interface DetalleReservaModalProps {
  reserva: Reserva;
  onClose: () => void;
  onUpdate: () => void;
}

export function DetalleReservaModal({ reserva, onClose }: DetalleReservaModalProps) {
  const fechaInicio = new Date(reserva.fechaInicio);
  const fechaFin = new Date(reserva.fechaFin);

  const getEstadoBadge = (estado: string) => {
    const config = {
      pendiente: { label: 'Pendiente', class: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
      pagado: { label: 'Pagado', class: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' },
      cancelado: { label: 'Cancelado', class: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30' },
      completado: { label: 'Completado', class: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30' },
      'no-show': { label: 'No asistió', class: 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30' }
    };
    return config[estado as keyof typeof config] || config.pendiente;
  };

  const estadoBadge = getEstadoBadge(reserva.estado);

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalle de Reserva
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Estado */}
          <div className="flex items-center gap-2">
            <Badge className={estadoBadge.class}>
              {estadoBadge.label}
            </Badge>
            {reserva.esAportante && (
              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                Aportante
              </Badge>
            )}
          </div>

          <Separator />

          {/* Información del Cliente */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Información del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Nombre</p>
                <p className="font-medium">{reserva.nombreCliente}</p>
              </div>
              {reserva.dni && (
                <div>
                  <p className="text-muted-foreground">DNI</p>
                  <p className="font-medium">{reserva.dni}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Teléfono</p>
                <p className="font-medium flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {reserva.telefono}
                </p>
              </div>
              {reserva.empadronadoId && (
                <div>
                  <p className="text-muted-foreground">ID Empadronado</p>
                  <p className="font-medium">{reserva.empadronadoId}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Información de la Reserva */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Información de la Reserva
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {format(fechaInicio, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  {format(fechaInicio, "HH:mm", { locale: es })} - {format(fechaFin, "HH:mm", { locale: es })}
                  ({reserva.duracionHoras} hora{reserva.duracionHoras !== 1 ? 's' : ''})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>Cancha ID: {reserva.canchaId}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Información de Pago */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Información de Pago
            </h3>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Precio base:</span>
                <span className="font-medium">S/ {reserva.precio.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Costo de luz:</span>
                <span className="font-medium">S/ {reserva.precio.luz.toFixed(2)}</span>
              </div>
              {reserva.precio.descuentoAportante > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Descuento aportante:</span>
                  <span className="font-medium">- S/ {reserva.precio.descuentoAportante.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">S/ {reserva.precio.total.toFixed(2)}</span>
              </div>
            </div>

            {reserva.pago && (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Método de pago:</span>
                  <Badge variant="outline">{reserva.pago.metodoPago.toUpperCase()}</Badge>
                </div>
                {reserva.pago.numeroOperacion && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nº Operación:</span>
                    <span className="font-medium">{reserva.pago.numeroOperacion}</span>
                  </div>
                )}
                {reserva.pago.fechaPago && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fecha de pago:</span>
                    <span className="font-medium">
                      {format(new Date(reserva.pago.fechaPago), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                )}
                {reserva.pago.esPrepago && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Monto prepago:</span>
                      <span className="font-medium">S/ {reserva.pago.montoPrepago?.toFixed(2)}</span>
                    </div>
                    {(reserva.pago.saldoPendiente ?? 0) > 0 && (
                      <div className="flex justify-between text-orange-600 dark:text-orange-400">
                        <span>Saldo pendiente:</span>
                        <span className="font-medium">S/ {reserva.pago.saldoPendiente?.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {reserva.observaciones && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">Observaciones</h3>
                <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                  {reserva.observaciones}
                </p>
              </div>
            </>
          )}

          {/* Metadatos */}
          <Separator />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>ID Reserva: {reserva.id}</p>
            {reserva.ingresoId && <p>ID Ingreso: {reserva.ingresoId}</p>}
            <p>Creada: {format(new Date(reserva.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
            <p>Actualizada: {format(new Date(reserva.updatedAt), "dd/MM/yyyy HH:mm", { locale: es })}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
