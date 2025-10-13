import { useState, useEffect } from "react";
import { Calendar, MapPin, Users, DollarSign, Clock, User, ChevronRight, Search, Filter, History } from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { obtenerEventosActivos } from "@/services/eventos";
import { Evento } from "@/types/eventos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { toast } from "sonner";
import { DetalleEventoModal } from "@/components/eventos/DetalleEventoModal";
import { HistorialInscripciones } from "@/components/eventos/HistorialInscripciones";
import { useAuth } from "@/contexts/AuthContext";

const Eventos = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosFiltrados, setEventosFiltrados] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [tabActiva, setTabActiva] = useState<string>("eventos");

  useEffect(() => {
    cargarEventos();
  }, []);

  useEffect(() => {
    filtrarEventos();
  }, [busqueda, categoriaFiltro, eventos]);

  const cargarEventos = async () => {
    try {
      setLoading(true);
      const data = await obtenerEventosActivos();
      setEventos(data);
      setEventosFiltrados(data);
    } catch (error) {
      console.error("Error al cargar eventos:", error);
      toast.error("Error al cargar los eventos");
    } finally {
      setLoading(false);
    }
  };

  const filtrarEventos = () => {
    let resultado = [...eventos];

    // Filtrar por búsqueda
    if (busqueda) {
      resultado = resultado.filter(
        (evento) =>
          evento.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
          evento.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
          evento.instructor?.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Filtrar por categoría
    if (categoriaFiltro !== "todas") {
      resultado = resultado.filter((evento) => evento.categoria === categoriaFiltro);
    }

    setEventosFiltrados(resultado);
  };

  const getCategoriaColor = (categoria: string) => {
    const colores: Record<string, string> = {
      deportivo: "bg-success/10 text-success border-success/20",
      cultural: "bg-primary/10 text-primary border-primary/20",
      educativo: "bg-secondary/10 text-secondary-foreground border-secondary/20",
      social: "bg-warning/10 text-warning border-warning/20",
      recreativo: "bg-primary/10 text-primary border-primary/20",
      otro: "bg-muted text-muted-foreground border-border",
    };
    return colores[categoria] || colores.otro;
  };

  const getCategoriaLabel = (categoria: string) => {
    const labels: Record<string, string> = {
      deportivo: "Deportivo",
      cultural: "Cultural",
      educativo: "Educativo",
      social: "Social",
      recreativo: "Recreativo",
      otro: "Otro",
    };
    return labels[categoria] || categoria;
  };

  const abrirDetalleEvento = (evento: Evento) => {
    setEventoSeleccionado(evento);
    setModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <TopNavigation />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center">Cargando eventos...</div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header con frase motivadora */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground">
            Eventos y Actividades
          </h1>
          <p className="text-lg text-muted-foreground">
            ¡Participa, aprende y disfruta con nuestra comunidad!
          </p>
        </div>

        <Tabs value={tabActiva} onValueChange={setTabActiva} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="eventos">
              <Calendar className="h-4 w-4 mr-2" />
              Eventos Disponibles
            </TabsTrigger>
            <TabsTrigger value="historial">
              <History className="h-4 w-4 mr-2" />
              Mis Inscripciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="eventos" className="space-y-6">
            {/* Filtros */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar eventos..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <Filter className="h-4 w-4 mr-2" />
                      <SelectValue placeholder="Categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      <SelectItem value="deportivo">Deportivo</SelectItem>
                      <SelectItem value="cultural">Cultural</SelectItem>
                      <SelectItem value="educativo">Educativo</SelectItem>
                      <SelectItem value="social">Social</SelectItem>
                      <SelectItem value="recreativo">Recreativo</SelectItem>
                      <SelectItem value="otro">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Grid de Eventos */}
            {eventosFiltrados.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {busqueda || categoriaFiltro !== "todas"
                      ? "No se encontraron eventos con los filtros seleccionados"
                      : "No hay eventos disponibles en este momento"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {eventosFiltrados.map((evento) => (
                  <Card
                    key={evento.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer group"
                    onClick={() => abrirDetalleEvento(evento)}
                  >
                    {evento.imagen && (
                      <div className="h-48 overflow-hidden bg-muted">
                        <img
                          src={evento.imagen}
                          alt={evento.titulo}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-lg line-clamp-2">{evento.titulo}</CardTitle>
                        <Badge className={getCategoriaColor(evento.categoria)}>
                          {getCategoriaLabel(evento.categoria)}
                        </Badge>
                      </div>
                      <CardDescription className="line-clamp-2">
                        {evento.descripcion}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {format(toZonedTime(new Date(evento.fechaInicio), "America/Lima"), "dd MMM yyyy", { locale: es })}
                          {evento.fechaFin && !evento.fechaFinIndefinida && (
                            <> - {format(toZonedTime(new Date(evento.fechaFin), "America/Lima"), "dd MMM", { locale: es })}</>
                          )}
                        </span>
                      </div>

                      {evento.sesiones && evento.sesiones.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>
                              {evento.sesiones[0].horaInicio} - {evento.sesiones[0].horaFin}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            <span className="line-clamp-1">{evento.sesiones[0].lugar}</span>
                          </div>

                          {evento.sesiones.length > 1 && (
                            <p className="text-xs text-muted-foreground">
                              +{evento.sesiones.length - 1} sesión(es) más
                            </p>
                          )}
                        </>
                      )}

                      {evento.instructor && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{evento.instructor}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {evento.cuposIlimitados
                              ? "Ilimitados"
                              : `${evento.cuposDisponibles} cupos`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-success">
                          <DollarSign className="h-4 w-4" />
                          {evento.precio === 0 ? "Gratis" : `S/ ${evento.precio.toFixed(2)}`}
                          {evento.promocion?.activa && (
                            <span className="text-xs text-warning">(Promo)</span>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter>
                      <Button className="w-full group" onClick={() => abrirDetalleEvento(evento)}>
                        Inscríbete ahora
                        <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="historial" className="space-y-6">
            {profile?.empadronadoId ? (
              <HistorialInscripciones empadronadoId={profile.empadronadoId} />
            ) : (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <p className="text-muted-foreground">
                    Debes tener un empadronado vinculado para ver tu historial de inscripciones
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />

      {eventoSeleccionado && (
        <DetalleEventoModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          evento={eventoSeleccionado}
          onInscripcionExitosa={cargarEventos}
        />
      )}
    </div>
  );
};

export default Eventos;
