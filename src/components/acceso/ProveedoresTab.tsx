// src/components/acceso/ProveedoresTab.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Car, User, Send, Clock, Zap, UtensilsCrossed, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";
import { registrarProveedor, enviarMensajeWhatsApp } from "@/services/acceso";
import { useAuth } from "@/contexts/AuthContext";

export function ProveedoresTab() {
  const [tipoAcceso, setTipoAcceso] = useState<"vehicular" | "peatonal">("peatonal");
  const [placa, setPlaca] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Usar empadronadoId directamente del perfil
  const empadronadoId = profile?.empadronadoId || "";
  const cargandoEmp = !profile;

  const serviciosRapidos = [
    { id: "gas", label: "Gas", icon: Zap, color: "bg-orange-500" },
    { id: "delivery", label: "Delivery de Comida", icon: UtensilsCrossed, color: "bg-green-500" },
  ] as const;

  const validarBase = (esRapido = false) => {
    if (cargandoEmp || !empadronadoId) {
      toast({ title: "No hay vecino vinculado", description: "Tu usuario no está vinculado a un empadronado.", variant: "destructive" });
      return false;
    }
    if (!esRapido && !empresa.trim()) {
      toast({ title: "Empresa requerida", description: "Debe especificar la empresa o servicio", variant: "destructive" });
      return false;
    }
    return true;
  };

  const registrarProveedorGeneral = async () => {
    if (!validarBase()) return;
    await procesarRegistro("otro", empresa.trim());
  };

  const registrarServicioRapido = async (tipoServicio: "gas" | "delivery") => {
    if (!validarBase(true)) return;
    const nombreServicio = tipoServicio === "gas" ? "GAS" : "DELIVERY DE COMIDA";
    await procesarRegistro(tipoServicio, nombreServicio);
  };

  const procesarRegistro = async (tipoServicio: "gas" | "delivery" | "otro", nombreEmpresa: string) => {
    try {
      const payload: Parameters<typeof registrarProveedor>[0] = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === "vehicular" ? placa.toUpperCase() : undefined,
        empresa: nombreEmpresa,
        tipoServicio,
        porticoId: "principal",
      };

      const id = await registrarProveedor(payload);

      enviarMensajeWhatsApp({ telefono: "", mensaje: `Autorizo a ${nombreEmpresa}. Código: ${id}` });

      setMostrarConfirmacion(true);
      if (tipoServicio === "otro") setEmpresa("");
      if (tipoAcceso === "vehicular") setPlaca("");

      toast({ title: "Registro exitoso", description: "Se envió la solicitud a vigilancia" });
    } catch (error: any) {
      console.error("registrarProveedor error:", error);
      toast({ title: "Error", description: error?.message || "No se pudo registrar al proveedor", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Ingreso Rápido</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {serviciosRapidos.map((s) => {
              const Icon = s.icon;
              return (
                <Button key={s.id} onClick={() => registrarServicioRapido(s.id)} className={`h-20 flex-col gap-2 ${s.color} hover:opacity-90 text-white`} size="lg">
                  <Icon className="h-8 w-8" />
                  <span className="font-medium">{s.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5" />Registro de Proveedores</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Acceso</Label>
            <RadioGroup value={tipoAcceso} onValueChange={(v) => setTipoAcceso(v as any)} className="flex gap-6">
              <div className="flex items-center space-x-2"><RadioGroupItem value="peatonal" id="peatonal-prov" /><Label htmlFor="peatonal-prov" className="flex items-center gap-2"><User className="h-4 w-4" />Peatonal</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="vehicular" id="vehicular-prov" /><Label htmlFor="vehicular-prov" className="flex items-center gap-2"><Car className="h-4 w-4" />Vehicular</Label></div>
            </RadioGroup>
          </div>

          {tipoAcceso === "vehicular" && (
            <div className="space-y-2">
              <Label htmlFor="placa-prov">Placa del Vehículo (opcional)</Label>
              <Input id="placa-prov" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-123" className="text-lg font-mono" />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa o Servicio *</Label>
            <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nombre de la empresa o servicio" className="text-lg" />
          </div>

          <Separator />

          <Button onClick={registrarProveedorGeneral} className="w-full h-12 flex items-center gap-2" size="lg">
            <Send className="h-5 w-5" />
            Registrar Proveedor
          </Button>
        </CardContent>
      </Card>

      <ConfirmacionDialog
        open={mostrarConfirmacion}
        onOpenChange={setMostrarConfirmacion}
        titulo="Esperando Confirmación de Vigilancia"
        contenido={
          <div className="space-y-4 text-center">
            <div className="flex justify-center"><Clock className="h-12 w-12 text-primary animate-pulse" /></div>
            <p className="font-medium">Su solicitud ha sido enviada</p>
            <p className="text-sm text-muted-foreground">Por favor espere la confirmación de vigilancia.</p>
          </div>
        }
      />
    </div>
  );
}
