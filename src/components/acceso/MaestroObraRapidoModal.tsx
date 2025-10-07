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
import { crearMaestroObra } from "@/services/acceso";
import { useAuth } from "@/contexts/AuthContext";

interface MaestroObraRapidoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (maestroId: string) => void;
}

export function MaestroObraRapidoModal({
  open,
  onOpenChange,
  onCreated,
}: MaestroObraRapidoModalProps) {
  const [nombre, setNombre] = useState("");
  const [dni, setDni] = useState("");
  const [guardando, setGuardando] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleGuardar = async () => {
    if (!nombre.trim() || !dni.trim()) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete el nombre y DNI del maestro de obra",
        variant: "destructive",
      });
      return;
    }

    setGuardando(true);
    try {
      const maestroId = await crearMaestroObra({
        nombre: nombre.trim(),
        dni: dni.trim(),
        creadoPorUid: user?.uid || "",
      });

      toast({
        title: "Maestro de obra creado",
        description: "El maestro de obra ha sido registrado exitosamente",
      });

      // Limpiar formulario
      setNombre("");
      setDni("");
      
      // Notificar al padre
      onCreated(maestroId);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creando maestro de obra:", error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo crear el maestro de obra",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Crear Maestro de Obra - Acceso Rápido</DialogTitle>
          <DialogDescription>
            Complete los datos básicos del maestro de obra
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
              disabled={guardando}
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
              disabled={guardando}
            />
          </div>

          <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p>💡 Este maestro de obra quedará <strong>pendiente de autorización</strong> por el administrador de seguridad.</p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Creando..." : "Crear Maestro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
