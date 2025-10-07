import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Upload, X, Plus } from "lucide-react";
import { crearMovimientoFinanciero } from "@/services/finanzas";

interface NuevoEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ItemFinanciero {
  descripcion: string;
  monto: number;
}

export function NuevoEventoModal({ open, onOpenChange, onSuccess }: NuevoEventoModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [fecha, setFecha] = useState("");
  const [ingresos, setIngresos] = useState<ItemFinanciero[]>([{ descripcion: "", monto: 0 }]);
  const [egresos, setEgresos] = useState<ItemFinanciero[]>([{ descripcion: "", monto: 0 }]);
  const [observaciones, setObservaciones] = useState("");
  const [archivos, setArchivos] = useState<File[]>([]);

  const agregarIngreso = () => {
    setIngresos([...ingresos, { descripcion: "", monto: 0 }]);
  };

  const agregarEgreso = () => {
    setEgresos([...egresos, { descripcion: "", monto: 0 }]);
  };

  const eliminarIngreso = (index: number) => {
    if (ingresos.length > 1) {
      setIngresos(ingresos.filter((_, i) => i !== index));
    }
  };

  const eliminarEgreso = (index: number) => {
    if (egresos.length > 1) {
      setEgresos(egresos.filter((_, i) => i !== index));
    }
  };

  const actualizarIngreso = (index: number, campo: keyof ItemFinanciero, valor: any) => {
    const nuevosIngresos = [...ingresos];
    nuevosIngresos[index] = { ...nuevosIngresos[index], [campo]: valor };
    setIngresos(nuevosIngresos);
  };

  const actualizarEgreso = (index: number, campo: keyof ItemFinanciero, valor: any) => {
    const nuevosEgresos = [...egresos];
    nuevosEgresos[index] = { ...nuevosEgresos[index], [campo]: valor };
    setEgresos(nuevosEgresos);
  };

  const totalIngresos = ingresos.reduce((sum, item) => sum + (item.monto || 0), 0);
  const totalEgresos = egresos.reduce((sum, item) => sum + (item.monto || 0), 0);
  const balance = totalIngresos - totalEgresos;

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
      
      // Construir descripción detallada
      let descripcionDetallada = `Evento: ${titulo}\n\n`;
      
      if (ingresos.some(i => i.descripcion || i.monto > 0)) {
        descripcionDetallada += "INGRESOS:\n";
        ingresos.forEach(item => {
          if (item.descripcion || item.monto > 0) {
            descripcionDetallada += `- ${item.descripcion || 'Sin descripción'}: S/ ${item.monto.toFixed(2)}\n`;
          }
        });
        descripcionDetallada += `Total Ingresos: S/ ${totalIngresos.toFixed(2)}\n\n`;
      }
      
      if (egresos.some(e => e.descripcion || e.monto > 0)) {
        descripcionDetallada += "EGRESOS:\n";
        egresos.forEach(item => {
          if (item.descripcion || item.monto > 0) {
            descripcionDetallada += `- ${item.descripcion || 'Sin descripción'}: S/ ${item.monto.toFixed(2)}\n`;
          }
        });
        descripcionDetallada += `Total Egresos: S/ ${totalEgresos.toFixed(2)}\n\n`;
      }
      
      descripcionDetallada += `BALANCE NETO: S/ ${balance.toFixed(2)}`;

      const movimientoData: any = {
        tipo,
        categoria: "evento",
        monto,
        descripcion: descripcionDetallada,
        fecha,
        comprobantes: [],
        registradoPor: "current-user",
        registradoPorNombre: "Usuario Actual",
      };

      if (observaciones && observaciones.trim()) {
        movimientoData.observaciones = observaciones.trim();
      }

      await crearMovimientoFinanciero(movimientoData, archivos);

      toast({
        title: "Evento registrado",
        description: `Se registró el evento "${titulo}" exitosamente`,
      });

      // Resetear formulario
      setTitulo("");
      setFecha("");
      setIngresos([{ descripcion: "", monto: 0 }]);
      setEgresos([{ descripcion: "", monto: 0 }]);
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
            {/* INGRESOS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Ingresos (S/)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={agregarIngreso}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ingresos.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Descripción"
                        value={item.descripcion}
                        onChange={(e) => actualizarIngreso(index, 'descripcion', e.target.value)}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.monto || ''}
                        onChange={(e) => actualizarIngreso(index, 'monto', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    {ingresos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarIngreso(index)}
                        className="mt-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-sm font-semibold pt-2 border-t">
                Total: S/ {totalIngresos.toFixed(2)}
              </div>
            </div>

            {/* EGRESOS */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Egresos (S/)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={agregarEgreso}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Agregar
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {egresos.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-1">
                      <Input
                        placeholder="Descripción"
                        value={item.descripcion}
                        onChange={(e) => actualizarEgreso(index, 'descripcion', e.target.value)}
                        className="h-9"
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={item.monto || ''}
                        onChange={(e) => actualizarEgreso(index, 'monto', parseFloat(e.target.value) || 0)}
                        className="h-9"
                      />
                    </div>
                    {egresos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => eliminarEgreso(index)}
                        className="mt-1"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-sm font-semibold pt-2 border-t">
                Total: S/ {totalEgresos.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Balance total */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Balance del Evento:</span>
              <span className={`text-xl font-bold ${
                balance > 0 ? 'text-green-600' : balance < 0 ? 'text-red-600' : ''
              }`}>
                S/ {balance.toFixed(2)}
              </span>
            </div>
          </div>

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
