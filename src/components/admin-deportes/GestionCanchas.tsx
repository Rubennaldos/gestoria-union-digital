import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Building2, MapPin } from "lucide-react";
import { obtenerCanchas } from "@/services/deportes";
import { Cancha } from "@/types/deportes";
import { toast } from "@/hooks/use-toast";
import { NuevaCanchaModal } from "./NuevaCanchaModal";
import { EditarCanchaModal } from "./EditarCanchaModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ref, remove } from "firebase/database";
import { db } from "@/config/firebase";

export function GestionCanchas() {
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [canchaEditar, setCanchaEditar] = useState<Cancha | null>(null);
  const [canchaEliminar, setCanchaEliminar] = useState<Cancha | null>(null);

  useEffect(() => {
    cargarCanchas();
  }, []);

  const cargarCanchas = async () => {
    try {
      setLoading(true);
      const data = await obtenerCanchas();
      setCanchas(data);
    } catch (error) {
      console.error('Error al cargar canchas:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las canchas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const eliminarCancha = async () => {
    if (!canchaEliminar) return;

    try {
      await remove(ref(db, `deportes/canchas/${canchaEliminar.id}`));
      toast({
        title: "Cancha eliminada",
        description: "La cancha ha sido eliminada exitosamente"
      });
      setCanchaEliminar(null);
      cargarCanchas();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar la cancha",
        variant: "destructive"
      });
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      futbol: 'Fútbol',
      voley: 'Vóley',
      basquet: 'Básquet',
      tenis: 'Tenis',
      padel: 'Pádel'
    };
    return labels[tipo] || tipo;
  };

  const getUbicacionLabel = (ubicacion: string) => {
    return ubicacion === 'boulevard' ? 'Boulevard' : 'Quinta Llana';
  };

  if (loading) {
    return <div className="text-center py-8">Cargando canchas...</div>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Gestión de Canchas
            </CardTitle>
            <Button onClick={() => setMostrarNueva(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nueva Cancha
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {canchas.length === 0 ? (
              <p className="col-span-full text-center text-muted-foreground py-8">
                No hay canchas registradas
              </p>
            ) : (
              canchas.map((cancha) => (
                <Card key={cancha.id} className="relative">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{cancha.nombre}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {getUbicacionLabel(cancha.ubicacion)}
                        </div>
                      </div>
                      <Badge variant={cancha.activa ? "default" : "secondary"}>
                        {cancha.activa ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="font-medium">{getTipoLabel(cancha.tipo)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Precio/hora:</span>
                        <span className="font-medium">S/ {cancha.configuracion.precioHora}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Horario:</span>
                        <span className="font-medium">
                          {cancha.configuracion.horarios.inicio} - {cancha.configuracion.horarios.fin}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setCanchaEditar(cancha)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setCanchaEliminar(cancha)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {mostrarNueva && (
        <NuevaCanchaModal
          onClose={() => setMostrarNueva(false)}
          onSuccess={cargarCanchas}
        />
      )}

      {canchaEditar && (
        <EditarCanchaModal
          cancha={canchaEditar}
          onClose={() => setCanchaEditar(null)}
          onSuccess={cargarCanchas}
        />
      )}

      <AlertDialog open={!!canchaEliminar} onOpenChange={() => setCanchaEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar cancha?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. La cancha "{canchaEliminar?.nombre}" será eliminada permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={eliminarCancha} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
