import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Save, Loader2, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getConfigWhatsAppPagos, guardarConfigWhatsAppPagos } from "@/lib/whatsappPagos";

const MENSAJE_DEFAULT = `🔔 *NOTIFICACIÓN DE PAGO*

Asociado: {asociado}
Padrón: {padron}
Monto: {monto}
Período(s): {periodos}
Método: {metodoPago}
N° Operación: {numeroOperacion}
Fecha: {fechaPago}

Por favor, verificar el depósito y aprobar el pago en el sistema.`;

export const ConfiguracionWhatsAppPagos = () => {
  const { toast } = useToast();
  const [numero1, setNumero1] = useState("");
  const [numero2, setNumero2] = useState("");
  const [mensajePredeterminado, setMensajePredeterminado] = useState(MENSAJE_DEFAULT);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      setCargando(true);
      const config = await getConfigWhatsAppPagos();
      if (config) {
        setNumero1(config.numero1 || "");
        setNumero2(config.numero2 || "");
        setMensajePredeterminado(config.mensajePredeterminado || MENSAJE_DEFAULT);
      }
    } catch (error) {
      console.error("Error cargando configuración:", error);
    } finally {
      setCargando(false);
    }
  };

  const guardarConfiguracion = async () => {
    // Validaciones
    if (!numero1.trim()) {
      toast({
        title: "Error",
        description: "Debes ingresar al menos el primer número de teléfono",
        variant: "destructive"
      });
      return;
    }

    const regexTelefono = /^9\d{8}$/;
    const numero1Limpio = numero1.replace(/\D/g, "");
    const numero2Limpio = numero2.replace(/\D/g, "");

    if (!regexTelefono.test(numero1Limpio)) {
      toast({
        title: "Error",
        description: "El primer número debe ser un celular peruano válido (9 dígitos, empieza con 9)",
        variant: "destructive"
      });
      return;
    }

    if (numero2.trim() && !regexTelefono.test(numero2Limpio)) {
      toast({
        title: "Error",
        description: "El segundo número debe ser un celular peruano válido (9 dígitos, empieza con 9)",
        variant: "destructive"
      });
      return;
    }

    if (!mensajePredeterminado.trim()) {
      toast({
        title: "Error",
        description: "El mensaje predeterminado no puede estar vacío",
        variant: "destructive"
      });
      return;
    }

    try {
      setGuardando(true);
      await guardarConfigWhatsAppPagos({
        numero1: numero1Limpio,
        numero2: numero2Limpio,
        mensajePredeterminado
      });
      
      toast({
        title: "✅ Configuración guardada",
        description: "Los números de notificación de pagos han sido actualizados"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive"
      });
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-green-600" />
          Notificaciones de Pagos por WhatsApp
        </CardTitle>
        <CardDescription>
          Configura los números a los que se enviará la notificación cuando un asociado registre un pago.
          Se abrirá WhatsApp Web para que puedas enviar el mensaje.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="numero1" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Número 1 (Obligatorio) *
            </Label>
            <Input
              id="numero1"
              placeholder="987654321"
              value={numero1}
              onChange={(e) => setNumero1(e.target.value)}
              maxLength={9}
            />
            <p className="text-xs text-muted-foreground">Ej: Tesorero o encargado principal</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="numero2" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Número 2 (Opcional)
            </Label>
            <Input
              id="numero2"
              placeholder="987654322"
              value={numero2}
              onChange={(e) => setNumero2(e.target.value)}
              maxLength={9}
            />
            <p className="text-xs text-muted-foreground">Ej: Presidente o administrador</p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mensaje">Mensaje Predeterminado</Label>
          <Textarea
            id="mensaje"
            value={mensajePredeterminado}
            onChange={(e) => setMensajePredeterminado(e.target.value)}
            rows={10}
            className="font-mono text-sm"
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium">Variables disponibles:</p>
            <p>{"{asociado}"} - Nombre del asociado</p>
            <p>{"{padron}"} - Número de padrón</p>
            <p>{"{monto}"} - Monto pagado</p>
            <p>{"{periodos}"} - Períodos pagados</p>
            <p>{"{metodoPago}"} - Método de pago usado</p>
            <p>{"{numeroOperacion}"} - Número de operación</p>
            <p>{"{fechaPago}"} - Fecha del pago</p>
          </div>
        </div>

        <Button 
          onClick={guardarConfiguracion} 
          disabled={guardando}
          className="w-full"
        >
          {guardando ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Guardar Configuración
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
