import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MessageSquare, Save, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ref, get, set } from "firebase/database";
import { db } from "@/config/firebase";

const MENSAJE_DEFAULT = `Hola, estoy solicitando acceso. Por favor dame autorización.

📋 Detalles de la solicitud:
{detalles}

Gracias.`;

export function ConfiguracionWhatsApp() {
  const [numeroWhatsApp, setNumeroWhatsApp] = useState("");
  const [mensajePredeterminado, setMensajePredeterminado] = useState(MENSAJE_DEFAULT);
  const [guardando, setGuardando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    cargarConfiguracion();
  }, []);

  const cargarConfiguracion = async () => {
    try {
      const configRef = ref(db, "configuracion/whatsapp_accesos");
      const snapshot = await get(configRef);
      
      if (snapshot.exists()) {
        const config = snapshot.val();
        setNumeroWhatsApp(config.numero || "");
        setMensajePredeterminado(config.mensajePredeterminado || MENSAJE_DEFAULT);
      }
    } catch (error) {
      console.error("Error al cargar configuración de WhatsApp:", error);
    }
  };

  const guardarConfiguracion = async () => {
    // Validar número de teléfono peruano (9 dígitos)
    const numeroLimpio = numeroWhatsApp.replace(/\D/g, "");
    
    if (!numeroLimpio) {
      toast({
        title: "Error",
        description: "Debes ingresar un número de WhatsApp",
        variant: "destructive",
      });
      return;
    }

    if (numeroLimpio.length !== 9 || !numeroLimpio.startsWith("9")) {
      toast({
        title: "Número inválido",
        description: "El número debe ser un celular peruano válido (9 dígitos empezando con 9)",
        variant: "destructive",
      });
      return;
    }

    if (!mensajePredeterminado.trim()) {
      toast({
        title: "Error",
        description: "El mensaje predeterminado no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    if (!mensajePredeterminado.includes("{detalles}")) {
      toast({
        title: "Error",
        description: 'El mensaje debe incluir la variable {detalles} para mostrar la información de la solicitud',
        variant: "destructive",
      });
      return;
    }

    setGuardando(true);
    try {
      const configRef = ref(db, "configuracion/whatsapp_accesos");
      await set(configRef, {
        numero: numeroLimpio,
        mensajePredeterminado: mensajePredeterminado.trim(),
        actualizadoEn: new Date().toISOString(),
      });

      toast({
        title: "Configuración guardada",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      console.error("Error al guardar configuración:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Configuración de WhatsApp para Solicitudes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="numero" className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Número de WhatsApp (Perú)
          </Label>
          <Input
            id="numero"
            type="tel"
            value={numeroWhatsApp}
            onChange={(e) => setNumeroWhatsApp(e.target.value)}
            placeholder="987654321"
            maxLength={9}
            className="text-lg"
          />
          <p className="text-xs text-muted-foreground">
            Ingresa el número de celular peruano (9 dígitos) donde se recibirán las solicitudes de acceso.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mensaje">
            Mensaje Predeterminado
          </Label>
          <Textarea
            id="mensaje"
            value={mensajePredeterminado}
            onChange={(e) => setMensajePredeterminado(e.target.value)}
            rows={10}
            className="font-mono text-sm"
            placeholder="Ingrese el mensaje que se enviará..."
          />
          <div className="bg-muted p-3 rounded-md">
            <p className="text-xs font-semibold mb-2">Variables disponibles:</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>
                <code className="bg-background px-1 py-0.5 rounded">{"{detalles}"}</code> - Se reemplazará automáticamente con la información de la solicitud (tipo, personas, placas, etc.)
              </li>
            </ul>
          </div>
          <p className="text-xs text-muted-foreground">
            Este mensaje se usará como plantilla cuando los asociados soliciten acceso. 
            Solo necesitarán presionar "Enviar mensaje" y se abrirá WhatsApp con el mensaje prellenado.
          </p>
        </div>

        <Button
          onClick={guardarConfiguracion}
          disabled={guardando}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {guardando ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </CardContent>
    </Card>
  );
}
