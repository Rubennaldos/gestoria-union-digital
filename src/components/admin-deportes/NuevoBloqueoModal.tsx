import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ref, push, set, get } from "firebase/database";
import { db } from "@/config/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { obtenerCanchas } from "@/services/deportes";
import { Cancha } from "@/types/deportes";

interface NuevoBloqueoModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function NuevoBloqueoModal({ onClose, onSuccess }: NuevoBloqueoModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [formData, setFormData] = useState({
    canchaId: "",
    fechaInicio: "",
    fechaFin: "",
    motivo: ""
  });

  useEffect(() => {
    cargarCanchas();
  }, []);

  const cargarCanchas = async () => {
    try {
      const data = await obtenerCanchas();
      setCanchas(data.filter(c => c.activa));
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.canchaId || !formData.fechaInicio || !formData.fechaFin || !formData.motivo) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      setLoading(true);
      
      const newRef = push(ref(db, 'deportes/bloqueos'));
      await set(newRef, {
        ...formData,
        createdAt: new Date().toISOString(),
        createdBy: profile?.uid || 'sistema'
      });

      toast({
        title: "¡Éxito!",
        description: "Bloqueo creado correctamente"
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el bloqueo",
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
          <DialogTitle>Nuevo Bloqueo de Cancha</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="canchaId">Cancha *</Label>
            <Select value={formData.canchaId} onValueChange={(value) => setFormData({ ...formData, canchaId: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cancha" />
              </SelectTrigger>
              <SelectContent>
                {canchas.map((cancha) => (
                  <SelectItem key={cancha.id} value={cancha.id}>
                    {cancha.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaInicio">Fecha y hora de inicio *</Label>
            <Input
              id="fechaInicio"
              type="datetime-local"
              value={formData.fechaInicio}
              onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fechaFin">Fecha y hora de fin *</Label>
            <Input
              id="fechaFin"
              type="datetime-local"
              value={formData.fechaFin}
              onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo del bloqueo *</Label>
            <Textarea
              id="motivo"
              value={formData.motivo}
              onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
              placeholder="Ej: Mantenimiento preventivo, reparación de piso, evento especial..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creando..." : "Crear Bloqueo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
