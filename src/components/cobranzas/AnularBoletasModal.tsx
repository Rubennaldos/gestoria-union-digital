import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Ban, 
  Loader2, 
  Calendar,
  CheckCircle2
} from "lucide-react";
import { ChargeV2 } from "@/types/cobranzas-v2";

interface AnularBoletasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chargesSeleccionados: ChargeV2[];
  onAnulacionConfirmada: (motivoAnulacion: string) => Promise<void>;
}

const MOTIVOS_SUGERIDOS = [
  "Empadronado ingresó a partir de una fecha posterior",
  "Error en la generación del cargo",
  "Acuerdo especial con la directiva",
  "Cargo duplicado",
  "Exoneración aprobada por asamblea",
  "Otro (especificar abajo)"
];

export function AnularBoletasModal({
  open,
  onOpenChange,
  chargesSeleccionados,
  onAnulacionConfirmada
}: AnularBoletasModalProps) {
  const [motivoSeleccionado, setMotivoSeleccionado] = useState<string>("");
  const [motivoPersonalizado, setMotivoPersonalizado] = useState("");
  const [loading, setLoading] = useState(false);
  const [exito, setExito] = useState(false);

  const handleConfirmarAnulacion = async () => {
    const motivoFinal = motivoSeleccionado === "Otro (especificar abajo)" 
      ? motivoPersonalizado 
      : motivoSeleccionado;
    
    if (!motivoFinal.trim()) return;

    try {
      setLoading(true);
      await onAnulacionConfirmada(motivoFinal);
      setExito(true);
      
      setTimeout(() => {
        onOpenChange(false);
        setExito(false);
        setMotivoSeleccionado("");
        setMotivoPersonalizado("");
      }, 2000);
    } catch (error) {
      console.error("Error anulando boletas:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPeriodo = (periodo: string) => {
    const year = periodo.substring(0, 4);
    const month = parseInt(periodo.substring(4, 6));
    return new Date(parseInt(year), month - 1).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric'
    });
  };

  const totalMontoAnular = chargesSeleccionados.reduce((sum, c) => sum + c.saldo, 0);
  const puedeConfirmar = (motivoSeleccionado && motivoSeleccionado !== "Otro (especificar abajo)") || 
    (motivoSeleccionado === "Otro (especificar abajo)" && motivoPersonalizado.trim().length >= 10);

  if (exito) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center animate-scale-in">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-700">¡Boletas Anuladas!</h3>
            <p className="text-sm text-muted-foreground text-center">
              Se anularon {chargesSeleccionados.length} boleta(s) correctamente
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Ban className="h-5 w-5" />
            Anular Boletas
          </DialogTitle>
          <DialogDescription>
            Esta acción anulará las boletas seleccionadas y no se podrá deshacer.
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de boletas a anular */}
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="font-semibold text-destructive">
                {chargesSeleccionados.length} boleta(s) a anular
              </span>
            </div>
            
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {chargesSeleccionados.map(charge => (
                <div key={charge.id} className="flex items-center justify-between p-2 bg-background rounded border">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-sm capitalize">{formatPeriodo(charge.periodo)}</span>
                  </div>
                  <Badge variant="outline" className="text-destructive">
                    S/ {charge.saldo.toFixed(2)}
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="mt-3 pt-3 border-t flex justify-between items-center">
              <span className="text-sm font-medium">Total a anular:</span>
              <span className="text-lg font-bold text-destructive">
                S/ {totalMontoAnular.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Selector de motivo */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">
            Motivo de anulación <span className="text-destructive">*</span>
          </Label>
          
          <div className="grid gap-2">
            {MOTIVOS_SUGERIDOS.map((motivo) => (
              <Button
                key={motivo}
                type="button"
                variant={motivoSeleccionado === motivo ? "default" : "outline"}
                className={`justify-start h-auto py-2 px-3 text-left whitespace-normal ${
                  motivoSeleccionado === motivo 
                    ? "bg-primary text-primary-foreground" 
                    : "hover:bg-muted"
                }`}
                onClick={() => setMotivoSeleccionado(motivo)}
              >
                {motivo}
              </Button>
            ))}
          </div>

          {/* Campo de texto para motivo personalizado */}
          {motivoSeleccionado === "Otro (especificar abajo)" && (
            <div className="space-y-2 animate-fade-in">
              <Textarea
                placeholder="Describe el motivo de la anulación (mínimo 10 caracteres)..."
                value={motivoPersonalizado}
                onChange={(e) => setMotivoPersonalizado(e.target.value)}
                className="min-h-[80px]"
              />
              <p className="text-xs text-muted-foreground">
                {motivoPersonalizado.length}/10 caracteres mínimo
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirmarAnulacion}
            disabled={!puedeConfirmar || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Anulando...
              </>
            ) : (
              <>
                <Ban className="h-4 w-4 mr-2" />
                Confirmar Anulación
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
