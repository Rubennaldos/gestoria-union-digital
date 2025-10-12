import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, DollarSign } from "lucide-react";
import { obtenerResumenCaja, actualizarResumenCaja } from "@/services/finanzas";
import { ResumenCaja as ResumenCajaType } from "@/types/finanzas";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const ResumenCaja = () => {
  const [resumen, setResumen] = useState<ResumenCajaType | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarResumen();
  }, []);

  const cargarResumen = async () => {
    try {
      setCargando(true);
      // Forzar recálculo del resumen para asegurar datos actualizados
      await actualizarResumenCaja();
      const data = await obtenerResumenCaja();
      setResumen(data);
    } catch (error) {
      console.error("Error al cargar resumen:", error);
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!resumen) return null;

  const hayDiferencia = Math.abs(resumen.diferencia) > 1;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo en Caja</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {resumen.saldoActual.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Actualizado: {format(resumen.ultimaActualizacion, "dd/MM/yyyy HH:mm", { locale: es })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              S/ {resumen.totalIngresos.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Egresos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              S/ {resumen.totalEgresos.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Esperado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">S/ {resumen.saldoEsperado.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresos - Egresos registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {hayDiferencia && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-orange-900 dark:text-orange-100 mb-1">
                  Diferencia en Caja
                </h4>
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  Hay una diferencia de{" "}
                  <Badge variant={resumen.diferencia > 0 ? "default" : "destructive"}>
                    S/ {Math.abs(resumen.diferencia).toFixed(2)}
                  </Badge>{" "}
                  entre el saldo actual y el esperado.
                  {resumen.diferencia > 0 
                    ? " Hay más dinero del esperado en caja."
                    : " Falta dinero en caja según los registros."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
