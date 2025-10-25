import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface MaestroObraRapidoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (data: { nombre: string; dni: string }) => void;
}

export function MaestroObraRapidoModal({
  open,
  onOpenChange,
  onCreated,
}: MaestroObraRapidoModalProps) {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const { toast } = useToast();

  const handleGuardar = () => {
    if (!nombre.trim() || !dni.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete el nombre y DNI del encargado de obra",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Encargado agregado",
      description: "Los datos se han agregado temporalmente para esta solicitud",
    });

    // Limpiar formulario
    const datos = {
      nombre: nombre.trim(),
      dni: dni.trim(),
    };
    
    setNombre("");
    setDni("");
    
    // Notificar al padre con los datos temporales
    onCreated(datos);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Registro Rápido de Encargado de Obra</DialogTitle>
          <DialogDescription>
            Estos datos se usarán temporalmente solo para esta solicitud
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nombre-maestro">Nombre Completo *</Label>
            <Input
              id="nombre-maestro"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Juan Pérez García"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dni-maestro">DNI *</Label>
            <Input
              id="dni-maestro"
              value={dni}
              onChange={(e) => setDni(e.target.value)}
              placeholder="12345678"
              maxLength={8}
            />
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
            <p>⚠️ <strong>Importante:</strong> Estos datos son temporales y solo se usarán para esta solicitud única.</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGuardar}
          >
            Agregar Temporalmente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
