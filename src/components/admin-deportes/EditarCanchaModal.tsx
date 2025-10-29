import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { actualizarCancha } from "@/services/deportes";
import { Cancha, TipoCancha } from "@/types/deportes";
import { toast } from "@/hooks/use-toast";

interface EditarCanchaModalProps {
  cancha: Cancha;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditarCanchaModal({ cancha, onClose, onSuccess }: EditarCanchaModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nombre: cancha.nombre,
    tipo: cancha.tipo,
    ubicacion: cancha.ubicacion,
    activa: cancha.activa,
    precioHora: cancha.configuracion.precioHora,
    modificadorLuz1h: cancha.configuracion.modificadorLuz['1h'],
    modificadorLuz2h: cancha.configuracion.modificadorLuz['2h'],
    modificadorLuz3h: cancha.configuracion.modificadorLuz['3h'],
    tarifaAportante: cancha.configuracion.tarifaAportante,
    horaMinima: cancha.configuracion.horaMinima,
    horaMaxima: cancha.configuracion.horaMaxima,
    bufferMinutos: cancha.configuracion.bufferMinutos,
    horaInicio: cancha.configuracion.horarios.inicio,
    horaFin: cancha.configuracion.horarios.fin
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      await actualizarCancha(cancha.id, {
        nombre: formData.nombre,
        tipo: formData.tipo,
        ubicacion: formData.ubicacion,
        activa: formData.activa,
        configuracion: {
          precioHora: formData.precioHora,
          modificadorLuz: {
            '1h': formData.modificadorLuz1h,
            '2h': formData.modificadorLuz2h,
            '3h': formData.modificadorLuz3h
          },
          tarifaAportante: formData.tarifaAportante,
          horaMinima: formData.horaMinima,
          horaMaxima: formData.horaMaxima,
          bufferMinutos: formData.bufferMinutos,
          horarios: {
            inicio: formData.horaInicio,
            fin: formData.horaFin
          }
        }
      });

      toast({
        title: "¡Éxito!",
        description: "Cancha actualizada correctamente"
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la cancha",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Cancha: {cancha.nombre}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* ... mismo contenido que NuevaCanchaModal ... */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre de la cancha *</Label>
              <Input
                id="nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de cancha *</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value as TipoCancha })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="futbol">Fútbol</SelectItem>
                  <SelectItem value="voley">Vóley</SelectItem>
                  <SelectItem value="basquet">Básquet</SelectItem>
                  <SelectItem value="tenis">Tenis</SelectItem>
                  <SelectItem value="padel">Pádel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación *</Label>
              <Select value={formData.ubicacion} onValueChange={(value) => setFormData({ ...formData, ubicacion: value as "boulevard" | "quinta_llana" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boulevard">Boulevard</SelectItem>
                  <SelectItem value="quinta_llana">Quinta Llana</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 flex items-center justify-between">
              <Label htmlFor="activa">Cancha activa</Label>
              <Switch
                id="activa"
                checked={formData.activa}
                onCheckedChange={(checked) => setFormData({ ...formData, activa: checked })}
              />
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Configuración de Precios</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="precioHora">Precio por hora (S/)</Label>
                <Input
                  id="precioHora"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precioHora}
                  onChange={(e) => setFormData({ ...formData, precioHora: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tarifaAportante">Descuento aportante (%)</Label>
                <Input
                  id="tarifaAportante"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.tarifaAportante}
                  onChange={(e) => setFormData({ ...formData, tarifaAportante: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modificadorLuz1h">Luz 1h (S/)</Label>
                <Input
                  id="modificadorLuz1h"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.modificadorLuz1h}
                  onChange={(e) => setFormData({ ...formData, modificadorLuz1h: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modificadorLuz2h">Luz 2h (S/)</Label>
                <Input
                  id="modificadorLuz2h"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.modificadorLuz2h}
                  onChange={(e) => setFormData({ ...formData, modificadorLuz2h: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modificadorLuz3h">Luz 3h+ (S/)</Label>
                <Input
                  id="modificadorLuz3h"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.modificadorLuz3h}
                  onChange={(e) => setFormData({ ...formData, modificadorLuz3h: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="border-t pt-4 space-y-4">
            <h3 className="font-semibold">Horarios y Restricciones</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="horaInicio">Hora de inicio</Label>
                <Input
                  id="horaInicio"
                  type="time"
                  value={formData.horaInicio}
                  onChange={(e) => setFormData({ ...formData, horaInicio: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horaFin">Hora de fin</Label>
                <Input
                  id="horaFin"
                  type="time"
                  value={formData.horaFin}
                  onChange={(e) => setFormData({ ...formData, horaFin: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horaMinima">Duración mínima (hrs)</Label>
                <Input
                  id="horaMinima"
                  type="number"
                  min="1"
                  max="5"
                  value={formData.horaMinima}
                  onChange={(e) => setFormData({ ...formData, horaMinima: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="horaMaxima">Duración máxima (hrs)</Label>
                <Input
                  id="horaMaxima"
                  type="number"
                  min="1"
                  max="8"
                  value={formData.horaMaxima}
                  onChange={(e) => setFormData({ ...formData, horaMaxima: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2 col-span-2">
                <Label htmlFor="bufferMinutos">Buffer entre reservas (min)</Label>
                <Input
                  id="bufferMinutos"
                  type="number"
                  min="0"
                  max="60"
                  value={formData.bufferMinutos}
                  onChange={(e) => setFormData({ ...formData, bufferMinutos: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
