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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
      {/* Buscador de Personas - Mobile Optimized */}
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="p-3 md:p-6 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
              <Search className="h-3.5 w-3.5 md:h-5 md:w-5 text-primary" />
            </div>
            Buscador Inteligente
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Busque por nombre, apellido o número de identidad
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
          <div className="flex gap-2">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="DNI, nombre o apellido"
              className="flex-1 text-sm md:text-base h-9 md:h-10"
            />
            <Button onClick={buscarPersona} size="sm" className="h-9 md:h-10 px-3 md:px-4">
              <Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>

          {resultadoBusqueda && (
            <div className="space-y-3 animate-fade-in">
              {resultadoBusqueda.encontrado ? (
                <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-gradient-to-br from-background to-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-green-500/10">
                      <User className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                    </div>
                    <h4 className="font-medium text-sm md:text-base">{resultadoBusqueda.datos.nombre}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                    <div>
                      <span className="font-medium">DNI:</span>
                      <p className="text-muted-foreground">{resultadoBusqueda.datos.dni}</p>
                    </div>
                    <div>
                      <span className="font-medium">Teléfono:</span>
                      <p className="text-muted-foreground">{resultadoBusqueda.datos.telefono}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Dirección:</span>
                      <p className="text-muted-foreground">{resultadoBusqueda.datos.direccion}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    <Badge className={`text-[10px] md:text-xs ${resultadoBusqueda.datos.esResidente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {resultadoBusqueda.datos.esResidente ? 'RESIDENTE' : 'NO RESIDENTE'}
                    </Badge>
                    <Badge className={`text-[10px] md:text-xs ${resultadoBusqueda.datos.esAportante ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                      {resultadoBusqueda.datos.esAportante ? 'APORTANTE' : 'NO APORTANTE'}
                    </Badge>
                  </div>

                  <Button 
                    className="w-full text-xs md:text-sm h-9 md:h-10 hover:scale-105 transition-transform"
                    disabled={!resultadoBusqueda.datos.esResidente}
                  >
                    {resultadoBusqueda.datos.esResidente ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                        Autorizar Ingreso
                      </>
                    ) : (
                      <>
                        <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                        Ingreso No Autorizado
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-orange-50/50">
                  <div className="flex items-center gap-2 text-orange-600">
                    <XCircle className="h-4 w-4 md:h-5 md:w-5" />
                    <h4 className="font-medium text-sm md:text-base">Usuario no encontrado</h4>
                  </div>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    No se encontró información para: {busqueda}
                  </p>
                  
                  <Dialog open={mostrarRegistroNuevo} onOpenChange={setMostrarRegistroNuevo}>
                    <DialogTrigger asChild>
                      <Button className="w-full text-xs md:text-sm h-9 md:h-10 hover:scale-105 transition-transform">
                        <UserPlus className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                        Registrar Nuevo Usuario
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md mx-auto">
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

      {/* Reconocimiento de Placas - Mobile Optimized */}
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="p-3 md:p-6 bg-gradient-to-r from-blue-500/5 to-blue-500/10">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10">
              <Camera className="h-3.5 w-3.5 md:h-5 md:w-5 text-blue-600" />
            </div>
            Reconocimiento de Placas
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Active la cámara para reconocer placas automáticamente
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
          <div className="flex gap-2">
            <Input
              value={placaBuscada}
              onChange={(e) => setPlacaBuscada(e.target.value.toUpperCase())}
              placeholder="ABC-123 (opcional)"
              className="flex-1 text-sm md:text-base h-9 md:h-10"
            />
            <Button onClick={reconocerPlaca} size="sm" className="h-9 md:h-10 px-3 md:px-4">
              <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>

          <div className="border-2 border-dashed border-muted rounded-lg p-6 md:p-8 text-center bg-gradient-to-br from-background to-muted/20">
            <Camera className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
            <p className="text-xs md:text-sm text-muted-foreground mb-3 md:mb-4">
              Función de reconocimiento automático
            </p>
            <Button 
              variant="outline" 
              onClick={reconocerPlaca}
              size="sm"
              className="text-xs md:text-sm h-9 md:h-10 hover:scale-105 transition-transform"
            >
              <Camera className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
              Activar Cámara
            </Button>
          </div>

          {resultadoPlaca && (
            <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-gradient-to-br from-background to-blue-50/20 animate-fade-in">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-full bg-blue-500/10">
                  <Car className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                </div>
                <h4 className="font-medium text-sm md:text-base">Placa: {resultadoPlaca.placa}</h4>
              </div>
              
              <div className="text-xs md:text-sm">
                <span className="font-medium">Propietario:</span>
                <p className="text-muted-foreground">{resultadoPlaca.propietario}</p>
              </div>

              <div className="flex flex-wrap gap-1.5 md:gap-2">
                <Badge className={`text-[10px] md:text-xs ${resultadoPlaca.esResidente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {resultadoPlaca.esResidente ? 'RESIDENTE' : 'NO RESIDENTE'}
                </Badge>
                <Badge className={`text-[10px] md:text-xs ${resultadoPlaca.esAportante ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'}`}>
                  {resultadoPlaca.esAportante ? 'APORTANTE' : 'NO APORTANTE'}
                </Badge>
                <Badge className={`text-[10px] md:text-xs ${resultadoPlaca.vigente ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {resultadoPlaca.vigente ? 'VIGENTE' : 'VENCIDO'}
                </Badge>
              </div>

              <Button 
                className="w-full text-xs md:text-sm h-9 md:h-10 hover:scale-105 transition-transform"
                disabled={!resultadoPlaca.esResidente || !resultadoPlaca.vigente}
              >
                {resultadoPlaca.esResidente && resultadoPlaca.vigente ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                    Autorizar Ingreso
                  </>
                ) : (
                  <>
                    <XCircle className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5" />
                    Ingreso No Autorizado
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};