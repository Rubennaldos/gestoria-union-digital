import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, FileDown, Printer } from "lucide-react";
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Sancion {
  id: string;
  numeroSancion: string;
  numeroResolucion: string;
  tipoEntidad: "empadronado" | "maestro_obra";
  entidadNombre: string;
  entidadDocumento?: string;
  tipoSancion: string;
  motivo: string;
  descripcion: string;
  montoMulta?: number;
  fechaAplicacion: string;
  fechaVencimiento?: string;
  estado: string;
  aplicadoPorNombre: string;
  observaciones?: string;
  createdAt: number;
}

interface ListaSancionesProps {
  onVerDetalle: (sancion: Sancion) => void;
}

export const ListaSanciones = ({ onVerDetalle }: ListaSancionesProps) => {
  const [sanciones, setSanciones] = useState<Sancion[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarSanciones();
  }, []);

  const cargarSanciones = async () => {
    try {
      setCargando(true);
      const sancionesRef = ref(db, "sanciones");
      const snapshot = await get(sancionesRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const sancionesArray: Sancion[] = Object.values(data);
        sancionesArray.sort((a, b) => b.createdAt - a.createdAt);
        setSanciones(sancionesArray);
      }
    } catch (error) {
      console.error("Error al cargar sanciones:", error);
    } finally {
      setCargando(false);
    }
  };

  const getTipoSancionLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      amonestacion: "Amonestación",
      multa: "Multa",
      suspension_temporal: "Suspensión Temporal",
      suspension_permanente: "Suspensión Permanente",
      inhabilitacion: "Inhabilitación",
      otros: "Otros",
    };
    return labels[tipo] || tipo;
  };

  const getEstadoBadge = (estado: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      activa: "destructive",
      cumplida: "secondary",
      anulada: "outline",
    };
    return <Badge variant={variants[estado] || "default"}>{estado.toUpperCase()}</Badge>;
  };

  if (cargando) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Cargando sanciones...</p>
        </CardContent>
      </Card>
    );
  }

  if (sanciones.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No hay sanciones registradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Resolución</TableHead>
                <TableHead>Sancionado</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Aplicado por</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sanciones.map((sancion) => (
                <TableRow key={sancion.id}>
                  <TableCell className="font-medium">{sancion.numeroResolucion}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{sancion.entidadNombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {sancion.tipoEntidad === "maestro_obra" ? "Maestro de Obra" : "Empadronado"}
                        {sancion.entidadDocumento && ` - DNI: ${sancion.entidadDocumento}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{getTipoSancionLabel(sancion.tipoSancion)}</TableCell>
                  <TableCell className="max-w-xs truncate">{sancion.motivo}</TableCell>
                  <TableCell>
                    {format(new Date(sancion.fechaAplicacion), "dd/MM/yyyy HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell className="text-sm">{sancion.aplicadoPorNombre}</TableCell>
                  <TableCell>{getEstadoBadge(sancion.estado)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onVerDetalle(sancion)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
