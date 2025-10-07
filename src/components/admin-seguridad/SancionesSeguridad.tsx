import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ban, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { ref, push, set, get } from "firebase/database";
import { db } from "@/config/firebase";
import { obtenerMaestrosObra } from "@/services/acceso";
import { MaestroObra } from "@/types/acceso";

export const SancionesSeguridad = () => {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoEntidad, setTipoEntidad] = useState<"empadronado" | "maestro_obra">("empadronado");
  const [tipoSancion, setTipoSancion] = useState("amonestacion");
  const [maestrosObra, setMaestrosObra] = useState<MaestroObra[]>([]);
  const [loadingMaestros, setLoadingMaestros] = useState(false);
  
  const [formData, setFormData] = useState({
    entidadId: "",
    entidadNombre: "",
    entidadDocumento: "",
    motivo: "",
    descripcion: "",
    montoMulta: "",
    fechaVencimiento: "",
    observaciones: "",
  });

  // Cargar maestros de obra cuando el modal se abre y el tipo es maestro_obra
  useEffect(() => {
    if (modalOpen && tipoEntidad === "maestro_obra") {
      cargarMaestrosObra();
    }
  }, [modalOpen, tipoEntidad]);

  const cargarMaestrosObra = async () => {
    try {
      setLoadingMaestros(true);
      const maestros = await obtenerMaestrosObra();
      setMaestrosObra(maestros);
    } catch (error) {
      console.error("Error al cargar maestros de obra:", error);
      toast.error("Error al cargar maestros de obra");
    } finally {
      setLoadingMaestros(false);
    }
  };

  const handleMaestroSelect = (maestroId: string) => {
    const maestro = maestrosObra.find(m => m.id === maestroId);
    if (maestro) {
      setFormData({
        ...formData,
        entidadId: maestro.id,
        entidadNombre: maestro.nombre,
        entidadDocumento: maestro.dni || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.entidadNombre.trim() || !formData.motivo.trim() || !formData.descripcion.trim()) {
      toast.error("Complete todos los campos obligatorios");
      return;
    }

    try {
      const sancionesRef = ref(db, "sanciones");
      
      // Generar número de resolución correlativo automático
      const sancionesSnap = await get(sancionesRef);
      let ultimoNumero = 0;
      if (sancionesSnap.exists()) {
        const sanciones = Object.values(sancionesSnap.val());
        sanciones.forEach((s: any) => {
          if (s.numeroResolucion) {
            const match = s.numeroResolucion.match(/RES-\d{4}-(\d+)/);
            if (match) {
              const num = parseInt(match[1]);
              if (num > ultimoNumero) ultimoNumero = num;
            }
          }
        });
      }
      
      const year = new Date().getFullYear();
      const siguienteNumero = ultimoNumero + 1;
      const numeroResolucion = `RES-${year}-${siguienteNumero.toString().padStart(4, '0')}`;
      
      const newSancionRef = push(sancionesRef);
      const numeroSancion = `SAN-${Date.now().toString().slice(-6)}`;
      
      const sancionData = {
        id: newSancionRef.key,
        numeroSancion,
        numeroResolucion,
        tipoEntidad,
        entidadId: formData.entidadId || newSancionRef.key,
        entidadNombre: formData.entidadNombre.trim(),
        entidadDocumento: formData.entidadDocumento.trim() || undefined,
        tipoSancion,
        motivo: formData.motivo.trim(),
        descripcion: formData.descripcion.trim(),
        montoMulta: formData.montoMulta ? parseFloat(formData.montoMulta) : undefined,
        fechaAplicacion: new Date().toISOString(),
        fechaVencimiento: formData.fechaVencimiento || undefined,
        estado: "activa",
        aplicadoPor: user?.uid,
        aplicadoPorNombre: user?.email || "Sistema",
        observaciones: formData.observaciones.trim() || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      await set(newSancionRef, sancionData);

      // Si hay multa, crear registro en cobranzas
      if (formData.montoMulta && parseFloat(formData.montoMulta) > 0) {
        const cobranzaRef = push(ref(db, "cobranzas/sanciones"));
        await set(cobranzaRef, {
          sancionId: newSancionRef.key,
          numeroSancion,
          entidadId: formData.entidadId || newSancionRef.key,
          entidadNombre: formData.entidadNombre,
          monto: parseFloat(formData.montoMulta),
          estado: "pendiente",
          fechaEmision: Date.now(),
          fechaVencimiento: formData.fechaVencimiento
            ? new Date(formData.fechaVencimiento).getTime()
            : undefined,
        });
      }

      toast.success("Sanción registrada exitosamente");
      setModalOpen(false);
      resetForm();
    } catch (error) {
      toast.error("Error al registrar la sanción");
      console.error(error);
    }
  };

  const resetForm = () => {
    setFormData({
      entidadId: "",
      entidadNombre: "",
      entidadDocumento: "",
      motivo: "",
      descripcion: "",
      montoMulta: "",
      fechaVencimiento: "",
      observaciones: "",
    });
    setTipoEntidad("empadronado");
    setTipoSancion("amonestacion");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Gestión de Sanciones
            </CardTitle>
            <Dialog open={modalOpen} onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nueva Sanción
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Registrar Nueva Sanción</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="tipoEntidad">Tipo de Entidad *</Label>
                      <Select value={tipoEntidad} onValueChange={(value: any) => setTipoEntidad(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="empadronado">Empadronado</SelectItem>
                          <SelectItem value="maestro_obra">Maestro de Obra</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="tipoSancion">Tipo de Sanción *</Label>
                      <Select value={tipoSancion} onValueChange={setTipoSancion}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="amonestacion">Amonestación</SelectItem>
                          <SelectItem value="multa">Multa</SelectItem>
                          <SelectItem value="suspension_temporal">Suspensión Temporal</SelectItem>
                          <SelectItem value="suspension_permanente">Suspensión Permanente</SelectItem>
                          <SelectItem value="inhabilitacion">Inhabilitación</SelectItem>
                          <SelectItem value="otros">Otros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {tipoEntidad === "maestro_obra" ? (
                    <div>
                      <Label htmlFor="maestroSelect">Seleccionar Maestro de Obra *</Label>
                      <Select 
                        value={formData.entidadId} 
                        onValueChange={handleMaestroSelect}
                        disabled={loadingMaestros}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={loadingMaestros ? "Cargando..." : "Seleccionar maestro de obra"} />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          {maestrosObra.map((maestro) => (
                            <SelectItem key={maestro.id} value={maestro.id}>
                              {maestro.nombre} {maestro.dni ? `- DNI: ${maestro.dni}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formData.entidadNombre && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Seleccionado: {formData.entidadNombre}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="entidadNombre">Nombre Completo *</Label>
                      <Input
                        id="entidadNombre"
                        value={formData.entidadNombre}
                        onChange={(e) => setFormData({ ...formData, entidadNombre: e.target.value })}
                        required
                      />
                    </div>
                  )}

                  {tipoEntidad !== "maestro_obra" && (
                    <div>
                      <Label htmlFor="entidadDocumento">DNI / Documento</Label>
                      <Input
                        id="entidadDocumento"
                        value={formData.entidadDocumento}
                        onChange={(e) => setFormData({ ...formData, entidadDocumento: e.target.value })}
                      />
                    </div>
                  )}

                  <div>
                    <Label htmlFor="motivo">Motivo *</Label>
                    <Input
                      id="motivo"
                      value={formData.motivo}
                      onChange={(e) => setFormData({ ...formData, motivo: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="descripcion">Descripción Detallada *</Label>
                    <Textarea
                      id="descripcion"
                      value={formData.descripcion}
                      onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>

                  {(tipoSancion === "multa" || tipoSancion === "suspension_temporal") && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="montoMulta">Monto de Multa (S/)</Label>
                        <Input
                          id="montoMulta"
                          type="number"
                          step="0.01"
                          value={formData.montoMulta}
                          onChange={(e) => setFormData({ ...formData, montoMulta: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="fechaVencimiento">Fecha de Vencimiento</Label>
                        <Input
                          id="fechaVencimiento"
                          type="date"
                          value={formData.fechaVencimiento}
                          onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  <div className="p-3 bg-muted/50 rounded-lg text-sm">
                    <p className="text-muted-foreground">
                      ℹ️ El <strong>Número de Resolución</strong> se generará automáticamente con formato: RES-{new Date().getFullYear()}-XXXX
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      value={formData.observaciones}
                      onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setModalOpen(false);
                        resetForm();
                      }}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit">Registrar Sanción</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Ban className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Registre sanciones para empadronados y maestros de obra</p>
            <p className="text-sm mt-2">
              Las multas se integrarán automáticamente con el módulo de Cobranzas V2
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
