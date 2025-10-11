import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Evento, InscripcionEvento } from "@/types/eventos";
import { obtenerInscripcionesPorEvento, actualizarEstadoInscripcion, registrarPagoInscripcion } from "@/services/eventos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react";

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

  useEffect(() => {
    if (open) {
      cargarInscripciones();
    }
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

  const handleCambiarEstado = async (inscripcionId: string, nuevoEstado: string) => {
    try {
      await actualizarEstadoInscripcion(inscripcionId, nuevoEstado);
      toast.success("Estado actualizado exitosamente");
      cargarInscripciones();
    } catch (error) {
      console.error("Error al cambiar estado:", error);
      toast.error("Error al actualizar el estado");
    }
  };

  const handleRegistrarPago = async (inscripcionId: string) => {
    try {
      await registrarPagoInscripcion(inscripcionId, evento.precio);
      toast.success("Pago registrado exitosamente");
      cargarInscripciones();
    } catch (error) {
      console.error("Error al registrar pago:", error);
      toast.error("Error al registrar el pago");
    }
  };

  const getEstadoBadge = (inscripcion: InscripcionEvento) => {
    const configs: Record<string, { label: string; className: string; icon: any }> = {
      inscrito: {
        label: "Inscrito",
        className: "bg-warning/10 text-warning border-warning/20",
        icon: Clock,
      },
      confirmado: {
        label: "Confirmado",
        className: "bg-success/10 text-success border-success/20",
        icon: CheckCircle2,
      },
      cancelado: {
        label: "Cancelado",
        className: "bg-destructive/10 text-destructive border-destructive/20",
        icon: XCircle,
      },
      asistio: {
        label: "Asistió",
        className: "bg-primary/10 text-primary border-primary/20",
        icon: CheckCircle2,
      },
      no_asistio: {
        label: "No Asistió",
        className: "bg-muted text-muted-foreground",
        icon: XCircle,
      },
    };

    const config = configs[inscripcion.estado] || configs.inscrito;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const totalInscritos = inscripciones.filter(i => i.estado !== 'cancelado').length;
  const totalConfirmados = inscripciones.filter(i => i.estado === 'confirmado').length;
  const totalPagos = inscripciones
    .filter(i => i.pagoRealizado)
    .reduce((sum, i) => sum + (i.montoPagado || 0), 0);

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted/50 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Total Inscritos</p>
            <p className="text-2xl font-bold">{totalInscritos}</p>
          </div>
          <div className="bg-success/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Confirmados</p>
            <p className="text-2xl font-bold text-success">{totalConfirmados}</p>
          </div>
          <div className="bg-primary/10 p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Ingresos</p>
            <p className="text-2xl font-bold text-primary">S/ {totalPagos.toFixed(2)}</p>
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
                  <TableHead>Pago</TableHead>
                  <TableHead>Estado</TableHead>
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
                      {format(new Date(inscripcion.fechaInscripcion), "dd/MM/yyyy HH:mm", {
                        locale: es,
                      })}
                    </TableCell>
                    <TableCell>{inscripcion.acompanantes}</TableCell>
                    <TableCell>
                      {inscripcion.pagoRealizado ? (
                        <Badge className="bg-success/10 text-success border-success/20">
                          <DollarSign className="h-3 w-3 mr-1" />
                          S/ {inscripcion.montoPagado?.toFixed(2)}
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRegistrarPago(inscripcion.id)}
                        >
                          Registrar pago
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>{getEstadoBadge(inscripcion)}</TableCell>
                    <TableCell>
                      <Select
                        value={inscripcion.estado}
                        onValueChange={(value) => handleCambiarEstado(inscripcion.id, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inscrito">Inscrito</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="asistio">Asistió</SelectItem>
                          <SelectItem value="no_asistio">No Asistió</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
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
