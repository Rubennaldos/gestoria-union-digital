import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Evento, FormularioEvento, CategoriaEvento, EstadoEvento } from "@/types/eventos";
import { actualizarEvento } from "@/services/eventos";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { SesionesEventoForm } from "./SesionesEventoForm";
import { ImageUploader } from "./ImageUploader";
import { Tag } from "lucide-react";

interface EditarEventoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  evento: Evento;
  onSuccess: () => void;
}

export const EditarEventoModal = ({
  open,
  onOpenChange,
  evento,
  onSuccess,
}: EditarEventoModalProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [mostrarPromocion, setMostrarPromocion] = useState(false);
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
    promocion: undefined,
    requisitos: "",
    materialesIncluidos: "",
    imagen: "",
    estado: "activo" as EstadoEvento,
  });

  useEffect(() => {
    if (evento) {
      setFormData({
        titulo: evento.titulo,
        descripcion: evento.descripcion,
        categoria: evento.categoria,
        fechaInicio: format(new Date(evento.fechaInicio), "yyyy-MM-dd"),
        fechaFin: evento.fechaFin ? format(new Date(evento.fechaFin), "yyyy-MM-dd") : "",
        fechaFinIndefinida: evento.fechaFinIndefinida,
        sesiones: evento.sesiones.map(s => ({
          lugar: s.lugar,
          fecha: s.fecha,
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
        })),
        instructor: evento.instructor || "",
        cuposMaximos: evento.cuposMaximos || 30,
        cuposIlimitados: evento.cuposIlimitados,
        precio: evento.precio,
        promocion: evento.promocion,
        requisitos: evento.requisitos || "",
        materialesIncluidos: evento.materialesIncluidos || "",
        imagen: evento.imagen || "",
        estado: evento.estado,
      });
      setMostrarPromocion(!!evento.promocion);
    }
  }, [evento]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titulo || !formData.fechaInicio) {
      toast.error("Por favor completa los campos obligatorios");
      return;
    }

    if (formData.sesiones.length === 0) {
      toast.error("Debes tener al menos una sesión del evento");
      return;
    }

    if (!user) {
      toast.error("Debes iniciar sesión");
      return;
    }

    try {
      setLoading(true);
      await actualizarEvento(evento.id, formData, user.uid);
      toast.success("Evento actualizado exitosamente");
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error al actualizar evento:", error);
      toast.error("Error al actualizar el evento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
          <DialogDescription>Modifica la información del evento</DialogDescription>
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
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
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
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
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

          {/* Cupos y Precios */}
          <div className="space-y-4">
            <h3 className="font-semibold">Cupos y Precios</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cuposMaximos">Cupos Máximos</Label>
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

              <div className="space-y-2">
                <Label htmlFor="precio">Precio (S/)</Label>
                <Input
                  id="precio"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="mostrarPromocion"
                    checked={mostrarPromocion}
                    onCheckedChange={(checked) => {
                      setMostrarPromocion(!!checked);
                      if (!checked) {
                        setFormData({ ...formData, promocion: undefined });
                      } else if (!formData.promocion) {
                        setFormData({
                          ...formData,
                          promocion: {
                            activa: true,
                            codigo: "",
                            precioPromocional: 0,
                          },
                        });
                      }
                    }}
                  />
                  <Label htmlFor="mostrarPromocion" className="cursor-pointer flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Agregar promoción con código
                  </Label>
                </div>

                {mostrarPromocion && (
                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="codigoPromocion">Código de Promoción</Label>
                        <Input
                          id="codigoPromocion"
                          value={formData.promocion?.codigo || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              promocion: { ...formData.promocion!, codigo: e.target.value.toUpperCase() },
                            })
                          }
                          placeholder="Ej: VERANO2025"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="precioPromocional">Precio Promocional (S/)</Label>
                        <Input
                          id="precioPromocional"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.promocion?.precioPromocional || 0}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              promocion: {
                                ...formData.promocion!,
                                precioPromocional: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
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
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="materialesIncluidos">Materiales Incluidos</Label>
                <Textarea
                  id="materialesIncluidos"
                  value={formData.materialesIncluidos}
                  onChange={(e) => setFormData({ ...formData, materialesIncluidos: e.target.value })}
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
              {loading ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
