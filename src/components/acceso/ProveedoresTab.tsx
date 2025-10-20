// src/components/acceso/ProveedoresTab.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Car, User, Send, Clock, Zap, UtensilsCrossed, Truck, FileText, Plus, Store, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";
import { ReglamentoDialog } from "@/components/acceso/ReglamentoDialog";
import { registrarProveedor, enviarMensajeWhatsApp } from "@/services/acceso";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { getConfigWhatsApp, generarDetallesSolicitud, abrirWhatsApp } from "@/lib/whatsappAcceso";

export function ProveedoresTab() {
  const [tipoAcceso, setTipoAcceso] = useState<"vehicular" | "peatonal">("peatonal");
  const [placas, setPlacas] = useState<{ id: string; placa: string }[]>([{ id: "1", placa: "" }]);
  const [empresa, setEmpresa] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [aceptaReglamento, setAceptaReglamento] = useState(false);
  const [textoReglamento, setTextoReglamento] = useState("");
  const [mostrarReglamento, setMostrarReglamento] = useState(false);

  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Usar empadronadoId directamente del perfil
  const empadronadoId = profile?.empadronadoId || "";
  const cargandoEmp = !profile;

  useEffect(() => {
    cargarReglamento();
  }, []);

  const cargarReglamento = async () => {
    try {
      const reglamentoRef = ref(db, "configuracion/reglamento_acceso");
      const snapshot = await get(reglamentoRef);
      
      if (snapshot.exists()) {
        setTextoReglamento(snapshot.val().texto || "");
      }
    } catch (error) {
      console.error("Error al cargar reglamento:", error);
    }
  };

  const agregarPlaca = () => {
    setPlacas((prev) => [...prev, { id: Date.now().toString(), placa: "" }]);
  };
  const actualizarPlaca = (id: string, valor: string) => {
    setPlacas((prev) => prev.map((p) => (p.id === id ? { ...p, placa: valor.toUpperCase() } : p)));
  };
  const eliminarPlaca = (id: string) => {
    setPlacas((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  };

  const serviciosRapidos = [
    { id: "gas", label: "Gas", icon: Zap, color: "bg-orange-500" },
    { id: "delivery", label: "Delivery de Comida", icon: UtensilsCrossed, color: "bg-green-500" },
    { id: "bodega", label: "Proveedor de Bodega", icon: Store, color: "bg-blue-500" },
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
    if (!aceptaReglamento) {
      toast({
        title: "Reglamento no aceptado",
        description: "Debe aceptar el reglamento interno para continuar",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const registrarProveedorGeneral = async () => {
    if (!validarBase()) return;
    await procesarRegistro("otro", empresa.trim());
  };

  const registrarServicioRapido = async (tipoServicio: "gas" | "delivery" | "bodega") => {
    if (!validarBase(true)) return;
    const nombreServicio = tipoServicio === "gas" ? "GAS" : tipoServicio === "delivery" ? "DELIVERY DE COMIDA" : "PROVEEDOR DE BODEGA";
    await procesarRegistro(tipoServicio, nombreServicio);
  };

  const procesarRegistro = async (tipoServicio: "gas" | "delivery" | "bodega" | "otro", nombreEmpresa: string) => {
    try {
      const placasLimpias = placas
        .map((p) => p.placa.trim().toUpperCase())
        .filter((p) => p);

      const payload: Parameters<typeof registrarProveedor>[0] = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === "vehicular" && placasLimpias.length > 0 ? placasLimpias[0] : undefined,
        placas: tipoAcceso === "vehicular" ? placasLimpias : undefined,
        empresa: nombreEmpresa,
        tipoServicio,
        porticoId: "principal",
      };

      const id = await registrarProveedor(payload);

      enviarMensajeWhatsApp({ telefono: "", mensaje: `Autorizo a ${nombreEmpresa}. Código: ${id}` });

      setMostrarConfirmacion(true);
      if (tipoServicio === "otro") setEmpresa("");
      if (tipoAcceso === "vehicular") setPlacas([{ id: "1", placa: "" }]);
      setAceptaReglamento(false);

      toast({ title: "Registro exitoso", description: "Se envió la solicitud a vigilancia" });
    } catch (error: any) {
      console.error("registrarProveedor error:", error);
      toast({ title: "Error", description: error?.message || "No se pudo registrar al proveedor", variant: "destructive" });
    }
  };

  const enviarWhatsApp = async () => {
    if (!validarBase()) return;

    try {
      const config = await getConfigWhatsApp();
      if (!config || !config.numero) {
        toast({
          title: "Configuración no disponible",
          description: "No se ha configurado un número de WhatsApp para solicitudes",
          variant: "destructive",
        });
        return;
      }

      const placasLimpias = placas
        .map((p) => p.placa.trim().toUpperCase())
        .filter((p) => p);

      const detalles = generarDetallesSolicitud({
        tipo: "proveedor",
        tipoAcceso,
        placas: tipoAcceso === "vehicular" ? placasLimpias : undefined,
        empresa: empresa.trim(),
        tipoServicio: "otro",
      });

      const mensaje = config.mensajePredeterminado.replace("{detalles}", detalles);
      abrirWhatsApp(config.numero, mensaje);

      toast({
        title: "WhatsApp abierto",
        description: "Se ha abierto WhatsApp con el mensaje prellenado",
      });
    } catch (error) {
      console.error("Error al abrir WhatsApp:", error);
      toast({
        title: "Error",
        description: "No se pudo abrir WhatsApp",
        variant: "destructive",
      });
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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Placas de Vehículos (opcional)</Label>
                <Button type="button" variant="outline" size="sm" onClick={agregarPlaca} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Placa
                </Button>
              </div>
              
              {placas.map((item, index) => (
                <Card key={item.id} className="p-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`placa-prov-${item.id}`}>Placa {index + 1}</Label>
                      <Input
                        id={`placa-prov-${item.id}`}
                        value={item.placa}
                        onChange={(e) => actualizarPlaca(item.id, e.target.value)}
                        placeholder="ABC-123"
                        className="text-lg font-mono"
                      />
                    </div>
                    {placas.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarPlaca(item.id)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa o Servicio *</Label>
            <Input id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Nombre de la empresa o servicio" className="text-lg" />
          </div>

          <Separator />

          {textoReglamento && (
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border">
              <Checkbox
                id="acepta-reglamento-proveedor"
                checked={aceptaReglamento}
                onCheckedChange={(checked) => setAceptaReglamento(checked as boolean)}
              />
              <Label
                htmlFor="acepta-reglamento-proveedor"
                className="text-sm leading-none cursor-pointer flex-1"
              >
                Acepto los{" "}
                <button
                  type="button"
                  onClick={() => setMostrarReglamento(true)}
                  className="text-primary underline hover:text-primary/80 font-medium"
                >
                  términos y condiciones
                </button>
              </Label>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              className="w-full h-12 flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
              onClick={enviarWhatsApp}
            >
              <MessageCircle className="h-5 w-5" />
              Enviar Solicitud por WhatsApp
            </Button>

            <Button onClick={registrarProveedorGeneral} className="w-full h-12 flex items-center gap-2" size="lg">
              <Send className="h-5 w-5" />
              Registrar Proveedor
            </Button>
          </div>
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

      <ReglamentoDialog
        open={mostrarReglamento}
        onOpenChange={setMostrarReglamento}
        texto={textoReglamento}
        onAceptar={() => setAceptaReglamento(true)}
      />
    </div>
  );
}
