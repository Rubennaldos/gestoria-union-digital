import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ref, push, set } from "firebase/database";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";

interface NuevoAvisoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function NuevoAvisoModal({ onClose, onSuccess }: NuevoAvisoModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    titulo: "",
    mensaje: "",
    tipo: "info" as 'info' | 'warning' | 'urgent',
    activo: true,
    fechaInicio: "",
    fechaFin: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.mensaje || !formData.fechaInicio || !formData.fechaFin) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const newRef = push(ref(db, 'deportes/avisos'));
      await set(newRef, {
        ...formData,
        createdAt: new Date().toISOString(),
        createdBy: profile?.uid || 'sistema'
      });

      toast({
        title: "¡Éxito!",
        description: "Aviso creado correctamente"
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el aviso",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo Aviso Deportivo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="titulo">Título del aviso *</Label>
            <Input
              id="titulo"
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Ej: Mantenimiento de canchas este fin de semana"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mensaje">Mensaje *</Label>
            <Textarea
              id="mensaje"
              value={formData.mensaje}
              onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
              placeholder="Describe el aviso en detalle..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de aviso *</Label>
            <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as 'info' | 'warning' | 'urgent' })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Información</SelectItem>
                <SelectItem value="warning">Advertencia</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaInicio">Fecha de inicio *</Label>
              <Input
                id="fechaInicio"
                type="date"
                value={formData.fechaInicio}
                onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fechaFin">Fecha de fin *</Label>
              <Input
                id="fechaFin"
                type="date"
                value={formData.fechaFin}
                onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="activo">Activar aviso inmediatamente</Label>
            <Switch
              id="activo"
              checked={formData.activo}
              onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Aviso"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
