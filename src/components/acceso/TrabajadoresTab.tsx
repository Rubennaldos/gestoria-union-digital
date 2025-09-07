import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Car, User, Star, Send, Clock, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";
import { BuscadorFavoritos } from "@/components/acceso/BuscadorFavoritos";
import { NuevoMaestroObraModal } from "@/components/acceso/NuevoMaestroObraModal";
import { registrarTrabajadores, enviarMensajeWhatsApp, obtenerMaestrosObra } from "@/services/acceso";
import { Trabajador, MaestroObra } from "@/types/acceso";

export function TrabajadoresTab() {
  const [tipoAcceso, setTipoAcceso] = useState<'vehicular' | 'peatonal'>('peatonal');
  const [placa, setPlaca] = useState('');
  const [maestroObraId, setMaestroObraId] = useState('');
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [maestrosObra, setMaestrosObra] = useState<MaestroObra[]>([]);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarNuevoMaestro, setMostrarNuevoMaestro] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    cargarMaestrosObra();
  }, []);

  const cargarMaestrosObra = async () => {
    try {
      const maestros = await obtenerMaestrosObra();
      setMaestrosObra(maestros);
    } catch (error) {
      console.error('Error al cargar maestros de obra:', error);
    }
  };

  const maestroSeleccionado = maestrosObra.find(m => m.id === maestroObraId);

  const agregarTrabajador = () => {
    setTrabajadores([...trabajadores, { 
      id: Date.now().toString(), 
      nombre: '', 
      dni: '',
      esMaestroObra: false
    }]);
  };

  const actualizarTrabajador = (id: string, campo: 'nombre' | 'dni', valor: string) => {
    setTrabajadores(trabajadores.map(t => 
      t.id === id ? { ...t, [campo]: valor } : t
    ));
  };

  const eliminarTrabajador = (id: string) => {
    setTrabajadores(trabajadores.filter(t => t.id !== id));
  };

  const validarFormulario = () => {
    if (tipoAcceso === 'vehicular' && !placa.trim()) {
      toast({
        title: "Error",
        description: "La placa es requerida para acceso vehicular",
        variant: "destructive"
      });
      return false;
    }

    if (!maestroObraId) {
      toast({
        title: "Error",
        description: "Debe seleccionar un maestro de obra",
        variant: "destructive"
      });
      return false;
    }

    const maestro = maestrosObra.find(m => m.id === maestroObraId);
    if (!maestro?.autorizado) {
      toast({
        title: "Error",
        description: "El maestro de obra seleccionado no está autorizado",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  const guardarYRegistrar = async () => {
    if (!validarFormulario()) return;

    try {
      const empadronadoId = "user123";
      const nombreUsuario = "Juan Pérez";
      const direccionUsuario = "Mz A Lt 15";

      const registro = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === 'vehicular' ? placa : undefined,
        maestroObraId,
        trabajadores: trabajadores.filter(t => t.nombre.trim() && t.dni.trim()),
        fechaCreacion: Date.now(),
        estado: 'pendiente' as const
      };

      await registrarTrabajadores(registro);

      // Generar mensaje WhatsApp
      const maestro = maestrosObra.find(m => m.id === maestroObraId);
      let listaTrabajadores = `- ${maestro?.nombre} ${maestro?.apellidos} (Maestro de Obra)`;
      
      if (registro.trabajadores.length > 0) {
        listaTrabajadores += '\n' + registro.trabajadores
          .map(t => `- ${t.nombre} (DNI: ${t.dni})`)
          .join('\n');
      }
      
      const mensaje = `Yo ${nombreUsuario} con dirección en ${direccionUsuario} autorizo el ingreso a las siguientes personas:\n\n${listaTrabajadores}\n\nDonde me comprometo que respetaré y respetarán los reglamentos internos de la urbanización San Antonio.`;

      enviarMensajeWhatsApp(mensaje);
      setMostrarConfirmacion(true);

      toast({
        title: "Registro exitoso",
        description: "Se ha enviado la solicitud de autorización a vigilancia"
      });

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar a los trabajadores",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Registro de Trabajadores
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tipo de acceso */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Acceso</Label>
            <RadioGroup 
              value={tipoAcceso} 
              onValueChange={(value) => setTipoAcceso(value as 'vehicular' | 'peatonal')}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="peatonal" id="peatonal-trab" />
                <Label htmlFor="peatonal-trab" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Peatonal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vehicular" id="vehicular-trab" />
                <Label htmlFor="vehicular-trab" className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicular
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Placa (solo para vehicular) */}
          {tipoAcceso === 'vehicular' && (
            <div className="space-y-2">
              <Label htmlFor="placa-trab">Placa del Vehículo *</Label>
              <Input
                id="placa-trab"
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="text-lg font-mono"
              />
            </div>
          )}

          <Separator />

          {/* Maestro de Obra */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Maestro de Obra *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMostrarNuevoMaestro(true)}
              >
                Nuevo Maestro
              </Button>
            </div>

            <Select value={maestroObraId} onValueChange={setMaestroObraId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar maestro de obra" />
              </SelectTrigger>
              <SelectContent>
                {maestrosObra.map((maestro) => (
                  <SelectItem key={maestro.id} value={maestro.id}>
                    <div className="flex items-center gap-2">
                      <span>{maestro.nombre} {maestro.apellidos}</span>
                      {maestro.autorizado ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {maestroSeleccionado && (
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={maestroSeleccionado.autorizado ? "default" : "destructive"}>
                    {maestroSeleccionado.autorizado ? "Autorizado" : "No Autorizado"}
                  </Badge>
                </div>
                <p className="text-sm"><strong>Empresa:</strong> {maestroSeleccionado.empresa}</p>
                <p className="text-sm"><strong>Teléfono:</strong> {maestroSeleccionado.telefono}</p>
                
                {!maestroSeleccionado.autorizado && (
                  <Alert className="mt-3">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      El maestro de obra no está autorizado para su ingreso. 
                      Comuníquese con la Junta Directiva.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </div>

          <Separator />

          {/* Trabajadores adicionales */}
          {maestroSeleccionado?.autorizado && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Trabajadores Adicionales</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarTrabajador}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Agregar
                </Button>
              </div>

              {trabajadores.map((trabajador) => (
                <Card key={trabajador.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre Completo</Label>
                      <Input
                        value={trabajador.nombre}
                        onChange={(e) => actualizarTrabajador(trabajador.id, 'nombre', e.target.value)}
                        placeholder="Nombre y apellidos"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>DNI</Label>
                      <Input
                        value={trabajador.dni}
                        onChange={(e) => actualizarTrabajador(trabajador.id, 'dni', e.target.value)}
                        placeholder="12345678"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarTrabajador(trabajador.id)}
                        className="w-full"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <Separator />

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex items-center gap-2 h-12"
              onClick={() => {
                toast({
                  title: "Favorito guardado",
                  description: "Los datos se han guardado en favoritos"
                });
              }}
            >
              <Star className="h-4 w-4" />
              Guardar Favorito
            </Button>
            
            <Button
              onClick={guardarYRegistrar}
              disabled={!maestroSeleccionado?.autorizado}
              className="flex items-center gap-2 h-12 flex-1"
            >
              <Send className="h-4 w-4" />
              Guardar y Registrar Trabajadores
            </Button>
          </div>
        </CardContent>
      </Card>

      <NuevoMaestroObraModal
        open={mostrarNuevoMaestro}
        onOpenChange={setMostrarNuevoMaestro}
        onCreado={cargarMaestrosObra}
      />

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
                La entrada es por el pórtico de Pablo Paulet.
              </p>
            </div>
          </div>
        }
      />
    </div>
  );
}