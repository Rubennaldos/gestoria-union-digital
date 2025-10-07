import { useState, useEffect } from "react";
import { AlertTriangle, Plus, Search, Filter, FileText, Eye, Edit, Trash2, Home } from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { NuevaSancionModal } from "@/components/sanciones/NuevaSancionModal";
import { getSanciones, getSancionesStats } from "@/services/sanciones";
import { Sancion, SancionesStats, TipoEntidad, TipoSancion, EstadoSancion } from "@/types/sanciones";

const Sanciones = () => {
  const { toast } = useToast();
  const [sanciones, setSanciones] = useState<Sancion[]>([]);
  const [stats, setStats] = useState<SancionesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filtroTipoEntidad, setFiltroTipoEntidad] = useState<TipoEntidad | "">("");
  const [filtroTipoSancion, setFiltroTipoSancion] = useState<TipoSancion | "">("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoSancion | "">("");
  const [showNuevaSancionModal, setShowNuevaSancionModal] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sancionesData, statsData] = await Promise.all([
        getSanciones({
          search: search || undefined,
          tipoEntidad: filtroTipoEntidad || undefined,
          tipoSancion: filtroTipoSancion || undefined,
          estado: filtroEstado || undefined,
        }),
        getSancionesStats()
      ]);
      
      setSanciones(sancionesData);
      setStats(statsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las sanciones",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, filtroTipoEntidad, filtroTipoSancion, filtroEstado]);

  const getTipoEntidadLabel = (tipo: TipoEntidad) => {
    const labels = {
      empadronado: "Empadronado",
      maestro_obra: "Maestro de Obra",
      direccion: "Dirección",
      vehiculo: "Vehículo",
      negocio: "Negocio",
      delegado: "Delegado",
      junta_directiva: "Junta Directiva"
    };
    return labels[tipo];
  };

  const getTipoSancionLabel = (tipo: TipoSancion) => {
    const labels = {
      amonestacion: "Amonestación",
      multa: "Multa",
      suspension_temporal: "Suspensión Temporal",
      suspension_permanente: "Suspensión Permanente",
      inhabilitacion: "Inhabilitación",
      otros: "Otros"
    };
    return labels[tipo];
  };

  const getEstadoBadge = (estado: EstadoSancion) => {
    const variants = {
      activa: "destructive" as const,
      cumplida: "default" as const,
      anulada: "secondary" as const,
      en_proceso: "outline" as const
    };
    
    const labels = {
      activa: "Activa",
      cumplida: "Cumplida",
      anulada: "Anulada",
      en_proceso: "En Proceso"
    };

    return (
      <Badge variant={variants[estado]}>
        {labels[estado]}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 md:gap-4">
            <BackButton fallbackTo="/" />
            <div className="h-4 md:h-6 w-px bg-border" />
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-foreground flex items-center gap-2 bg-gradient-to-r from-destructive to-destructive/60 bg-clip-text text-transparent">
                <AlertTriangle className="h-5 w-5 md:h-6 md:w-6 text-destructive" />
                Sanciones
              </h1>
              <p className="text-[10px] md:text-sm text-muted-foreground">Gestión de sanciones disciplinarias</p>
            </div>
          </div>
          <Button 
            size="sm"
            className="bg-destructive hover:bg-destructive/90 h-8 md:h-9 text-xs md:text-sm"
            onClick={() => setShowNuevaSancionModal(true)}
          >
            <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
            Nueva Sanción
          </Button>
        </div>

        {/* Estadísticas */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-destructive/20">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="text-sm text-destructive font-medium">Total</p>
                    <p className="text-xl font-bold text-destructive">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-warning/20 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  <div>
                    <p className="text-sm text-warning font-medium">Activas</p>
                    <p className="text-xl font-bold text-warning">{stats.activas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-success/20 bg-success/5">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm text-success font-medium">Cumplidas</p>
                    <p className="text-xl font-bold text-success">{stats.cumplidas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-primary font-medium">Multas Pendientes</p>
                    <p className="text-xl font-bold text-primary">S/ {stats.montoMultasPendientes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros de Búsqueda
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Buscar</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Nombre, motivo, número..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Entidad</label>
                <Select value={filtroTipoEntidad || "all"} onValueChange={(value) => setFiltroTipoEntidad(value === "all" ? "" : value as TipoEntidad)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas las entidades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las entidades</SelectItem>
                    <SelectItem value="empadronado">Empadronados</SelectItem>
                    <SelectItem value="maestro_obra">Maestros de Obra</SelectItem>
                    <SelectItem value="direccion">Dirección</SelectItem>
                    <SelectItem value="vehiculo">Vehículos</SelectItem>
                    <SelectItem value="negocio">Negocios</SelectItem>
                    <SelectItem value="delegado">Delegados</SelectItem>
                    <SelectItem value="junta_directiva">Junta Directiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Sanción</label>
                <Select value={filtroTipoSancion || "all"} onValueChange={(value) => setFiltroTipoSancion(value === "all" ? "" : value as TipoSancion)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los tipos</SelectItem>
                    <SelectItem value="amonestacion">Amonestación</SelectItem>
                    <SelectItem value="multa">Multa</SelectItem>
                    <SelectItem value="suspension_temporal">Suspensión Temporal</SelectItem>
                    <SelectItem value="suspension_permanente">Suspensión Permanente</SelectItem>
                    <SelectItem value="inhabilitacion">Inhabilitación</SelectItem>
                    <SelectItem value="otros">Otros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <Select value={filtroEstado || "all"} onValueChange={(value) => setFiltroEstado(value === "all" ? "" : value as EstadoSancion)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="activa">Activa</SelectItem>
                    <SelectItem value="cumplida">Cumplida</SelectItem>
                    <SelectItem value="anulada">Anulada</SelectItem>
                    <SelectItem value="en_proceso">En Proceso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Sanciones */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Sanciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Entidad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Cargando sanciones...
                      </TableCell>
                    </TableRow>
                  ) : sanciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No hay sanciones registradas</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    sanciones.map((sancion) => (
                      <TableRow key={sancion.id}>
                        <TableCell className="font-mono text-sm">
                          {sancion.numeroSancion}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{sancion.entidadNombre}</p>
                            <p className="text-xs text-muted-foreground">
                              {getTipoEntidadLabel(sancion.tipoEntidad)}
                              {sancion.entidadDocumento && ` • ${sancion.entidadDocumento}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTipoSancionLabel(sancion.tipoSancion)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {sancion.motivo}
                        </TableCell>
                        <TableCell>
                          {sancion.montoMulta ? `S/ ${sancion.montoMulta}` : '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(sancion.fechaAplicacion).toLocaleDateString('es-PE')}
                        </TableCell>
                        <TableCell>
                          {getEstadoBadge(sancion.estado)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <NuevaSancionModal
        open={showNuevaSancionModal}
        onOpenChange={setShowNuevaSancionModal}
        onSuccess={loadData}
      />

      <BottomNavigation />
    </div>
  );
};

export default Sanciones;