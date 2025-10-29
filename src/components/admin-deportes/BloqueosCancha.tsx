import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Plus, Trash2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ref, push, set, get, remove } from "firebase/database";
import { db } from "@/config/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { NuevoBloqueoModal } from "./NuevoBloqueoModal";

interface Bloqueo {
  id: string;
  canchaId: string;
  fechaInicio: string;
  fechaFin: string;
  motivo: string;
  createdAt: string;
  createdBy: string;
}

export function BloqueosCancha() {
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarNuevo, setMostrarNuevo] = useState(false);

  useEffect(() => {
    cargarBloqueos();
  }, []);

  const cargarBloqueos = async () => {
    try {
      setLoading(true);
      const snapshot = await get(ref(db, 'deportes/bloqueos'));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const bloqueosArray = Object.keys(data).map(id => ({
          id,
          ...data[id]
        }));
        setBloqueos(bloqueosArray.sort((a, b) => 
          new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime()
        ));
      } else {
        setBloqueos([]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los bloqueos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const eliminarBloqueo = async (id: string) => {
    try {
      await remove(ref(db, `deportes/bloqueos/${id}`));
      toast({
        title: "Bloqueo eliminado",
        description: "El bloqueo ha sido eliminado exitosamente"
      });
      cargarBloqueos();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el bloqueo",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div className="text-center py-8">Cargando bloqueos...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Bloqueos de Canchas
            </CardTitle>
            <Button onClick={() => setMostrarNuevo(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Bloqueo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {bloqueos.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay bloqueos registrados
              </p>
            ) : (
              bloqueos.map((bloqueo) => {
                const fechaInicio = new Date(bloqueo.fechaInicio);
                const fechaFin = new Date(bloqueo.fechaFin);
                const ahora = new Date();
                const estaActivo = ahora >= fechaInicio && ahora <= fechaFin;

                return (
                  <Card key={bloqueo.id} className={estaActivo ? "border-l-4 border-l-red-500" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <span className="font-semibold">Cancha ID: {bloqueo.canchaId}</span>
                            {estaActivo && (
                              <span className="text-xs bg-red-500/20 text-red-700 dark:text-red-400 px-2 py-1 rounded">
                                ACTIVO
                              </span>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground">{bloqueo.motivo}</p>
                          
                          <div className="text-sm space-y-1">
                            <p>
                              <span className="text-muted-foreground">Desde:</span>{" "}
                              {format(fechaInicio, "dd/MM/yyyy HH:mm", { locale: es })}
                            </p>
                            <p>
                              <span className="text-muted-foreground">Hasta:</span>{" "}
                              {format(fechaFin, "dd/MM/yyyy HH:mm", { locale: es })}
                            </p>
                          </div>
                        </div>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => eliminarBloqueo(bloqueo.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
        <NuevoBloqueoModal
          onClose={() => setMostrarNuevo(false)}
          onSuccess={cargarBloqueos}
        />
      )}
    </>
  );
}
