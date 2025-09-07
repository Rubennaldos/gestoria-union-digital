import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { crearMaestroObra } from "@/services/acceso";

interface NuevoMaestroObraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreado?: () => void;
  onMaestroCreado?: (maestroId: string) => void;
}

export function NuevoMaestroObraModal({ 
  open, 
  onOpenChange, 
  onCreado,
  onMaestroCreado
}: NuevoMaestroObraModalProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    apellidos: '',
    telefono: '',
    empresa: '',
    sexo: '' as 'masculino' | 'femenino' | '',
    fotoDni: ''
  });
  const [enviado, setEnviado] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setFormData({
      nombre: '',
      apellidos: '',
      telefono: '',
      empresa: '',
      sexo: '',
      fotoDni: ''
    });
    setEnviado(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nombre || !formData.apellidos || !formData.telefono || 
        !formData.empresa || !formData.sexo) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      const maestroId = await crearMaestroObra({
        nombre: formData.nombre,
        apellidos: formData.apellidos,
        telefono: formData.telefono,
        empresa: formData.empresa,
        sexo: formData.sexo as 'masculino' | 'femenino',
        fotoDni: formData.fotoDni,
        autorizado: false // Por defecto no autorizado, debe ser aprobado por JD
      });

      setEnviado(true);
      
      // Llamar ambos callbacks si existen
      onCreado?.();
      if (maestroId && onMaestroCreado) {
        onMaestroCreado(maestroId);
      }

      toast({
        title: "Solicitud enviada",
        description: "El maestro de obra será evaluado por la Junta Directiva"
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el maestro de obra",
        variant: "destructive"
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Simular subida de archivo
      setFormData({ ...formData, fotoDni: file.name });
      toast({
        title: "Archivo cargado",
        description: `Se ha cargado: ${file.name}`
      });
    }
  };

  if (enviado) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Solicitud Enviada</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 text-center py-4">
            <div className="flex justify-center">
              <Clock className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Su solicitud ha sido enviada</p>
              <p className="text-sm text-muted-foreground">
                La Junta Directiva evaluará al maestro de obra y le notificará 
                la decisión por el canal correspondiente.
              </p>
            </div>
          </div>
          
          <Button onClick={handleClose} className="w-full">
            Entendido
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Maestro de Obra</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Nombre del maestro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apellidos">Apellidos *</Label>
              <Input
                id="apellidos"
                value={formData.apellidos}
                onChange={(e) => setFormData({ ...formData, apellidos: e.target.value })}
                placeholder="Apellidos del maestro"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input
                id="telefono"
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                placeholder="999999999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="empresa">Empresa *</Label>
              <Input
                id="empresa"
                value={formData.empresa}
                onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                placeholder="Nombre de la empresa"
              />
            </div>

            <div className="space-y-2">
              <Label>Sexo *</Label>
              <Select 
                value={formData.sexo} 
                onValueChange={(value) => setFormData({ ...formData, sexo: value as 'masculino' | 'femenino' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar sexo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="femenino">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Foto del DNI</Label>
              <Card className="p-4">
                <div className="text-center">
                  {formData.fotoDni ? (
                    <p className="text-sm text-green-600">✓ {formData.fotoDni}</p>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        Adjuntar foto del DNI (opcional)
                      </p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="mt-2 w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                </div>
              </Card>
            </div>
          </div>

          <Card className="p-3 border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <p className="text-xs text-yellow-800">
                <strong>Importante:</strong> El maestro de obra debe ser autorizado 
                por la Junta Directiva antes de poder registrar trabajadores.
              </p>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1">
              Registrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}