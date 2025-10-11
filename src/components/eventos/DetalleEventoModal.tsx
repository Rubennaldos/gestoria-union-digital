import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, User, Users, DollarSign, FileText, Package } from "lucide-react";
import { Evento } from "@/types/eventos";
import { inscribirseEvento } from "@/services/eventos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface DetalleEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: Evento;
  onInscripcionExitosa: () => void;
}

export const DetalleEventoModal = ({
  open,
  onOpenChange,
  evento,
  onInscripcionExitosa,
}: DetalleEventoModalProps) => {
  const { user } = useAuth();
  const [acompanantes, setAcompanantes] = useState(0);
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInscripcion = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para inscribirte");
      return;
    }

    try {
      setLoading(true);
      await inscribirseEvento(
        evento.id,
        user.uid,
        user.displayName || user.email || "Usuario",
        acompanantes,
        observaciones
      );

      toast.success("¡Inscripción realizada exitosamente!");
      onOpenChange(false);
      onInscripcionExitosa();
      
      // Resetear form
      setAcompanantes(0);
      setObservaciones("");
    } catch (error: any) {
      console.error("Error al inscribirse:", error);
      toast.error(error.message || "Error al realizar la inscripción");
    } finally {
      setLoading(false);
    }
  };

  const getCategoriaColor = (categoria: string) => {
    const colores: Record<string, string> = {
      deportivo: "bg-success/10 text-success border-success/20",
      cultural: "bg-primary/10 text-primary border-primary/20",
      educativo: "bg-secondary/10 text-secondary-foreground border-secondary/20",
      social: "bg-warning/10 text-warning border-warning/20",
      recreativo: "bg-primary/10 text-primary border-primary/20",
      otro: "bg-muted text-muted-foreground border-border",
    };
    return colores[categoria] || colores.otro;
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

  const totalPersonas = 1 + acompanantes;
  const costoTotal = evento.precio * totalPersonas;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{evento.titulo}</DialogTitle>
              <DialogDescription>{evento.descripcion}</DialogDescription>
            </div>
            <Badge className={getCategoriaColor(evento.categoria)}>
              {getCategoriaLabel(evento.categoria)}
            </Badge>
          </div>
        </DialogHeader>

        {evento.imagen && (
          <div className="rounded-lg overflow-hidden">
            <img
              src={evento.imagen}
              alt={evento.titulo}
              className="w-full h-64 object-cover"
            />
          </div>
        )}

        <div className="space-y-4">
          {/* Información del Evento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Fecha</p>
                  <p className="font-medium">
                    {format(new Date(evento.fechaInicio), "dd 'de' MMMM, yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Horario</p>
                  <p className="font-medium">
                    {evento.horaInicio} - {evento.horaFin}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Lugar</p>
                  <p className="font-medium">{evento.lugar}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {evento.instructor && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Instructor</p>
                    <p className="font-medium">{evento.instructor}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Cupos disponibles</p>
                  <p className="font-medium">{evento.cuposDisponibles} lugares</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Inversión</p>
                  <p className="font-semibold text-success text-lg">
                    {evento.precio === 0 ? "Gratis" : `S/ ${evento.precio.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {(evento.requisitos || evento.materialesIncluidos) && (
            <>
              <Separator />
              <div className="space-y-3">
                {evento.requisitos && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base">Requisitos</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{evento.requisitos}</p>
                  </div>
                )}

                {evento.materialesIncluidos && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <Label className="text-base">Materiales incluidos</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">{evento.materialesIncluidos}</p>
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Formulario de Inscripción */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Inscripción</h3>

            <div className="space-y-2">
              <Label htmlFor="acompanantes">Número de acompañantes</Label>
              <Input
                id="acompanantes"
                type="number"
                min="0"
                max={evento.cuposDisponibles - 1}
                value={acompanantes}
                onChange={(e) => setAcompanantes(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Total de personas: {totalPersonas}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Alguna información adicional que desees compartir..."
                rows={3}
              />
            </div>

            {evento.precio > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Costo Total:</span>
                  <span className="text-xl font-bold text-success">
                    S/ {costoTotal.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  El pago se realizará al confirmar tu inscripción
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleInscripcion}
              disabled={loading || evento.cuposDisponibles < totalPersonas}
              className="flex-1"
            >
              {loading ? "Inscribiendo..." : "Confirmar Inscripción"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
