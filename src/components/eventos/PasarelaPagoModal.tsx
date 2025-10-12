import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarIcon, Upload, Building2, Smartphone } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PasarelaPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  montoTotal: number;
  onPagoConfirmado: (fechaPago: Date, archivoComprobante: File) => void;
}

const BANCOS_PERUANOS = [
  { nombre: "BCP", cuentas: ["191-12345678-0-00"] },
  { nombre: "Interbank", cuentas: ["200-12345678"] },
  { nombre: "BBVA", cuentas: ["0011-0123-0112345678"] },
  { nombre: "Scotiabank", cuentas: ["000-1234567"] },
];

const BILLETERAS_DIGITALES = [
  { nombre: "Yape", numero: "987654321" },
  { nombre: "Plin", numero: "987654321" },
];

export const PasarelaPagoModal = ({
  open,
  onOpenChange,
  montoTotal,
  onPagoConfirmado,
}: PasarelaPagoModalProps) => {
  const [fechaPago, setFechaPago] = useState<Date>();
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

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

  const handleConfirmarPago = () => {
    if (!fechaPago) {
      toast.error("Debes seleccionar la fecha de pago");
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
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Cuentas Bancarias</h3>
            </div>
            <div className="space-y-3">
              {BANCOS_PERUANOS.map((banco) => (
                <Card key={banco.nombre} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{banco.nombre}</p>
                        {banco.cuentas.map((cuenta, idx) => (
                          <p key={idx} className="text-sm text-muted-foreground font-mono">
                            {cuenta}
                          </p>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(banco.cuentas[0]);
                          toast.success("Número de cuenta copiado");
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Billeteras Digitales */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Billeteras Digitales</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {BILLETERAS_DIGITALES.map((billetera) => (
                <Card key={billetera.nombre} className="hover:border-primary/50 transition-colors">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="font-semibold mb-1">{billetera.nombre}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {billetera.numero}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 w-full"
                        onClick={() => {
                          navigator.clipboard.writeText(billetera.numero);
                          toast.success("Número copiado");
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

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
              disabled={loading || !fechaPago || !archivoComprobante}
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
