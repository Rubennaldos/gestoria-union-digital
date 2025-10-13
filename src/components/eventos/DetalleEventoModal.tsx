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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, MapPin, User, Users, DollarSign, FileText, Package, Tag, UserPlus, Trash2 } from "lucide-react";
import { Evento } from "@/types/eventos";
import { inscribirseEvento } from "@/services/eventos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toZonedTime } from "date-fns-tz";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { PasarelaPagoModal } from "./PasarelaPagoModal";
import { generarVoucherEvento, archivoABase64 } from "@/lib/pdf/voucherEvento";
import { crearMovimientoFinanciero } from "@/services/finanzas";

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
  const { user, profile } = useAuth();
  const [sesionesSeleccionadas, setSesionesSeleccionadas] = useState<string[]>([]);
  const [personas, setPersonas] = useState<PersonaInscrita[]>([{ nombre: "", dni: "" }]);
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [mostrarPasarelaPago, setMostrarPasarelaPago] = useState(false);

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

  const toggleSesion = (sesionId: string) => {
    setSesionesSeleccionadas(prev => 
      prev.includes(sesionId)
        ? prev.filter(id => id !== sesionId)
        : [...prev, sesionId]
    );
  };

  const calcularPrecioTotal = () => {
    if (sesionesSeleccionadas.length === 0) return 0;
    
    let total = 0;
    
    sesionesSeleccionadas.forEach(sesionId => {
      const sesion = evento.sesiones.find(s => s.id === sesionId);
      if (!sesion) return;
      
      const precioUnitario = sesion.precio;
      
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
    });
    
    return total;
  };

  const handleInscripcion = () => {
    if (!user) {
      toast.error("Debes iniciar sesión para inscribirte");
      return;
    }

    if (sesionesSeleccionadas.length === 0) {
      toast.error("Debes seleccionar al menos una sesión");
      return;
    }

    // Validar que todas las personas tengan nombre y DNI
    const personasIncompletas = personas.some(p => !p.nombre.trim() || !p.dni.trim());
    if (personasIncompletas) {
      toast.error("Completa el nombre y DNI de todas las personas");
      return;
    }

    // Si hay precio, mostrar pasarela de pago
    if (precioTotal > 0) {
      setMostrarPasarelaPago(true);
    } else {
      // Inscripción gratuita directa
      procesarInscripcion(new Date(), null);
    }
  };

  const procesarInscripcion = async (fechaPago: Date, archivoComprobante: File | null) => {
    if (!user) return;

    try {
      setLoading(true);
      const sesionesInfo = sesionesSeleccionadas.map(sesionId => {
        const sesion = evento.sesiones.find(s => s.id === sesionId);
        if (!sesion) return '';
        return `${sesion.lugar} - ${format(new Date(sesion.fecha), "dd/MM/yyyy", { locale: es })} (${sesion.horaInicio} - ${sesion.horaFin})`;
      }).join('\n');

      // Usar empadronadoId del perfil si existe, sino usar uid
      const empadronadoId = profile?.empadronadoId || user.uid;
      const nombreEmpadronado = user.displayName || user.email || "Usuario";

      console.log('📝 Inscribiendo con empadronadoId:', empadronadoId);

      // Inscribir al evento
      await inscribirseEvento(
        evento.id,
        empadronadoId,
        nombreEmpadronado,
        personas.length - 1,
        `${observaciones}\n\nPERSONAS INSCRITAS:\n${personas.map((p, i) => `${i + 1}. ${p.nombre} - DNI: ${p.dni}`).join('\n')}\n\nSESIONES SELECCIONADAS:\n${sesionesInfo}`
      );

      // Si hay pago, generar voucher y registrar en finanzas
      if (precioTotal > 0 && archivoComprobante) {
        const comprobanteBase64 = await archivoABase64(archivoComprobante);
        
        const sesionesData = sesionesSeleccionadas.map(sesionId => {
          const sesion = evento.sesiones.find(s => s.id === sesionId);
          return sesion ? {
            lugar: sesion.lugar,
            fecha: sesion.fecha,
            horaInicio: sesion.horaInicio,
            horaFin: sesion.horaFin,
            precio: sesion.precio
          } : null;
        }).filter(Boolean) as any[];

        const numeroVoucher = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Generar PDF del voucher
        const voucherBlob = await generarVoucherEvento({
          eventoTitulo: evento.titulo,
          eventoCategoria: getCategoriaLabel(evento.categoria),
          personas,
          sesiones: sesionesData,
          montoTotal: precioTotal,
          fechaPago,
          numeroVoucher,
          comprobanteBase64,
        });

        // Registrar en finanzas
        await crearMovimientoFinanciero({
          tipo: "ingreso",
          categoria: "evento",
          monto: precioTotal,
          descripcion: `Inscripción: ${evento.titulo} - ${personas.map(p => p.nombre).join(', ')}`,
          fecha: fechaPago.toISOString(),
          comprobantes: [],
          registradoPor: user.uid,
          registradoPorNombre: user.displayName || user.email || "Usuario",
          numeroComprobante: numeroVoucher,
          observaciones: `Voucher: ${numeroVoucher}\nComprobante adjunto`,
        });

        // Descargar voucher
        const url = URL.createObjectURL(voucherBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `voucher_${numeroVoucher}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("¡Inscripción completada! Descargando comprobante...");
      } else {
        toast.success("¡Inscripción realizada exitosamente!");
      }

      setMostrarPasarelaPago(false);
      onOpenChange(false);
      onInscripcionExitosa();
      
      // Resetear form
      setSesionesSeleccionadas([]);
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

  const precioTotal = calcularPrecioTotal();
  const hayPrecio = sesionesSeleccionadas.some(sesionId => {
    const sesion = evento.sesiones.find(s => s.id === sesionId);
    return sesion && sesion.precio > 0;
  });

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
                    {format(toZonedTime(new Date(evento.fechaInicio), "America/Lima"), "dd 'de' MMMM, yyyy", { locale: es })}
                    {evento.fechaFin && !evento.fechaFinIndefinida && (
                      <> - {format(toZonedTime(new Date(evento.fechaFin), "America/Lima"), "dd 'de' MMM", { locale: es })}</>
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
                              {format(toZonedTime(new Date(sesion.fecha), "America/Lima"), "dd/MM/yyyy", { locale: es })}
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

            {/* Selección de Sesiones */}
            <div className="space-y-3">
              <Label>Selecciona las sesiones *</Label>
              <div className="space-y-2">
                {evento.sesiones.map((sesion) => (
                  <div
                    key={sesion.id}
                    className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                      sesionesSeleccionadas.includes(sesion.id)
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => toggleSesion(sesion.id)}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={sesionesSeleccionadas.includes(sesion.id)}
                        onCheckedChange={() => toggleSesion(sesion.id)}
                        className="mt-0.5"
                      />
                        <div className="flex-1">
                          <p className="font-medium">{sesion.lugar}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(toZonedTime(new Date(sesion.fecha), "America/Lima"), "dd/MM/yyyy", { locale: es })}
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

            {hayPrecio && (
              <div className="bg-muted/50 p-4 rounded-lg">
                <div className="space-y-3">
                  <div className="font-medium mb-2">Resumen de costos:</div>
                  
                  {sesionesSeleccionadas.map(sesionId => {
                    const sesion = evento.sesiones.find(s => s.id === sesionId);
                    if (!sesion || sesion.precio === 0) return null;
                    
                    return (
                      <div key={sesionId} className="space-y-2 pb-2 border-b border-border last:border-0">
                        <div className="text-sm font-medium text-muted-foreground">
                          {sesion.lugar} - {format(new Date(sesion.fecha), "dd/MM", { locale: es })}
                        </div>
                        {personas.map((_, index) => (
                          <div key={index} className="flex items-center justify-between text-sm pl-3">
                            <span className="text-muted-foreground">Persona {index + 1}:</span>
                            <span className={index === 1 ? "text-success font-medium" : ""}>
                              S/ {(index === 1 ? sesion.precio * 0.5 : sesion.precio).toFixed(2)}
                              {index === 1 && " (50% desc.)"}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  
                  <Separator className="my-2" />
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-lg">Costo Total:</span>
                    <span className="text-2xl font-bold text-success">
                      S/ {precioTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
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
                sesionesSeleccionadas.length === 0 ||
                personas.some(p => !p.nombre.trim() || !p.dni.trim())
              }
              className="flex-1"
            >
              {loading ? "Inscribiendo..." : "Confirmar Inscripción"}
            </Button>
          </div>
        </div>
      </DialogContent>

      <PasarelaPagoModal
        open={mostrarPasarelaPago}
        onOpenChange={setMostrarPasarelaPago}
        montoTotal={precioTotal}
        onPagoConfirmado={procesarInscripcion}
      />
    </Dialog>
  );
};
