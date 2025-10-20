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
import { Plus, Car, User, Star, Send, Clock, Zap, FileText, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";
import { ReglamentoDialog } from "@/components/acceso/ReglamentoDialog";
import { MaestroObraRapidoModal } from "@/components/acceso/MaestroObraRapidoModal";
import { registrarTrabajadores, enviarMensajeWhatsApp, obtenerMaestrosObra } from "@/services/acceso";
import { Trabajador, MaestroObra } from "@/types/acceso";
import { useAuth } from "@/contexts/AuthContext";
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { getConfigWhatsApp, generarDetallesSolicitud, abrirWhatsApp } from "@/lib/whatsappAcceso";

export function TrabajadoresTab() {
  const [tipoAcceso, setTipoAcceso] = useState<"vehicular" | "peatonal">("peatonal");
  const [placas, setPlacas] = useState<{ id: string; placa: string }[]>([{ id: "1", placa: "" }]);
  const [maestroObraId, setMaestroObraId] = useState("");
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [maestrosObra, setMaestrosObra] = useState<MaestroObra[]>([]);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarModalRapido, setMostrarModalRapido] = useState(false);
  const [aceptaReglamento, setAceptaReglamento] = useState(false);
  const [textoReglamento, setTextoReglamento] = useState("");
  const [mostrarReglamento, setMostrarReglamento] = useState(false);

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
      const reglamentoRef = ref(db, "configuracion/reglamento_acceso");
      const snapshot = await get(reglamentoRef);
      
      if (snapshot.exists()) {
        setTextoReglamento(snapshot.val().texto || "");
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

  const agregarPlaca = () => {
    setPlacas((prev) => [...prev, { id: Date.now().toString(), placa: "" }]);
  };
  const actualizarPlaca = (id: string, valor: string) => {
    setPlacas((prev) => prev.map((p) => (p.id === id ? { ...p, placa: valor.toUpperCase() } : p)));
  };
  const eliminarPlaca = (id: string) => {
    setPlacas((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
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
    if (tipoAcceso === "vehicular") {
      const placasValidas = placas.filter((p) => p.placa.trim());
      if (placasValidas.length === 0) {
        toast({ title: "Error", description: "Debe agregar al menos una placa para acceso vehicular", variant: "destructive" });
        return false;
      }
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

      const placasLimpias = placas
        .map((p) => p.placa.trim().toUpperCase())
        .filter((p) => p);

      const payload = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === "vehicular" && placasLimpias.length > 0 ? placasLimpias[0] : undefined,
        placas: tipoAcceso === "vehicular" ? placasLimpias : undefined,
        maestroObraId,
        trabajadores: trabajadoresLimpios,
        porticoId: "principal",
      } as Parameters<typeof registrarTrabajadores>[0];

      const id = await registrarTrabajadores(payload);

      enviarMensajeWhatsApp({ telefono: "", mensaje: `Autorizo ingreso de personal. Código: ${id}` });

      setMostrarConfirmacion(true);
      setPlacas([{ id: "1", placa: "" }]);
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

  const enviarWhatsApp = async () => {
    if (!validarFormulario()) return;

    try {
      const config = await getConfigWhatsApp();
      if (!config || !config.numero) {
        toast({
          title: "Configuración no disponible",
          description: "No se ha configurado un número de WhatsApp para solicitudes",
          variant: "destructive",
        });
        return;
      }

      const trabajadoresLimpios = trabajadores
        .map((t) => ({ nombre: (t.nombre || "").trim(), dni: (t.dni || "").trim(), esMaestroObra: !!t.esMaestroObra }))
        .filter((t) => t.nombre && t.dni);

      const placasLimpias = placas
        .map((p) => p.placa.trim().toUpperCase())
        .filter((p) => p);

      const maestro = trabajadoresLimpios.find(t => t.esMaestroObra);
      const obreros = trabajadoresLimpios.filter(t => !t.esMaestroObra);

      const detalles = generarDetallesSolicitud({
        tipo: "trabajador",
        tipoAcceso,
        placas: tipoAcceso === "vehicular" ? placasLimpias : undefined,
        maestro: maestro ? { nombre: maestro.nombre, dni: maestro.dni } : undefined,
        personas: obreros.length > 0 ? obreros : undefined,
      });

      const mensaje = config.mensajePredeterminado.replace("{detalles}", detalles);
      abrirWhatsApp(config.numero, mensaje);

      toast({
        title: "WhatsApp abierto",
        description: "Se ha abierto WhatsApp con el mensaje prellenado",
      });
    } catch (error) {
      console.error("Error al abrir WhatsApp:", error);
      toast({
        title: "Error",
        description: "No se pudo abrir WhatsApp",
        variant: "destructive",
      });
    }
  };

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
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Placas de Vehículos *</Label>
                <Button type="button" variant="outline" size="sm" onClick={agregarPlaca} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar Placa
                </Button>
              </div>
              
              {placas.map((item, index) => (
                <Card key={item.id} className="p-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label htmlFor={`placa-trab-${item.id}`}>Placa {index + 1}</Label>
                      <Input
                        id={`placa-trab-${item.id}`}
                        value={item.placa}
                        onChange={(e) => actualizarPlaca(item.id, e.target.value)}
                        placeholder="ABC-123"
                        className="text-lg font-mono"
                      />
                    </div>
                    {placas.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarPlaca(item.id)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
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
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border">
              <Checkbox
                id="acepta-reglamento-trabajo"
                checked={aceptaReglamento}
                onCheckedChange={(checked) => setAceptaReglamento(checked as boolean)}
              />
              <Label
                htmlFor="acepta-reglamento-trabajo"
                className="text-sm leading-none cursor-pointer flex-1"
              >
                Acepto los{" "}
                <button
                  type="button"
                  onClick={() => setMostrarReglamento(true)}
                  className="text-primary underline hover:text-primary/80 font-medium"
                >
                  términos y condiciones
                </button>
              </Label>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button type="button" variant="outline" className="flex items-center gap-2 h-12">
                <Star className="h-4 w-4" />
                Guardar Favorito
              </Button>

              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 h-12 flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
                onClick={enviarWhatsApp}
                disabled={deshabilitarSubmit}
              >
                <MessageCircle className="h-4 w-4" />
                Enviar Solicitud por WhatsApp
              </Button>
            </div>

            <Button onClick={guardarYRegistrar} className="flex items-center gap-2 h-12 w-full" disabled={deshabilitarSubmit}>
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

      <ReglamentoDialog
        open={mostrarReglamento}
        onOpenChange={setMostrarReglamento}
        texto={textoReglamento}
        onAceptar={() => setAceptaReglamento(true)}
      />
    </div>
  );
}
