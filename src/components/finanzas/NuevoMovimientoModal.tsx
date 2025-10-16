import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { crearMovimientoFinanciero } from "@/services/finanzas";
import { TipoMovimiento, CategoriaIngreso, CategoriaEgreso } from "@/types/finanzas";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, X, TrendingUp, TrendingDown, Calendar, DollarSign, FileText, UserCircle } from "lucide-react";
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

      console.log("📝 Datos del empadronado a guardar:", {
        empadronadoId: empadronadoSeleccionado?.id,
        empadronadoNumeroPadron: empadronadoSeleccionado?.numeroPadron,
        empadronadoNombres: empadronadoSeleccionado?.nombres,
        empadronadoDni: empadronadoSeleccionado?.dni,
      });

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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header Mejorado */}
        <div className={`relative overflow-hidden p-6 ${
          formData.tipo === "ingreso" 
            ? "bg-gradient-to-br from-success/10 via-success/5 to-transparent" 
            : "bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent"
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10">
            {formData.tipo === "ingreso" ? (
              <TrendingUp className="w-full h-full" />
            ) : (
              <TrendingDown className="w-full h-full" />
            )}
          </div>
          
          <DialogHeader className="relative">
            <div className="flex items-center gap-4">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                formData.tipo === "ingreso" 
                  ? "bg-success/20" 
                  : "bg-destructive/20"
              }`}>
                {formData.tipo === "ingreso" ? (
                  <TrendingUp className="h-6 w-6 text-success" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-destructive" />
                )}
              </div>
              <DialogTitle className="text-2xl">
                Nuevo {formData.tipo === "ingreso" ? "Ingreso" : "Egreso"}
              </DialogTitle>
            </div>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Tipo y Categoría */}
          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Información del Movimiento</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo" className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    Tipo de Movimiento *
                  </Label>
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

                <div className="space-y-2">
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monto" className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    Monto (S/) *
                  </Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="0.00"
                    className="text-lg font-semibold"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Fecha *
                  </Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
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
            </CardContent>
          </Card>

          {/* Empadronado */}
          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <UserCircle className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Empadronado (Opcional)</h3>
              </div>
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
              {empadronadoSeleccionado && (
                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium">{empadronadoSeleccionado.nombres}</p>
                  <p className="text-xs text-muted-foreground">
                    Padrón: {empadronadoSeleccionado.numeroPadron} • DNI: {empadronadoSeleccionado.dni}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información Adicional */}
          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Información Adicional</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numeroComprobante">N° Comprobante</Label>
                  <Input
                    id="numeroComprobante"
                    value={formData.numeroComprobante}
                    onChange={(e) => setFormData({ ...formData, numeroComprobante: e.target.value })}
                    placeholder="Ej: F001-0001234"
                  />
                </div>

                {formData.tipo === "egreso" && (
                  <div className="space-y-2">
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
                  <div className="space-y-2 md:col-span-2">
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

              <div className="space-y-2">
                <Label htmlFor="observaciones">Observaciones</Label>
                <Textarea
                  id="observaciones"
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Información adicional (opcional)"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Comprobantes */}
          <Card className="border-primary/20 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                <h3 className="font-semibold">Comprobantes</h3>
              </div>
              
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 hover:border-primary/30 transition-all">
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
                      className="flex items-center justify-between p-3 bg-gradient-to-r from-muted/50 to-transparent rounded-lg border group hover:border-primary/30 transition-colors"
                    >
                      <span className="text-sm truncate flex-1">{archivo.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => eliminarArchivo(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={guardando}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={guardando}
              className="gap-2"
            >
              {guardando ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
