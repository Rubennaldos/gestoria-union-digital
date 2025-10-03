import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { obtenerMaestrosObra, crearMaestroObra, actualizarMaestroObra, setActivoMaestroObra } from "@/services/acceso";
import { Plus, Search, Edit, Ban, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface MaestroObra {
  id: string;
  nombre: string;
  telefono?: string;
  dni?: string;
  empresa?: string;
  notas?: string;
  activo: boolean;
  createdAt: number;
}

export const GestionMaestrosObra = () => {
  const { user } = useAuth();
  const [maestros, setMaestros] = useState<MaestroObra[]>([]);
  const [filtrados, setFiltrados] = useState<MaestroObra[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editando, setEditando] = useState<MaestroObra | null>(null);

  const [formData, setFormData] = useState({
    nombre: "",
    telefono: "",
    dni: "",
    empresa: "",
    notas: "",
  });

  useEffect(() => {
    cargarMaestros();
  }, []);

  useEffect(() => {
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      setFiltrados(
        maestros.filter(
          (m) =>
            m.nombre.toLowerCase().includes(termino) ||
            m.dni?.toLowerCase().includes(termino) ||
            m.empresa?.toLowerCase().includes(termino) ||
            m.telefono?.toLowerCase().includes(termino)
        )
      );
    } else {
      setFiltrados(maestros);
    }
  }, [busqueda, maestros]);

  const cargarMaestros = async () => {
    setLoading(true);
    try {
      const data = await obtenerMaestrosObra();
      setMaestros(data);
      setFiltrados(data);
    } catch (error) {
      toast.error("Error al cargar maestros de obra");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    try {
      if (editando) {
        await actualizarMaestroObra(editando.id, formData);
        toast.success("Maestro de obra actualizado");
      } else {
        await crearMaestroObra({
          ...formData,
          creadoPorUid: user?.uid,
        });
        toast.success("Maestro de obra creado");
      }
      
      setModalOpen(false);
      resetForm();
      cargarMaestros();
    } catch (error) {
      toast.error("Error al guardar maestro de obra");
      console.error(error);
    }
  };

  const handleToggleActivo = async (id: string, activo: boolean) => {
    try {
      await setActivoMaestroObra(id, !activo);
      toast.success(`Maestro ${!activo ? "habilitado" : "deshabilitado"}`);
      cargarMaestros();
    } catch (error) {
      toast.error("Error al cambiar estado");
      console.error(error);
    }
  };

  const handleEditar = (maestro: MaestroObra) => {
    setEditando(maestro);
    setFormData({
      nombre: maestro.nombre,
      telefono: maestro.telefono || "",
      dni: maestro.dni || "",
      empresa: maestro.empresa || "",
      notas: maestro.notas || "",
    });
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      nombre: "",
      telefono: "",
      dni: "",
      empresa: "",
      notas: "",
    });
    setEditando(null);
  };

  return (
    <div className="space-y-4">
      {/* Barra de acciones */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre, DNI, empresa, teléfono..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full"
              />
            </div>
            <Dialog open={modalOpen} onOpenChange={(open) => {
              setModalOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Maestro
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editando ? "Editar Maestro de Obra" : "Nuevo Maestro de Obra"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="nombre">Nombre Completo *</Label>
                    <Input
                      id="nombre"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="dni">DNI</Label>
                    <Input
                      id="dni"
                      value={formData.dni}
                      onChange={(e) => setFormData({ ...formData, dni: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefono">Teléfono</Label>
                    <Input
                      id="telefono"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="empresa">Empresa</Label>
                    <Input
                      id="empresa"
                      value={formData.empresa}
                      onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="notas">Notas</Label>
                    <Textarea
                      id="notas"
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
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
                    <Button type="submit">
                      {editando ? "Actualizar" : "Crear"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{maestros.length}</div>
            <p className="text-sm text-muted-foreground">Total Maestros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {maestros.filter((m) => m.activo).length}
            </div>
            <p className="text-sm text-muted-foreground">Activos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {maestros.filter((m) => !m.activo).length}
            </div>
            <p className="text-sm text-muted-foreground">Inactivos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Maestros de Obra</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center">
                      No se encontraron maestros de obra
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((maestro) => (
                    <TableRow key={maestro.id}>
                      <TableCell className="font-medium">{maestro.nombre}</TableCell>
                      <TableCell>{maestro.dni || "-"}</TableCell>
                      <TableCell>{maestro.telefono || "-"}</TableCell>
                      <TableCell>{maestro.empresa || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={maestro.activo ? "default" : "destructive"}>
                          {maestro.activo ? "Activo" : "Inactivo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditar(maestro)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant={maestro.activo ? "destructive" : "default"}
                            onClick={() => handleToggleActivo(maestro.id, maestro.activo)}
                          >
                            {maestro.activo ? (
                              <Ban className="h-3 w-3" />
                            ) : (
                              <CheckCircle className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
