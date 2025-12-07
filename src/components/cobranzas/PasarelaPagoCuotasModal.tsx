import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, Upload, Building2, Smartphone, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { obtenerMediosPago } from "@/services/medios-pago";
import { CuentaBancaria, BilleteraDigital } from "@/types/medios-pago";
import { ChargeV2 } from "@/types/cobranzas-v2";

interface PasarelaPagoCuotasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargesSeleccionados: ChargeV2[];
  montoTotal: number;
  onPagoConfirmado: (
    fechaPago: Date,
    archivoComprobante: File,
    metodoPago: string,
    numeroOperacion: string,
    observaciones: string
  ) => Promise<void>;
}

type MedioPago = {
  tipo: 'banco' | 'billetera';
  nombre: string;
  cuenta: string;
};

export const PasarelaPagoCuotasModal = ({
  open,
  onOpenChange,
  chargesSeleccionados,
  montoTotal,
  onPagoConfirmado,
}: PasarelaPagoCuotasModalProps) => {
  const [fechaPago, setFechaPago] = useState<Date>(new Date());
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [medioSeleccionado, setMedioSeleccionado] = useState<MedioPago | null>(null);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [pagoEnviado, setPagoEnviado] = useState(false);
  
  // Cargar medios de pago configurados
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [billeterasDigitales, setBilleterasDigitales] = useState<BilleteraDigital[]>([]);
  const [loadingMedios, setLoadingMedios] = useState(false);

  useEffect(() => {
    if (open) {
      cargarMediosPago();
      // Reset states
      setFechaPago(new Date());
      setArchivoComprobante(null);
      setMedioSeleccionado(null);
      setNumeroOperacion("");
      setObservaciones("");
      setPagoEnviado(false);
      setLoading(false);
    }
  }, [open]);

  const cargarMediosPago = async () => {
    setLoadingMedios(true);
    try {
      const configuracion = await obtenerMediosPago();
      setCuentasBancarias(configuracion?.cuentasBancarias?.filter(c => c.activo) || []);
      setBilleterasDigitales(configuracion?.billeterasDigitales?.filter(b => b.activo) || []);
    } catch (error) {
      console.error("Error al cargar medios de pago:", error);
      toast.error("Error al cargar medios de pago");
    } finally {
      setLoadingMedios(false);
    }
  };

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
      if (!tiposPermitidos.includes(file.type)) {
        toast.error("Solo se permiten archivos PNG, JPG o PDF");
        return;
      }
      
      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("El archivo no debe superar los 5MB");
        return;
      }
      
      setArchivoComprobante(file);
    }
  };

  const handleSeleccionarMedio = (medio: MedioPago) => {
    setMedioSeleccionado(medio);
  };

  const formatPeriodo = (periodo: string) => {
    const year = periodo.substring(0, 4);
    const month = parseInt(periodo.substring(4, 6));
    return new Date(parseInt(year), month - 1).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric'
    });
  };

  const handleConfirmarPago = async () => {
    if (!medioSeleccionado) {
      toast.error("Debes seleccionar un medio de pago");
      return;
    }

    if (!fechaPago) {
      toast.error("Debes seleccionar la fecha de pago");
      return;
    }

    if (!numeroOperacion.trim()) {
      toast.error("Debes ingresar el número de operación");
      return;
    }

    if (!archivoComprobante) {
      toast.error("Debes adjuntar el comprobante de pago");
      return;
    }

    setLoading(true);
    try {
      await onPagoConfirmado(
        fechaPago,
        archivoComprobante,
        medioSeleccionado.nombre.toLowerCase(),
        numeroOperacion,
        observaciones
      );
      setPagoEnviado(true);
      
      // Cerrar después de mostrar éxito
      setTimeout(() => {
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Error al confirmar pago:", error);
      toast.error("Error al procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  if (pagoEnviado) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <div className="py-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-xl font-semibold mb-2">
              ¡Pago enviado correctamente!
            </h3>
            <p className="text-muted-foreground">
              Tu pago será revisado y aprobado pronto. Puedes ver el estado en "Mis Pagos".
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Registrar Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Fecha de Pago */}
          <div className="space-y-2">
            <Label>Fecha de Pago *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !fechaPago && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {fechaPago ? (
                    format(fechaPago, "dd/MM/yyyy", { locale: es })
                  ) : (
                    <span>Selecciona la fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaPago}
                  onSelect={(date) => date && setFechaPago(date)}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Método de Pago - Selector */}
          <div className="space-y-3">
            <Label>Método de Pago *</Label>
            
            {loadingMedios ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {/* Cuentas Bancarias */}
                {cuentasBancarias.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Transferencia Bancaria</span>
                    </div>
                    <div className="space-y-2">
                      {cuentasBancarias.map((banco) => {
                        const isSelected = medioSeleccionado?.tipo === 'banco' && medioSeleccionado.nombre === banco.nombreBanco;
                        return (
                          <Card 
                            key={banco.id} 
                            className={cn(
                              "cursor-pointer transition-all hover:border-primary/50",
                              isSelected && "border-primary bg-primary/5"
                            )}
                            onClick={() => handleSeleccionarMedio({ tipo: 'banco', nombre: banco.nombreBanco, cuenta: banco.numeroCuenta })}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                  <div>
                                    <p className="font-medium text-sm">{banco.nombreBanco}</p>
                                    <p className="text-xs text-muted-foreground font-mono">
                                      {banco.numeroCuenta}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {banco.titular}
                                    </p>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs h-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(banco.numeroCuenta);
                                    toast.success("Número de cuenta copiado");
                                  }}
                                >
                                  Copiar
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Billeteras Digitales */}
                {billeterasDigitales.length > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Smartphone className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Billeteras Digitales</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {billeterasDigitales.map((billetera) => {
                        const isSelected = medioSeleccionado?.tipo === 'billetera' && medioSeleccionado.nombre === billetera.nombreBilletera;
                        return (
                          <Card 
                            key={billetera.id} 
                            className={cn(
                              "cursor-pointer transition-all hover:border-primary/50",
                              isSelected && "border-primary bg-primary/5"
                            )}
                            onClick={() => handleSeleccionarMedio({ tipo: 'billetera', nombre: billetera.nombreBilletera, cuenta: billetera.numeroTelefono })}
                          >
                            <CardContent className="p-3">
                              <div className="text-center relative">
                                {isSelected && (
                                  <CheckCircle2 className="h-4 w-4 text-primary absolute top-0 right-0" />
                                )}
                                <p className="font-medium text-sm">{billetera.nombreBilletera}</p>
                                <p className="text-xs text-muted-foreground font-mono">
                                  {billetera.numeroTelefono}
                                </p>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-1 w-full text-xs h-7"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(billetera.numeroTelefono);
                                    toast.success("Número copiado");
                                  }}
                                >
                                  Copiar
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Mensaje si no hay medios configurados */}
                {cuentasBancarias.length === 0 && billeterasDigitales.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-6 text-center">
                      <p className="text-muted-foreground text-sm">
                        No hay medios de pago configurados. Por favor, contacta al administrador.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>

          {/* Número de Operación */}
          <div className="space-y-2">
            <Label htmlFor="numeroOperacion">Número de Operación *</Label>
            <Input
              id="numeroOperacion"
              placeholder="Ingresa el número de operación"
              value={numeroOperacion}
              onChange={(e) => setNumeroOperacion(e.target.value)}
            />
          </div>

          {/* Comprobante de Pago */}
          <div className="space-y-2">
            <Label>Comprobante de Pago * (PDF, JPG, PNG)</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer">
              <Input
                id="comprobante"
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={handleArchivoChange}
                className="hidden"
              />
              <label htmlFor="comprobante" className="cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                {archivoComprobante ? (
                  <div>
                    <p className="font-medium text-primary text-sm">{archivoComprobante.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(archivoComprobante.size / 1024).toFixed(0)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm font-medium">Seleccionar archivo</p>
                    <p className="text-xs text-muted-foreground">Sin archivos seleccionados</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones (opcional)</Label>
            <Textarea
              id="observaciones"
              placeholder="Notas adicionales"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="min-h-[60px]"
            />
          </div>

          {/* Resumen del Pago */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Resumen del Pago</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cuotas seleccionadas:</span>
                  <span>{chargesSeleccionados.length}</span>
                </div>
                {chargesSeleccionados.map((charge) => (
                  <div key={charge.id} className="flex justify-between text-xs text-muted-foreground pl-2">
                    <span className="capitalize">{formatPeriodo(charge.periodo)}</span>
                    <span>S/ {charge.saldo.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-base pt-2 border-t mt-2">
                  <span>Total a pagar:</span>
                  <span className="text-primary">S/ {montoTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Botones */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarPago}
              disabled={loading || !medioSeleccionado || !fechaPago || !archivoComprobante || !numeroOperacion.trim()}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Confirmar Pago"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
