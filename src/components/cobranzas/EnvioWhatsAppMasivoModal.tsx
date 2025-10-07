import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import { Empadronado } from "@/types/empadronados";

interface EnvioWhatsAppMasivoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronados: Empadronado[];
  deudas: Map<string, number>;
}

export const EnvioWhatsAppMasivoModal = ({
  open,
  onOpenChange,
  empadronados,
  deudas,
}: EnvioWhatsAppMasivoModalProps) => {
  const [enviando, setEnviando] = useState(false);
  const [plantilla, setPlantilla] = useState(
    `Estimado(a) {NOMBRE},

Le recordamos que tiene una deuda pendiente de {DEUDA} en la asociación.

Por favor, regularice su situación a la brevedad.

Gracias por su comprensión.`
  );

  const handleEnviar = async () => {
    if (!plantilla.trim()) {
      toast.error("Por favor ingrese un mensaje");
      return;
    }

    setEnviando(true);
    let enviados = 0;
    let fallidos = 0;

    for (const emp of empadronados) {
      try {
        const deuda = deudas.get(emp.id) || 0;
        const mensaje = plantilla
          .replace(/{NOMBRE}/g, `${emp.nombre} ${emp.apellidos}`)
          .replace(/{DEUDA}/g, `S/ ${deuda.toFixed(2)}`)
          .replace(/{PADRON}/g, emp.numeroPadron)
          .replace(/{DNI}/g, emp.dni || "");

        // Limpiar teléfono y abrir WhatsApp
        const primerTelefono = emp.telefonos && emp.telefonos.length > 0 ? emp.telefonos[0].numero : "";
        const telefono = primerTelefono.replace(/[^\d]/g, "");
        
        if (!telefono) {
          console.warn(`Empadronado ${emp.nombre} ${emp.apellidos} no tiene teléfono`);
          fallidos++;
          continue;
        }

        const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;
        
        // Abrir en nueva ventana
        window.open(url, "_blank", "noopener,noreferrer");
        
        // Esperar un poco entre cada envío para no saturar
        await new Promise(resolve => setTimeout(resolve, 500));
        
        enviados++;
      } catch (error) {
        console.error(`Error enviando mensaje a ${emp.nombre}:`, error);
        fallidos++;
      }
    }

    setEnviando(false);
    
    toast.success(`Proceso completado. ${enviados} mensajes enviados, ${fallidos} fallidos.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Envío Masivo de WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Badge variant="default">{empadronados.length}</Badge>
            <span className="text-sm">
              empadronado(s) seleccionado(s)
            </span>
          </div>

          <div>
            <Label htmlFor="plantilla">Plantilla de Mensaje</Label>
            <div className="text-xs text-muted-foreground mb-2">
              Usa las siguientes variables:
              <br />
              <code className="bg-muted px-1 py-0.5 rounded">{"NOMBRE"}</code> - Nombre completo
              <br />
              <code className="bg-muted px-1 py-0.5 rounded">{"DEUDA"}</code> - Monto de deuda
              <br />
              <code className="bg-muted px-1 py-0.5 rounded">{"PADRON"}</code> - Número de padrón
              <br />
              <code className="bg-muted px-1 py-0.5 rounded">{"DNI"}</code> - DNI
            </div>
            <Textarea
              id="plantilla"
              value={plantilla}
              onChange={(e) => setPlantilla(e.target.value)}
              rows={10}
              placeholder="Escriba su mensaje aquí..."
              className="font-mono text-sm"
            />
          </div>

          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium mb-1">ℹ️ Cómo funciona:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Se abrirá una ventana de WhatsApp por cada persona seleccionada</li>
              <li>El mensaje estará prellenado, solo necesitas dar "Enviar"</li>
              <li>Habrá un pequeño intervalo entre cada ventana</li>
              <li>Los empadronados sin teléfono serán omitidos</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={enviando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleEnviar}
            disabled={enviando}
          >
            <Send className="h-4 w-4 mr-2" />
            {enviando ? "Enviando..." : "Enviar Mensajes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
