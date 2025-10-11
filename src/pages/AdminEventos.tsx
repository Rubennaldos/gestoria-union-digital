import { useState, useEffect } from "react";
import { Plus, Calendar, BarChart3, Users, DollarSign } from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { obtenerEventos, obtenerEstadisticasEventos } from "@/services/eventos";
import { Evento, EstadisticasEventos } from "@/types/eventos";
import { ListaEventos } from "@/components/eventos/ListaEventos";
import { NuevoEventoModal } from "@/components/eventos/NuevoEventoModal";
import { EditarEventoModal } from "@/components/eventos/EditarEventoModal";
import { InscripcionesEventoModal } from "@/components/eventos/InscripcionesEventoModal";
import { useAuth } from "@/contexts/AuthContext";

const AdminEventos = () => {
  const { user } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasEventos | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalInscripcionesOpen, setModalInscripcionesOpen] = useState(false);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [tabActiva, setTabActiva] = useState("todos");

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [eventosData, estadisticasData] = await Promise.all([
        obtenerEventos(),
        obtenerEstadisticasEventos(),
      ]);
      setEventos(eventosData);
      setEstadisticas(estadisticasData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast.error("Error al cargar los eventos");
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (evento: Evento) => {
    setEventoSeleccionado(evento);
    setModalEditarOpen(true);
  };

  const handleVerInscripciones = (evento: Evento) => {
    setEventoSeleccionado(evento);
    setModalInscripcionesOpen(true);
  };

  const eventosFiltrados = eventos.filter((evento) => {
    if (tabActiva === "todos") return true;
    if (tabActiva === "activos") return evento.estado === "activo";
    if (tabActiva === "finalizados") return evento.estado === "finalizado";
    if (tabActiva === "inactivos") return evento.estado === "inactivo" || evento.estado === "cancelado";
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <TopNavigation />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center">Cargando...</div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Administración de Eventos</h1>
            <p className="text-muted-foreground">Gestiona todos los eventos y actividades</p>
          </div>
          <Button onClick={() => setModalNuevoOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Evento
          </Button>
        </div>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Eventos</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estadisticas.totalEventos}</div>
                <p className="text-xs text-muted-foreground">
                  {estadisticas.eventosActivos} activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inscripciones</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estadisticas.totalInscripciones}</div>
                <p className="text-xs text-muted-foreground">Total de inscritos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  S/ {estadisticas.ingresosTotales.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Recaudado total</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Asistencia</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {estadisticas.promedioAsistencia.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Promedio general</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs y Lista de Eventos */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos</CardTitle>
            <CardDescription>Gestiona y organiza todos tus eventos</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tabActiva} onValueChange={setTabActiva}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="activos">Activos</TabsTrigger>
                <TabsTrigger value="finalizados">Finalizados</TabsTrigger>
                <TabsTrigger value="inactivos">Inactivos</TabsTrigger>
              </TabsList>

              <TabsContent value={tabActiva} className="mt-6">
                <ListaEventos
                  eventos={eventosFiltrados}
                  onEditar={handleEditar}
                  onVerInscripciones={handleVerInscripciones}
                  onActualizar={cargarDatos}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />

      <NuevoEventoModal
        open={modalNuevoOpen}
        onOpenChange={setModalNuevoOpen}
        onSuccess={cargarDatos}
      />

      {eventoSeleccionado && (
        <>
          <EditarEventoModal
            open={modalEditarOpen}
            onOpenChange={setModalEditarOpen}
            evento={eventoSeleccionado}
            onSuccess={cargarDatos}
          />

          <InscripcionesEventoModal
            open={modalInscripcionesOpen}
            onOpenChange={setModalInscripcionesOpen}
            evento={eventoSeleccionado}
          />
        </>
      )}
    </div>
  );
};

export default AdminEventos;
