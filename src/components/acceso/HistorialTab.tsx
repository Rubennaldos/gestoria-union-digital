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
  obtenerProveedoresPorEmpadronado 
} from "@/services/acceso";
import { obtenerEmpadronadoPorAuthUid } from "@/services/empadronados";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { useAuth } from "@/contexts/AuthContext";

export function HistorialTab() {
  const { user } = useAuth();
  const [visitas, setVisitas] = useState<RegistroVisita[]>([]);
  const [trabajadores, setTrabajadores] = useState<RegistroTrabajadores[]>([]);
  const [proveedores, setProveedores] = useState<RegistroProveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [empadronadoId, setEmpadronadoId] = useState<string | null>(null);
  const [noVinculado, setNoVinculado] = useState(false);

  useEffect(() => {
    cargarHistorial();
  }, [user]);

  const cargarHistorial = async () => {
    try {
      setLoading(true);
      setNoVinculado(false);

      if (!user?.uid) {
        setNoVinculado(true);
        return;
      }

      // Obtener el empadronado vinculado al usuario autenticado
      const empadronado = await obtenerEmpadronadoPorAuthUid(user.uid);
      
      if (!empadronado) {
        console.log('Usuario no vinculado a ningún empadronado');
        setNoVinculado(true);
        return;
      }

      setEmpadronadoId(empadronado.id);
      
      // Cargar historial solo del empadronado actual
      const [visitasData, trabajadoresData, proveedoresData] = await Promise.all([
        obtenerVisitasPorEmpadronado(empadronado.id),
        obtenerTrabajadoresPorEmpadronado(empadronado.id),
        obtenerProveedoresPorEmpadronado(empadronado.id)
      ]);

      setVisitas(visitasData);
      setTrabajadores(trabajadoresData);
      setProveedores(proveedoresData);
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
                      <Card key={visita.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getEstadoIcon(visita.estado)}
                            <span className="font-medium">
                              {format(new Date(visita.fechaCreacion), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                            </span>
                          </div>
                          {getEstadoBadge(visita.estado)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <p><strong>Tipo:</strong> {visita.tipoAcceso}</p>
                          {visita.placa && <p><strong>Placa:</strong> {visita.placa}</p>}
                          <p><strong>Visitantes:</strong></p>
                          <ul className="ml-4 space-y-1">
                            {visita.visitantes.map((visitante, index) => (
                              <li key={index}>• {visitante.nombre} (DNI: {visitante.dni})</li>
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
                      <Card key={registro.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getEstadoIcon(registro.estado)}
                            <span className="font-medium">
                              {format(new Date(registro.fechaCreacion), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                            </span>
                          </div>
                          {getEstadoBadge(registro.estado)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <p><strong>Tipo:</strong> {registro.tipoAcceso}</p>
                          {registro.placa && <p><strong>Placa:</strong> {registro.placa}</p>}
                          <p><strong>Maestro de Obra ID:</strong> {registro.maestroObraId}</p>
                          {registro.trabajadores.length > 0 && (
                            <>
                              <p><strong>Trabajadores adicionales:</strong></p>
                              <ul className="ml-4 space-y-1">
                                {registro.trabajadores.map((trabajador, index) => (
                                  <li key={index}>• {trabajador.nombre} (DNI: {trabajador.dni})</li>
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
                      <Card key={proveedor.id} className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getEstadoIcon(proveedor.estado)}
                            <span className="font-medium">
                              {format(new Date(proveedor.fechaCreacion), "dd/MM/yyyy 'a las' HH:mm", { locale: es })}
                            </span>
                          </div>
                          {getEstadoBadge(proveedor.estado)}
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <p><strong>Tipo:</strong> {proveedor.tipoAcceso}</p>
                          {proveedor.placa && <p><strong>Placa:</strong> {proveedor.placa}</p>}
                          <p><strong>Empresa:</strong> {proveedor.empresa}</p>
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