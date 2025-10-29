import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ref, get, remove, update } from "firebase/database";
import { db } from "@/config/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NuevoAvisoModal } from "./NuevoAvisoModal";

interface Aviso {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: 'info' | 'warning' | 'urgent';
  activo: boolean;
  fechaInicio: string;
  fechaFin: string;
  createdAt: string;
  createdBy: string;
}

export function AvisosDeportivos() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  useEffect(() => {
    cargarAvisos();
  }, []);

  const cargarAvisos = async () => {
    try {
      setLoading(true);
      const snapshot = await get(ref(db, 'deportes/avisos'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const avisosArray = Object.keys(data).map(id => ({
          id,
          ...data[id]
        }));
        setAvisos(avisosArray.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ));
      } else {
        setAvisos([]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los avisos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleActivo = async (id: string, activo: boolean) => {
    try {
      await update(ref(db, `deportes/avisos/${id}`), { activo: !activo });
      toast({
        title: activo ? "Aviso desactivado" : "Aviso activado",
        description: `El aviso ha sido ${activo ? 'desactivado' : 'activado'}`
      });
      cargarAvisos();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el aviso",
        variant: "destructive"
      });
    }
  };

  const eliminarAviso = async (id: string) => {
    try {
      await remove(ref(db, `deportes/avisos/${id}`));
      toast({
        title: "Aviso eliminado",
        description: "El aviso ha sido eliminado exitosamente"
      });
      cargarAvisos();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el aviso",
        variant: "destructive"
      });
    }
  };

  const getTipoBadge = (tipo: string) => {
    const config = {
      info: { label: 'Información', class: 'bg-blue-500/20 text-blue-700 dark:text-blue-400' },
      warning: { label: 'Advertencia', class: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' },
      urgent: { label: 'Urgente', class: 'bg-red-500/20 text-red-700 dark:text-red-400' }
    };
    return config[tipo as keyof typeof config] || config.info;
  };

  if (loading) {
    return <div className="text-center py-8">Cargando avisos...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Avisos del Sistema Deportivo
            </CardTitle>
            <Button onClick={() => setMostrarNuevo(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Aviso
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {avisos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay avisos registrados
              </p>
            ) : (
              avisos.map((aviso) => {
                const tipoBadge = getTipoBadge(aviso.tipo);
                const fechaInicio = new Date(aviso.fechaInicio);
                const fechaFin = new Date(aviso.fechaFin);
                const ahora = new Date();
                const estaVigente = ahora >= fechaInicio && ahora <= fechaFin;

                return (
                  <Card key={aviso.id} className={aviso.activo && estaVigente ? "border-l-4 border-l-primary" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={tipoBadge.class}>
                              {tipoBadge.label}
                            </Badge>
                            <Badge variant={aviso.activo ? "default" : "secondary"}>
                              {aviso.activo ? 'Activo' : 'Inactivo'}
                            </Badge>
                            {estaVigente && aviso.activo && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/30">
                                Vigente
                              </Badge>
                            )}
                          </div>
                          
                          <h3 className="font-semibold text-lg">{aviso.titulo}</h3>
                          <p className="text-sm text-muted-foreground">{aviso.mensaje}</p>
                          
                          <div className="text-xs text-muted-foreground space-y-1">
                            <p>
                              <span className="font-medium">Vigencia:</span>{" "}
                              {format(fechaInicio, "dd/MM/yyyy", { locale: es })} -{" "}
                              {format(fechaFin, "dd/MM/yyyy", { locale: es })}
                            </p>
                            <p>
                              <span className="font-medium">Creado:</span>{" "}
                              {format(new Date(aviso.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActivo(aviso.id, aviso.activo)}
                          >
                            {aviso.activo ? (
                              <><EyeOff className="h-4 w-4 mr-2" /> Desactivar</>
                            ) : (
                              <><Eye className="h-4 w-4 mr-2" /> Activar</>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => eliminarAviso(aviso.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
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

      {mostrarNuevo && (
        <NuevoAvisoModal
          onClose={() => setMostrarNuevo(false)}
          onSuccess={cargarAvisos}
        />
      )}
    </>
  );
}
