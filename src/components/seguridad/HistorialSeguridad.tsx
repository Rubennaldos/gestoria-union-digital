import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Clock, Users, UserCheck, Shield, Search, Calendar } from "lucide-react";
import { useFirebaseData } from "@/hooks/useFirebase";

interface RegistroHistorial {
  id: string;
  tipo: 'visitante' | 'trabajador' | 'proveedor';
  fecha: number;
  horaIngreso?: number;
  horaSalida?: number;
  estado: 'ingresado' | 'finalizado' | 'autorizado' | 'denegado';
  datos: any;
}

export const HistorialSeguridad = () => {
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().split('T')[0]);
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<'todos' | 'visitante' | 'trabajador' | 'proveedor'>('todos');
  
  // Obtener datos de Firebase
  const { data: ingresos } = useFirebaseData<Record<string, any>>('seguridad/ingresos');
  const { data: registrosManuales } = useFirebaseData<Record<string, any>>('seguridad/registros_manuales');
  const { data: incidencias } = useFirebaseData<Record<string, any>>('seguridad/incidencias');

  const [historialFiltrado, setHistorialFiltrado] = useState<RegistroHistorial[]>([]);

  useEffect(() => {
    const registros: RegistroHistorial[] = [];

    // Procesar ingresos/salidas
    if (ingresos) {
      Object.entries(ingresos).forEach(([id, registro]) => {
        const fechaRegistro = new Date(registro.horaIngreso || registro.fechaCreacion).toISOString().split('T')[0];
        
        if (fechaRegistro === filtroFecha) {
          registros.push({
            id,
            tipo: registro.tipo,
            fecha: registro.horaIngreso || registro.fechaCreacion,
            horaIngreso: registro.horaIngreso,
            horaSalida: registro.horaSalida,
            estado: registro.estado,
            datos: registro
          });
        }
      });
    }

    // Procesar registros manuales
    if (registrosManuales) {
      Object.entries(registrosManuales).forEach(([id, registro]) => {
        const fechaRegistro = new Date(registro.fechaCreacion).toISOString().split('T')[0];
        
        if (fechaRegistro === filtroFecha) {
          registros.push({
            id,
            tipo: registro.tipo,
            fecha: registro.fechaCreacion,
            estado: registro.estado,
            datos: registro
          });
        }
      });
    }

    // Filtrar por tipo
    let registrosFiltrados = registros;
    if (tipoFiltro !== 'todos') {
      registrosFiltrados = registros.filter(r => r.tipo === tipoFiltro);
    }

    // Filtrar por búsqueda
    if (busqueda.trim()) {
      registrosFiltrados = registrosFiltrados.filter(r => 
        JSON.stringify(r.datos).toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    // Ordenar por fecha (más recientes primero)
    registrosFiltrados.sort((a, b) => b.fecha - a.fecha);

    setHistorialFiltrado(registrosFiltrados);
  }, [ingresos, registrosManuales, filtroFecha, busqueda, tipoFiltro]);

  const getIcono = (tipo: string) => {
    switch (tipo) {
      case 'visitante': return Users;
      case 'trabajador': return UserCheck;
      case 'proveedor': return Shield;
      default: return FileText;
    }
  };

  const getColorBadge = (estado: string) => {
    switch (estado) {
      case 'autorizado': return 'bg-green-100 text-green-800';
      case 'denegado': return 'bg-red-100 text-red-800';
      case 'ingresado': return 'bg-blue-100 text-blue-800';
      case 'finalizado': return 'bg-gray-100 text-gray-800';
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatearHora = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Historial de Seguridad
          </CardTitle>
          <CardDescription>
            Registro de todas las actividades del día
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha</label>
              <Input
                type="date"
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="DNI, nombre, empresa..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Tabs value={tipoFiltro} onValueChange={(value: any) => setTipoFiltro(value)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="todos">Todos</TabsTrigger>
                  <TabsTrigger value="visitante">Visitas</TabsTrigger>
                  <TabsTrigger value="trabajador">Trabajo</TabsTrigger>
                  <TabsTrigger value="proveedor">Proveedor</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Resumen del día */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {historialFiltrado.filter(r => r.tipo === 'visitante').length}
                </div>
                <div className="text-sm text-muted-foreground">Visitas</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {historialFiltrado.filter(r => r.tipo === 'trabajador').length}
                </div>
                <div className="text-sm text-muted-foreground">Trabajadores</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {historialFiltrado.filter(r => r.tipo === 'proveedor').length}
                </div>
                <div className="text-sm text-muted-foreground">Proveedores</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {historialFiltrado.filter(r => r.estado === 'ingresado').length}
                </div>
                <div className="text-sm text-muted-foreground">Activos</div>
              </CardContent>
            </Card>
          </div>

          {/* Lista de registros */}
          <div className="space-y-3">
            {historialFiltrado.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    No hay registros
                  </h3>
                  <p className="text-muted-foreground">
                    No se encontraron registros para los filtros seleccionados
                  </p>
                </CardContent>
              </Card>
            ) : (
              historialFiltrado.map((registro) => {
                const Icono = getIcono(registro.tipo);
                return (
                  <Card key={registro.id} className="border-l-4 border-l-primary">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icono className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium capitalize">{registro.tipo}</h4>
                              <Badge className={getColorBadge(registro.estado)}>
                                {registro.estado.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {registro.datos.empresa || 
                               registro.datos.visitantes?.[0]?.nombre ||
                               registro.datos.trabajadores?.[0]?.nombre ||
                               'Sin datos'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right text-sm">
                          {registro.horaIngreso && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>Ingreso: {formatearHora(registro.horaIngreso)}</span>
                            </div>
                          )}
                          {registro.horaSalida && (
                            <div className="flex items-center gap-1 text-green-600">
                              <Clock className="h-3 w-3" />
                              <span>Salida: {formatearHora(registro.horaSalida)}</span>
                            </div>
                          )}
                          {!registro.horaIngreso && !registro.horaSalida && (
                            <span className="text-muted-foreground">
                              {formatearHora(registro.fecha)}
                            </span>
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
    </div>
  );
};