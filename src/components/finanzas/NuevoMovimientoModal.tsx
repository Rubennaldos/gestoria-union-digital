import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { crearMovimientoFinanciero } from "@/services/finanzas";
import { TipoMovimiento, CategoriaIngreso, CategoriaEgreso } from "@/types/finanzas";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, X } from "lucide-react";
import { BusquedaEmpadronado } from "@/components/deportes/BusquedaEmpadronado";

interface NuevoMovimientoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  tipoInicial?: TipoMovimiento;
}

const categoriasIngreso: { value: CategoriaIngreso; label: string }[] = [
  { value: "cuotas", label: "Cuotas Mensuales" },
  { value: "donacion", label: "Donación" },
  { value: "multa_externa", label: "Multa Externa" },
  { value: "evento", label: "Evento" },
  { value: "alquiler", label: "Alquiler" },
  { value: "intereses", label: "Intereses" },
  { value: "otro", label: "Otro" },
];

const categoriasEgreso: { value: CategoriaEgreso; label: string }[] = [
  { value: "mantenimiento", label: "Mantenimiento" },
  { value: "servicios", label: "Servicios" },
  { value: "personal", label: "Personal" },
  { value: "seguridad", label: "Seguridad" },
  { value: "compras", label: "Compras" },
  { value: "eventos", label: "Eventos" },
  { value: "reparaciones", label: "Reparaciones" },
  { value: "otro", label: "Otro" },
];

export const NuevoMovimientoModal = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  tipoInicial = "egreso" 
}: NuevoMovimientoModalProps) => {
  const { user } = useAuth();
  const [guardando, setGuardando] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [empadronadoSeleccionado, setEmpadronadoSeleccionado] = useState<{
    id: string;
    numeroPadron: string;
    nombres: string;
    dni: string;
  } | null>(null);
  
  const [formData, setFormData] = useState({
    tipo: tipoInicial as TipoMovimiento,
    categoria: "" as CategoriaIngreso | CategoriaEgreso,
    monto: "",
    descripcion: "",
    fecha: new Date().toISOString().split("T")[0],
    numeroComprobante: "",
    beneficiario: "",
    proveedor: "",
    observaciones: "",
  });

  const handleArchivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const nuevosArchivos = Array.from(e.target.files);
      // Validar tamaño (max 5MB por archivo)
      const archivosValidos = nuevosArchivos.filter(f => {
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`El archivo ${f.name} es muy grande (máx 5MB)`);
          return false;
        }
        return true;
      });
      setArchivos([...archivos, ...archivosValidos]);
    }
  };

  const eliminarArchivo = (index: number) => {
    setArchivos(archivos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.categoria || !formData.monto || !formData.descripcion) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    if (parseFloat(formData.monto) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    try {
      setGuardando(true);

      await crearMovimientoFinanciero(
        {
          tipo: formData.tipo,
          categoria: formData.categoria,
          monto: parseFloat(formData.monto),
          descripcion: formData.descripcion.trim(),
          fecha: formData.fecha,
          numeroComprobante: formData.numeroComprobante.trim() || undefined,
          beneficiario: formData.beneficiario.trim() || undefined,
          proveedor: formData.proveedor.trim() || undefined,
          observaciones: formData.observaciones.trim() || undefined,
          registradoPor: user?.uid || "",
          registradoPorNombre: user?.email || "Sistema",
          comprobantes: [],
          empadronadoId: empadronadoSeleccionado?.id,
          empadronadoNumeroPadron: empadronadoSeleccionado?.numeroPadron,
          empadronadoNombres: empadronadoSeleccionado?.nombres,
          empadronadoDni: empadronadoSeleccionado?.dni,
        },
        archivos
      );

      toast.success(`${formData.tipo === "ingreso" ? "Ingreso" : "Egreso"} registrado exitosamente`);
      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error al registrar movimiento:", error);
      toast.error(error?.message || "Error al registrar el movimiento");
    } finally {
      setGuardando(false);
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: tipoInicial,
      categoria: "" as CategoriaIngreso | CategoriaEgreso,
      monto: "",
      descripcion: "",
      fecha: new Date().toISOString().split("T")[0],
      numeroComprobante: "",
      beneficiario: "",
      proveedor: "",
      observaciones: "",
    });
    setArchivos([]);
    setEmpadronadoSeleccionado(null);
  };

  const categorias = formData.tipo === "ingreso" ? categoriasIngreso : categoriasEgreso;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Nuevo {formData.tipo === "ingreso" ? "Ingreso" : "Egreso"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Buscador de Empadronado */}
          <div>
            <Label>Empadronado (Opcional)</Label>
            <BusquedaEmpadronado 
              onSeleccionar={(emp) => {
                setEmpadronadoSeleccionado({
                  id: emp.id,
                  numeroPadron: emp.numeroPadron || "",
                  nombres: `${emp.nombre} ${emp.apellidos}`,
                  dni: emp.dni || ""
                });
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo">Tipo de Movimiento *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value: TipoMovimiento) => {
                  setFormData({ ...formData, tipo: value, categoria: "" as any });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="egreso">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="categoria">Categoría *</Label>
              <Select
                value={formData.categoria}
                onValueChange={(value) => setFormData({ ...formData, categoria: value as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monto">Monto (S/) *</Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                value={formData.monto}
                onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <Label htmlFor="fecha">Fecha *</Label>
              <Input
                id="fecha"
                type="date"
                value={formData.fecha}
                onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="descripcion">Descripción *</Label>
            <Textarea
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Detalle del movimiento"
              rows={3}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="numeroComprobante">N° Comprobante</Label>
              <Input
                id="numeroComprobante"
                value={formData.numeroComprobante}
                onChange={(e) => setFormData({ ...formData, numeroComprobante: e.target.value })}
                placeholder="Ej: F001-0001234"
              />
            </div>

            {formData.tipo === "egreso" && (
              <div>
                <Label htmlFor="proveedor">Proveedor</Label>
                <Input
                  id="proveedor"
                  value={formData.proveedor}
                  onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
            )}

            {formData.tipo === "egreso" && (
              <div>
                <Label htmlFor="beneficiario">Beneficiario</Label>
                <Input
                  id="beneficiario"
                  value={formData.beneficiario}
                  onChange={(e) => setFormData({ ...formData, beneficiario: e.target.value })}
                  placeholder="Nombre del beneficiario"
                />
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Información adicional (opcional)"
              rows={2}
            />
          </div>

          {/* Subir archivos */}
          <div>
            <Label>Comprobantes (PDF o fotos)</Label>
            <div className="mt-2">
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click para subir o arrastra archivos
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    PDF, JPG, PNG (máx 5MB cada uno)
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleArchivoChange}
                />
              </label>

              {archivos.length > 0 && (
                <div className="mt-3 space-y-2">
                  {archivos.map((archivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-muted rounded"
                    >
                      <span className="text-sm truncate flex-1">{archivo.name}</span>
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
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
