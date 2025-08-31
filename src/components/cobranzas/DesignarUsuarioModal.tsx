import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { designarUsuarioAEmpadronado } from "@/services/rtdb";
import { useAuth } from "@/contexts/AuthContext";
import type { Empadronado } from "@/types/empadronados";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  onSuccess: () => void;
}

export default function DesignarUsuarioModal({ open, onOpenChange, empadronado, onSuccess }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [identifier, setIdentifier] = useState(""); // email o username
  const [loading, setLoading] = useState(false);

  const close = () => {
    onOpenChange(false);
    setIdentifier("");
  };

  const onSave = async () => {
    if (!empadronado) return;
    const id = identifier.trim();
    if (!id) {
      toast({ title: "Falta identificador", description: "Ingresa email o usuario.", variant: "destructive" });
      return;
    }

    try {
      setLoading(true);
      await designarUsuarioAEmpadronado(empadronado.id, id, user?.uid || "system");
      toast({ title: "Usuario designado", description: `Vinculado a padrón ${empadronado.numeroPadron}.` });
      onSuccess();
      close();
    } catch (e: any) {
      const msg = String(e?.message || "");
      if (msg.includes("USUARIO_NO_ENCONTRADO")) {
        toast({ title: "No encontrado", description: "No existe un usuario con ese email/usuario.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "No se pudo designar el usuario.", variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Designar usuario existente</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Empadronado</Label>
          <div className="p-2 rounded border bg-muted/30 text-sm">
            {empadronado ? `${empadronado.nombre} ${empadronado.apellidos} — Padrón ${empadronado.numeroPadron}` : "—"}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="identifier">Email o Usuario</Label>
          <Input
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="ej: presidencia@jpusap.com o presidencia"
            autoFocus
          />
          <p className="text-xs text-muted-foreground">
            Debe ser una cuenta ya creada en el módulo de Usuarios.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>Cancelar</Button>
          <Button onClick={onSave} disabled={loading}>
            {loading ? "Guardando..." : "Designar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
