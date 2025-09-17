import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, User, Star, Send, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";
import { BuscadorFavoritos } from "@/components/acceso/BuscadorFavoritos";
import { registrarVisita, enviarMensajeWhatsApp } from "@/services/acceso";
import { Visitante, FavoritoUsuario } from "@/types/acceso";

export function VisitaTab() {
  const [tipoAcceso, setTipoAcceso] = useState<"vehicular" | "peatonal">("peatonal");
  const [placa, setPlaca] = useState("");
  const [visitantes, setVisitantes] = useState<Visitante[]>([
    { id: "1", nombre: "", dni: "" },
  ]);
  const [menores, setMenores] = useState(0);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const { toast } = useToast();

  // ───────── helpers UI ─────────
  const agregarVisitante = () => {
    setVisitantes((prev) => [
      ...prev,
      { id: Date.now().toString(), nombre: "", dni: "" },
    ]);
  };

  const actualizarVisitante = (id: string, campo: "nombre" | "dni", valor: string) => {
    setVisitantes((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [campo]: valor } : v))
    );
  };

  const eliminarVisitante = (id: string) => {
    setVisitantes((prev) => (prev.length > 1 ? prev.filter((v) => v.id !== id) : prev));
  };

  const validarFormulario = () => {
    if (tipoAcceso === "vehicular" && !placa.trim()) {
      toast({
        title: "Error",
        description: "La placa es requerida para acceso vehicular",
        variant: "destructive",
      });
      return false;
    }

    const validos = visitantes.filter((v) => v.nombre.trim() && v.dni.trim());
    if (validos.length === 0) {
      toast({
        title: "Error",
        description: "Debe agregar al menos un visitante",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // ───────── guardar & registrar ─────────
  const guardarYRegistrar = async () => {
    if (!validarFormulario()) return;

    try {
      // TODO: reemplazar por datos reales del usuario logueado
      const empadronadoId = "user123";
      const nombreUsuario = "Juan Pérez";
      const direccionUsuario = "Mz A Lt 15";
      const telefonoVigilancia = ""; // “51999…”, si lo tienes

      // normalizar visitantes
      const visitantesLimpios = visitantes
        .map((v) => ({
          nombre: v.nombre.trim(),
          dni: v.dni.trim(),
        }))
        .filter((v) => v.nombre && v.dni);

      // TIPAMOS EXACTAMENTE EL OBJETO COMO EL 1er PARÁMETRO DE registrarVisita
      const registro: Parameters<typeof registrarVisita>[0] = {
        empadronadoId,
        tipoAcceso, // 'peatonal' | 'vehicular'
        placa: tipoAcceso === "vehicular" ? placa.toUpperCase() : undefined,
        visitantes: visitantesLimpios, // array de {nombre, dni}
        menores: Number(menores || 0),
        porticoId: "principal", // necesario para reflejar en Seguridad
      };

      const id = await registrarVisita(registro);

      // —— Mensaje de WhatsApp
      const listaVisitantes = registro.visitantes
        .map((v) => `• ${v.nombre} (DNI: ${v.dni})`)
        .join("\n");
      const mensajeMenores =
        registro.menores > 0 ? `\n- ${registro.menores} menor(es) de edad` : "";

      const mensaje = `Yo ${nombreUsuario} con dirección ${direccionUsuario} autorizo el ingreso a:\n\n${listaVisitantes}${mensajeMenores}\n\nCódigo de solicitud: ${id}`;

      // la función exige { telefono, mensaje }
      enviarMensajeWhatsApp({
        telefono: telefonoVigilancia, // puede estar vacío; la función lo maneja
        mensaje,
      });

      setMostrarConfirmacion(true);
      toast({
        title: "Registro exitoso",
        description: "Se ha enviado la solicitud de autorización a vigilancia",
      });
    } catch (error: any) {
      console.error("guardarYRegistrar error:", error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo registrar la visita",
        variant: "destructive",
      });
    }
  };

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
          {/* Tipo de acceso */}
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

          {/* Placa (solo vehicular) */}
          {tipoAcceso === "vehicular" && (
            <div className="space-y-2">
              <Label htmlFor="placa">Placa del Vehículo *</Label>
              <Input
                id="placa"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="text-lg font-mono"
              />
            </div>
          )}

          <Separator />

          {/* Buscador de favoritos */}
          <BuscadorFavoritos
            tipo="visitante"
            onSeleccionar={(favorito: FavoritoUsuario) => {
              // Ajusta a tu shape: asumo favorito.datos = { nombre, dni }
              const nom = (favorito as any)?.datos?.nombre ?? "";
              const doc = (favorito as any)?.datos?.dni ?? "";
              setVisitantes([{ id: Date.now().toString(), nombre: nom, dni: doc }]);
            }}
          />

          <Separator />

          {/* Visitantes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Visitantes</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={agregarVisitante}
                className="flex items-center gap-2"
              >
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
                      onChange={(e) =>
                        actualizarVisitante(visitante.id, "nombre", e.target.value)
                      }
                      placeholder="Nombre y apellidos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DNI o Documento *</Label>
                    <Input
                      value={visitante.dni}
                      onChange={(e) =>
                        actualizarVisitante(visitante.id, "dni", e.target.value)
                      }
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

          {/* Menores */}
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
            {menores > 0 && (
              <Badge variant="secondary" className="mt-2">
                {menores} menor(es) acompañante(s)
              </Badge>
            )}
          </div>

          <Separator />

          {/* Botones */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 h-12"
              onClick={() => {
                // TODO: Implementar guardar favorito real
                toast({
                  title: "Favorito guardado",
                  description: "Los datos se han guardado en favoritos",
                });
              }}
            >
              <Star className="h-4 w-4" />
              Guardar Favorito
            </Button>

            <Button onClick={guardarYRegistrar} className="flex items-center gap-2 h-12 flex-1">
              <Send className="h-4 w-4" />
              Guardar y Registrar Visita
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
    </div>
  );
}
