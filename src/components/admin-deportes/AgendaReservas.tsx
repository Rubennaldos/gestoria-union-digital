import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Check, X, Eye, Download, Filter } from "lucide-react";
import { obtenerReservas, actualizarReserva } from "@/services/deportes";
import { Reserva } from "@/types/deportes";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DetalleReservaModal } from "./DetalleReservaModal";
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AgendaReservas() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<string>("todas");
  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null);
  const [mostrarDetalle, setMostrarDetalle] = useState(false);

  useEffect(() => {
    cargarReservas();
  }, []);

  const cargarReservas = async () => {
    try {
      setLoading(true);
      const data = await obtenerReservas();
      // Ordenar por fecha más reciente primero
      setReservas(data.sort((a, b) => 
        new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
      ));
    } catch (error) {
      console.error('Error al cargar reservas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las reservas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmarReserva = async (reservaId: string) => {
    try {
      await actualizarReserva(reservaId, { estado: 'pagado' });
      toast({
        title: "Reserva confirmada",
        description: "La reserva ha sido confirmada exitosamente"
      });
      cargarReservas();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo confirmar la reserva",
        variant: "destructive"
      });
    }
  };

  const rechazarReserva = async (reservaId: string) => {
    try {
      await actualizarReserva(reservaId, { estado: 'cancelado' });
      toast({
        title: "Reserva rechazada",
        description: "La reserva ha sido cancelada"
      });
      cargarReservas();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo rechazar la reserva",
        variant: "destructive"
      });
    }
  };

  const descargarComprobante = async (reserva: Reserva) => {
    try {
      const posiblesIds = [
        reserva.ingresoId,
        `receipt_${reserva.id}`,
        `mov_${reserva.id.replace('reserva_', '')}`
      ].filter(Boolean);

      let receiptData = null;

      for (const id of posiblesIds) {
        const receiptRef = ref(db, `recibos/${id}`);
        const snapshot = await get(receiptRef);
        
        if (snapshot.exists()) {
          receiptData = snapshot.val();
          break;
        }
      }

      if (!receiptData) {
        toast({
          title: "Sin comprobante",
          description: "No se encontró comprobante para esta reserva",
          variant: "destructive"
        });
        return;
      }

      if (receiptData.pdfDataUrl) {
        const link = document.createElement('a');
        link.href = receiptData.pdfDataUrl;
        link.download = `Comprobante-${reserva.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "¡Listo!",
          description: "El comprobante se ha descargado"
        });
      } else {
        toast({
          title: "Sin PDF",
          description: "El comprobante no tiene PDF disponible",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el comprobante",
        variant: "destructive"
      });
    }
  };

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

  const reservasFiltradas = filtroEstado === "todas" 
    ? reservas 
    : reservas.filter(r => r.estado === filtroEstado);

  if (loading) {
    return <div className="text-center py-8">Cargando agenda...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Agenda de Reservas
            </CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="pendiente">Pendientes</SelectItem>
                  <SelectItem value="pagado">Pagadas</SelectItem>
                  <SelectItem value="cancelado">Canceladas</SelectItem>
                  <SelectItem value="completado">Completadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reservasFiltradas.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay reservas {filtroEstado !== "todas" && `con estado "${filtroEstado}"`}
              </p>
            ) : (
              reservasFiltradas.map((reserva) => {
                const estadoBadge = getEstadoBadge(reserva.estado);
                const fechaInicio = new Date(reserva.fechaInicio);
                const fechaFin = new Date(reserva.fechaFin);
                
                return (
                  <Card key={reserva.id} className="border-l-4 border-l-primary/30">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={estadoBadge.class}>
                              {estadoBadge.label}
                            </Badge>
                            {reserva.esAportante && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                                Aportante
                              </Badge>
                            )}
                          </div>
                          
                          <div>
                            <p className="font-semibold text-lg">{reserva.nombreCliente}</p>
                            {reserva.dni && (
                              <p className="text-sm text-muted-foreground">DNI: {reserva.dni}</p>
                            )}
                            <p className="text-sm text-muted-foreground">Tel: {reserva.telefono}</p>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <p className="font-medium">
                              {format(fechaInicio, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
                            </p>
                            <p className="text-muted-foreground">
                              {format(fechaInicio, "HH:mm", { locale: es })} - {format(fechaFin, "HH:mm", { locale: es })} 
                              ({reserva.duracionHoras}h)
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <p className="font-semibold text-lg text-primary">
                              S/ {reserva.precio.total.toFixed(2)}
                            </p>
                            {reserva.pago?.metodoPago && (
                              <Badge variant="outline">
                                {reserva.pago.metodoPago.toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReservaSeleccionada(reserva);
                              setMostrarDetalle(true);
                            }}
                            className="w-full lg:w-auto"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalle
                          </Button>
                          
                          {reserva.estado === 'pagado' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => descargarComprobante(reserva)}
                              className="w-full lg:w-auto"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Comprobante
                            </Button>
                          )}
                          
                          {reserva.estado === 'pendiente' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => confirmarReserva(reserva.id)}
                                className="flex-1"
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => rechazarReserva(reserva.id)}
                                className="flex-1"
                              >
                                <X className="h-4 w-4 mr-2" />
                                Rechazar
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {mostrarDetalle && reservaSeleccionada && (
        <DetalleReservaModal
          reserva={reservaSeleccionada}
          onClose={() => {
            setMostrarDetalle(false);
            setReservaSeleccionada(null);
          }}
          onUpdate={cargarReservas}
        />
      )}
    </>
  );
}
