import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Lightbulb, LightbulbOff, ArrowLeft } from "lucide-react";
import { format, addHours } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { calcularPrecio, crearReserva, registrarPago } from "@/services/deportes";
import { Cancha } from "@/types/deportes";
import { useAuth } from "@/contexts/AuthContext";
import { PasarelaPagoReservaModal } from "./PasarelaPagoReservaModal";
import { uploadFileAndGetURL } from "@/services/FileStorageService";
import { ref, set, get } from "firebase/database";
import { db } from "@/config/firebase";
import generarComprobanteReservaPDF from "@/lib/pdf/receiptReserva";

interface NuevaReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canchas: Cancha[];
  onSuccess: () => void;
}

export const NuevaReservaModal = ({ open, onOpenChange, canchas, onSuccess }: NuevaReservaModalProps) => {
  const { user, empadronado } = useAuth();
  
  // Estados para el flujo por pasos
  const [paso, setPaso] = useState<1 | 2 | 3>(1);
  const [deporte, setDeporte] = useState<'voley' | 'futbol' | null>(null);
  const [canchaSeleccionada, setCanchaSeleccionada] = useState<Cancha | null>(null);
  
  // Estados para el formulario
  const [fecha, setFecha] = useState<Date>();
  const [horaInicio, setHoraInicio] = useState("");
  const [duracion, setDuracion] = useState(1);
  const [conLuz, setConLuz] = useState(false);
  
  // Estados para datos del cliente
  const [nombreCliente, setNombreCliente] = useState("");
  const [dni, setDni] = useState("");
  const [telefono, setTelefono] = useState("");
  
  // Estados para pasarela de pago
  const [mostrarPasarela, setMostrarPasarela] = useState(false);
  const [precioCalculado, setPrecioCalculado] = useState({ base: 0, luz: 0, descuentoAportante: 0, total: 0 });
  
  const [loading, setLoading] = useState(false);

  // Pre-cargar datos del empadronado
  useEffect(() => {
    if (open && empadronado) {
      const nombreCompleto = `${empadronado.nombre} ${empadronado.apellidos}`.trim();
      setNombreCliente(nombreCompleto);
      setDni(empadronado.dni || "");
      const telefonoEmpadronado = empadronado.telefonos?.[0]?.numero || "";
      setTelefono(telefonoEmpadronado);
    }
  }, [open, empadronado]);

  // Resetear estados al cerrar
  useEffect(() => {
    if (!open) {
      setPaso(1);
      setDeporte(null);
      setCanchaSeleccionada(null);
      setFecha(undefined);
      setHoraInicio("");
      setDuracion(1);
      setConLuz(false);
    }
  }, [open]);

  // Filtrar canchas según deporte seleccionado
  const canchasFiltradas = canchas.filter(c => {
    if (deporte === 'voley') return c.tipo === 'voley';
    if (deporte === 'futbol') return c.tipo === 'futbol';
    return false;
  });

  // Calcular precio cuando cambian los parámetros
  useEffect(() => {
    if (canchaSeleccionada && duracion > 0) {
      const precio = calcularPrecio(canchaSeleccionada, duracion, !!empadronado);
      setPrecioCalculado(precio);
    }
  }, [canchaSeleccionada, duracion, conLuz, empadronado]);

  const handleContinuarPaso2 = () => {
    if (!canchaSeleccionada) {
      toast.error("Debes seleccionar una cancha");
      return;
    }
    setPaso(3);
  };

  const handleContinuarPaso3 = () => {
    if (!fecha) {
      toast.error("Debes seleccionar una fecha");
      return;
    }
    if (!horaInicio) {
      toast.error("Debes seleccionar una hora de inicio");
      return;
    }
    if (!nombreCliente || !telefono) {
      toast.error("Completa tus datos");
      return;
    }

    // Mostrar pasarela de pago
    setMostrarPasarela(true);
  };

  const handlePagoConfirmado = async (
    fechaPago: Date,
    archivoComprobante: File,
    nombreBanco: string,
    numeroOperacion: string
  ) => {
    if (!user || !canchaSeleccionada || !fecha) return;

    try {
      setLoading(true);

      // Subir comprobante primero
      const voucherUrl = await uploadFileAndGetURL(archivoComprobante, "comprobantes-reservas");

      // Calcular fechas
      const [hora, minuto] = horaInicio.split(":").map(Number);
      const fechaInicioISO = new Date(fecha);
      fechaInicioISO.setHours(hora, minuto, 0, 0);
      const fechaFinISO = addHours(fechaInicioISO, duracion);

      // Crear reserva directamente con estado "pagado"
      const reservaId = `reserva_${Date.now()}`;
      const reservaData = {
        id: reservaId,
        canchaId: canchaSeleccionada.id,
        empadronadoId: empadronado?.id,
        nombreCliente,
        dni: dni || undefined,
        telefono,
        fechaInicio: fechaInicioISO.toISOString(),
        fechaFin: fechaFinISO.toISOString(),
        duracionHoras: duracion,
        estado: "pagado",
        esAportante: !!empadronado,
        precio: precioCalculado,
        pago: {
          metodoPago: nombreBanco.includes("Yape") || nombreBanco.includes("Plin") ? "yape" : "transferencia",
          numeroOperacion,
          voucherUrl,
          fechaPago: fechaPago.toISOString(),
        },
        observaciones: conLuz ? "Con iluminación" : "Sin iluminación",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user.uid,
      };

      await set(ref(db, `deportes/reservas/${reservaId}`), reservaData);

      // Crear movimiento en finanzas
      const movimientoId = `mov_${Date.now()}`;
      const movimientoData = {
        id: movimientoId,
        tipo: 'ingreso',
        categoria: 'alquiler',
        monto: precioCalculado.total,
        descripcion: `Reserva ${canchaSeleccionada.nombre} - ${nombreCliente} (${canchaSeleccionada.tipo === 'futbol' ? 'Fútbol' : 'Vóley'})`,
        fecha: new Date().toISOString(),
        comprobantes: [],
        registradoPor: user.uid,
        registradoPorNombre: nombreCliente,
        numeroComprobante: numeroOperacion,
        observaciones: `Comprobante: ${voucherUrl}`,
        banco: nombreBanco,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await set(ref(db, `finanzas/movimientos/${movimientoId}`), movimientoData);

      // Vincular
      await set(ref(db, `deportes/reservas/${reservaId}/ingresoId`), movimientoId);

      // Generar correlativo
      const correlativoRef = ref(db, "correlativos/reservas");
      const correlativoSnap = await get(correlativoRef);
      const ultimoCorrelativo = correlativoSnap.exists() ? correlativoSnap.val() : 0;
      const nuevoCorrelativo = ultimoCorrelativo + 1;
      await set(correlativoRef, nuevoCorrelativo);

      const correlativoStr = `RES-${String(nuevoCorrelativo).padStart(6, "0")}`;

      // Generar PDF
      await generarComprobanteReservaPDF(
        {
          correlativo: correlativoStr,
          cancha: canchaSeleccionada.nombre,
          ubicacion: canchaSeleccionada.ubicacion === "boulevard" ? "Boulevard" : "Quinta Llana",
          fecha: format(fecha, "dd/MM/yyyy", { locale: es }),
          horaInicio,
          horaFin: format(fechaFinISO, "HH:mm"),
          duracion,
          conLuz,
          cliente: nombreCliente,
          dni: dni || undefined,
          telefono,
          montoPagado: precioCalculado.total,
          metodoPago: nombreBanco,
          numeroOperacion,
          fechaEmision: new Date(),
        },
        {
          receiptId: `receipt_${reservaId}`,
          reservaId,
          empadronadoId: empadronado?.id,
        }
      );

      toast.success("Reserva confirmada y comprobante generado");
      setMostrarPasarela(false);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error al procesar el pago:", error);
      toast.error(error.message || "Error al confirmar la reserva");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open && !mostrarPasarela} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {paso === 1 && "¿Qué quieres jugar?"}
              {paso === 2 && "Selecciona tu cancha"}
              {paso === 3 && "Completa tu reserva"}
            </DialogTitle>
          </DialogHeader>

          {/* PASO 1: Seleccionar Deporte */}
          {paso === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Selecciona el deporte que quieres practicar</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card
                  className="cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => {
                    setDeporte('voley');
                    setPaso(2);
                  }}
                >
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="text-5xl mb-4">🏐</div>
                    <h3 className="font-semibold text-xl mb-2">Voleibol</h3>
                    <p className="text-sm text-muted-foreground">
                      Canchas de voleibol disponibles
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className="cursor-pointer hover:border-primary hover:bg-primary/5 transition-all"
                  onClick={() => {
                    setDeporte('futbol');
                    setPaso(2);
                  }}
                >
                  <CardContent className="pt-8 pb-8 text-center">
                    <div className="text-5xl mb-4">⚽</div>
                    <h3 className="font-semibold text-xl mb-2">Fútbol</h3>
                    <p className="text-sm text-muted-foreground">
                      Canchas deportivas para fútbol
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* PASO 2: Seleccionar Cancha */}
          {paso === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Selecciona en qué cancha quieres jugar {deporte === 'voley' ? 'voleibol' : 'fútbol'}
                </p>
              </div>

              <div className="space-y-3">
                {canchasFiltradas.map((cancha) => (
                  <Card
                    key={cancha.id}
                    className={cn(
                      "cursor-pointer hover:border-primary transition-all",
                      canchaSeleccionada?.id === cancha.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => setCanchaSeleccionada(cancha)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {cancha.tipo === 'futbol' ? 'Cancha Deportiva' : 'Cancha de Voleibol'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {cancha.ubicacion === "boulevard" ? "Boulevard" : "Quinta Llana"}
                          </p>
                          <p className="text-sm font-medium text-primary mt-1">
                            S/ {cancha.configuracion.precioHora.toFixed(2)} por hora
                          </p>
                        </div>
                        {canchaSeleccionada?.id === cancha.id && (
                          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                            <span className="text-white text-xs">✓</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaso(1)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Atrás
                </Button>
                <Button
                  type="button"
                  onClick={handleContinuarPaso2}
                  className="flex-1"
                  disabled={!canchaSeleccionada}
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {/* PASO 3: Fecha, Hora y Luz */}
          {paso === 3 && canchaSeleccionada && (
            <div className="space-y-4">
              {/* Información de la cancha seleccionada */}
              <Card className="bg-primary/5">
                <CardContent className="pt-4">
                  <p className="text-sm text-muted-foreground">Cancha seleccionada</p>
                  <p className="font-semibold text-lg">
                    {canchaSeleccionada.tipo === 'futbol' ? 'Cancha Deportiva' : 'Cancha de Voleibol'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {canchaSeleccionada.ubicacion === "boulevard" ? "Boulevard" : "Quinta Llana"}
                  </p>
                </CardContent>
              </Card>

              {/* Fecha */}
              <div className="space-y-2">
                <Label>Fecha de reserva *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fecha && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fecha ? format(fecha, "PPP", { locale: es }) : <span>Selecciona la fecha</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fecha}
                      onSelect={setFecha}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      locale={es}
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Hora de inicio */}
              <div className="space-y-2">
                <Label htmlFor="horaInicio">Hora de inicio *</Label>
                <Input
                  id="horaInicio"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                  required
                />
              </div>

              {/* Duración */}
              <div className="space-y-2">
                <Label htmlFor="duracion">Duración (horas) *</Label>
                <Input
                  id="duracion"
                  type="number"
                  min="1"
                  max="4"
                  value={duracion}
                  onChange={(e) => setDuracion(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              {/* Con luz o sin luz */}
              <div className="space-y-3">
                <Label>¿Necesitas iluminación?</Label>
                <div className="grid grid-cols-2 gap-3">
                  <Card
                    className={cn(
                      "cursor-pointer hover:border-primary transition-all",
                      !conLuz && "border-primary bg-primary/5"
                    )}
                    onClick={() => setConLuz(false)}
                  >
                    <CardContent className="pt-4 text-center">
                      <LightbulbOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="font-medium">Sin luz</p>
                      <p className="text-xs text-muted-foreground mt-1">Horario diurno</p>
                    </CardContent>
                  </Card>

                  <Card
                    className={cn(
                      "cursor-pointer hover:border-primary transition-all",
                      conLuz && "border-primary bg-primary/5"
                    )}
                    onClick={() => setConLuz(true)}
                  >
                    <CardContent className="pt-4 text-center">
                      <Lightbulb className="h-8 w-8 mx-auto mb-2 text-primary" />
                      <p className="font-medium">Con luz</p>
                      <p className="text-xs text-muted-foreground mt-1">Horario nocturno</p>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Resumen de precio */}
              {precioCalculado.total > 0 && (
                <Card className="bg-primary/10 border-primary">
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Precio base:</span>
                        <span>S/ {precioCalculado.base.toFixed(2)}</span>
                      </div>
                      {conLuz && precioCalculado.luz > 0 && (
                        <div className="flex justify-between text-sm">
                          <span>Iluminación:</span>
                          <span>S/ {precioCalculado.luz.toFixed(2)}</span>
                        </div>
                      )}
                      {precioCalculado.descuentoAportante > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Descuento aportante:</span>
                          <span>-S/ {precioCalculado.descuentoAportante.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold text-lg pt-2 border-t">
                        <span>Total:</span>
                        <span className="text-primary">S/ {precioCalculado.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPaso(2)}
                  className="flex-1"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Atrás
                </Button>
                <Button
                  type="button"
                  onClick={handleContinuarPaso3}
                  className="flex-1"
                >
                  Continuar al pago
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Pasarela de Pago */}
      <PasarelaPagoReservaModal
        open={mostrarPasarela}
        onOpenChange={setMostrarPasarela}
        montoTotal={precioCalculado.total}
        detalleReserva={{
          cancha: canchaSeleccionada?.tipo === 'futbol' ? 'Cancha Deportiva' : 'Cancha de Voleibol',
          fecha: fecha ? format(fecha, "dd/MM/yyyy", { locale: es }) : "",
          horaInicio,
          horaFin: fecha && horaInicio ? format(addHours(new Date(fecha.setHours(parseInt(horaInicio.split(":")[0]), parseInt(horaInicio.split(":")[1]))), duracion), "HH:mm") : "",
          duracion,
          conLuz,
        }}
        onPagoConfirmado={handlePagoConfirmado}
      />
    </>
  );
};
