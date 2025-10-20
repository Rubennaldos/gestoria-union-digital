import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Car, User, Star, Send, Clock, FileText, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";
import { ReglamentoDialog } from "@/components/acceso/ReglamentoDialog";
import { BuscadorFavoritos } from "@/components/acceso/BuscadorFavoritos";
import { registrarVisita, enviarMensajeWhatsApp } from "@/services/acceso";
import { Visitante, FavoritoUsuario } from "@/types/acceso";
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { getConfigWhatsApp, generarDetallesSolicitud, abrirWhatsApp } from "@/lib/whatsappAcceso";

import { useAuth } from "@/contexts/AuthContext";

export function VisitaTab() {
  const [tipoAcceso, setTipoAcceso] = useState<"vehicular" | "peatonal">("peatonal");
  const [placas, setPlacas] = useState<{ id: string; placa: string }[]>([{ id: "1", placa: "" }]);
  const [visitantes, setVisitantes] = useState<Visitante[]>([{ id: "1", nombre: "", dni: "" }]);
  const [menores, setMenores] = useState(0);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [aceptaReglamento, setAceptaReglamento] = useState(false);
  const [textoReglamento, setTextoReglamento] = useState("");
  const [mostrarReglamento, setMostrarReglamento] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Usar empadronadoId directamente del perfil
  const empadronadoId = profile?.empadronadoId || "";
  const cargandoEmp = !profile;

  useEffect(() => {
    cargarReglamento();
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

  const agregarPlaca = () => {
    setPlacas((prev) => [...prev, { id: Date.now().toString(), placa: "" }]);
  };
  const actualizarPlaca = (id: string, valor: string) => {
    setPlacas((prev) => prev.map((p) => (p.id === id ? { ...p, placa: valor.toUpperCase() } : p)));
  };
  const eliminarPlaca = (id: string) => {
    setPlacas((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
  };

  const agregarVisitante = () => {
    setVisitantes((prev) => [...prev, { id: Date.now().toString(), nombre: "", dni: "" }]);
  };
  const actualizarVisitante = (id: string, campo: "nombre" | "dni", valor: string) => {
    setVisitantes((prev) => prev.map((v) => (v.id === id ? { ...v, [campo]: valor } : v)));
  };
  const eliminarVisitante = (id: string) => {
    setVisitantes((prev) => (prev.length > 1 ? prev.filter((v) => v.id !== id) : prev));
  };

  const validarFormulario = () => {
    if (tipoAcceso === "vehicular") {
      const placasValidas = placas.filter((p) => p.placa.trim());
      if (placasValidas.length === 0) {
        toast({ title: "Error", description: "Debe agregar al menos una placa para acceso vehicular", variant: "destructive" });
        return false;
      }
    }
    const validos = visitantes.filter((v) => v.nombre.trim() && v.dni.trim());
    if (validos.length === 0) {
      toast({ title: "Error", description: "Debe agregar al menos un visitante", variant: "destructive" });
      return false;
    }
    if (!empadronadoId) {
      toast({
        title: "No se pudo identificar al vecino",
        description: "Tu usuario no está vinculado a un empadronado. Contacta al administrador.",
        variant: "destructive",
      });
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
      const visitantesLimpios = visitantes
        .map((v) => ({ nombre: v.nombre.trim(), dni: v.dni.trim() }))
        .filter((v) => v.nombre && v.dni);

      const placasLimpias = placas
        .map((p) => p.placa.trim().toUpperCase())
        .filter((p) => p);

      const registro = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === "vehicular" && placasLimpias.length > 0 ? placasLimpias[0] : undefined,
        placas: tipoAcceso === "vehicular" ? placasLimpias : undefined,
        visitantes: visitantesLimpios,
        menores: Number(menores || 0),
        porticoId: "principal",
      } as Parameters<typeof registrarVisita>[0];

      const id = await registrarVisita(registro);

      // Enviar WhatsApp automáticamente
      try {
        const config = await getConfigWhatsApp();
        if (config?.numero) {
          const detalles = generarDetallesSolicitud({
            tipo: "visita",
            tipoAcceso,
            placas: tipoAcceso === "vehicular" ? placasLimpias : undefined,
            personas: visitantesLimpios.map(v => ({ nombre: v.nombre, dni: v.dni })),
          });
          const mensaje = config.mensajePredeterminado.replace("{detalles}", detalles);
          abrirWhatsApp(config.numero, mensaje);
        }
      } catch (whatsappError) {
        console.error("Error al enviar WhatsApp:", whatsappError);
      }

      setMostrarConfirmacion(true);
      toast({ title: "Registro exitoso", description: "Solicitud enviada a vigilancia y WhatsApp" });

      setPlacas([{ id: "1", placa: "" }]);
      setVisitantes([{ id: "1", nombre: "", dni: "" }]);
      setMenores(0);
      setAceptaReglamento(false);
    } catch (error: any) {
      console.error("guardarYRegistrar error:", error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo registrar la visita",
        variant: "destructive",
      });
    }
  };

  const deshabilitarSubmit = useMemo(() => cargandoEmp || !empadronadoId, [cargandoEmp, empadronadoId]);


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Registro de Visitas
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {cargandoEmp ? (
            <p className="text-sm text-muted-foreground">Verificando tu empadronado…</p>
          ) : !empadronadoId ? (
            <p className="text-sm text-destructive">Tu usuario no está vinculado a un empadronado.</p>
          ) : null}

          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Acceso</Label>
            <RadioGroup
              value={tipoAcceso}
              onValueChange={(value) => setTipoAcceso(value as "vehicular" | "peatonal")}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="peatonal" id="peatonal" />
                <Label htmlFor="peatonal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Peatonal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vehicular" id="vehicular" />
                <Label htmlFor="vehicular" className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicular
                </Label>
              </div>
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
                      <Label htmlFor={`placa-${item.id}`}>Placa {index + 1}</Label>
                      <Input
                        id={`placa-${item.id}`}
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

          <BuscadorFavoritos
            tipo="visitante"
            empadronadoId={empadronadoId}
            onSeleccionar={(favorito: FavoritoUsuario) => {
              const nom = (favorito as any)?.datos?.nombre ?? "";
              const doc = (favorito as any)?.datos?.dni ?? "";
              setVisitantes([{ id: Date.now().toString(), nombre: nom, dni: doc }]);
            }}
          />

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Visitantes</Label>
              <Button type="button" variant="outline" size="sm" onClick={agregarVisitante} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Agregar
              </Button>
            </div>

            {visitantes.map((visitante) => (
              <Card key={visitante.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo *</Label>
                    <Input
                      value={visitante.nombre}
                      onChange={(e) => actualizarVisitante(visitante.id, "nombre", e.target.value)}
                      placeholder="Nombre y apellidos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DNI o Documento *</Label>
                    <Input
                      value={visitante.dni}
                      onChange={(e) => actualizarVisitante(visitante.id, "dni", e.target.value)}
                      placeholder="12345678"
                    />
                  </div>
                  <div className="flex items-end">
                    {visitantes.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarVisitante(visitante.id)}
                        className="w-full"
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="menores">Cantidad de Menores de Edad</Label>
            <Input
              id="menores"
              type="number"
              min="0"
              value={menores}
              onChange={(e) => setMenores(parseInt(e.target.value) || 0)}
              placeholder="0"
            />
            {menores > 0 && <Badge variant="secondary" className="mt-2">{menores} menor(es)</Badge>}
          </div>

          <Separator />

          {textoReglamento && (
            <div className="flex items-center space-x-2 p-3 bg-muted/30 rounded-lg border">
              <Checkbox
                id="acepta-reglamento-visita"
                checked={aceptaReglamento}
                onCheckedChange={(checked) => setAceptaReglamento(checked as boolean)}
              />
              <Label
                htmlFor="acepta-reglamento-visita"
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
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 h-12"
              onClick={() => toast({ title: "Favorito guardado", description: "Los datos se han guardado en favoritos" })}
            >
              <Star className="h-4 w-4" />
              Guardar Favorito
            </Button>

            <Button
              onClick={guardarYRegistrar}
              className="flex items-center gap-2 h-12 w-full"
              disabled={deshabilitarSubmit}
              title={deshabilitarSubmit ? "Esperando tu empadronado…" : ""}
            >
              <Send className="h-4 w-4" />
              Registrar y Enviar Solicitud
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
            <div className="flex justify-center">
              <Clock className="h-12 w-12 text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">Su solicitud ha sido enviada</p>
              <p className="text-sm text-muted-foreground">
                Por favor espere la confirmación de vigilancia.
                La entrada es por el pórtico principal de la Av. Pablo Paulet.
              </p>
            </div>
          </div>
        }
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
