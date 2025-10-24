import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  User, 
  Car,
  HardHat,
  CheckCircle2,
  Clock
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { obtenerListasActivasParaSeguridad, obtenerMaestrosObra } from "@/services/acceso";
import { MaestroObra } from "@/types/acceso";
import { ScrollArea } from "@/components/ui/scroll-area";

export function ListasTrabajadoresActivas() {
  const [listas, setListas] = useState<any[]>([]);
  const [maestrosObra, setMaestrosObra] = useState<MaestroObra[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarDatos();
    // Actualizar cada 5 minutos
    const interval = setInterval(cargarDatos, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [listasData, maestrosData] = await Promise.all([
        obtenerListasActivasParaSeguridad(),
        obtenerMaestrosObra()
      ]);
      setListas(listasData);
      setMaestrosObra(maestrosData);
    } catch (error) {
      console.error("Error al cargar listas activas:", error);
    } finally {
      setCargando(false);
    }
  };

  const obtenerNombreMaestro = (maestroId: string): string => {
    return maestrosObra.find(m => m.id === maestroId)?.nombre || maestroId;
  };

  const getDiasRestantes = (fechaFin: number): number => {
    return differenceInDays(fechaFin, Date.now());
  };

  if (cargando) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardHat className="h-5 w-5" />
            Listas de Trabajadores Activas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardHat className="h-5 w-5" />
          Listas de Trabajadores Activas
          <Badge variant="default" className="ml-2">
            {listas.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {listas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay listas de trabajadores activas en este momento</p>
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="space-y-4">
              {listas.map((lista) => {
                const diasRestantes = getDiasRestantes(lista.fechaFin);
                const proximoAVencer = diasRestantes <= 3;

                return (
                  <Card key={lista.id} className="border-2 border-primary/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{lista.nombreLista}</h3>
                            <Badge variant="default" className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Activa
                            </Badge>
                            {proximoAVencer && (
                              <Badge variant="destructive" className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Vence pronto
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(lista.fechaInicio, "dd MMM", { locale: es })} - {format(lista.fechaFin, "dd MMM yyyy", { locale: es })}
                            </span>
                            <span className="flex items-center gap-1">
                              {lista.tipoAcceso === "vehicular" ? <Car className="h-3 w-3" /> : <User className="h-3 w-3" />}
                              {lista.tipoAcceso === "vehicular" ? "Vehicular" : "Peatonal"}
                            </span>
                            <span className={proximoAVencer ? "text-destructive font-medium" : ""}>
                              {diasRestantes} {diasRestantes === 1 ? "día restante" : "días restantes"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 bg-muted/30 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Solicitado por</p>
                          <p className="font-medium">
                            {lista.solicitadoPorNombre || "N/A"}
                          </p>
                          {lista.solicitadoPorPadron && (
                            <p className="text-xs text-muted-foreground">
                              Padrón: {lista.solicitadoPorPadron}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Maestro de Obra</p>
                          <p className="font-medium">
                            {obtenerNombreMaestro(lista.maestroObraId)}
                          </p>
                        </div>
                      </div>

                      {lista.tipoAcceso === "vehicular" && lista.placas && (
                        <div className="p-3 bg-muted/20 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-2">Placas autorizadas</p>
                          <div className="flex flex-wrap gap-2">
                            {lista.placas.map((placa: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="font-mono">
                                {placa}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium">
                            Trabajadores autorizados ({lista.trabajadores?.length || 0})
                          </p>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {(lista.trabajadores || []).map((trabajador: any, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 bg-muted/20 rounded text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{trabajador.nombre}</span>
                              </div>
                              <Badge variant="outline" className="font-mono text-xs">
                                DNI: {trabajador.dni}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
