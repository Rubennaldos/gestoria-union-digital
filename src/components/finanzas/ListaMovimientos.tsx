import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, FileText, TrendingUp, TrendingDown } from "lucide-react";
import { obtenerMovimientos } from "@/services/finanzas";
import { MovimientoFinanciero } from "@/types/finanzas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ListaMovimientosProps {
  onVerDetalle: (movimiento: MovimientoFinanciero) => void;
  refreshKey?: number;
}

const categoriasLabels: Record<string, string> = {
  // Ingresos
  donacion: "Donación",
  multa_externa: "Multa Externa",
  evento: "Evento",
  alquiler: "Alquiler",
  intereses: "Intereses",
  // Egresos
  mantenimiento: "Mantenimiento",
  servicios: "Servicios",
  personal: "Personal",
  seguridad: "Seguridad",
  compras: "Compras",
  eventos: "Eventos",
  reparaciones: "Reparaciones",
  otro: "Otro",
};

export const ListaMovimientos = ({ onVerDetalle, refreshKey }: ListaMovimientosProps) => {
  const [movimientos, setMovimientos] = useState<MovimientoFinanciero[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMovimientos();
  }, [refreshKey]);

  const cargarMovimientos = async () => {
    try {
      setCargando(true);
      const data = await obtenerMovimientos();
      setMovimientos(data);
    } catch (error) {
      console.error("Error al cargar movimientos:", error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Cargando movimientos...</p>
        </CardContent>
      </Card>
    );
  }

  if (movimientos.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">No hay movimientos registrados</p>
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
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead>Registrado por</TableHead>
                <TableHead>Comprobantes</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movimientos.map((movimiento) => (
                <TableRow key={movimiento.id}>
                  <TableCell className="font-medium">
                    {format(new Date(movimiento.fecha), "dd/MM/yyyy", { locale: es })}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={movimiento.tipo === "ingreso" ? "default" : "destructive"}
                      className="flex items-center gap-1 w-fit"
                    >
                      {movimiento.tipo === "ingreso" ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {movimiento.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                    </Badge>
                  </TableCell>
                  <TableCell>{categoriasLabels[movimiento.categoria]}</TableCell>
                  <TableCell className="max-w-xs truncate">{movimiento.descripcion}</TableCell>
                  <TableCell className="text-right font-medium">
                    <span
                      className={
                        movimiento.tipo === "ingreso" ? "text-green-600" : "text-red-600"
                      }
                    >
                      {movimiento.tipo === "ingreso" ? "+" : "-"} S/ {movimiento.monto.toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{movimiento.registradoPorNombre}</TableCell>
                  <TableCell>
                    {movimiento.comprobantes && movimiento.comprobantes.length > 0 ? (
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{movimiento.comprobantes.length}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onVerDetalle(movimiento)}
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
