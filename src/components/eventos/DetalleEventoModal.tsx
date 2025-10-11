import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, MapPin, User, Users, DollarSign, FileText, Package, Tag } from "lucide-react";
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
  const [codigoPromocion, setCodigoPromocion] = useState("");
  const [loading, setLoading] = useState(false);

  const handleInscripcion = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para inscribirte");
      return;
    }

    // Validar código de promoción si existe
    if (evento.promocion?.activa && codigoPromocion) {
      if (codigoPromocion.toUpperCase() !== evento.promocion.codigo) {
        toast.error("Código de promoción inválido");
        return;
      }
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
      setCodigoPromocion("");
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
  
  // Calcular precio aplicable según tipo de promoción
  const calcularPrecioConPromocion = () => {
    if (!evento.promocion?.activa) return evento.precio;
    
    const promo = evento.promocion;
    
    // Verificar condiciones específicas
    if (promo.tipo === 'codigo') {
      if (!codigoPromocion.trim()) {
        return evento.precio; // No hay código ingresado
      }
      if (codigoPromocion.trim().toUpperCase() !== promo.codigo?.toUpperCase()) {
        return evento.precio; // Código incorrecto
      }
    }
    
    if (promo.tipo === 'acompanantes') {
      if (promo.minimoAcompanantes && acompanantes < promo.minimoAcompanantes) {
        return evento.precio;
      }
      if (promo.maximoAcompanantes && acompanantes > promo.maximoAcompanantes) {
        return evento.precio;
      }
    }
    
    if (promo.tipo === 'early_bird' && promo.fechaVencimiento) {
      if (Date.now() > promo.fechaVencimiento) {
        return evento.precio;
      }
    }
    
    // Aplicar descuento por escalones de precio
    if (promo.tipoDescuento === 'escalonado' && promo.escalones && promo.escalones.length > 0) {
      // Buscar el escalón que coincida con la cantidad de personas
      const escalonAplicable = promo.escalones.find(e => e.cantidadPersonas === totalPersonas);
      if (escalonAplicable) {
        return escalonAplicable.precioPorPersona;
      }
      // Si no hay escalón exacto, buscar el más cercano menor
      const escalonesOrdenados = [...promo.escalones].sort((a, b) => b.cantidadPersonas - a.cantidadPersonas);
      const escalonMenor = escalonesOrdenados.find(e => e.cantidadPersonas <= totalPersonas);
      if (escalonMenor) {
        return escalonMenor.precioPorPersona;
      }
    }
    
    // Aplicar precio final fijo
    if (promo.precioFinal !== undefined) {
      return promo.precioFinal;
    }
    
    // Aplicar descuento porcentual
    if (promo.tipoDescuento === 'porcentaje' && promo.montoDescuento) {
      return evento.precio * (1 - promo.montoDescuento / 100);
    }
    
    return evento.precio;
  };
  
  const precioAplicar = calcularPrecioConPromocion();
  const costoTotal = precioAplicar * totalPersonas;
  const tieneDescuento = precioAplicar < evento.precio;
  
  // Validar código de promoción específicamente
  const codigoEsValido = evento.promocion?.activa && 
    evento.promocion.tipo === 'codigo' && 
    codigoPromocion.trim() && 
    codigoPromocion.trim().toUpperCase() === evento.promocion.codigo?.toUpperCase();

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

            <div className="space-y-2">
              <Label htmlFor="acompanantes">Número de acompañantes</Label>
              <Input
                id="acompanantes"
                type="number"
                min="0"
                max={!evento.cuposIlimitados && evento.cuposDisponibles ? evento.cuposDisponibles - 1 : 999}
                value={acompanantes}
                onChange={(e) => setAcompanantes(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Total de personas: {totalPersonas}
              </p>
            </div>

            {evento.promocion?.activa && evento.promocion.tipo === 'codigo' && (
              <div className="space-y-2">
                <Label htmlFor="codigoPromocion" className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Código de Promoción (opcional)
                </Label>
                <Input
                  id="codigoPromocion"
                  value={codigoPromocion}
                  onChange={(e) => setCodigoPromocion(e.target.value.toUpperCase())}
                  placeholder="Ingresa tu código"
                />
                {codigoPromocion.trim() && (
                  codigoEsValido ? (
                    <p className="text-xs text-success flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      ✓ Código válido - Descuento aplicado
                    </p>
                  ) : (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      Código inválido
                    </p>
                  )
                )}
                {evento.promocion.nombre && (
                  <p className="text-xs text-muted-foreground">
                    {evento.promocion.nombre}
                  </p>
                )}
              </div>
            )}

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
                <div className="space-y-2">
                  {tieneDescuento && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Precio regular:</span>
                      <span className="line-through text-muted-foreground">
                        S/ {(evento.precio * totalPersonas).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Costo Total:</span>
                    <span className="text-xl font-bold text-success">
                      S/ {costoTotal.toFixed(2)}
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
                (!evento.cuposIlimitados &&
                  evento.cuposDisponibles !== undefined &&
                  evento.cuposDisponibles < totalPersonas)
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
