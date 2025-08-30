import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, MapPin, Users, TrendingUp, Search, Plus } from "lucide-react";
import { CalendarioReservas } from "@/components/deportes/CalendarioReservas";
import { NuevaReservaModal } from "@/components/deportes/NuevaReservaModal";
import { PagoReservaModal } from "@/components/deportes/PagoReservaModal";
import { ConfiguracionModal } from "@/components/deportes/ConfiguracionModal";
import { EstadisticasWidget } from "@/components/deportes/EstadisticasWidget";
import { BusquedaEmpadronado } from "@/components/deportes/BusquedaEmpadronado";
import { obtenerCanchas, obtenerReservas, obtenerEstadisticas } from "@/services/deportes";
import { Cancha, Reserva, EstadisticasDeportes } from "@/types/deportes";
import { toast } from "@/hooks/use-toast";
import { TopNavigation } from "@/components/layout/Navigation";

export default function Deportes() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasDeportes | null>(null);
  const [canchaActiva, setCanchaActiva] = useState<string>("");
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [mostrarNuevaReserva, setMostrarNuevaReserva] = useState(false);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [mostrarConfiguracion, setMostrarConfiguracion] = useState(false);
  const [reservaSeleccionada, setReservaSeleccionada] = useState<Reserva | null>(null);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [canchasData, reservasData, estadisticasData] = await Promise.all([
        obtenerCanchas(),
        obtenerReservas(),
        obtenerEstadisticas()
      ]);
      
      console.log('Canchas cargadas:', canchasData);
      setCanchas(canchasData);
      setReservas(reservasData);
      setEstadisticas(estadisticasData);
      
      // Establecer primera cancha como activa por defecto
      if (canchasData.length > 0 && !canchaActiva) {
        setCanchaActiva(canchasData[0].id);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de deportes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReservaClick = (reserva: Reserva) => {
    setReservaSeleccionada(reserva);
    if (reserva.estado === 'pendiente') {
      setMostrarPago(true);
    }
  };

  const handleNuevaReserva = (fechaInicio?: Date, fechaFin?: Date) => {
    setMostrarNuevaReserva(true);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-500';
      case 'pagado': return 'bg-green-500';
      case 'cancelado': return 'bg-red-500';
      case 'no-show': return 'bg-gray-500';
      case 'completado': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  const canchasFiltradas = canchas.filter(cancha => 
    cancha.nombre.toLowerCase().includes(busquedaTexto.toLowerCase()) ||
    cancha.ubicacion.toLowerCase().includes(busquedaTexto.toLowerCase())
  );

  // Agrupar canchas por ubicación y tipo para las tabs
  const tabs = [
    {
      id: 'boulevard-futbol',
      label: 'Boulevard - Fútbol',
      canchas: canchas.filter(c => c.ubicacion === 'boulevard' && c.tipo === 'futbol')
    },
    {
      id: 'boulevard-voley', 
      label: 'Boulevard - Vóley',
      canchas: canchas.filter(c => c.ubicacion === 'boulevard' && c.tipo === 'voley')
    },
    {
      id: 'quinta-futbol',
      label: 'Quinta Llana - Fútbol', 
      canchas: canchas.filter(c => c.ubicacion === 'quinta_llana' && c.tipo === 'futbol')
    },
    {
      id: 'quinta-voley',
      label: 'Quinta Llana - Vóley',
      canchas: canchas.filter(c => c.ubicacion === 'quinta_llana' && c.tipo === 'voley')
    }
  ].filter(tab => tab.canchas.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Cargando módulo de deportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestión Deportiva</h1>
            <p className="text-muted-foreground">
              Administra reservas, canchas y actividades deportivas
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => handleNuevaReserva()}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Nueva Reserva
            </Button>
            <Button 
              variant="outline"
              onClick={() => setMostrarConfiguracion(true)}
            >
              Configuración
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Reservas del Mes</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estadisticas.reservasDelMes}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">S/{estadisticas.ingresosTotales.toFixed(2)}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ocupación</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estadisticas.ocupacionPromedio.toFixed(1)}%</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Canchas Activas</CardTitle>
                <MapPin className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{canchas.filter(c => c.activa).length}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Búsqueda y filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por padrón, DNI o nombre..."
                value={busquedaTexto}
                onChange={(e) => setBusquedaTexto(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <BusquedaEmpadronado onSeleccionar={(empadronado) => {
            setBusquedaTexto(empadronado.nombre);
          }} />
        </div>

        {/* Leyenda de estados */}
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-500"></div>
            <span className="text-sm">Pendiente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span className="text-sm">Pagado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span className="text-sm">Completado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span className="text-sm">Cancelado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-500"></div>
            <span className="text-sm">No-Show</span>
          </div>
        </div>

        {/* Calendario por recursos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Calendario de Reservas
            </CardTitle>
            <CardDescription>
              Arrastra para crear, mover y redimensionar reservas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tabs[0]?.id} className="w-full">
              <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
                {tabs.map(tab => (
                  <TabsTrigger key={tab.id} value={tab.id} className="text-xs">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              
              {tabs.map(tab => (
                <TabsContent key={tab.id} value={tab.id} className="mt-6">
                  <CalendarioReservas
                    canchas={tab.canchas}
                    reservas={reservas.filter(r => 
                      tab.canchas.some(c => c.id === r.canchaId)
                    )}
                    onReservaClick={handleReservaClick}
                    onNuevaReserva={handleNuevaReserva}
                    onReservaUpdate={cargarDatos}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Estadísticas detalladas */}
        {estadisticas && (
          <div className="mt-6">
            <EstadisticasWidget estadisticas={estadisticas} />
          </div>
        )}
      </div>

      {/* Modales */}
      <NuevaReservaModal
        open={mostrarNuevaReserva}
        onOpenChange={setMostrarNuevaReserva}
        canchas={canchas}
        onSuccess={() => {
          cargarDatos();
          setMostrarNuevaReserva(false);
        }}
      />

      {reservaSeleccionada && (
        <PagoReservaModal
          open={mostrarPago}
          onOpenChange={setMostrarPago}
          reserva={reservaSeleccionada}
          onSuccess={() => {
            cargarDatos();
            setMostrarPago(false);
            setReservaSeleccionada(null);
          }}
        />
      )}

      <ConfiguracionModal
        open={mostrarConfiguracion}
        onOpenChange={setMostrarConfiguracion}
        onSuccess={() => {
          cargarDatos();
          setMostrarConfiguracion(false);
        }}
      />
    </div>
  );
}