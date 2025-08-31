import { useEffect, useState } from "react";
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
import { useAuth } from "@/contexts/AuthContext";

interface RegistrarPagoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pago?: Pago;
  onSuccess: () => void;
}

type Metodo = "efectivo" | "transferencia" | "yape" | "plin";

interface FormData {
  metodoPago: Metodo;
  numeroOperacion?: string;
  observaciones?: string;
}

export const RegistrarPagoModal = ({
  open,
  onOpenChange,
  pago,
  onSuccess
}: RegistrarPagoModalProps) => {
  const { register, handleSubmit, setValue, watch, reset, formState: { isSubmitting } } = useForm<FormData>({
    defaultValues: { metodoPago: "efectivo" }
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);

  const metodoPago = watch("metodoPago");

  // Prefill cuando se abre o cambia el pago
  useEffect(() => {
    if (!open) return;
    // valores por defecto al abrir
    setValue("metodoPago", (pago?.metodoPago as Metodo) || "efectivo");
    setValue("numeroOperacion", pago?.numeroOperacion || "");
    setValue("observaciones", "");
    setArchivoComprobante(null);
  }, [open, pago, setValue]);

  const close = () => {
    onOpenChange(false);
    reset({ metodoPago: "efectivo", numeroOperacion: "", observaciones: "" });
    setArchivoComprobante(null);
  };

  const onSubmit = async (data: FormData) => {
    if (!pago) return;
    if (!data.metodoPago) {
      toast({ title: "Falta método de pago", description: "Selecciona un método de pago.", variant: "destructive" });
      return;
    }

    try {
      // Opcional: subir a Firebase Storage aquí y obtener URL pública
      // const urlComprobante = await uploadFileAndGetURL(archivoComprobante)
      let urlComprobante = "";
      if (archivoComprobante) {
        // Simulación (si aún no usas Storage)
        urlComprobante = `comprobantes/${Date.now()}_${archivoComprobante.name}`;
      }

      await actualizarPago(
        pago.id,
        {
          estado: "pagado",
          fechaPago: new Date().toLocaleDateString("es-PE"),
          metodoPago: data.metodoPago,
          numeroOperacion: data.numeroOperacion || null,
          comprobantePago: urlComprobante || null,
          observaciones: data.observaciones || undefined
        },
        user?.uid || "system"
      );

      toast({ title: "Pago registrado", description: "El pago se ha registrado correctamente." });
      onSuccess();
      close();
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo registrar el pago.", variant: "destructive" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
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
                Periodo: {pago.mes}/{pago.año} — Monto: S/ {Number(pago.monto || 0).toFixed(2)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Método de Pago</Label>
            <Select
              value={metodoPago}
              onValueChange={(value) => setValue("metodoPago", value as Metodo, { shouldDirty: true })}
            >
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

          {metodoPago && metodoPago !== "efectivo" && (
            <div className="space-y-2">
              <Label htmlFor="numeroOperacion">Número de Operación</Label>
              <Input
                id="numeroOperacion"
                placeholder="Ingrese número de operación"
                {...register("numeroOperacion")}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="comprobante">Comprobante de Pago</Label>
            <div className="flex items-center gap-2">
              <Input
                id="comprobante"
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setArchivoComprobante(e.target.files?.[0] || null)}
                className="flex-1"
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setArchivoComprobante(null)}>
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {archivoComprobante && (
              <p className="text-xs text-muted-foreground">Archivo: {archivoComprobante.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              rows={3}
              placeholder="Observaciones adicionales (opcional)"
              {...register("observaciones")}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Guardando..." : "Registrar Pago"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
