import { useState } from "react";
import { MoreVertical, Edit, Users, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Evento } from "@/types/eventos";
import { eliminarEvento, cambiarEstadoEvento } from "@/services/eventos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { toast } from "sonner";

interface ListaEventosProps {
  eventos: Evento[];
  onEditar: (evento: Evento) => void;
  onVerInscripciones: (evento: Evento) => void;
  onActualizar: () => void;
}

export const ListaEventos = ({
  eventos,
  onEditar,
  onVerInscripciones,
  onActualizar,
}: ListaEventosProps) => {
  const [eventoAEliminar, setEventoAEliminar] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEliminar = async () => {
    if (!eventoAEliminar) return;

    try {
      setLoading(true);
      await eliminarEvento(eventoAEliminar.id);
      toast.success("Evento eliminado exitosamente");
      onActualizar();
    } catch (error) {
      console.error("Error al eliminar evento:", error);
      toast.error("Error al eliminar el evento");
    } finally {
      setLoading(false);
      setEventoAEliminar(null);
    }
  };

  const handleCambiarEstado = async (eventoId: string, nuevoEstado: string) => {
    try {
      await cambiarEstadoEvento(eventoId, nuevoEstado);
      toast.success("Estado actualizado exitosamente");
      onActualizar();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      toast.error("Error al cambiar el estado");
    }
  };

  const getEstadoBadge = (estado: string) => {
    const configs: Record<string, { label: string; className: string }> = {
      activo: { label: "Activo", className: "bg-success/10 text-success border-success/20" },
      inactivo: { label: "Inactivo", className: "bg-muted text-muted-foreground" },
      finalizado: { label: "Finalizado", className: "bg-secondary/10 text-secondary-foreground" },
      cancelado: { label: "Cancelado", className: "bg-destructive/10 text-destructive" },
    };

    const config = configs[estado] || configs.inactivo;
    return (
      <Badge className={config.className}>
        {config.label}
      </Badge>
    );
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

  if (eventos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay eventos para mostrar
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cupos</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {eventos.map((evento) => (
              <TableRow key={evento.id}>
                <TableCell>
                  <div>
                    <div className="font-medium">{evento.titulo}</div>
                    {evento.instructor && (
                      <div className="text-sm text-muted-foreground">
                        {evento.instructor}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getCategoriaLabel(evento.categoria)}</TableCell>
                <TableCell>
                  {format(toZonedTime(new Date(evento.fechaInicio), "America/Lima"), "dd/MM/yyyy", { locale: es })}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{evento.cuposDisponibles}</span> /{" "}
                  {evento.cuposMaximos}
                </TableCell>
                <TableCell>
                  {evento.precio === 0 ? "Gratis" : `S/ ${evento.precio.toFixed(2)}`}
                </TableCell>
                <TableCell>{getEstadoBadge(evento.estado)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onVerInscripciones(evento)}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Inscritos
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEditar(evento)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {evento.estado === "activo" && (
                          <DropdownMenuItem
                            onClick={() => handleCambiarEstado(evento.id, "finalizado")}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Marcar como finalizado
                          </DropdownMenuItem>
                        )}
                        {evento.estado !== "activo" && (
                          <DropdownMenuItem
                            onClick={() => handleCambiarEstado(evento.id, "activo")}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Activar evento
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setEventoAEliminar(evento)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!eventoAEliminar}
        onOpenChange={(open) => !open && setEventoAEliminar(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el evento "{eventoAEliminar?.titulo}".
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminar}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
