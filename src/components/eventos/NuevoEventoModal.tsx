import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { FormularioEvento, CategoriaEvento, EstadoEvento } from "@/types/eventos";
import { crearEvento } from "@/services/eventos";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { SesionesEventoForm } from "./SesionesEventoForm";
import { ImageUploader } from "./ImageUploader";

interface NuevoEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NuevoEventoModal = ({ open, onOpenChange, onSuccess }: NuevoEventoModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormularioEvento>({
    titulo: "",
    descripcion: "",
    categoria: "otro" as CategoriaEvento,
    fechaInicio: "",
    fechaFin: "",
    fechaFinIndefinida: false,
    sesiones: [],
    instructor: "",
    cuposMaximos: 30,
    cuposIlimitados: false,
    precio: 0,
    requisitos: "",
    materialesIncluidos: "",
    imagen: "",
    estado: "activo" as EstadoEvento,
  });


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo || !formData.fechaInicio) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    if (formData.sesiones.length === 0) {
      toast.error("Debes agregar al menos una sesión del evento");
      return;
    }

    if (!user) {
      toast.error("Debes iniciar sesión");
      return;
    }

    try {
      setLoading(true);
      await crearEvento(formData, user.uid);
      toast.success("Evento creado exitosamente");
      onOpenChange(false);
      onSuccess();
      resetForm();
    } catch (error) {
      console.error("Error al crear evento:", error);
      toast.error("Error al crear el evento");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: "",
      descripcion: "",
      categoria: "otro" as CategoriaEvento,
      fechaInicio: "",
      fechaFin: "",
      fechaFinIndefinida: false,
      sesiones: [],
      instructor: "",
      cuposMaximos: 30,
      cuposIlimitados: false,
      precio: 0,
      requisitos: "",
      materialesIncluidos: "",
      imagen: "",
      estado: "activo" as EstadoEvento,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear Nuevo Evento</DialogTitle>
          <DialogDescription>Completa la información del evento</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información Básica */}
          <div className="space-y-4">
            <h3 className="font-semibold">Información Básica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Título del Evento *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ej: Clases de Baile"
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  placeholder="Describe el evento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({ ...formData, categoria: value as CategoriaEvento })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="deportivo">Deportivo</SelectItem>
                    <SelectItem value="cultural">Cultural</SelectItem>
                    <SelectItem value="educativo">Educativo</SelectItem>
                    <SelectItem value="social">Social</SelectItem>
                    <SelectItem value="recreativo">Recreativo</SelectItem>
                    <SelectItem value="otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({ ...formData, estado: value as EstadoEvento })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activo">Activo</SelectItem>
                    <SelectItem value="inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                <Input
                  id="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fechaFin">Fecha Fin</Label>
                <Input
                  id="fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                  disabled={formData.fechaFinIndefinida}
                />
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="fechaFinIndefinida"
                    checked={formData.fechaFinIndefinida}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, fechaFinIndefinida: !!checked, fechaFin: checked ? "" : formData.fechaFin })
                    }
                  />
                  <Label htmlFor="fechaFinIndefinida" className="text-sm font-normal cursor-pointer">
                    Sin fecha de fin (indefinido)
                  </Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructor">Instructor / Profesor</Label>
                <Input
                  id="instructor"
                  value={formData.instructor}
                  onChange={(e) => setFormData({ ...formData, instructor: e.target.value })}
                  placeholder="Nombre del instructor"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Sesiones */}
          <SesionesEventoForm
            sesiones={formData.sesiones}
            onChange={(sesiones) => setFormData({ ...formData, sesiones })}
          />

          <Separator />

          {/* Cupos */}
          <div className="space-y-4">
            <h3 className="font-semibold">Cupos</h3>
            
            <div className="space-y-2">
              <Label htmlFor="cuposMaximos">Cupos Máximos por Sesión</Label>
              <Input
                id="cuposMaximos"
                type="number"
                min="0"
                value={formData.cuposMaximos}
                onChange={(e) => setFormData({ ...formData, cuposMaximos: parseInt(e.target.value) || 0 })}
                disabled={formData.cuposIlimitados}
              />
              <div className="flex items-center gap-2">
                <Checkbox
                  id="cuposIlimitados"
                  checked={formData.cuposIlimitados}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, cuposIlimitados: !!checked })
                  }
                />
                <Label htmlFor="cuposIlimitados" className="text-sm font-normal cursor-pointer">
                  Sin límite de cupos
                </Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Imagen */}
          <ImageUploader
            value={formData.imagen}
            onChange={(base64) => setFormData({ ...formData, imagen: base64 })}
          />

          <Separator />

          {/* Detalles Adicionales */}
          <div className="space-y-4">
            <h3 className="font-semibold">Detalles Adicionales</h3>
            
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requisitos">Requisitos</Label>
                <Textarea
                  id="requisitos"
                  value={formData.requisitos}
                  onChange={(e) => setFormData({ ...formData, requisitos: e.target.value })}
                  placeholder="Requisitos para participar..."
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="materialesIncluidos">Materiales Incluidos</Label>
                <Textarea
                  id="materialesIncluidos"
                  value={formData.materialesIncluidos}
                  onChange={(e) => setFormData({ ...formData, materialesIncluidos: e.target.value })}
                  placeholder="Materiales que se incluyen en el evento..."
                  rows={2}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? "Creando..." : "Crear Evento"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
