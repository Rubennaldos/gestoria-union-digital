// src/components/eventos/DetalleEventoModal.tsx
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { ref, update } from "firebase/database";
import { db } from "@/config/firebase";
// ✅ guardaremos el PDF generado por inscripción
import { saveVoucherPdf } from "@/services/recibos";

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
    if (personas.length < 10) setPersonas([...personas, { nombre: "", dni: "" }]);
  };
  const eliminarPersona = (index: number) => {
    if (personas.length > 1) setPersonas(personas.filter((_, i) => i !== index));
  };
  const actualizarPersona = (index: number, campo: "nombre" | "dni", valor: string) => {
    const nuevas = [...personas];
    nuevas[index][campo] = valor;
    setPersonas(nuevas);
  };
  const toggleSesion = (sesionId: string) => {
    setSesionesSeleccionadas(prev => prev.includes(sesionId) ? prev.filter(id => id !== sesionId) : [...prev, sesionId]);
  };

  const calcularPrecioTotal = () => {
    if (sesionesSeleccionadas.length === 0) return 0;
    let total = 0;
    sesionesSeleccionadas.forEach(sesionId => {
      const sesion = evento.sesiones.find(s => s.id === sesionId);
      if (!sesion) return;
      const precio = sesion.precio;
      total += precio; // 1ra persona
      if (personas.length > 1) total += precio * 0.5; // 2da persona 50%
      if (personas.length > 2) total += precio * (personas.length - 2); // resto
    });
    return total;
  };

  const handleInscripcion = () => {
    if (!user) return toast.error("Debes iniciar sesión para inscribirte");
    if (sesionesSeleccionadas.length === 0) return toast.error("Debes seleccionar al menos una sesión");
    const incompletas = personas.some(p => !p.nombre.trim() || !p.dni.trim());
    if (incompletas) return toast.error("Completa el nombre y DNI de todas las personas");
    if (precioTotal > 0) setMostrarPasarelaPago(true);
    else procesarInscripcion(new Date(), null, "");
  };

  const procesarInscripcion = async (fechaPago: Date, archivoComprobante: File | null, nombreBanco?: string) => {
    if (!user) return;
    try {
      setLoading(true);

      const sesionesInfo = sesionesSeleccionadas.map(sid => {
        const s = evento.sesiones.find(x => x.id === sid);
        if (!s) return "";
        return `${s.lugar} - ${format(new Date(s.fecha), "dd/MM/yyyy", { locale: es })} (${s.horaInicio} - ${s.horaFin})`;
      }).filter(Boolean).join("\n");

      const empadronadoId = profile?.empadronadoId || user.uid;
      const nombreEmpadronado = user.displayName || user.email || "Usuario";
      const numeroPadron = profile?.empadronadoId || "";

      // 1) crear inscripciones (una por persona)
      const inscripcionIds: string[] = [];
      for (const persona of personas) {
        const id = await inscribirseEvento(
          evento.id,
          empadronadoId,
          persona.nombre,
          0,
          `DNI: ${persona.dni}\n${observaciones}\n\nSESIONES SELECCIONADAS:\n${sesionesInfo}`
        );
        inscripcionIds.push(id);
      }

      // 2) si hay pago: actualizar inscripciones, generar voucher y guardar en RTDB
      if (precioTotal > 0 && archivoComprobante) {
        const comprobanteBase64 = await archivoABase64(archivoComprobante);

        const sesionesData = sesionesSeleccionadas.map(sid => {
          const s = evento.sesiones.find(x => x.id === sid);
          return s ? { lugar: s.lugar, fecha: s.fecha, horaInicio: s.horaInicio, horaFin: s.horaFin, precio: s.precio } : null;
        }).filter(Boolean) as any[];

        const numeroVoucher = `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const montoPorPersona = precioTotal / personas.length;

        // Actualizar cada inscripción
        for (let i = 0; i < inscripcionIds.length; i++) {
          const inscripcionRef = ref(db, `inscripcionesEventos/${inscripcionIds[i]}`);
          await update(inscripcionRef, {
            pagoRealizado: true,
            montoPagado: montoPorPersona,
            fechaPago: fechaPago.getTime(),
            estado: "confirmado",
            dni: personas[i].dni,
            observaciones: JSON.stringify({
              observaciones,
              persona: personas[i],
              sesiones: sesionesData,
              medioPago: "transferencia",
              numeroOperacion: "Pendiente de verificación",
              voucherCode: numeroVoucher,
              correo: user.email,
              grupoInscripcion: numeroVoucher,
            }),
          });
        }

        // Generar y guardar voucher (un mismo PDF para todas las inscripciones del grupo)
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

        await Promise.all(
          inscripcionIds.map((id) =>
            saveVoucherPdf(id, voucherBlob, `Comprobante-${id}.pdf`, {
              numeroVoucher,
              eventoId: evento.id,
              empadronadoId,
            })
          )
        );

        // Registrar en finanzas (uno por persona)
        for (const persona of personas) {
          await crearMovimientoFinanciero(
            {
              tipo: "ingreso",
              categoria: "evento",
              monto: montoPorPersona,
              descripcion: `Inscripción: ${evento.titulo} - ${persona.nombre}`,
              fecha: fechaPago.toISOString(),
              comprobantes: [],
              registradoPor: user.uid,
              registradoPorNombre: user.displayName || user.email || "Usuario",
              numeroComprobante: numeroVoucher,
              observaciones: JSON.stringify({
                eventoTitulo: evento.titulo,
                eventoCategoria: getCategoriaLabel(evento.categoria),
                nombreAsociado: nombreEmpadronado,
                numeroPadron,
                banco: nombreBanco || "",
                persona,
                sesiones: sesionesData,
                voucherCode: numeroVoucher,
                fechaRegistro: fechaPago.getTime(),
                correo: user.email,
                comprobanteBase64,
                grupoInscripcion: numeroVoucher,
              }),
            },
            [archivoComprobante]
          );
        }

        // Descargar voucher al usuario
        const url = URL.createObjectURL(voucherBlob);
        const a = document.createElement("a");
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

      // reset
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
  const hayPrecio = sesionesSeleccionadas.some(sid => {
    const s = evento.sesiones.find(x => x.id === sid);
    return s && s.precio > 0;
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
            <img src={evento.imagen} alt={evento.titulo} className="w-full h-64 object-cover" />
          </div>
        )}

        <div className="space-y-4">
          {/* Info del evento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {format(toZonedTime(new Date(evento.fechaInicio), "America/Lima"), "dd 'de' MMMM, yyyy", { locale: es })}
                    {evento.fechaFin && !evento.fechaFinIndefinida && <> - {format(toZonedTime(new Date(evento.fechaFin), "America/Lima"), "dd 'de' MMM", { locale: es })}</>}
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
                    {evento.cuposIlimitados ? "Ilimitados" : `${evento.cuposDisponibles} disponibles`}
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

          {/* Sesiones */}
          {evento.sesiones && evento.sesiones.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Sesiones Programadas</h3>
                <div className="space-y-2">
                  {evento.sesiones.map((sesion) => (
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
                                <DollarSign className="h-3 w-3" /> S/ {sesion.precio.toFixed(2)}
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

          {/* Selección de sesiones */}
          <div>
            <h3 className="font-semibold mb-3">Selecciona las sesiones a las que deseas inscribirte</h3>
            <div className="space-y-2">
              {evento.sesiones.map((sesion) => (
                <div key={sesion.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={sesionesSeleccionadas.includes(sesion.id)}
                    onCheckedChange={() => toggleSesion(sesion.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{sesion.lugar}</p>
                    </div>
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
                          <DollarSign className="h-3 w-3" /> S/ {sesion.precio.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Personas a inscribir */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Personas a inscribir</h3>
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
            <div className="space-y-3">
              {personas.map((persona, index) => (
                <Card key={index}>
                  <CardContent className="pt-4">
                    <div className="flex gap-3">
                      <div className="flex-1 space-y-3">
                        <div>
                          <Label htmlFor={`nombre-${index}`}>Nombre completo</Label>
                          <Input
                            id={`nombre-${index}`}
                            value={persona.nombre}
                            onChange={(e) => actualizarPersona(index, "nombre", e.target.value)}
                            placeholder="Ingresa el nombre completo"
                          />
                        </div>
                        <div>
                          <Label htmlFor={`dni-${index}`}>DNI</Label>
                          <Input
                            id={`dni-${index}`}
                            value={persona.dni}
                            onChange={(e) => actualizarPersona(index, "dni", e.target.value)}
                            placeholder="Ingresa el DNI"
                            maxLength={8}
                          />
                        </div>
                      </div>
                      {personas.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => eliminarPersona(index)}
                          className="mt-6"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {hayPrecio && personas.length > 1 && (
              <p className="text-sm text-muted-foreground mt-2">
                💡 La segunda persona tiene 50% de descuento. A partir de la tercera, precio normal.
              </p>
            )}
          </div>

          {/* Observaciones */}
          <div>
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Agrega cualquier comentario o solicitud especial..."
              rows={3}
            />
          </div>

          {/* Resumen de precio */}
          {precioTotal > 0 && (
            <Card className="bg-success/5 border-success/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total a pagar</p>
                    <p className="text-2xl font-bold text-success">S/ {precioTotal.toFixed(2)}</p>
                  </div>
                  <Tag className="h-8 w-8 text-success" />
                </div>
              </CardContent>
            </Card>
          )}

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
