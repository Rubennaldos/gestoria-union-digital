import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { crearIngreso } from "@/services/cobranzas";
import { useAuth } from "@/contexts/AuthContext";
import { MetodoPago } from "@/types/cobranzas";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function RegistrarIngresoModal({ open, onOpenChange, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState<"donacion" | "evento" | "alquiler" | "otros">("donacion");
  const [monto, setMonto] = useState<string>("");
  const [fecha, setFecha] = useState<string>(() => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const aa = d.getFullYear();
    return `${dd}/${mm}/${aa}`;
  });
  const [metodo, setMetodo] = useState<MetodoPago | "">("");
  const [operacion, setOperacion] = useState<string>("");
  const [archivoUrl, setArchivoUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const toBase64 = (f: File) =>
    new Promise<string>((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.onerror = rej;
      r.readAsDataURL(f);
    });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 7 * 1024 * 1024) {
      toast({ title: "Archivo muy grande", description: "Máximo 7MB", variant: "destructive" });
      return;
    }
    setArchivoUrl(await toBase64(file));
  };

  const guardar = async () => {
    if (!user) return;
    if (!concepto.trim() || !monto) {
      toast({ title: "Completa los campos", description: "Concepto y monto son obligatorios", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await crearIngreso(
        {
          concepto: concepto.trim(),
          categoria,
          monto: Number(monto),
          fecha,
          metodoPago: metodo || null,
          numeroOperacion: operacion || null,
          archivoUrl: archivoUrl || null
        },
        user.uid
      );
      toast({ title: "Ingreso registrado", description: "El ingreso fue guardado correctamente." });
      onOpenChange(false);
      onSuccess?.();
      // limpiar
      setConcepto(""); setMonto(""); setMetodo(""); setOperacion(""); setArchivoUrl("");
    } catch (e) {
      toast({ title: "Error", description: "No se pudo registrar el ingreso", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar Ingreso</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Concepto *</Label>
            <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="Donación cancha / Evento..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoría</Label>
              <Select value={categoria} onValueChange={(v) => setCategoria(v as any)}>
                <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="donacion">Donación</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                  <SelectItem value="alquiler">Alquiler</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Fecha</Label>
              <Input value={fecha} onChange={(e) => setFecha(e.target.value)} placeholder="dd/mm/aaaa" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Monto *</Label>
              <Input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Método de pago</Label>
              <Select value={metodo} onValueChange={(v) => setMetodo(v as MetodoPago | "")}>
                <SelectTrigger><SelectValue placeholder="Selecciona método" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="yape">Yape</SelectItem>
                  <SelectItem value="plin">Plin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>N° Operación</Label>
              <Input value={operacion} onChange={(e) => setOperacion(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Comprobante (PDF/Imagen)</Label>
              <Input type="file" accept=".pdf,image/*" onChange={handleFile} />
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
            <Button className="flex-1" onClick={guardar} disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
