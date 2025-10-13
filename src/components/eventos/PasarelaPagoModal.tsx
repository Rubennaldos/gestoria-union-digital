import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, Upload, Building2, Smartphone, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { obtenerMediosPago } from "@/services/medios-pago";
import { CuentaBancaria, BilleteraDigital } from "@/types/medios-pago";

interface PasarelaPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  montoTotal: number;
  onPagoConfirmado: (fechaPago: Date, archivoComprobante: File) => void;
}

type MedioPago = {
  tipo: 'banco' | 'billetera';
  nombre: string;
  cuenta: string;
};

export const PasarelaPagoModal = ({
  open,
  onOpenChange,
  montoTotal,
  onPagoConfirmado,
}: PasarelaPagoModalProps) => {
  const [fechaPago, setFechaPago] = useState<Date>();
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [medioSeleccionado, setMedioSeleccionado] = useState<MedioPago | null>(null);
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [sinNumeroOperacion, setSinNumeroOperacion] = useState(false);
  
  // Cargar medios de pago configurados
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [billeterasDigitales, setBilleterasDigitales] = useState<BilleteraDigital[]>([]);

  useEffect(() => {
    if (open) {
      cargarMediosPago();
    }
  }, [open]);

  const cargarMediosPago = async () => {
    try {
      const configuracion = await obtenerMediosPago();
      setCuentasBancarias(configuracion.cuentasBancarias.filter(c => c.activo) || []);
      setBilleterasDigitales(configuracion.billeterasDigitales.filter(b => b.activo) || []);
    } catch (error) {
      console.error("Error al cargar medios de pago:", error);
      toast.error("Error al cargar medios de pago");
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
      toast.success("Comprobante cargado correctamente");
    }
  };

  const handleSeleccionarMedio = (medio: MedioPago) => {
    setMedioSeleccionado(medio);
    setNumeroOperacion("");
    setSinNumeroOperacion(false);
  };

  const handleConfirmarPago = () => {
    if (!medioSeleccionado) {
      toast.error("Debes seleccionar un medio de pago");
      return;
    }

    if (!fechaPago) {
      toast.error("Debes seleccionar la fecha de pago");
      return;
    }

    if (!sinNumeroOperacion && !numeroOperacion.trim()) {
      toast.error("Debes ingresar el número de operación o marcar que no lo tienes");
      return;
    }

    if (!archivoComprobante) {
      toast.error("Debes adjuntar el comprobante de pago");
      return;
    }

    setLoading(true);
    onPagoConfirmado(fechaPago, archivoComprobante);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Realizar Pago</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Monto Total */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Monto a pagar</p>
                <p className="text-4xl font-bold text-primary">S/ {montoTotal.toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Cuentas Bancarias */}
          {cuentasBancarias.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Cuentas Bancarias</h3>
              </div>
              <div className="space-y-3">
                {cuentasBancarias.map((banco) => {
                  const isSelected = medioSeleccionado?.tipo === 'banco' && medioSeleccionado.nombre === banco.nombreBanco;
                  return (
                    <Card 
                      key={banco.id} 
                      className={cn(
                        "hover:border-primary/50 transition-all cursor-pointer",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleSeleccionarMedio({ tipo: 'banco', nombre: banco.nombreBanco, cuenta: banco.numeroCuenta })}
                    >
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                            <div>
                              <p className="font-semibold">{banco.nombreBanco}</p>
                              <p className="text-sm text-muted-foreground font-mono">
                                {banco.numeroCuenta}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
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
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Smartphone className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">Billeteras Digitales</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {billeterasDigitales.map((billetera) => {
                  const isSelected = medioSeleccionado?.tipo === 'billetera' && medioSeleccionado.nombre === billetera.nombreBilletera;
                  return (
                    <Card 
                      key={billetera.id} 
                      className={cn(
                        "hover:border-primary/50 transition-all cursor-pointer",
                        isSelected && "border-primary bg-primary/5"
                      )}
                      onClick={() => handleSeleccionarMedio({ tipo: 'billetera', nombre: billetera.nombreBilletera, cuenta: billetera.numeroTelefono })}
                    >
                      <CardContent className="pt-4">
                        <div className="text-center relative">
                          {isSelected && (
                            <CheckCircle2 className="h-5 w-5 text-primary absolute top-0 right-0" />
                          )}
                          <p className="font-semibold mb-1">{billetera.nombreBilletera}</p>
                          <p className="text-sm text-muted-foreground font-mono">
                            {billetera.numeroTelefono}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full"
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
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">
                  No hay medios de pago configurados. Por favor, contacta al administrador.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Información del medio seleccionado */}
          {medioSeleccionado && (
            <Card className="bg-primary/5 border-primary">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Medio de pago seleccionado</p>
                      <p className="font-semibold text-lg">{medioSeleccionado.nombre}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(medioSeleccionado.cuenta);
                        toast.success("Cuenta copiada");
                      }}
                    >
                      Copiar cuenta
                    </Button>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Cuenta depositada</p>
                    <p className="font-mono text-sm bg-background px-3 py-2 rounded border">
                      {medioSeleccionado.cuenta}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Número de Operación */}
          {medioSeleccionado && (
            <div className="space-y-3">
              <Label htmlFor="numeroOperacion">Número de operación</Label>
              <Input
                id="numeroOperacion"
                placeholder="Ingresa el número de operación"
                value={numeroOperacion}
                onChange={(e) => setNumeroOperacion(e.target.value)}
                disabled={sinNumeroOperacion}
              />
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="sinNumero"
                  checked={sinNumeroOperacion}
                  onCheckedChange={(checked) => {
                    setSinNumeroOperacion(checked as boolean);
                    if (checked) setNumeroOperacion("");
                  }}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="sinNumero"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    Soy consciente y acepto que mi comprobante no tenga número de operación para facilitar mi pago
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Fecha de Pago */}
          <div className="space-y-2">
            <Label>Fecha de pago *</Label>
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
                    format(fechaPago, "PPP", { locale: es })
                  ) : (
                    <span>Selecciona la fecha</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fechaPago}
                  onSelect={setFechaPago}
                  initialFocus
                  locale={es}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Adjuntar Comprobante */}
          <div className="space-y-2">
            <Label htmlFor="comprobante">Adjuntar comprobante de pago *</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <Input
                id="comprobante"
                type="file"
                accept="image/png,image/jpeg,image/jpg,application/pdf"
                onChange={handleArchivoChange}
                className="hidden"
              />
              <label htmlFor="comprobante" className="cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                {archivoComprobante ? (
                  <div>
                    <p className="font-medium text-primary">{archivoComprobante.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(archivoComprobante.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-medium">Haz clic para subir</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG o PDF (máx. 5MB)</p>
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-4">
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
              disabled={loading || !medioSeleccionado || !fechaPago || !archivoComprobante || (!sinNumeroOperacion && !numeroOperacion.trim())}
              className="flex-1"
            >
              {loading ? "Procesando..." : "Confirmar Pago"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
