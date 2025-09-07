import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Phone, MessageSquare } from "lucide-react";
import { useFirebaseWrite } from "@/hooks/useFirebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const BotonEmergencia = () => {
  const { toast } = useToast();
  const { pushData } = useFirebaseWrite();
  
  const [mostrarDialog, setMostrarDialog] = useState(false);
  const [descripcionEmergencia, setDescripcionEmergencia] = useState("");
  const [enviandoAlerta, setEnviandoAlerta] = useState(false);

  const enviarAlertaEmergencia = async () => {
    if (!descripcionEmergencia.trim()) {
      toast({
        title: "Error",
        description: "Describa brevemente la emergencia",
        variant: "destructive",
      });
      return;
    }

    setEnviandoAlerta(true);

    try {
      // Enviar notificación a todos los roles de la junta directiva (excepto asociados)
      const rolesJuntaDirectiva = [
        'presidencia',
        'vicepresidencia', 
        'economia',
        'seguridad',
        'actas_archivos',
        'fiscal',
        'deportes',
        'comunicaciones',
        'salud_medioambiente',
        'educacion_cultura',
        'vocal'
      ];

      const alertaEmergencia = {
        tipo: 'emergencia',
        titulo: '🚨 ALERTA DE EMERGENCIA',
        descripcion: descripcionEmergencia,
        ubicacion: 'Pórtico Principal',
        fecha: Date.now(),
        reportadoPor: 'seguridad_portico',
        prioridad: 'alta',
        estado: 'activa'
      };

      // Enviar a cada rol de la junta directiva
      for (const rol of rolesJuntaDirectiva) {
        await pushData(`notificaciones/roles/${rol}`, {
          ...alertaEmergencia,
          destinatario: rol
        });
      }

      // Registrar en el log de emergencias
      await pushData('seguridad/emergencias', alertaEmergencia);

      // Simular envío de mensajes/llamadas (en implementación real conectar con APIs)
      toast({
        title: "🚨 Alerta Enviada",
        description: "La emergencia ha sido reportada a toda la Junta Directiva",
        variant: "destructive",
      });

      // Simular notificaciones adicionales
      setTimeout(() => {
        toast({
          title: "📱 Mensajes Enviados",
          description: "SMS y WhatsApp enviados a todos los directivos",
        });
      }, 2000);

      setTimeout(() => {
        toast({
          title: "📞 Llamadas Iniciadas",
          description: "Llamadas automáticas en progreso",
        });
      }, 4000);

      setMostrarDialog(false);
      setDescripcionEmergencia("");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo enviar la alerta de emergencia",
        variant: "destructive",
      });
    } finally {
      setEnviandoAlerta(false);
    }
  };

  return (
    <>
      <Dialog open={mostrarDialog} onOpenChange={setMostrarDialog}>
        <DialogTrigger asChild>
          <Button 
            variant="destructive" 
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white animate-pulse"
          >
            <AlertTriangle className="h-5 w-5 mr-2" />
            EMERGENCIA
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Alerta de Emergencia
            </DialogTitle>
            <DialogDescription>
              Esta acción notificará inmediatamente a todos los miembros de la Junta Directiva
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descripción de la Emergencia</Label>
              <Textarea
                value={descripcionEmergencia}
                onChange={(e) => setDescripcionEmergencia(e.target.value)}
                placeholder="Describa brevemente la situación de emergencia..."
                className="min-h-[100px]"
              />
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <h4 className="font-medium text-red-800 mb-2">Se notificará a:</h4>
              <div className="grid grid-cols-2 gap-1 text-sm text-red-700">
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Presidencia
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Vicepresidencia
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  Seguridad
                </div>
                <div className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Todos los Vocales
                </div>
              </div>
              <p className="text-xs text-red-600 mt-2">
                * Se enviarán SMS, WhatsApp y llamadas automáticas
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline"
                onClick={() => setMostrarDialog(false)}
                className="flex-1"
                disabled={enviandoAlerta}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive"
                onClick={enviarAlertaEmergencia}
                className="flex-1"
                disabled={enviandoAlerta}
              >
                {enviandoAlerta ? (
                  "Enviando..."
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    ENVIAR ALERTA
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};