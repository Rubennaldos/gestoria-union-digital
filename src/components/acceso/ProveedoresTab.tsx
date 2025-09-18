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

export function ProveedoresTab() {
  const [tipoAcceso, setTipoAcceso] = useState<"vehicular" | "peatonal">("peatonal");
  const [placa, setPlaca] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const { toast } = useToast();

  const serviciosRapidos = [
    { id: "gas", label: "Gas", icon: Zap, color: "bg-orange-500" },
    { id: "delivery", label: "Delivery de Comida", icon: UtensilsCrossed, color: "bg-green-500" },
  ] as const;

  const registrarProveedorGeneral = async () => {
    if (tipoAcceso === "vehicular" && !placa.trim()) {
      toast({
        title: "Error",
        description: "La placa es requerida para acceso vehicular",
        variant: "destructive",
      });
      return;
    }

    if (!empresa.trim()) {
      toast({
        title: "Error",
        description: "Debe especificar la empresa",
        variant: "destructive",
      });
      return;
    }

    await procesarRegistro("otro", empresa.trim());
  };

  const registrarServicioRapido = async (tipoServicio: "gas" | "delivery") => {
    const nombreServicio = tipoServicio === "gas" ? "GAS" : "DELIVERY DE COMIDA";
    await procesarRegistro(tipoServicio, nombreServicio);
  };

  const procesarRegistro = async (
    tipoServicio: "gas" | "delivery" | "otro",
    nombreEmpresa: string
  ) => {
    try {
      // TODO: sustituir por datos reales del usuario logueado
      const empadronadoId = "user123";
      const nombreUsuario = "Juan Pérez";
      const direccionUsuario = "Mz A Lt 15";
      const telefonoVigilancia = ""; // si no lo tienes, déjalo vacío

      // Tipado EXACTO del payload del servicio
      const registro: Parameters<typeof registrarProveedor>[0] = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === "vehicular" ? placa.toUpperCase() : undefined,
        empresa: nombreEmpresa,
        tipoServicio,
        fechaCreacion: Date.now(),
        porticoId: "principal",
      };

      const id = await registrarProveedor(registro);

      // Mensaje WhatsApp
      const mensaje =
        tipoServicio === "gas" || tipoServicio === "delivery"
          ? `Yo ${nombreUsuario} con dirección en ${direccionUsuario} autorizo a mi delivery de ${nombreEmpresa}. Código de solicitud: ${id}`
          : `Yo ${nombreUsuario} con dirección en ${direccionUsuario} autorizo el ingreso a la empresa ${nombreEmpresa}. Código de solicitud: ${id}`;

      enviarMensajeWhatsApp({
        telefono: telefonoVigilancia,
        mensaje,
      });

      setMostrarConfirmacion(true);

      // limpiar formulario
      if (tipoServicio === "otro") setEmpresa("");
      if (tipoAcceso === "vehicular") setPlaca("");

      toast({
        title: "Registro exitoso",
        description: "Se ha enviado la solicitud de autorización a vigilancia",
      });
    } catch (error: any) {
      console.error("registrarProveedor error:", error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo registrar al proveedor",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Ingreso Rápido */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Ingreso Rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {serviciosRapidos.map((servicio) => {
              const IconComponent = servicio.icon;
              return (
                <Button
                  key={servicio.id}
                  onClick={() =>
                    registrarServicioRapido(servicio.id as "gas" | "delivery")
                  }
                  className={`h-20 flex-col gap-2 ${servicio.color} hover:opacity-90 text-white`}
                  size="lg"
                >
                  <IconComponent className="h-8 w-8" />
                  <span className="font-medium">{servicio.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Registro General */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Registro de Proveedores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de acceso */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Acceso</Label>
            <RadioGroup
              value={tipoAcceso}
              onValueChange={(value) => setTipoAcceso(value as "vehicular" | "peatonal")}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="peatonal" id="peatonal-prov" />
                <Label htmlFor="peatonal-prov" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Peatonal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vehicular" id="vehicular-prov" />
                <Label htmlFor="vehicular-prov" className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicular
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Placa */}
          {tipoAcceso === "vehicular" && (
            <div className="space-y-2">
              <Label htmlFor="placa-prov">Placa del Vehículo *</Label>
              <Input
                id="placa-prov"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="text-lg font-mono"
              />
            </div>
          )}

          {/* Empresa */}
          <div className="space-y-2">
            <Label htmlFor="empresa">Empresa o Servicio *</Label>
            <Input
              id="empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              placeholder="Nombre de la empresa o servicio"
              className="text-lg"
            />
          </div>

          <Separator />

          <Button
            onClick={registrarProveedorGeneral}
            className="w-full h-12 flex items-center gap-2"
            size="lg"
          >
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
            <div className="flex justify-center">
              <Clock className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Su solicitud ha sido enviada</p>
              <p className="text-sm text-muted-foreground">
                Por favor espere la confirmación de vigilancia.
                La entrada es por el pórtico de Pablo Paulet.
              </p>
            </div>
          </div>
        }
      />
    </div>
  );
}
