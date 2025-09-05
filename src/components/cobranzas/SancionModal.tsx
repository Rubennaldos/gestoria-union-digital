import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { aplicarSancion } from "@/services/cobranzas";

interface SancionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronadoId?: string;
  onSuccess: () => void;
}

interface FormData {
  empadronadoId: string;
  tipoSancion: string;
  montoSancion: number;
  motivo: string;
}

export const SancionModal = ({ open, onOpenChange, empadronadoId, onSuccess }: SancionModalProps) => {
  const { register, handleSubmit, setValue, reset } = useForm<FormData>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [archivoSancion, setArchivoSancion] = useState<File | null>(null);

  const descargarPlantilla = () => {
    // En un sistema real, esto descargaría una plantilla PDF
    const element = document.createElement('a');
    element.href = 'data:text/plain;charset=utf-8,PLANTILLA DE SANCIÓN\n\nEmpadronado: _______________\nDNI: _______________\nTipo de sanción: _______________\nMonto: S/ _______________\nMotivo: _______________\n\nFecha: _______________\n\nFirma del Fiscal: _______________\nSello: _______________';
    element.download = 'plantilla_sancion.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Plantilla descargada",
      description: "Complete y firme la sanción"
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!archivoSancion) {
      toast({
        title: "Error",
        description: "Debe subir el archivo de sanción firmado",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Simular subida de archivo
      const urlArchivo = `sanciones/${Date.now()}_${archivoSancion.name}`;

      await aplicarSancion({
        empadronadoId: data.empadronadoId,
        tipoSancion: data.tipoSancion,
        montoSancion: data.montoSancion,
        motivo: data.motivo,
        archivo: urlArchivo,
        aplicadoPor: 'current-user-id', // En un sistema real usarías el ID del usuario actual
        fechaAplicacion: new Date().toLocaleDateString('es-PE')
      });

      toast({
        title: "Sanción aplicada",
        description: "La sanción se ha aplicado correctamente"
      });

      onSuccess();
      onOpenChange(false);
      reset();
      setArchivoSancion(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo aplicar la sanción",
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
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Aplicar Sanción
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm font-medium text-destructive mb-2">Proceso:</p>
            <ol className="text-xs text-destructive/80 space-y-1">
              <li>1. Descargar plantilla de sanción</li>
              <li>2. Completar y obtener firma del fiscal</li>
              <li>3. Subir documento firmado</li>
            </ol>
          </div>

          <Button onClick={descargarPlantilla} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Descargar Plantilla de Sanción
          </Button>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="empadronadoId">ID del Empadronado</Label>
              <Input
                id="empadronadoId"
                {...register('empadronadoId', { required: true })}
                defaultValue={empadronadoId}
                placeholder="ID del empadronado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipoSancion">Tipo de Sanción</Label>
              <Select onValueChange={(value) => setValue('tipoSancion', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incumplimiento_estatutos">Incumplimiento de Estatutos</SelectItem>
                  <SelectItem value="perturbacion_orden">Perturbación del Orden</SelectItem>
                  <SelectItem value="danos_propiedad">Daños a Propiedad Común</SelectItem>
                  <SelectItem value="morosidad_reiterada">Morosidad Reiterada</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="montoSancion">Monto de la Sanción (S/)</Label>
              <Input
                id="montoSancion"
                type="number"
                min="0"
                step="0.01"
                {...register('montoSancion', { required: true, valueAsNumber: true })}
                placeholder="Ej: 100.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo de la Sanción</Label>
              <Textarea
                id="motivo"
                {...register('motivo', { required: true })}
                placeholder="Describa el motivo de la sanción"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="archivo">Sanción Firmada por el Fiscal</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setArchivoSancion(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {archivoSancion && (
                <p className="text-xs text-muted-foreground">
                  Archivo seleccionado: {archivoSancion.name}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} variant="destructive">
                {loading ? "Aplicando..." : "Aplicar Sanción"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};