import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Star, UserCheck, Car, MapPin, Save, CheckCircle, XCircle } from "lucide-react";
import { useFirebaseWrite } from "@/hooks/useFirebase";
import { Trabajador, RegistroTrabajadores, MaestroObra } from "@/types/acceso";
import { BuscadorFavoritos } from "@/components/acceso/BuscadorFavoritos";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";
import { NuevoMaestroObraModal } from "@/components/acceso/NuevoMaestroObraModal";

export const RegistroManualTrabajadores = () => {
  const { toast } = useToast();
  const { pushData } = useFirebaseWrite();
  
  const [tipoAcceso, setTipoAcceso] = useState<'vehicular' | 'peatonal'>('peatonal');
  const [placa, setPlaca] = useState("");
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([{ id: '1', nombre: '', dni: '', esMaestroObra: false }]);
  const [maestroObraId, setMaestroObraId] = useState("");
  const [direccion, setDireccion] = useState("");
  const [empadronadoId, setEmpadronadoId] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [mostrarNuevoMaestro, setMostrarNuevoMaestro] = useState(false);
  const [maestrosObra, setMaestrosObra] = useState<MaestroObra[]>([]);

  const agregarTrabajador = () => {
    const nuevoId = (trabajadores.length + 1).toString();
    setTrabajadores([...trabajadores, { id: nuevoId, nombre: '', dni: '', esMaestroObra: false }]);
  };

  const eliminarTrabajador = (id: string) => {
    if (trabajadores.length > 1) {
      setTrabajadores(trabajadores.filter(t => t.id !== id));
    }
  };

  const actualizarTrabajador = (id: string, campo: keyof Trabajador, valor: string | boolean) => {
    setTrabajadores(trabajadores.map(t => 
      t.id === id ? { ...t, [campo]: valor } : t
    ));
  };

  const guardarFavorito = async () => {
    try {
      const favorito = {
        empadronadoId,
        tipo: 'trabajador' as const,
        nombre: trabajadores[0]?.nombre || 'Sin nombre',
        datos: {
          tipoAcceso,
          placa: tipoAcceso === 'vehicular' ? placa : undefined,
          trabajadores,
          maestroObraId,
          direccion
        },
        fechaCreacion: Date.now()
      };

      await pushData(`usuarios/${empadronadoId}/favoritos`, favorito);
      
      toast({
        title: "Favorito Guardado",
        description: "El registro de trabajadores ha sido guardado en favoritos",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar en favoritos",
        variant: "destructive",
      });
    }
  };

  const registrarTrabajadores = async () => {
    // Validaciones
    if (!empadronadoId.trim()) {
      toast({
        title: "Error",
        description: "Seleccione un empadronado",
        variant: "destructive",
      });
      return;
    }

    if (!direccion.trim()) {
      toast({
        title: "Error",
        description: "Ingrese la dirección de destino",
        variant: "destructive",
      });
      return;
    }

    if (!maestroObraId.trim()) {
      toast({
        title: "Error",
        description: "Seleccione un maestro de obra",
        variant: "destructive",
      });
      return;
    }

    if (trabajadores.some(t => !t.nombre.trim() || !t.dni.trim())) {
      toast({
        title: "Error",
        description: "Complete todos los datos de los trabajadores",
        variant: "destructive",
      });
      return;
    }

    if (tipoAcceso === 'vehicular' && !placa.trim()) {
      toast({
        title: "Error",
        description: "Ingrese la placa del vehículo",
        variant: "destructive",
      });
      return;
    }

    // Mostrar confirmación antes de registrar
    setMostrarConfirmacion(true);
  };

  const confirmarRegistro = async () => {
    try {
      const registro: Omit<RegistroTrabajadores, 'id'> = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === 'vehicular' ? placa : undefined,
        maestroObraId,
        trabajadores,
        fechaCreacion: Date.now(),
        estado: 'pendiente'
      };

      await pushData('acceso/trabajadores', registro);

      // También registrar en seguridad para seguimiento
      await pushData('seguridad/registros_manuales', {
        ...registro,
        tipo: 'trabajador',
        direccion,
        registradoPor: 'seguridad',
        fechaRegistro: Date.now()
      });

      toast({
        title: "Trabajadores Registrados",
        description: "El registro ha sido enviado para autorización",
      });

      // Limpiar formulario
      setTipoAcceso('peatonal');
      setPlaca("");
      setTrabajadores([{ id: '1', nombre: '', dni: '', esMaestroObra: false }]);
      setMaestroObraId("");
      setDireccion("");
      setEmpadronadoId("");
      setMostrarConfirmacion(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar a los trabajadores",
        variant: "destructive",
      });
    }
  };

  const getMaestroObraStatus = (maestroId: string) => {
    const maestro = maestrosObra.find(m => m.id === maestroId);
    if (!maestro) return null;
    
    if (maestro.autorizado) {
      return { autorizado: true, icon: CheckCircle, color: "text-green-600" };
    } else {
      return { autorizado: false, icon: XCircle, color: "text-red-600" };
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Registro Manual de Trabajadores
          </CardTitle>
          <CardDescription>
            Registre trabajadores con maestro de obra autorizado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Buscador de Favoritos */}
          <BuscadorFavoritos 
            tipo="trabajador"
            onSeleccionar={(favorito) => {
              setTipoAcceso(favorito.datos.tipoAcceso);
              setPlaca(favorito.datos.placa || "");
              setTrabajadores(favorito.datos.trabajadores);
              setMaestroObraId(favorito.datos.maestroObraId);
              setDireccion(favorito.datos.direccion || "");
              setEmpadronadoId(favorito.empadronadoId);
            }}
          />

          {/* Tipo de Acceso */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Acceso</Label>
            <RadioGroup 
              value={tipoAcceso} 
              onValueChange={(value: 'vehicular' | 'peatonal') => setTipoAcceso(value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="peatonal" id="peatonal" />
                <Label htmlFor="peatonal" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
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

          {/* Placa (solo si es vehicular) */}
          {tipoAcceso === 'vehicular' && (
            <div className="space-y-2">
              <Label>Placa del Vehículo</Label>
              <Input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="max-w-xs"
              />
            </div>
          )}

          {/* Maestro de Obra */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Maestro de Obra</Label>
              <Button 
                onClick={() => setMostrarNuevoMaestro(true)}
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nuevo Maestro
              </Button>
            </div>
            
            <div className="space-y-2">
              <Input
                value={maestroObraId}
                onChange={(e) => setMaestroObraId(e.target.value)}
                placeholder="ID del maestro de obra"
              />
              {maestroObraId && (
                <div className="flex items-center gap-2 text-sm">
                  {(() => {
                    const status = getMaestroObraStatus(maestroObraId);
                    if (!status) return <span className="text-muted-foreground">Maestro no encontrado</span>;
                    
                    const Icon = status.icon;
                    return (
                      <>
                        <Icon className={`h-4 w-4 ${status.color}`} />
                        <span className={status.color}>
                          {status.autorizado ? "Maestro autorizado" : "Maestro NO autorizado - Comunicarse con JD"}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>

          {/* Datos de Trabajadores */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Datos de Trabajadores</Label>
              <Button 
                onClick={agregarTrabajador}
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Trabajador
              </Button>
            </div>

            {trabajadores.map((trabajador, index) => (
              <div key={trabajador.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Trabajador {index + 1}</h4>
                  {trabajadores.length > 1 && (
                    <Button
                      onClick={() => eliminarTrabajador(trabajador.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input
                      value={trabajador.nombre}
                      onChange={(e) => actualizarTrabajador(trabajador.id, 'nombre', e.target.value)}
                      placeholder="Nombre del trabajador"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DNI / Documento</Label>
                    <Input
                      value={trabajador.dni}
                      onChange={(e) => actualizarTrabajador(trabajador.id, 'dni', e.target.value)}
                      placeholder="12345678"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dirección de Destino */}
          <div className="space-y-2">
            <Label>Dirección de Destino</Label>
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 mt-3 text-muted-foreground" />
              <Input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Mz. A Lt. 15, Calle Los Rosales"
                className="flex-1"
              />
            </div>
          </div>

          {/* ID del Empadronado */}
          <div className="space-y-2">
            <Label>ID del Empadronado que Autoriza</Label>
            <Input
              value={empadronadoId}
              onChange={(e) => setEmpadronadoId(e.target.value)}
              placeholder="ID del empadronado"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={guardarFavorito}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!empadronadoId || trabajadores.some(t => !t.nombre.trim())}
            >
              <Star className="h-4 w-4" />
              Guardar Favorito
            </Button>
            <Button 
              onClick={registrarTrabajadores}
              className="flex-1 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Registrar Trabajadores
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmación */}
      <ConfirmacionDialog
        open={mostrarConfirmacion}
        onOpenChange={setMostrarConfirmacion}
        titulo="Confirmar Registro de Trabajadores"
        mensaje="¿Confirma con el propietario que pueden ingresar estos trabajadores?"
        onConfirmar={confirmarRegistro}
      />

      {/* Modal Nuevo Maestro de Obra */}
      <NuevoMaestroObraModal
        open={mostrarNuevoMaestro}
        onOpenChange={setMostrarNuevoMaestro}
        onMaestroCreado={(maestroId) => setMaestroObraId(maestroId)}
      />
    </div>
  );
};