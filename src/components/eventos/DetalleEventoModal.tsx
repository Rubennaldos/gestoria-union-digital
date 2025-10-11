import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, MapPin, User, Users, DollarSign, FileText, Package, Tag, UserPlus, Trash2 } from "lucide-react";
import { Evento } from "@/types/eventos";
import { inscribirseEvento } from "@/services/eventos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface PersonaInscrita {
  nombre: string;
  dni: string;
}

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
  const [sesionSeleccionada, setSesionSeleccionada] = useState<string>("");
  const [personas, setPersonas] = useState<PersonaInscrita[]>([{ nombre: "", dni: "" }]);
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);

  const agregarPersona = () => {
    if (personas.length < 10) {
      setPersonas([...personas, { nombre: "", dni: "" }]);
    }
  };

  const eliminarPersona = (index: number) => {
    if (personas.length > 1) {
      setPersonas(personas.filter((_, i) => i !== index));
    }
  };

  const actualizarPersona = (index: number, campo: 'nombre' | 'dni', valor: string) => {
    const nuevasPersonas = [...personas];
    nuevasPersonas[index][campo] = valor;
    setPersonas(nuevasPersonas);
  };

  const calcularPrecioTotal = () => {
    if (!sesionSeleccionada) return 0;
    
    const sesion = evento.sesiones.find(s => s.id === sesionSeleccionada);
    if (!sesion) return 0;
    
    const precioUnitario = sesion.precio;
    let total = 0;
    
    // Primera persona: precio completo
    total += precioUnitario;
    
    // Segunda persona: 50% de descuento
    if (personas.length > 1) {
      total += precioUnitario * 0.5;
    }
    
    // Resto de personas: precio completo
    if (personas.length > 2) {
      total += precioUnitario * (personas.length - 2);
    }
    
    return total;
  };

  const handleInscripcion = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para inscribirte");
      return;
    }

    if (!sesionSeleccionada) {
      toast.error("Debes seleccionar una sesión");
      return;
    }

    // Validar que todas las personas tengan nombre y DNI
    const personasIncompletas = personas.some(p => !p.nombre.trim() || !p.dni.trim());
    if (personasIncompletas) {
      toast.error("Completa el nombre y DNI de todas las personas");
      return;
    }

    try {
      setLoading(true);
      await inscribirseEvento(
        evento.id,
        user.uid,
        user.displayName || user.email || "Usuario",
        personas.length - 1, // acompañantes
        `${observaciones}\n\nPersonas inscritas:\n${personas.map((p, i) => `${i + 1}. ${p.nombre} - DNI: ${p.dni}`).join('\n')}\n\nSesión: ${sesionSeleccionada}`
      );

      toast.success("¡Inscripción realizada exitosamente!");
      onOpenChange(false);
      onInscripcionExitosa();
      
      // Resetear form
      setSesionSeleccionada("");
      setPersonas([{ nombre: "", dni: "" }]);
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

  const sesionSeleccionadaObj = evento.sesiones.find(s => s.id === sesionSeleccionada);
  const precioTotal = calcularPrecioTotal();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {format(new Date(evento.fechaInicio), "dd 'de' MMMM, yyyy", { locale: es })}
                    {evento.fechaFin && !evento.fechaFinIndefinida && (
                      <> - {format(new Date(evento.fechaFin), "dd 'de' MMM", { locale: es })}</>
                    )}
                    {evento.fechaFinIndefinida && <> (Sin fecha fin)</>}
                  </p>
                </div>
              </div>

              {evento.instructor && (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Instructor</p>
                    <p className="font-medium">{evento.instructor}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Cupos</p>
                  <p className="font-medium">
                    {evento.cuposIlimitados
                      ? "Ilimitados"
                      : `${evento.cuposDisponibles} disponibles`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Inversión</p>
                  <p className="font-semibold text-success text-lg">
                    {evento.precio === 0 ? "Gratis" : `S/ ${evento.precio.toFixed(2)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Sesiones del evento */}
          {evento.sesiones && evento.sesiones.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Sesiones Programadas</h3>
                <div className="space-y-2">
                  {evento.sesiones.map((sesion, index) => (
                    <div key={sesion.id} className="bg-muted/50 p-3 rounded-lg">
                      <div className="flex items-start gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
                        <div className="flex-1">
                          <p className="font-medium">{sesion.lugar}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(sesion.fecha), "dd/MM/yyyy", { locale: es })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {sesion.horaInicio} - {sesion.horaFin}
                            </span>
                            {sesion.precio > 0 && (
                              <span className="flex items-center gap-1 text-success font-semibold">
                                <DollarSign className="h-3 w-3" />
                                S/ {sesion.precio.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

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

            {/* Selección de Sesión */}
            <div className="space-y-2">
              <Label htmlFor="sesion">Selecciona una sesión *</Label>
              <Select value={sesionSeleccionada} onValueChange={setSesionSeleccionada}>
                <SelectTrigger id="sesion">
                  <SelectValue placeholder="Elige el día y horario" />
                </SelectTrigger>
                <SelectContent>
                  {evento.sesiones.map((sesion) => (
                    <SelectItem key={sesion.id} value={sesion.id}>
                      {sesion.lugar} - {format(new Date(sesion.fecha), "dd/MM/yyyy", { locale: es })} ({sesion.horaInicio} - {sesion.horaFin}) - S/ {sesion.precio.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Personas Inscritas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Datos de las personas *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarPersona}
                  disabled={personas.length >= 10}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar persona
                </Button>
              </div>

              {personas.length <= 2 && (
                <div className="bg-primary/10 p-3 rounded-lg">
                  <p className="text-sm text-primary font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    ¡Promoción! La 2da persona obtiene 50% de descuento
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {personas.map((persona, index) => (
                  <Card key={index}>
                    <CardContent className="pt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            Persona {index + 1}
                            {index === 1 && <Badge className="ml-2 bg-success">50% descuento</Badge>}
                          </span>
                          {personas.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => eliminarPersona(index)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor={`nombre-${index}`}>Nombre completo</Label>
                            <Input
                              id={`nombre-${index}`}
                              value={persona.nombre}
                              onChange={(e) => actualizarPersona(index, 'nombre', e.target.value)}
                              placeholder="Ej: Juan Pérez"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`dni-${index}`}>DNI</Label>
                            <Input
                              id={`dni-${index}`}
                              value={persona.dni}
                              onChange={(e) => actualizarPersona(index, 'dni', e.target.value)}
                              placeholder="12345678"
                              maxLength={8}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
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

            {sesionSeleccionadaObj && sesionSeleccionadaObj.precio > 0 && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Precio por sesión:</span>
                    <span className="text-muted-foreground">
                      S/ {sesionSeleccionadaObj.precio.toFixed(2)}
                    </span>
                  </div>
                  
                  {personas.map((_, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Persona {index + 1}:</span>
                      <span className={index === 1 ? "text-success font-medium" : ""}>
                        S/ {(index === 1 ? sesionSeleccionadaObj.precio * 0.5 : sesionSeleccionadaObj.precio).toFixed(2)}
                        {index === 1 && " (50% desc.)"}
                      </span>
                    </div>
                  ))}
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Costo Total:</span>
                    <span className="text-xl font-bold text-success">
                      S/ {precioTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
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
              disabled={
                loading ||
                !sesionSeleccionada ||
                personas.some(p => !p.nombre.trim() || !p.dni.trim())
              }
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
