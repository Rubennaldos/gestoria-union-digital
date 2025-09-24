import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, CreditCard, FileText, User, Link2, Copy } from "lucide-react";
import { Empadronado } from "@/types/empadronados";
import { Pago, MetodoPago } from "@/types/cobranzas";
import { toast } from "sonner";

import { useBillingConfig } from "@/contexts/BillingConfigContext";
import { calcularDeuda } from "@/lib/cobranzas/debt";

interface DetalleEmpadronadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  onRegistrarPago: (pago: Pago) => void;
}

export const DetalleEmpadronadoModal = ({
  open,
  onOpenChange,
  empadronado,
  onRegistrarPago,
}: DetalleEmpadronadoModalProps) => {
  const cfg = useBillingConfig();
  const [loading, setLoading] = useState(false);

  // 1) Deuda oficial según reglas (independiente del shape de retorno)
  const deudaCalc = useMemo(() => {
    if (!empadronado) return { monto: 0, quincenas: 0 } as any;
    const fechaIngresoISO = ensureISO((empadronado as any).fechaIngreso);
    // No imponemos tipo fuerte aquí para ser compatibles con tu debt.ts actual
    return calcularDeuda({ fechaIngresoISO }, cfg) as any;
  }, [empadronado, cfg]);

  // 2) Adaptador de forma: usa breakdown|items|detalle (el que exista)
  const deudaItems = useMemo(() => {
    const raw: any[] =
      (deudaCalc && (deudaCalc.breakdown || deudaCalc.items || deudaCalc.detalle)) || [];

    // Normalizamos a la forma que pinta la UI
    return raw.map((b: any) => ({
      periodo: String(b.periodo ?? b.period ?? b.mes ?? ""), // "YYYY-MM"
      saldo: Number(b.monto ?? b.importe ?? 0),
      estado: b.vencido ? "moroso" : "pendiente",
    }));
  }, [deudaCalc]);

  useEffect(() => {
    if (open && empadronado) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 100);
      return () => clearTimeout(t);
    }
  }, [open, empadronado]);

  if (!empadronado) return null;

  const esMoroso = Number(deudaCalc?.quincenas ?? 0) > 0;

  const generarLinkCompartir = () =>
    `${window.location.origin}/consulta-deuda?dni=${empadronado.dni}&padron=${empadronado.numeroPadron}`;

  const copiarLink = () => {
    navigator.clipboard.writeText(generarLinkCompartir());
    toast.success("Link copiado al portapapeles");
  };

  const handleRegistrarPago = (periodo: string, monto: number) => {
    const [year, month] = periodo.split("-").map(Number);
    const pagoData: Pago = {
      id: "",
      empadronadoId: empadronado.id,
      numeroPadron: empadronado.numeroPadron,
      año: year,
      mes: month,
      monto,
      montoOriginal: monto,
      estado: "pendiente",
      fechaVencimiento: `${String(cfg.vencimientoDia).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
      metodoPago: "efectivo" as MetodoPago,
      descuentos: [],
      recargos: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      creadoPor: "admin",
    };
    onRegistrarPago(pagoData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalle del Asociado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Empadronado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre Completo</p>
                <p className="font-medium">
                  {empadronado.nombre} {empadronado.apellidos}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DNI</p>
                <p className="font-medium">{empadronado.dni}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Número de Padrón</p>
                <p className="font-medium">{empadronado.numeroPadron}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ubicación</p>
                <p className="font-medium">
                  {empadronado.manzana && empadronado.lote ? `Mz. ${empadronado.manzana} Lt. ${empadronado.lote}` : "No especificada"}
                </p>
              </div>

              {/* Estado según lógica oficial */}
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <div className="flex gap-2">
                  <Badge variant={empadronado.habilitado ? "default" : "secondary"}>
                    {empadronado.habilitado ? "Habilitado" : "No habilitado"}
                  </Badge>
                  <Badge variant={esMoroso ? "destructive" : "default"}>
                    {esMoroso ? "Moroso" : "Al día"}
                  </Badge>
                </div>
              </div>

              {/* Total oficial */}
              <div>
                <p className="text-sm text-muted-foreground">Deuda Total</p>
                <p className={`font-bold text-lg ${Number(deudaCalc?.monto ?? 0) > 0 ? "text-destructive" : "text-green-600"}`}>
                  S/ {Number(deudaCalc?.monto ?? 0).toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Link para compartir */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Link de Consulta para el Vecino
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generarLinkCompartir()}
                  readOnly
                  className="flex-1 p-2 border rounded text-sm bg-muted"
                />
                <Button onClick={copiarLink} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                El vecino puede usar este link para consultar su deuda y descargar comprobantes
              </p>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="deuda">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deuda">Estado de Cuenta</TabsTrigger>
              <TabsTrigger value="comprobantes">Comprobantes</TabsTrigger>
            </TabsList>

            <TabsContent value="deuda" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Estado de Cuenta</h3>
                <p className="text-sm text-muted-foreground">Total de periodos: {deudaItems.length}</p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                  <p className="text-muted-foreground">Cargando estado de cuenta...</p>
                </div>
              ) : deudaItems.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay deudas registradas</p>
                  <p className="text-sm text-muted-foreground">El asociado está al día con sus pagos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deudaItems.map((item, index) => {
                    const [year, month] = String(item.periodo).split("-").map(Number);
                    const fechaVenc = `${String(cfg.vencimientoDia).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

                    return (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">Periodo {String(month).padStart(2, "0")}/{year}</p>
                            <Badge variant={item.estado === "moroso" ? "destructive" : "secondary"}>
                              {item.estado}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">Vencimiento: {fechaVenc}</p>
                          <p className="text-xs text-muted-foreground">Cuota mensual</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold">S/ {Number(item.saldo).toFixed(2)}</p>
                            {item.estado === "moroso" && (
                              <p className="text-xs text-destructive">Incluye recargo por morosidad</p>
                            )}
                          </div>
                          <Button size="sm" onClick={() => handleRegistrarPago(item.periodo, item.saldo)} className="ml-2">
                            <CreditCard className="h-4 w-4 mr-1" />
                            Pagar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comprobantes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Comprobantes de Pago</h3>
              </div>

              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Funcionalidad en desarrollo</p>
                <p className="text-sm text-muted-foreground">
                  Los comprobantes se mostrarán aquí una vez que se implementen los pagos
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/** Asegura "YYYY-MM-DD" sin romper tus datos actuales */
function ensureISO(v: string | number): string {
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (typeof v === "string" && /^\d{8}$/.test(v)) {
    return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  }
  if (typeof v === "number") {
    const d = new Date(v);
    return d.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}
  