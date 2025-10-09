// src/components/acceso/TrabajadoresTab.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Car, User, Star, Send, Clock, Zap, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";
import { MaestroObraRapidoModal } from "@/components/acceso/MaestroObraRapidoModal";
import { registrarTrabajadores, enviarMensajeWhatsApp, obtenerMaestrosObra } from "@/services/acceso";
import { Trabajador, MaestroObra } from "@/types/acceso";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { fs } from "@/config/firebase";

export function TrabajadoresTab() {
  const [tipoAcceso, setTipoAcceso] = useState<"vehicular" | "peatonal">("peatonal");
  const [placa, setPlaca] = useState("");
  const [maestroObraId, setMaestroObraId] = useState("");
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [maestrosObra, setMaestrosObra] = useState<MaestroObra[]>([]);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarModalRapido, setMostrarModalRapido] = useState(false);
  const [aceptaReglamento, setAceptaReglamento] = useState(false);
  const [textoReglamento, setTextoReglamento] = useState("");

  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Usar empadronadoId directamente del perfil
  const empadronadoId = profile?.empadronadoId || "";
  const cargandoEmp = !profile;

  useEffect(() => { 
    void cargarMaestrosObra();
    void cargarReglamento();
  }, []);

  const cargarReglamento = async () => {
    try {
      const docRef = doc(fs, "configuracion", "reglamento_acceso");
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setTextoReglamento(docSnap.data().texto || "");
      }
    } catch (error) {
      console.error("Error al cargar reglamento:", error);
    }
  };

  const cargarMaestrosObra = async () => {
    try { setMaestrosObra(await obtenerMaestrosObra()); } catch (e) { console.error(e); }
  };

  const handleMaestroCreado = async (maestroId: string) => {
    await cargarMaestrosObra();
    setMaestroObraId(maestroId);
    toast({
      title: "Maestro de obra seleccionado",
      description: "Puede continuar con el registro de trabajadores",
    });
  };

  const agregarTrabajador = () =>
    setTrabajadores((prev) => [...prev, { id: Date.now().toString(), nombre: "", dni: "", esMaestroObra: false }]);

  const actualizarTrabajador = (id: string, campo: "nombre" | "dni", valor: string) =>
    setTrabajadores((prev) => prev.map((t) => (t.id === id ? { ...t, [campo]: valor } : t)));

  const eliminarTrabajador = (id: string) =>
    setTrabajadores((prev) => prev.filter((t) => t.id !== id));

  const validarFormulario = () => {
    if (cargandoEmp || !empadronadoId) {
      toast({ title: "No hay vecino vinculado", description: "Tu usuario no está vinculado a un empadronado.", variant: "destructive" });
      return false;
    }
    if (tipoAcceso === "vehicular" && !placa.trim()) {
      toast({ title: "Error", description: "La placa es requerida para acceso vehicular", variant: "destructive" });
      return false;
    }
    if (!maestroObraId) {
      toast({ title: "Error", description: "Debe seleccionar un maestro de obra", variant: "destructive" });
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

  const guardarYRegistrar = async () => {
    if (!validarFormulario()) return;
    try {
      const trabajadoresLimpios = trabajadores
        .map((t) => ({ id: t.id, nombre: (t.nombre || "").trim(), dni: (t.dni || "").trim(), esMaestroObra: !!t.esMaestroObra }))
        .filter((t) => t.nombre && t.dni);

      const payload = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === "vehicular" ? placa.toUpperCase() : undefined,
        maestroObraId,
        trabajadores: trabajadoresLimpios,
        porticoId: "principal",
      } as Parameters<typeof registrarTrabajadores>[0];

      const id = await registrarTrabajadores(payload);

      enviarMensajeWhatsApp({ telefono: "", mensaje: `Autorizo ingreso de personal. Código: ${id}` });

      setMostrarConfirmacion(true);
      setPlaca("");
      setMaestroObraId("");
      setTrabajadores([]);
      setAceptaReglamento(false);
      toast({ title: "Registro exitoso", description: "Se envió la solicitud a vigilancia" });
    } catch (error: any) {
      console.error("registrarTrabajadores error:", error);
      toast({ title: "Error", description: error?.message || "No se pudo registrar a los trabajadores", variant: "destructive" });
    }
  };

  const deshabilitarSubmit = useMemo(() => cargandoEmp || !empadronadoId, [cargandoEmp, empadronadoId]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Registro de Trabajadores</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Acceso</Label>
            <RadioGroup value={tipoAcceso} onValueChange={(v) => setTipoAcceso(v as any)} className="flex gap-6">
              <div className="flex items-center space-x-2"><RadioGroupItem value="peatonal" id="peatonal-trab" /><Label htmlFor="peatonal-trab" className="flex items-center gap-2"><User className="h-4 w-4" />Peatonal</Label></div>
              <div className="flex items-center space-x-2"><RadioGroupItem value="vehicular" id="vehicular-trab" /><Label htmlFor="vehicular-trab" className="flex items-center gap-2"><Car className="h-4 w-4" />Vehicular</Label></div>
            </RadioGroup>
          </div>

          {tipoAcceso === "vehicular" && (
            <div className="space-y-2">
              <Label htmlFor="placa-trab">Placa del Vehículo *</Label>
              <Input id="placa-trab" value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} placeholder="ABC-123" className="text-lg font-mono" />
            </div>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-base font-medium">Maestro de Obra *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarModalRapido(true)}
                className="flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <Zap className="h-4 w-4" />
                Acceso Rápido
              </Button>
            </div>
            
            <Select value={maestroObraId} onValueChange={setMaestroObraId}>
              <SelectTrigger className="w-full h-11 bg-background">
                <SelectValue placeholder="Buscar el nombre del maestro de obra" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                {maestrosObra.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No hay maestros de obra registrados
                  </div>
                ) : (
                  maestrosObra.map((maestro) => (
                    <SelectItem key={maestro.id} value={maestro.id}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-medium">{maestro.nombre}</span>
                        {maestro.dni && (
                          <span className="text-xs text-muted-foreground">DNI: {maestro.dni}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>

            {maestroObraId && maestrosObra.find((m) => m.id === maestroObraId) && (
              <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {maestrosObra.find((m) => m.id === maestroObraId)?.nombre}
                  </span>
                  <Badge variant={maestrosObra.find((m) => m.id === maestroObraId)?.activo ? "default" : "destructive"}>
                    {maestrosObra.find((m) => m.id === maestroObraId)?.activo ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                {maestrosObra.find((m) => m.id === maestroObraId)?.dni && (
                  <p className="text-xs text-muted-foreground">
                    DNI: {maestrosObra.find((m) => m.id === maestroObraId)?.dni}
                  </p>
                )}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Trabajadores</Label>
              <Button type="button" variant="outline" size="sm" onClick={agregarTrabajador} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />Agregar
              </Button>
            </div>

            {trabajadores.map((t) => (
              <Card key={t.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2"><Label>Nombre</Label><Input value={t.nombre} onChange={(e) => actualizarTrabajador(t.id, "nombre", e.target.value)} /></div>
                  <div className="space-y-2"><Label>DNI</Label><Input value={t.dni} onChange={(e) => actualizarTrabajador(t.id, "dni", e.target.value)} /></div>
                  <div className="flex items-end"><Button type="button" variant="outline" size="sm" onClick={() => eliminarTrabajador(t.id)} className="w-full">Eliminar</Button></div>
                </div>
              </Card>
            ))}
          </div>

          <Separator />

          {textoReglamento && (
            <div className="space-y-3 bg-muted/50 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <Label className="text-sm font-semibold">Acuerdos y Compromisos</Label>
                  <p className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                    {textoReglamento}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="acepta-reglamento-trabajo"
                  checked={aceptaReglamento}
                  onCheckedChange={(checked) => setAceptaReglamento(checked as boolean)}
                />
                <Label
                  htmlFor="acepta-reglamento-trabajo"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Acepto el reglamento interno
                </Label>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="button" variant="outline" className="flex items-center gap-2 h-12">
              <Star className="h-4 w-4" />
              Guardar Favorito
            </Button>

            <Button onClick={guardarYRegistrar} className="flex items-center gap-2 h-12 flex-1" disabled={deshabilitarSubmit}>
              <Send className="h-4 w-4" />
              Guardar y Registrar
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
            <p className="text-sm text-muted-foreground">Su solicitud ha sido enviada.</p>
          </div>
        }
      />

      <MaestroObraRapidoModal
        open={mostrarModalRapido}
        onOpenChange={setMostrarModalRapido}
        onCreated={handleMaestroCreado}
      />
    </div>
  );
}
