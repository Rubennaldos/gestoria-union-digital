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
  XCircle,
  Loader2
} from "lucide-react";
import { useAuthz } from "@/contexts/AuthzContext";
import { obtenerPagosPendientesV2, aprobarPagoV2, rechazarPagoV2 } from "@/services/cobranzas-v2";
import { getEmpadronados } from "@/services/empadronados";
import { PagoV2 } from "@/types/cobranzas-v2";
import { Empadronado } from "@/types/empadronados";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const PagosPendientesWidget = () => {
  const navigate = useNavigate();
  const { can } = useAuthz();
  const { user, profile } = useAuth();
  const [pagosPendientes, setPagosPendientes] = useState<PagoV2[]>([]);
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);

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
      setPagosPendientes(pagos.slice(0, 6)); // Mostrar hasta 6 para 2 filas
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

  const handleAprobar = async (pago: PagoV2, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcesando(pago.id);
    try {
      await aprobarPagoV2(
        pago.id,
        "Aprobado desde dashboard",
        user?.uid,
        profile?.displayName || user?.email || "Usuario"
      );
      toast.success("Pago aprobado correctamente");
      cargarPagosPendientes();
    } catch (error) {
      console.error("Error aprobando pago:", error);
      toast.error("Error al aprobar el pago");
    } finally {
      setProcesando(null);
    }
  };

  const handleRechazar = async (pago: PagoV2, e: React.MouseEvent) => {
    e.stopPropagation();
    setProcesando(pago.id);
    try {
      await rechazarPagoV2(pago.id, "Rechazado desde dashboard");
      toast.success("Pago rechazado");
      cargarPagosPendientes();
    } catch (error) {
      console.error("Error rechazando pago:", error);
      toast.error("Error al rechazar el pago");
    } finally {
      setProcesando(null);
    }
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
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <div className="p-1.5 bg-amber-100 dark:bg-amber-900 rounded-full">
              <CreditCard className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-base">Pagos Pendientes</span>
            <Badge 
              variant="secondary" 
              className="bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200 text-xs"
            >
              {pagosPendientes.length}
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/cobranzas-v2')}
            className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-300 text-xs h-7 px-2"
          >
            Ver todos
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 px-3 pb-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {pagosPendientes.map((pago) => (
            <div 
              key={pago.id}
              className="flex flex-col p-2 bg-white dark:bg-gray-900 rounded-lg border border-amber-100 dark:border-amber-900 hover:shadow-md transition-all"
            >
              <div className="flex items-start gap-2 mb-2">
                <div className="p-1 bg-amber-100 dark:bg-amber-900/50 rounded-full shrink-0">
                  <Clock className="h-3 w-3 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-xs line-clamp-1" title={getEmpadronadoNombre(pago.empadronadoId)}>
                    {getEmpadronadoNombre(pago.empadronadoId)}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{getEmpadronadoPadron(pago.empadronadoId)}</span>
                    <span>•</span>
                    <span className="capitalize">{formatPeriodo(pago.periodo)}</span>
                  </div>
                </div>
                <span className="font-bold text-xs text-amber-700 dark:text-amber-300 shrink-0">
                  S/ {pago.monto.toFixed(2)}
                </span>
              </div>
              
              {/* Botones de acción */}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-6 text-[10px] text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                  onClick={(e) => handleAprobar(pago, e)}
                  disabled={procesando === pago.id}
                >
                  {procesando === pago.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Aprobar
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-6 text-[10px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={(e) => handleRechazar(pago, e)}
                  disabled={procesando === pago.id}
                >
                  <XCircle className="h-3 w-3 mr-1" />
                  Rechazar
                </Button>
              </div>
            </div>
          ))}
        </div>

        {pagosPendientes.length > 0 && (
          <Button 
            className="w-full mt-3 h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => navigate('/cobranzas-v2')}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Revisar Todos los Pagos
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
