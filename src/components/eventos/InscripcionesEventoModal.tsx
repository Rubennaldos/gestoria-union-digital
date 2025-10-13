import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Evento, InscripcionEvento } from "@/types/eventos";
import {
  obtenerInscripcionesPorEvento,
} from "@/services/eventos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { CheckCircle2, Trash2, Edit } from "lucide-react";
import { ref, remove } from "firebase/database";
import { db } from "@/config/firebase";

interface InscripcionesEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: Evento;
}

export const InscripcionesEventoModal = ({
  open,
  onOpenChange,
  evento,
}: InscripcionesEventoModalProps) => {
  const [inscripciones, setInscripciones] = useState<InscripcionEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (open) {
      cargarInscripciones();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const cargarInscripciones = async () => {
    try {
      setLoading(true);
      const data = await obtenerInscripcionesPorEvento(evento.id);
      setInscripciones(data);
    } catch (error) {
      console.error("Error al cargar inscripciones:", error);
      toast.error("Error al cargar las inscripciones");
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarInscripcion = async (inscripcionId: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta inscripción?")) {
      return;
    }
    
    try {
      setWorking(true);
      // Eliminar la inscripción de Firebase
      const inscripcionRef = ref(db, `inscripcionesEventos/${inscripcionId}`);
      await remove(inscripcionRef);
      
      toast.success("Inscripción eliminada exitosamente");
      cargarInscripciones();
    } catch (error) {
      console.error("Error al eliminar inscripción:", error);
      toast.error("Error al eliminar la inscripción");
    } finally {
      setWorking(false);
    }
  };

  const totalInscritos = inscripciones.filter(
    (i) => i.estado !== "cancelado"
  ).length;
  const totalConfirmados = inscripciones.filter(
    (i) => i.pagoRealizado
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inscripciones - {evento.titulo}</DialogTitle>
          <DialogDescription>
            Gestiona las inscripciones del evento
          </DialogDescription>
        </DialogHeader>

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Inscritos</p>
            <p className="text-2xl font-bold">{totalInscritos}</p>
          </div>
          <div className="bg-success/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Con Pago Confirmado</p>
            <p className="text-2xl font-bold text-success">
              {totalConfirmados}
            </p>
          </div>
        </div>

        {/* Tabla de Inscripciones */}
        {loading ? (
          <div className="text-center py-8">Cargando inscripciones...</div>
        ) : inscripciones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay inscripciones para este evento
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empadronado</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Acompañantes</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inscripciones.map((inscripcion) => (
                  <TableRow key={inscripcion.id}>
                    <TableCell className="font-medium">
                      {inscripcion.nombreEmpadronado}
                    </TableCell>
                    <TableCell>
                      {format(
                        new Date(inscripcion.fechaInscripcion),
                        "dd/MM/yyyy HH:mm",
                        {
                          locale: es,
                        }
                      )}
                    </TableCell>
                    <TableCell>{inscripcion.acompanantes}</TableCell>
                    <TableCell>
                      {inscripcion.pagoRealizado ? (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          S/ {inscripcion.montoPagado?.toFixed(2) || "0.00"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">Sin pago</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.info("Función de edición próximamente")}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEliminarInscripcion(inscripcion.id)}
                          disabled={working}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
