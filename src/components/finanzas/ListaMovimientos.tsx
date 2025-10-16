import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, TrendingUp, TrendingDown, Pencil, Trash2 } from "lucide-react";
import { obtenerMovimientos } from "@/services/finanzas";
import { MovimientoFinanciero } from "@/types/finanzas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ListaMovimientosProps {
  onVerDetalle: (movimiento: MovimientoFinanciero) => void;
  onEditar?: (movimiento: MovimientoFinanciero) => void;
  onEliminar?: (movimientoId: string) => void;
  refreshKey?: number;
  filtroTipo?: "ingreso" | "egreso";
}

const categoriasLabels: Record<string, string> = {
  // Ingresos
  cuotas: "Cuotas Mensuales",
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

export const ListaMovimientos = ({ onVerDetalle, onEditar, onEliminar, refreshKey, filtroTipo }: ListaMovimientosProps) => {
  const [movimientos, setMovimientos] = useState<MovimientoFinanciero[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarMovimientos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, filtroTipo]);

  const cargarMovimientos = async () => {
    try {
      setCargando(true);
      const data = await obtenerMovimientos({ tipo: filtroTipo });
      setMovimientos(data);
    } finally {
      setCargando(false);
    }
  };

  const handleEliminar = (e: React.MouseEvent, movimientoId: string) => {
    e.stopPropagation(); // Evitar que se abra el detalle
    if (confirm("¿Estás seguro de que deseas eliminar este movimiento?")) {
      onEliminar?.(movimientoId);
    }
  };

  const handleEditar = (e: React.MouseEvent, movimiento: MovimientoFinanciero) => {
    e.stopPropagation(); // Evitar que se abra el detalle
    onEditar?.(movimiento);
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
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
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
                    <TableRow
                      key={movimiento.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => onVerDetalle(movimiento)}
                    >
                      <TableCell className="font-medium">
                        {movimiento.fecha && !isNaN(new Date(movimiento.fecha).getTime())
                          ? format(new Date(movimiento.fecha), "dd/MM/yyyy", { locale: es })
                          : "Fecha inválida"}
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
                      <TableCell>{categoriasLabels[movimiento.categoria] ?? movimiento.categoria}</TableCell>
                      <TableCell className="max-w-xs truncate">{movimiento.descripcion}</TableCell>
                      <TableCell className="text-right font-medium">
                        <span className={movimiento.tipo === "ingreso" ? "text-green-600" : "text-red-600"}>
                          {movimiento.tipo === "ingreso" ? "+" : "-"} S/ {Number(movimiento.monto).toFixed(2)}
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
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEditar(e, movimiento)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEliminar(e, movimiento.id)}
                            className="text-destructive hover:text-destructive"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {movimientos.map((movimiento) => (
          <Card
            key={movimiento.id}
            className="relative overflow-hidden cursor-pointer hover:shadow-md transition-all duration-300 active:scale-[0.98]"
            onClick={() => onVerDetalle(movimiento)}
          >
            {/* Colored accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
              movimiento.tipo === "ingreso" 
                ? "bg-gradient-to-b from-success to-success/60" 
                : "bg-gradient-to-b from-destructive to-destructive/60"
            }`} />
            
            <CardContent className="p-4 pl-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant={movimiento.tipo === "ingreso" ? "default" : "destructive"}
                      className="text-xs"
                    >
                      {movimiento.tipo === "ingreso" ? (
                        <TrendingUp className="h-3 w-3 mr-1" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-1" />
                      )}
                      {movimiento.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {movimiento.fecha && !isNaN(new Date(movimiento.fecha).getTime())
                        ? format(new Date(movimiento.fecha), "dd/MM/yyyy", { locale: es })
                        : "Fecha inválida"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">
                    {categoriasLabels[movimiento.categoria] ?? movimiento.categoria}
                  </p>
                  <p className="text-sm font-medium line-clamp-2">
                    {movimiento.descripcion}
                  </p>
                </div>
                
                <div className="text-right flex-shrink-0">
                  <div className={`text-lg font-bold ${
                    movimiento.tipo === "ingreso" ? "text-success" : "text-destructive"
                  }`}>
                    {movimiento.tipo === "ingreso" ? "+" : "-"}S/ {Number(movimiento.monto).toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="truncate max-w-[120px]">{movimiento.registradoPorNombre}</span>
                  {movimiento.comprobantes && movimiento.comprobantes.length > 0 && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      <span>{movimiento.comprobantes.length}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={(e) => handleEditar(e, movimiento)}
                    title="Editar"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={(e) => handleEliminar(e, movimiento.id)}
                    title="Eliminar"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
};
