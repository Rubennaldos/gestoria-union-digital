import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  Clock, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Eye
} from "lucide-react";
import { useAuthz } from "@/contexts/AuthzContext";
import { obtenerPagosPendientesV2 } from "@/services/cobranzas-v2";
import { getEmpadronados } from "@/services/empadronados";
import { PagoV2 } from "@/types/cobranzas-v2";
import { Empadronado } from "@/types/empadronados";

export const PagosPendientesWidget = () => {
  const navigate = useNavigate();
  const { can } = useAuthz();
  const [pagosPendientes, setPagosPendientes] = useState<PagoV2[]>([]);
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [loading, setLoading] = useState(true);

  // Solo mostrar si tiene acceso al módulo cobranzas-v2
  const tieneAcceso = can("cobranzas-v2", "write");

  useEffect(() => {
    if (tieneAcceso) {
      cargarPagosPendientes();
    } else {
      setLoading(false);
    }
  }, [tieneAcceso]);

  const cargarPagosPendientes = async () => {
    try {
      setLoading(true);
      const [pagos, emps] = await Promise.all([
        obtenerPagosPendientesV2(),
        getEmpadronados()
      ]);
      setPagosPendientes(pagos.slice(0, 5)); // Solo mostrar los primeros 5
      setEmpadronados(emps);
    } catch (error) {
      console.error("Error cargando pagos pendientes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getEmpadronadoNombre = (empadronadoId: string): string => {
    const emp = empadronados.find(e => e.id === empadronadoId);
    return emp ? `${emp.nombre} ${emp.apellidos}` : "Desconocido";
  };

  const getEmpadronadoPadron = (empadronadoId: string): string => {
    const emp = empadronados.find(e => e.id === empadronadoId);
    return emp?.numeroPadron || "";
  };

  const formatPeriodo = (periodo: string) => {
    const year = periodo.substring(0, 4);
    const month = parseInt(periodo.substring(4, 6));
    return new Date(parseInt(year), month - 1).toLocaleDateString('es-PE', {
      month: 'short',
      year: 'numeric'
    });
  };

  const formatFecha = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short'
    });
  };

  // No mostrar si no tiene acceso o no hay pagos pendientes
  if (!tieneAcceso) return null;

  if (loading) {
    return (
      <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
        <CardContent className="py-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
        </CardContent>
      </Card>
    );
  }

  if (pagosPendientes.length === 0) return null;

  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-full">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <span className="text-lg">Pagos Pendientes</span>
              <Badge 
                variant="secondary" 
                className="ml-2 bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200"
              >
                {pagosPendientes.length}
              </Badge>
            </div>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/cobranzas-v2')}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300"
          >
            Ver todos
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {pagosPendientes.map((pago) => (
            <div 
              key={pago.id}
              className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-amber-100 dark:border-amber-900 hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate('/cobranzas-v2')}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium text-sm line-clamp-1">
                    {getEmpadronadoNombre(pago.empadronadoId)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{getEmpadronadoPadron(pago.empadronadoId)}</span>
                    <span>•</span>
                    <span className="capitalize">{formatPeriodo(pago.periodo)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold text-amber-700 dark:text-amber-300">
                    S/ {pago.monto.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFecha(pago.fechaCreacion)}
                  </p>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))}
        </div>

        {pagosPendientes.length > 0 && (
          <Button 
            className="w-full mt-4 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => navigate('/cobranzas-v2')}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Revisar y Aprobar Pagos
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
