import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/config/firebase";
import { Search, Ban, CheckCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Trabajador {
  id: string;
  nombre: string;
  dni: string;
  maestroObraId: string;
  maestroObraNombre?: string;
  empadronadoId: string;
  empadronadoNombre?: string;
  estado: string;
  fechaRegistro: number;
  habilitado: boolean;
}

export const ControlTrabajadores = () => {
  const { user } = useAuth();
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [filtrados, setFiltrados] = useState<Trabajador[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const trabajadoresRef = ref(db, "acceso/trabajadores");
    const maestrosRef = ref(db, "acceso/maestrosObra");
    const empadronadosRef = ref(db, "empadronados");

    const unsubscribe = onValue(trabajadoresRef, async (snapshot) => {
      if (snapshot.exists()) {
        // Cargar maestros y empadronados para nombres
        const maestrosSnap = await new Promise<any>((resolve) => {
          onValue(maestrosRef, (snap) => resolve(snap.val()), { onlyOnce: true });
        });
        const empadronadosSnap = await new Promise<any>((resolve) => {
          onValue(empadronadosRef, (snap) => resolve(snap.val()), { onlyOnce: true });
        });

        const maestrosMap = maestrosSnap || {};
        const empadronadosMap = empadronadosSnap || {};

        const data: Trabajador[] = [];
        
        Object.entries(snapshot.val()).forEach(([regId, reg]: any) => {
          (reg.trabajadores || []).forEach((t: any, index: number) => {
            const maestro = maestrosMap[reg.maestroObraId];
            const emp = empadronadosMap[reg.empadronadoId];
            
            data.push({
              id: `${regId}-${index}`,
              nombre: t.nombre,
              dni: t.dni,
              maestroObraId: reg.maestroObraId,
              maestroObraNombre: maestro?.nombre || "Desconocido",
              empadronadoId: reg.empadronadoId,
              empadronadoNombre: emp ? `${emp.nombre} ${emp.apellidos}` : "Desconocido",
              estado: reg.estado || "pendiente",
              fechaRegistro: reg.createdAt || reg.fechaCreacion || Date.now(),
              habilitado: t.habilitado !== false,
            });
          });
        });

        setTrabajadores(data.sort((a, b) => b.fechaRegistro - a.fechaRegistro));
        setFiltrados(data.sort((a, b) => b.fechaRegistro - a.fechaRegistro));
      } else {
        setTrabajadores([]);
        setFiltrados([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      setFiltrados(
        trabajadores.filter(
          (t) =>
            t.nombre.toLowerCase().includes(termino) ||
            t.dni.toLowerCase().includes(termino) ||
            t.maestroObraNombre?.toLowerCase().includes(termino) ||
            t.empadronadoNombre?.toLowerCase().includes(termino)
        )
      );
    } else {
      setFiltrados(trabajadores);
    }
  }, [busqueda, trabajadores]);

  const handleToggleHabilitado = async (trabajador: Trabajador) => {
    try {
      const [regId, index] = trabajador.id.split("-");
      const path = `acceso/trabajadores/${regId}/trabajadores/${index}/habilitado`;
      
      await update(ref(db), {
        [path]: !trabajador.habilitado,
      });

      toast.success(
        trabajador.habilitado
          ? "Trabajador inhabilitado"
          : "Trabajador habilitado"
      );
    } catch (error) {
      toast.error("Error al cambiar estado del trabajador");
      console.error(error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de búsqueda */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre, DNI, maestro de obra o empadronado..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{trabajadores.length}</div>
            <p className="text-sm text-muted-foreground">Total Trabajadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {trabajadores.filter((t) => t.habilitado).length}
            </div>
            <p className="text-sm text-muted-foreground">Habilitados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {trabajadores.filter((t) => !t.habilitado).length}
            </div>
            <p className="text-sm text-muted-foreground">Inhabilitados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Control de Trabajadores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Maestro de Obra</TableHead>
                  <TableHead>Empadronado</TableHead>
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
                      No se encontraron trabajadores
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((trabajador) => (
                    <TableRow key={trabajador.id}>
                      <TableCell className="font-medium">{trabajador.nombre}</TableCell>
                      <TableCell>{trabajador.dni}</TableCell>
                      <TableCell>{trabajador.maestroObraNombre}</TableCell>
                      <TableCell className="text-sm">
                        {trabajador.empadronadoNombre}
                      </TableCell>
                      <TableCell>
                        <Badge variant={trabajador.habilitado ? "default" : "destructive"}>
                          {trabajador.habilitado ? "Habilitado" : "Inhabilitado"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant={trabajador.habilitado ? "destructive" : "default"}
                          onClick={() => handleToggleHabilitado(trabajador)}
                        >
                          {trabajador.habilitado ? (
                            <>
                              <Ban className="h-3 w-3 mr-1" />
                              Inhabilitar
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Habilitar
                            </>
                          )}
                        </Button>
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
