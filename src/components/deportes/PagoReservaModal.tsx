import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CreditCard, Upload, Receipt, MessageSquare, FileImage } from "lucide-react";
import { Reserva, FormPago, MetodoPago } from "@/types/deportes";
import { registrarPago, generarComprobanteReserva, generarEnlaceWhatsApp } from "@/services/deportes";
import { toast } from "@/hooks/use-toast";

interface PagoReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reserva: Reserva;
  onSuccess: () => void;
}

export const PagoReservaModal = ({
  open,
  onOpenChange,
  reserva,
  onSuccess
}: PagoReservaModalProps) => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormPago>({
    metodoPago: 'efectivo',
    numeroOperacion: '',
    esPrepago: false,
    montoPrepago: 0
  });
  const [voucher, setVoucher] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      await registrarPago(reserva.id, { ...form, voucher }, 'current-user'); // TODO: obtener usuario actual
      
      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado exitosamente"
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo registrar el pago",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validarFormulario = (): boolean => {
    if (!form.metodoPago) {
      toast({
        title: "Método de pago requerido",
        description: "Seleccione un método de pago",
        variant: "destructive"
      });
      return false;
    }

    if (form.metodoPago !== 'efectivo' && !form.numeroOperacion) {
      toast({
        title: "Número de operación requerido",
        description: "Ingrese el número de operación para pagos digitales",
        variant: "destructive"
      });
      return false;
    }

    if (form.metodoPago !== 'efectivo' && !voucher) {
      toast({
        title: "Voucher requerido",
        description: "Adjunte el comprobante de pago",
        variant: "destructive"
      });
      return false;
    }

    if (form.esPrepago && (!form.montoPrepago || form.montoPrepago <= 0)) {
      toast({
        title: "Monto de prepago inválido",
        description: "Ingrese un monto válido para el prepago",
        variant: "destructive"
      });
      return false;
    }

    if (form.esPrepago && form.montoPrepago! >= reserva.precio.total) {
      toast({
        title: "Monto de prepago inválido",
        description: "El prepago debe ser menor al total",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const handleVoucherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validar tipo de archivo
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de archivo no válido",
          description: "Solo se permiten imágenes (JPG, PNG, GIF) y PDFs",
          variant: "destructive"
        });
        return;
      }

      // Validar tamaño (máx 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Archivo muy grande",
          description: "El archivo no debe superar los 5MB",
          variant: "destructive"
        });
        return;
      }

      setVoucher(file);
    }
  };

  const handleGenerarComprobante = async () => {
    try {
      const comprobante = await generarComprobanteReserva(reserva.id);
      
      // Aquí se podría generar y descargar un PDF
      // Por ahora, mostraremos la información en consola
      console.log('Comprobante generado:', comprobante);
      
      toast({
        title: "Comprobante generado",
        description: "El comprobante se ha creado exitosamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el comprobante",
        variant: "destructive"
      });
    }
  };

  const handleEnviarWhatsApp = async () => {
    try {
      const comprobante = await generarComprobanteReserva(reserva.id);
      const enlace = generarEnlaceWhatsApp(reserva.telefono, comprobante);
      
      window.open(enlace, '_blank');
      
      toast({
        title: "WhatsApp abierto",
        description: "El mensaje se ha preparado en WhatsApp"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo generar el enlace de WhatsApp",
        variant: "destructive"
      });
    }
  };

  const montoAPagar = form.esPrepago ? form.montoPrepago! : reserva.precio.total;
  const saldoPendiente = form.esPrepago ? reserva.precio.total - form.montoPrepago! : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Registrar Pago - Reserva #{reserva.id.slice(-8).toUpperCase()}
          </DialogTitle>
          <DialogDescription>
            Complete los datos del pago para esta reserva
          </DialogDescription>
        </DialogHeader>

        {/* Información de la reserva */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalles de la Reserva</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Cliente</p>
                <p className="font-medium">{reserva.nombreCliente}</p>
                {reserva.esAportante && (
                  <Badge variant="secondary" className="mt-1">Aportante</Badge>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Teléfono</p>
                <p className="font-medium">{reserva.telefono}</p>
              </div>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Fecha y Hora</p>
                <p className="font-medium">
                  {new Date(reserva.fechaInicio).toLocaleDateString('es-PE')}
                </p>
                <p className="text-sm">
                  {new Date(reserva.fechaInicio).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })} - 
                  {new Date(reserva.fechaFin).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Duración</p>
                <p className="font-medium">{reserva.duracionHoras} hora(s)</p>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Precio base:</span>
                <span>S/{reserva.precio.base.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Costo de luz:</span>
                <span>S/{reserva.precio.luz.toFixed(2)}</span>
              </div>
              {reserva.precio.descuentoAportante > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Descuento aportante:</span>
                  <span>-S/{reserva.precio.descuentoAportante.toFixed(2)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>S/{reserva.precio.total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulario de pago */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Datos del Pago</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="metodoPago">Método de Pago *</Label>
                <Select 
                  value={form.metodoPago} 
                  onValueChange={(value: MetodoPago) => setForm(prev => ({ ...prev, metodoPago: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                    <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                    <SelectItem value="yape">📱 Yape</SelectItem>
                    <SelectItem value="plin">📱 Plin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.metodoPago !== 'efectivo' && (
                <>
                  <div>
                    <Label htmlFor="numeroOperacion">Número de Operación *</Label>
                    <Input
                      id="numeroOperacion"
                      value={form.numeroOperacion}
                      onChange={(e) => setForm(prev => ({ ...prev, numeroOperacion: e.target.value }))}
                      placeholder="Ingrese el número de operación"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="voucher">Comprobante de Pago *</Label>
                    <div className="mt-1">
                      <Input
                        id="voucher"
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleVoucherChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Formatos permitidos: JPG, PNG, GIF, PDF (máx. 5MB)
                      </p>
                    </div>
                    {voucher && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <FileImage className="h-4 w-4" />
                        <span>{voucher.name}</span>
                        <Badge variant="outline">
                          {(voucher.size / 1024 / 1024).toFixed(2)} MB
                        </Badge>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="esPrepago"
                  checked={form.esPrepago}
                  onCheckedChange={(checked) => setForm(prev => ({ ...prev, esPrepago: checked }))}
                />
                <Label htmlFor="esPrepago">Es un prepago (seña)</Label>
              </div>

              {form.esPrepago && (
                <div>
                  <Label htmlFor="montoPrepago">Monto del Prepago *</Label>
                  <Input
                    id="montoPrepago"
                    type="number"
                    step="0.01"
                    min="1"
                    max={reserva.precio.total - 1}
                    value={form.montoPrepago}
                    onChange={(e) => setForm(prev => ({ ...prev, montoPrepago: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
              )}

              {form.esPrepago && form.montoPrepago! > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="p-3">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Monto a pagar ahora:</p>
                        <p className="font-bold text-lg">S/{montoAPagar.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Saldo pendiente:</p>
                        <p className="font-bold text-lg text-orange-600">S/{saldoPendiente.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </form>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleGenerarComprobante}
              className="gap-2"
            >
              <Receipt className="h-4 w-4" />
              Generar Comprobante
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleEnviarWhatsApp}
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Enviar WhatsApp
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Registrando..." : "Registrar Pago"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};