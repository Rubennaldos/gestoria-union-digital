import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Download, Upload, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { crearDeclaracionJurada } from "@/services/cobranzas";

interface DeclaracionJuradaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronadoId?: string;
  onSuccess: () => void;
}

interface FormData {
  empadronadoId: string;
  tipoDescuento: string;
  porcentajeDescuento: number;
  motivo: string;
}

export const DeclaracionJuradaModal = ({ open, onOpenChange, empadronadoId, onSuccess }: DeclaracionJuradaModalProps) => {
  const { register, handleSubmit, setValue, reset } = useForm<FormData>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [archivoDeclaracion, setArchivoDeclaracion] = useState<File | null>(null);

  const descargarPlantilla = () => {
    // En un sistema real, esto descargaría una plantilla PDF
    const element = document.createElement('a');
    element.href = 'data:text/plain;charset=utf-8,PLANTILLA DE DECLARACIÓN JURADA\n\nNombre: _______________\nDNI: _______________\nMotivo del descuento: _______________\n\nFirma del solicitante: _______________\n\nAprobación:\nPresidente: _______________\nFiscal: _______________';
    element.download = 'plantilla_declaracion_jurada.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Plantilla descargada",
      description: "Complete y firme la declaración jurada"
    });
  };

  const onSubmit = async (data: FormData) => {
    if (!archivoDeclaracion) {
      toast({
        title: "Error",
        description: "Debe subir el archivo de declaración jurada",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Simular subida de archivo
      const urlArchivo = `declaraciones/${Date.now()}_${archivoDeclaracion.name}`;

      await crearDeclaracionJurada({
        empadronadoId: data.empadronadoId,
        tipoDescuento: data.tipoDescuento,
        porcentajeDescuento: data.porcentajeDescuento,
        motivo: data.motivo,
        archivo: urlArchivo,
        estado: 'pendiente',
        aprobadoPorPresidente: false,
        aprobadoPorFiscal: false
      });

      toast({
        title: "Declaración jurada enviada",
        description: "La declaración está pendiente de aprobación"
      });

      onSuccess();
      onOpenChange(false);
      reset();
      setArchivoDeclaracion(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo procesar la declaración jurada",
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
            <FileText className="h-5 w-5" />
            Declaración Jurada de Descuento
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-sm font-medium mb-2">Proceso:</p>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>1. Descargar plantilla</li>
              <li>2. Completar y obtener firmas</li>
              <li>3. Subir documento firmado</li>
            </ol>
          </div>

          <Button onClick={descargarPlantilla} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Descargar Plantilla
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
              <Label htmlFor="tipoDescuento">Tipo de Descuento</Label>
              <Select onValueChange={(value) => setValue('tipoDescuento', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="problemas_salud">Problemas de Salud</SelectItem>
                  <SelectItem value="desempleo">Desempleo</SelectItem>
                  <SelectItem value="situacion_economica">Situación Económica</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="porcentajeDescuento">Porcentaje de Descuento (%)</Label>
              <Input
                id="porcentajeDescuento"
                type="number"
                min="0"
                max="100"
                {...register('porcentajeDescuento', { required: true, valueAsNumber: true })}
                placeholder="Ej: 20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="motivo">Motivo del Descuento</Label>
              <Textarea
                id="motivo"
                {...register('motivo', { required: true })}
                placeholder="Describa el motivo del descuento"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="archivo">Declaración Jurada Firmada</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setArchivoDeclaracion(e.target.files?.[0] || null)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {archivoDeclaracion && (
                <p className="text-xs text-muted-foreground">
                  Archivo seleccionado: {archivoDeclaracion.name}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Declaración"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};