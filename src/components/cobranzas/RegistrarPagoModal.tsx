import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { actualizarPago } from "@/services/cobranzas";
import { Pago } from "@/types/cobranzas";

interface RegistrarPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago?: Pago;
  onSuccess: () => void;
}

interface FormData {
  metodoPago: 'efectivo' | 'transferencia' | 'yape' | 'plin';
  numeroOperacion?: string;
  observaciones?: string;
}

export const RegistrarPagoModal = ({ open, onOpenChange, pago, onSuccess }: RegistrarPagoModalProps) => {
  const { register, handleSubmit, setValue, watch, reset } = useForm<FormData>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);

  const metodoPago = watch('metodoPago');

  const onSubmit = async (data: FormData) => {
    if (!pago) return;
    
    try {
      setLoading(true);
      
      // Simular subida de archivo (en un sistema real usarías Firebase Storage)
      let urlComprobante = '';
      if (archivoComprobante) {
        urlComprobante = `comprobantes/${Date.now()}_${archivoComprobante.name}`;
      }

      await actualizarPago(pago.id, {
        estado: 'pagado',
        fechaPago: new Date().toLocaleDateString('es-PE'),
        metodoPago: data.metodoPago,
        numeroOperacion: data.numeroOperacion,
        comprobantePago: urlComprobante,
        observaciones: data.observaciones
      }, 'current-user-id'); // En un sistema real usarías el ID del usuario actual

      toast({
        title: "Pago registrado",
        description: "El pago se ha registrado correctamente"
      });

      onSuccess();
      onOpenChange(false);
      reset();
      setArchivoComprobante(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Registrar Pago
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {pago && (
            <div className="p-3 bg-accent rounded-lg">
              <p className="text-sm font-medium">Padrón: {pago.numeroPadron}</p>
              <p className="text-sm text-muted-foreground">
                Periodo: {pago.mes}/{pago.año} - Monto: S/ {pago.monto.toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="metodoPago">Método de Pago</Label>
            <Select onValueChange={(value) => setValue('metodoPago', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar método" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="yape">Yape</SelectItem>
                <SelectItem value="plin">Plin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {metodoPago && metodoPago !== 'efectivo' && (
            <div className="space-y-2">
              <Label htmlFor="numeroOperacion">Número de Operación</Label>
              <Input
                id="numeroOperacion"
                {...register('numeroOperacion')}
                placeholder="Ingrese número de operación"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comprobante">Comprobante de Pago</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setArchivoComprobante(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {archivoComprobante && (
              <p className="text-xs text-muted-foreground">
                Archivo seleccionado: {archivoComprobante.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              {...register('observaciones')}
              placeholder="Observaciones adicionales (opcional)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Registrar Pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};