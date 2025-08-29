import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface RegistrarIngresoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface FormData {
  concepto: string;
  categoria: 'donacion' | 'evento' | 'alquiler' | 'otros';
  monto: number;
  fecha: Date;
  metodoPago?: 'efectivo' | 'transferencia' | 'yape' | 'plin';
  numeroOperacion?: string;
}

export const RegistrarIngresoModal = ({ open, onOpenChange, onSuccess }: RegistrarIngresoModalProps) => {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      fecha: new Date()
    }
  });
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);

  const metodoPago = watch('metodoPago');
  const fecha = watch('fecha');

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);
      
      // Simular subida de archivo
      let archivoUrl = '';
      if (archivoComprobante) {
        archivoUrl = `ingresos/${Date.now()}_${archivoComprobante.name}`;
      }

      // Aquí iría la lógica para guardar en Firebase RTDB
      const nuevoIngreso = {
        id: `ingreso_${Date.now()}`,
        concepto: data.concepto,
        categoria: data.categoria,
        monto: data.monto,
        fecha: data.fecha.toLocaleDateString('es-PE'),
        metodoPago: data.metodoPago || null,
        numeroOperacion: data.numeroOperacion || null,
        archivoUrl: archivoUrl || null,
        registradoPor: 'current-user-id', // En un sistema real usarías el ID del usuario actual
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      console.log('Registrando ingreso:', nuevoIngreso);

      toast({
        title: "Ingreso registrado",
        description: `Se registró el ingreso por S/ ${data.monto.toFixed(2)}`
      });

      onSuccess();
      onOpenChange(false);
      reset();
      setArchivoComprobante(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el ingreso",
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
            <DollarSign className="h-5 w-5" />
            Registrar Ingreso
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto</Label>
            <Input
              id="concepto"
              {...register('concepto', { required: 'El concepto es requerido' })}
              placeholder="Ej: Donación para cancha, Evento navideño, etc."
            />
            {errors.concepto && (
              <p className="text-sm text-destructive">{errors.concepto.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select onValueChange={(value) => setValue('categoria', value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="donacion">Donación</SelectItem>
                <SelectItem value="evento">Evento</SelectItem>
                <SelectItem value="alquiler">Alquiler</SelectItem>
                <SelectItem value="otros">Otros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto">Monto (S/)</Label>
            <Input
              id="monto"
              type="number"
              step="0.01"
              min="0"
              {...register('monto', { 
                required: 'El monto es requerido',
                valueAsNumber: true,
                min: { value: 0.01, message: 'El monto debe ser mayor a 0' }
              })}
              placeholder="0.00"
            />
            {errors.monto && (
              <p className="text-sm text-destructive">{errors.monto.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Fecha</Label>
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
                  {fecha ? format(fecha, "dd/MM/yyyy") : <span>Seleccionar fecha</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fecha}
                  onSelect={(date) => date && setValue('fecha', date)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metodoPago">Método de Pago (Opcional)</Label>
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
            <Label htmlFor="comprobante">Comprobante (Opcional)</Label>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Registrar Ingreso"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};