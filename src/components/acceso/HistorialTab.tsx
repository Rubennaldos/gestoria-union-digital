import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, HardHat, Truck, Calendar, Clock, CheckCircle, XCircle, AlertCircle, UserX } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  obtenerVisitasPorEmpadronado, 
  obtenerTrabajadoresPorEmpadronado, 
  obtenerProveedoresPorEmpadronado,
  obtenerMaestroObraPorId
} from "@/services/acceso";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { useAuth } from "@/contexts/AuthContext";

export function HistorialTab() {
  const { user, profile } = useAuth();
  const [visitas, setVisitas] = useState<RegistroVisita[]>([]);
  const [trabajadores, setTrabajadores] = useState<RegistroTrabajadores[]>([]);
  const [proveedores, setProveedores] = useState<RegistroProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [noVinculado, setNoVinculado] = useState(false);
  const [maestrosObraData, setMaestrosObraData] = useState<Record<string, any>>({});

  const empadronadoId = profile?.empadronadoId || "";

  useEffect(() => {
    if (empadronadoId) {
      cargarHistorial();
    } else {
      setLoading(false);
      setNoVinculado(true);
    }
  }, [empadronadoId]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setNoVinculado(false);

      if (!empadronadoId) {
        setNoVinculado(true);
        return;
      }
      
      // Cargar historial solo del empadronado actual
      const [visitasData, trabajadoresData, proveedoresData] = await Promise.all([
        obtenerVisitasPorEmpadronado(empadronadoId),
        obtenerTrabajadoresPorEmpadronado(empadronadoId),
        obtenerProveedoresPorEmpadronado(empadronadoId)
      ]);

      setVisitas(visitasData);
      setTrabajadores(trabajadoresData);
      setProveedores(proveedoresData);

      // Cargar datos de maestros de obra
      const maestrosIds = trabajadoresData
        .map(t => t.maestroObraId)
        .filter((id, index, self) => id && self.indexOf(id) === index);

      const maestrosMap: Record<string, any> = {};
      await Promise.all(
        maestrosIds.map(async (id) => {
          if (id) {
            const maestro = await obtenerMaestroObraPorId(id);
            if (maestro) {
              maestrosMap[id] = maestro;
            }
          }
        })
      );
      setMaestrosObraData(maestrosMap);
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setNoVinculado(true);
    } finally {
      setLoading(false);
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'autorizado':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'denegado':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'autorizado':
        return <Badge variant="default">Autorizado</Badge>;
      case 'denegado':
        return <Badge variant="destructive">Denegado</Badge>;
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  const formatFecha = (fecha: any) => {
    try {
      // Intentar convertir diferentes formatos de fecha
      let date: Date;
      
      if (!fecha) {
        return "Fecha no disponible";
      }
      
      if (typeof fecha === 'number') {
        // Es un timestamp
        date = new Date(fecha);
      } else if (typeof fecha === 'string') {
        // Es una fecha en formato ISO
        date = new Date(fecha);
      } else if (fecha instanceof Date) {
        date = fecha;
      } else {
        return "Fecha inválida";
      }
      
      // Validar que la fecha es válida
      if (isNaN(date.getTime())) {
        return "Fecha inválida";
      }
      
      return format(date, "dd/MM/yyyy 'a las' HH:mm", { locale: es });
    } catch (error) {
      console.error("Error al formatear fecha:", error, fecha);
      return "Fecha inválida";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 mx-auto animate-spin text-primary" />
          <p className="mt-2 text-muted-foreground">Cargando historial...</p>
        </div>
      </div>
    );
  }

  if (noVinculado) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <UserX className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground font-medium">No tienes acceso al historial</p>
          <p className="text-sm text-muted-foreground mt-2">
            Tu cuenta no está vinculada a ningún registro de empadronado
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Historial de Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="visitas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="visitas" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Visitas ({visitas.length})
              </TabsTrigger>
              <TabsTrigger value="trabajadores" className="flex items-center gap-2">
                <HardHat className="h-4 w-4" />
                Trabajadores ({trabajadores.length})
              </TabsTrigger>
              <TabsTrigger value="proveedores" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Proveedores ({proveedores.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visitas">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {visitas.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay visitas registradas</p>
                    </div>
                  ) : (
                    visitas.map((visita) => (
                      <Card key={visita.id} className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {getEstadoIcon(visita.estado)}
                            <span className="font-medium text-xs sm:text-sm truncate">
                              {formatFecha(visita.fechaCreacion || (visita as any).createdAt)}
                            </span>
                          </div>
                          {getEstadoBadge(visita.estado)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <p className="break-words"><strong>Tipo:</strong> {visita.tipoAcceso}</p>
                          {visita.placa && <p className="break-words"><strong>Placa:</strong> {visita.placa}</p>}
                          <p><strong>Visitantes:</strong></p>
                          <ul className="ml-4 space-y-1">
                            {Array.isArray(visita.visitantes) && visita.visitantes.map((visitante, index) => (
                              <li key={index} className="break-words">• {visitante.nombre} (DNI: {visitante.dni})</li>
                            ))}
                            {visita.menores > 0 && (
                              <li>• {visita.menores} menor(es) de edad</li>
                            )}
                          </ul>
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="trabajadores">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {trabajadores.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <HardHat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay trabajadores registrados</p>
                    </div>
                  ) : (
                    trabajadores.map((registro) => (
                      <Card key={registro.id} className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {getEstadoIcon(registro.estado)}
                            <span className="font-medium text-xs sm:text-sm truncate">
                              {formatFecha(registro.fechaCreacion || (registro as any).createdAt)}
                            </span>
                          </div>
                          {getEstadoBadge(registro.estado)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <p className="break-words"><strong>Tipo:</strong> {registro.tipoAcceso}</p>
                          {registro.placa && <p className="break-words"><strong>Placa:</strong> {registro.placa}</p>}
                          {registro.maestroObraId && maestrosObraData[registro.maestroObraId] ? (
                            <div>
                              <p><strong>Maestro de Obra:</strong></p>
                              <div className="ml-4 mt-1 p-2 bg-muted/50 rounded break-words">
                                <p className="font-medium break-words">{maestrosObraData[registro.maestroObraId].nombre}</p>
                                {maestrosObraData[registro.maestroObraId].dni && (
                                  <p className="text-xs text-muted-foreground break-words">
                                    DNI: {maestrosObraData[registro.maestroObraId].dni}
                                  </p>
                                )}
                                {maestrosObraData[registro.maestroObraId].telefono && (
                                  <p className="text-xs text-muted-foreground break-words">
                                    Tel: {maestrosObraData[registro.maestroObraId].telefono}
                                  </p>
                                )}
                                {maestrosObraData[registro.maestroObraId].empresa && (
                                  <p className="text-xs text-muted-foreground break-words">
                                    Empresa: {maestrosObraData[registro.maestroObraId].empresa}
                                  </p>
                                )}
                              </div>
                            </div>
                          ) : (
                            <p className="break-words"><strong>Maestro de Obra:</strong> {registro.maestroObraId || "No especificado"}</p>
                          )}
                          {Array.isArray(registro.trabajadores) && registro.trabajadores.length > 0 && (
                            <>
                              <p><strong>Trabajadores adicionales:</strong></p>
                              <ul className="ml-4 space-y-1">
                                {registro.trabajadores.map((trabajador, index) => (
                                  <li key={index} className="break-words">• {trabajador.nombre} (DNI: {trabajador.dni})</li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="proveedores">
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {proveedores.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Truck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay proveedores registrados</p>
                    </div>
                  ) : (
                    proveedores.map((proveedor) => (
                      <Card key={proveedor.id} className="p-3 sm:p-4">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2 min-w-0">
                            {getEstadoIcon(proveedor.estado)}
                            <span className="font-medium text-xs sm:text-sm truncate">
                              {formatFecha(proveedor.fechaCreacion || (proveedor as any).createdAt)}
                            </span>
                          </div>
                          {getEstadoBadge(proveedor.estado)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <p className="break-words"><strong>Tipo:</strong> {proveedor.tipoAcceso}</p>
                          {proveedor.placa && <p className="break-words"><strong>Placa:</strong> {proveedor.placa}</p>}
                          <p className="break-words"><strong>Empresa:</strong> {proveedor.empresa}</p>
                          {proveedor.tipoServicio && proveedor.tipoServicio !== 'otro' && (
                            <Badge variant="outline" className="text-xs">
                              {proveedor.tipoServicio.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}