import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Upload, X } from "lucide-react";
import { crearMovimientoFinanciero } from "@/services/finanzas";

interface NuevoEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NuevoEventoModal({ open, onOpenChange, onSuccess }: NuevoEventoModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [ingresos, setIngresos] = useState("");
  const [egresos, setEgresos] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      // Validar tipos
      const tiposValidos = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      const archivosValidos = nuevosArchivos.filter(file => 
        tiposValidos.includes(file.type)
      );
      
      if (archivosValidos.length !== nuevosArchivos.length) {
        toast({
          title: "Archivos no válidos",
          description: "Solo se permiten archivos JPG, PNG o PDF",
          variant: "destructive",
        });
      }
      
      setArchivos(prev => [...prev, ...archivosValidos]);
    }
  };

  const eliminarArchivo = (index: number) => {
    setArchivos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!titulo.trim() || !fecha) {
      toast({
        title: "Campos requeridos",
        description: "Por favor completa el título y la fecha del evento",
        variant: "destructive",
      });
      return;
    }

    const ingresosNum = parseFloat(ingresos) || 0;
    const egresosNum = parseFloat(egresos) || 0;
    const balance = ingresosNum - egresosNum;

    if (balance === 0) {
      toast({
        title: "Balance en cero",
        description: "El evento no tiene balance neto (ingresos = egresos)",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const tipo = balance > 0 ? "ingreso" : "egreso";
      const monto = Math.abs(balance);
      
      const descripcion = `Evento: ${titulo}\nIngresos: S/ ${ingresosNum.toFixed(2)}\nEgresos: S/ ${egresosNum.toFixed(2)}\nBalance: S/ ${balance.toFixed(2)}`;

      await crearMovimientoFinanciero(
        {
          tipo,
          categoria: "evento",
          monto,
          descripcion,
          fecha,
          comprobantes: [],
          registradoPor: "current-user", // Esto debería venir del contexto de auth
          registradoPorNombre: "Usuario Actual",
          observaciones: observaciones || undefined,
        },
        archivos
      );

      toast({
        title: "Evento registrado",
        description: `Se registró el evento "${titulo}" exitosamente`,
      });

      // Resetear formulario
      setTitulo("");
      setFecha("");
      setIngresos("");
      setEgresos("");
      setObservaciones("");
      setArchivos([]);
      
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error registrando evento:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el evento. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Registrar Nuevo Evento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título del Evento *</Label>
            <Input
              id="titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Torneo de Fútbol, Fiesta de Aniversario"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha">Fecha del Evento *</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ingresos">Ingresos (S/)</Label>
              <Input
                id="ingresos"
                type="number"
                step="0.01"
                min="0"
                value={ingresos}
                onChange={(e) => setIngresos(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="egresos">Egresos (S/)</Label>
              <Input
                id="egresos"
                type="number"
                step="0.01"
                min="0"
                value={egresos}
                onChange={(e) => setEgresos(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Balance preview */}
          {(ingresos || egresos) && (
            <div className="p-3 bg-muted rounded-lg">
              <div className="text-sm font-medium">Balance del Evento:</div>
              <div className={`text-lg font-bold ${
                (parseFloat(ingresos) || 0) - (parseFloat(egresos) || 0) > 0 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                S/ {((parseFloat(ingresos) || 0) - (parseFloat(egresos) || 0)).toFixed(2)}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Detalles adicionales del evento..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Comprobantes (JPG, PNG, PDF)</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Subir Archivos
              </Button>
              {archivos.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {archivos.length} archivo(s) seleccionado(s)
                </span>
              )}
            </div>

            {archivos.length > 0 && (
              <div className="space-y-2 mt-2">
                {archivos.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-muted rounded"
                  >
                    <span className="text-sm truncate flex-1">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => eliminarArchivo(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Registrando..." : "Registrar Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
