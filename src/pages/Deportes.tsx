import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Download, MapPin, Clock, CreditCard, FileText } from "lucide-react";
import { NuevaReservaModal } from "@/components/deportes/NuevaReservaModal";
import { obtenerCanchas, obtenerReservas } from "@/services/deportes";
import { Cancha, Reserva } from "@/types/deportes";
import { toast } from "@/hooks/use-toast";
import { TopNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import CalendarioDeportes from '@/components/deportes/CalendarioDeportes';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function Deportes() {
  const { empadronado } = useAuth();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarNuevaReserva, setMostrarNuevaReserva] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [empadronado?.id]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [canchasData, reservasData] = await Promise.all([
        obtenerCanchas(),
        obtenerReservas()
      ]);
      
      setCanchas(canchasData);
      
      // Filtrar solo las reservas del usuario actual
      if (empadronado?.id) {
        const misReservas = reservasData.filter(r => r.empadronadoId === empadronado.id);
        setReservas(misReservas.sort((a, b) => 
          new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
        ));
      } else {
        setReservas([]);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar tus reservas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const config = {
      pendiente: { label: 'Pendiente', variant: 'secondary' as const, class: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30' },
      pagado: { label: 'Pagado', variant: 'default' as const, class: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' },
      cancelado: { label: 'Cancelado', variant: 'destructive' as const, class: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30' },
      completado: { label: 'Completado', variant: 'outline' as const, class: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30' },
      'no-show': { label: 'No asistió', variant: 'outline' as const, class: 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30' }
    };
    return config[estado as keyof typeof config] || config.pendiente;
  };

  const descargarComprobante = async (reserva: Reserva) => {
    try {
      // Intentar con ingresoId primero, luego con el ID de la reserva
      const posiblesIds = [
        reserva.ingresoId,
        `receipt_${reserva.id}`,
        `mov_${reserva.id.replace('reserva_', '')}`
      ].filter(Boolean);

      let receiptData = null;
      let foundId = null;

      // Intentar encontrar el comprobante con cualquiera de los IDs posibles
      for (const id of posiblesIds) {
        const receiptRef = ref(db, `recibos/${id}`);
        const snapshot = await get(receiptRef);
        
        if (snapshot.exists()) {
          receiptData = snapshot.val();
          foundId = id;
          break;
        }
      }

      if (!receiptData) {
        toast({
          title: "Comprobante no disponible",
          description: "Esta reserva fue creada antes de que se implementara el sistema de comprobantes digitales",
          variant: "destructive"
        });
        return;
      }

      if (receiptData.pdfDataUrl) {
        // Crear un enlace temporal y descargar
        const link = document.createElement('a');
        link.href = receiptData.pdfDataUrl;
        link.download = `Comprobante-Reserva-${receiptData.code || reserva.id}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast({
          title: "¡Listo!",
          description: "El comprobante se ha descargado correctamente"
        });
      } else {
        toast({
          title: "PDF no disponible",
          description: "El comprobante existe pero el PDF no está disponible",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error al descargar comprobante:', error);
      toast({
        title: "Error",
        description: "No se pudo descargar el comprobante. Por favor, intenta nuevamente",
        variant: "destructive"
      });
    }
  };

  const getNombreCancha = (canchaId: string) => {
    const cancha = canchas.find(c => c.id === canchaId);
    return cancha ? cancha.nombre : 'Cancha no disponible';
  };

  const getUbicacionCancha = (canchaId: string) => {
    const cancha = canchas.find(c => c.id === canchaId);
    return cancha ? (cancha.ubicacion === 'boulevard' ? 'Boulevard' : 'Quinta Llana') : '';
  };

  const calendarEvents = reservas.map(r => ({
    id: r.id,
    title: `${getNombreCancha(r.canchaId)} (${r.estado})`,
    start: new Date(r.fechaInicio),
    end: new Date(r.fechaFin),
    resource: r
  }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="text-center space-y-4">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">Cargando tus reservas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <TopNavigation />
      
      <div className="container mx-auto p-4 md:p-6 lg:p-8 max-w-7xl">
        {/* Header futurista */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BackButton fallbackTo="/" />
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent mb-1">
                Reserva de Losas Deportivas
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gestiona tus reservas deportivas fácilmente
              </p>
            </div>
          </div>

          {/* Botón destacado de Nueva Reserva */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/80 to-primary/60 rounded-2xl opacity-75 group-hover:opacity-100 blur transition duration-300"></div>
            <Button 
              onClick={() => setMostrarNuevaReserva(true)}
              size="lg"
              className="relative w-full md:w-auto bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-2xl hover:shadow-primary/50 transition-all duration-300 text-base md:text-lg py-6 md:py-7 px-8 md:px-12 rounded-xl group"
            >
              <Plus className="h-5 w-5 md:h-6 md:w-6 mr-2 group-hover:rotate-90 transition-transform duration-300" />
              Nueva Reserva
            </Button>
          </div>

          {/* Botón para ver horario en modal */}
          <div className="mt-4 md:mt-0 md:ml-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  Ver Horario Disponible
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Horario de Reservas</DialogTitle>
                </DialogHeader>
                <CalendarioDeportes
                  events={calendarEvents}
                  canchas={canchas}
                  onSelectEvent={(ev) => {
                    console.debug('Calendario: evento seleccionado', ev);
                  }}
                  onSuccess={() => cargarDatos()}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* Calendario */}
        <CalendarioDeportes
          events={calendarEvents}
          onSelectEvent={(ev) => {
            // seleccionar evento -> navegar o abrir detalle (por ahora solo log)
            console.debug('Calendario: evento seleccionado', ev);
          }}
        />

        {/* Historial de Reservas */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-6">
            <Calendar className="h-6 w-6 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold">Mi Historial de Reservas</h2>
          </div>

          {reservas.length === 0 ? (
            <Card className="border-dashed border-2 hover:border-primary/50 transition-colors duration-300">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-10 w-10 text-primary/50" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-muted-foreground mb-2">
                      No tienes reservas aún
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Haz tu primera reserva usando el botón de arriba
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {reservas.map((reserva) => {
                const estadoConfig = getEstadoBadge(reserva.estado);
                return (
                  <Card 
                    key={reserva.id} 
                    className="group hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 border-primary/20 hover:border-primary/40 overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-primary/60 to-primary/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    
                    <CardHeader className="pb-3">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="flex-1">
                          <CardTitle className="text-lg md:text-xl mb-2 flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            {getNombreCancha(reserva.canchaId)}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {getUbicacionCancha(reserva.canchaId)}
                          </p>
                        </div>
                        <Badge className={`${estadoConfig.class} border text-xs md:text-sm px-3 py-1`}>
                          {estadoConfig.label}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <Separator className="opacity-50" />
                      
                      {/* Información de la reserva */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <Calendar className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Fecha</p>
                            <p className="font-semibold truncate">
                              {format(new Date(reserva.fechaInicio), "dd 'de' MMMM, yyyy", { locale: es })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <Clock className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Horario</p>
                            <p className="font-semibold truncate">
                              {format(new Date(reserva.fechaInicio), "HH:mm")} - {format(new Date(reserva.fechaFin), "HH:mm")}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <CreditCard className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Total</p>
                            <p className="font-semibold text-lg truncate">
                              S/ {reserva.precio.total.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                          <FileText className="h-5 w-5 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Duración</p>
                            <p className="font-semibold truncate">
                              {reserva.duracionHoras} {reserva.duracionHoras === 1 ? 'hora' : 'horas'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {reserva.observaciones && (
                        <>
                          <Separator className="opacity-50" />
                          <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                            <p className="font-medium mb-1">Observaciones:</p>
                            <p>{reserva.observaciones}</p>
                          </div>
                        </>
                      )}

      {/* Botón de descarga de comprobante */}
                      {reserva.estado === 'pagado' && (
                        <>
                          <Separator className="opacity-50" />
                          <Button
                            onClick={() => descargarComprobante(reserva)}
                            variant="outline"
                            className="w-full group/btn hover:bg-primary hover:text-primary-foreground transition-all duration-300"
                          >
                            <Download className="h-4 w-4 mr-2 group-hover/btn:animate-bounce" />
                            Descargar Comprobante
                          </Button>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Nueva Reserva */}
      <NuevaReservaModal
        open={mostrarNuevaReserva}
        onOpenChange={setMostrarNuevaReserva}
        canchas={canchas}
        onSuccess={() => {
          cargarDatos();
          setMostrarNuevaReserva(false);
        }}
      />
    </div>
  );
}
