import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Camera, User, Car, UserPlus, CheckCircle, XCircle } from "lucide-react";
import { useFirebaseWrite } from "@/hooks/useFirebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const BuscadorInteligente = () => {
  const { toast } = useToast();
  const { pushData } = useFirebaseWrite();
  
  const [busqueda, setBusqueda] = useState("");
  const [placaBuscada, setPlacaBuscada] = useState("");
  const [resultadoBusqueda, setResultadoBusqueda] = useState<any>(null);
  const [resultadoPlaca, setResultadoPlaca] = useState<any>(null);
  const [mostrarRegistroNuevo, setMostrarRegistroNuevo] = useState(false);
  const [nuevoUsuario, setNuevoUsuario] = useState({
    dni: "",
    nombre: "",
    telefono: "",
    direccion: ""
  });

  const buscarPersona = async () => {
    if (!busqueda.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un criterio de búsqueda",
        variant: "destructive",
      });
      return;
    }

    try {
      // Simular búsqueda en base de datos
      // En implementación real, conectar con Firebase RTDB
      const resultado = {
        encontrado: Math.random() > 0.5, // 50% de probabilidad
        datos: {
          nombre: "Juan Pérez García",
          dni: busqueda,
          telefono: "987654321",
          direccion: "Mz. A Lt. 15",
          esResidente: Math.random() > 0.3,
          esAportante: Math.random() > 0.4
        }
      };

      setResultadoBusqueda(resultado);

      if (!resultado.encontrado) {
        setNuevoUsuario({
          dni: busqueda,
          nombre: "",
          telefono: "",
          direccion: ""
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error en la búsqueda",
        variant: "destructive",
      });
    }
  };

  const reconocerPlaca = async () => {
    try {
      // Simular reconocimiento de placa con cámara
      toast({
        title: "Función en Desarrollo",
        description: "El reconocimiento de placas estará disponible próximamente",
      });

      // Simular resultado
      const resultado = {
        placa: placaBuscada || "ABC-123",
        propietario: "María González",
        esResidente: Math.random() > 0.3,
        esAportante: Math.random() > 0.4,
        vigente: Math.random() > 0.2
      };

      setResultadoPlaca(resultado);
    } catch (error) {
      toast({
        title: "Error",
        description: "Error en el reconocimiento",
        variant: "destructive",
      });
    }
  };

  const registrarNuevoUsuario = async () => {
    if (!nuevoUsuario.dni || !nuevoUsuario.nombre) {
      toast({
        title: "Error",
        description: "Complete los datos obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      // Simular conexión con API de RENIEC
      toast({
        title: "Consultando RENIEC...",
        description: "Obteniendo datos automáticamente",
      });

      // Simular respuesta de RENIEC
      setTimeout(async () => {
        const datosReniec = {
          ...nuevoUsuario,
          nombre: `${nuevoUsuario.nombre} (Datos RENIEC)`,
          fechaNacimiento: "1985-05-15",
          estadoCivil: "Soltero"
        };

        await pushData('empadronados/pendientes', {
          ...datosReniec,
          fechaRegistro: Date.now(),
          registradoPor: 'seguridad',
          estado: 'pendiente_aprobacion'
        });

        // Notificar a la junta directiva
        await pushData('notificaciones/junta_directiva', {
          tipo: 'nuevo_empadronado',
          mensaje: `Nuevo registro pendiente de aprobación: ${datosReniec.nombre}`,
          fecha: Date.now(),
          datos: datosReniec
        });

        toast({
          title: "Usuario Registrado",
          description: "Los datos han sido enviados a la Junta Directiva para aprobación",
        });

        setMostrarRegistroNuevo(false);
        setNuevoUsuario({ dni: "", nombre: "", telefono: "", direccion: "" });
      }, 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el usuario",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Buscador de Personas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Buscador Inteligente
          </CardTitle>
          <CardDescription>
            Busque por nombre, apellido o número de identidad
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="DNI, nombre o apellido"
              className="flex-1"
            />
            <Button onClick={buscarPersona}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {resultadoBusqueda && (
            <div className="space-y-3">
              {resultadoBusqueda.encontrado ? (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium">{resultadoBusqueda.datos.nombre}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium">DNI:</span>
                      <p>{resultadoBusqueda.datos.dni}</p>
                    </div>
                    <div>
                      <span className="font-medium">Teléfono:</span>
                      <p>{resultadoBusqueda.datos.telefono}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Dirección:</span>
                      <p>{resultadoBusqueda.datos.direccion}</p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Badge className={resultadoBusqueda.datos.esResidente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {resultadoBusqueda.datos.esResidente ? 'RESIDENTE' : 'NO RESIDENTE'}
                    </Badge>
                    <Badge className={resultadoBusqueda.datos.esAportante ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                      {resultadoBusqueda.datos.esAportante ? 'APORTANTE' : 'NO APORTANTE'}
                    </Badge>
                  </div>

                  <Button 
                    className="w-full"
                    disabled={!resultadoBusqueda.datos.esResidente}
                  >
                    {resultadoBusqueda.datos.esResidente ? 'Autorizar Ingreso' : 'Ingreso No Autorizado'}
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2 text-orange-600">
                    <XCircle className="h-5 w-5" />
                    <h4 className="font-medium">Usuario no encontrado</h4>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No se encontró información para: {busqueda}
                  </p>
                  
                  <Dialog open={mostrarRegistroNuevo} onOpenChange={setMostrarRegistroNuevo}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Registrar Nuevo Usuario
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Registrar Nuevo Usuario</DialogTitle>
                        <DialogDescription>
                          Complete los datos para conectar con RENIEC
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>DNI</Label>
                          <Input
                            value={nuevoUsuario.dni}
                            onChange={(e) => setNuevoUsuario({...nuevoUsuario, dni: e.target.value})}
                            placeholder="12345678"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Nombre Completo</Label>
                          <Input
                            value={nuevoUsuario.nombre}
                            onChange={(e) => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})}
                            placeholder="Nombre completo"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input
                            value={nuevoUsuario.telefono}
                            onChange={(e) => setNuevoUsuario({...nuevoUsuario, telefono: e.target.value})}
                            placeholder="987654321"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>Dirección del Lote</Label>
                          <Input
                            value={nuevoUsuario.direccion}
                            onChange={(e) => setNuevoUsuario({...nuevoUsuario, direccion: e.target.value})}
                            placeholder="Mz. A Lt. 15"
                          />
                        </div>

                        <div className="bg-muted/50 p-3 rounded-lg text-sm">
                          <p className="font-medium mb-1">Proceso automático:</p>
                          <p className="text-muted-foreground">
                            Los datos serán verificados con RENIEC y enviados a la Junta Directiva para aprobación.
                          </p>
                        </div>

                        <Button onClick={registrarNuevoUsuario} className="w-full">
                          Enviar Datos a JD
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconocimiento de Placas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Reconocimiento de Placas
          </CardTitle>
          <CardDescription>
            Active la cámara para reconocer placas automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={placaBuscada}
              onChange={(e) => setPlacaBuscada(e.target.value.toUpperCase())}
              placeholder="ABC-123 (opcional)"
              className="flex-1"
            />
            <Button onClick={reconocerPlaca}>
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
            <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Función de reconocimiento automático
            </p>
            <Button variant="outline" onClick={reconocerPlaca}>
              Activar Cámara
            </Button>
          </div>

          {resultadoPlaca && (
            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium">Placa: {resultadoPlaca.placa}</h4>
              </div>
              
              <div className="text-sm">
                <span className="font-medium">Propietario:</span>
                <p>{resultadoPlaca.propietario}</p>
              </div>

              <div className="flex gap-2">
                <Badge className={resultadoPlaca.esResidente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {resultadoPlaca.esResidente ? 'RESIDENTE' : 'NO RESIDENTE'}
                </Badge>
                <Badge className={resultadoPlaca.esAportante ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}>
                  {resultadoPlaca.esAportante ? 'APORTANTE' : 'NO APORTANTE'}
                </Badge>
                <Badge className={resultadoPlaca.vigente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {resultadoPlaca.vigente ? 'VIGENTE' : 'VENCIDO'}
                </Badge>
              </div>

              <Button 
                className="w-full"
                disabled={!resultadoPlaca.esResidente || !resultadoPlaca.vigente}
              >
                {resultadoPlaca.esResidente && resultadoPlaca.vigente ? 'Autorizar Ingreso' : 'Ingreso No Autorizado'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};