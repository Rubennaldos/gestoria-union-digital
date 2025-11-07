import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode, Camera, X, Search, LogIn, LogOut } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ref, update, get, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/config/firebase";

interface Visitante {
  nombre: string;
  dni: string;
}

interface DatosQR {
  id: string;
  tipoAcceso: string;
  visitantes: Visitante[];
  placas?: string[];
  menores: number;
  createdAt: number;
  tipoRegistro?: "visita" | "alquiler";
}

interface PersonaEncontrada {
  id: string;
  nombre: string;
  dni: string;
  tipo: "visitante" | "trabajador";
  registroId: string;
  ingresado?: boolean;
  horaIngreso?: number;
  horaSalida?: number;
}

export function EscanearQRPortico() {
  const isMobile = useIsMobile();
  const [escaneando, setEscaneando] = useState(false);
  const [datosQR, setDatosQR] = useState<DatosQR | null>(null);
  const [visitantesSeleccionados, setVisitantesSeleccionados] = useState<Set<number>>(new Set());
  const [procesando, setProcesando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const { toast } = useToast();

  // Estados para búsqueda manual (PC)
  const [mostrarBusqueda, setMostrarBusqueda] = useState(false);
  const [dniBusqueda, setDniBusqueda] = useState("");
  const [nombreBusqueda, setNombreBusqueda] = useState("");
  const [apellidoBusqueda, setApellidoBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<PersonaEncontrada[]>([]);
  const [buscando, setBuscando] = useState(false);

  useEffect(() => {
    console.log("useEffect escaneando cambió a:", escaneando);
    if (!escaneando) return;

    // Esperar a que el video element esté disponible en el DOM
    const intentarIniciarEscaneo = () => {
      console.log("Intentando iniciar escaneo, videoRef.current existe:", !!videoRef.current);
      if (videoRef.current) {
        console.log("Video ref disponible, iniciando escaneo...");
        iniciarEscaneo();
      } else {
        console.log("Video ref no disponible todavía, reintentando en 100ms...");
        setTimeout(intentarIniciarEscaneo, 100);
      }
    };

    // Dar un pequeño delay para que el Dialog se monte
    const timeoutId = setTimeout(intentarIniciarEscaneo, 50);

    return () => {
      clearTimeout(timeoutId);
      console.log("Limpiando escaneo");
      detenerEscaneo();
    };
  }, [escaneando]);

  const iniciarEscaneo = async () => {
    try {
      const reader = new BrowserQRCodeReader();
      readerRef.current = reader;

      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (devices.length === 0) {
        toast({
          title: "Error",
          description: "No se encontró cámara disponible",
          variant: "destructive",
        });
        setEscaneando(false);
        return;
      }

      // Usar la cámara trasera si está disponible
      const videoInputDevice = devices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('trasera')
      ) || devices[0];

      reader.decodeFromVideoDevice(
        videoInputDevice.deviceId,
        videoRef.current!,
        (result, error) => {
          if (result) {
            procesarQR(result.getText());
            detenerEscaneo();
          }
        }
      );
    } catch (error) {
      console.error("Error al iniciar escaneo:", error);
      toast({
        title: "Error",
        description: "No se pudo acceder a la cámara",
        variant: "destructive",
      });
      setEscaneando(false);
    }
  };

  const detenerEscaneo = () => {
    if (readerRef.current) {
      try {
        // Detener streams de video
        const videoElement = videoRef.current;
        if (videoElement && videoElement.srcObject) {
          const stream = videoElement.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoElement.srcObject = null;
        }
      } catch (e) {
        console.error("Error al detener stream:", e);
      }
      readerRef.current = null;
    }
    setEscaneando(false);
  };

  const procesarQR = async (texto: string) => {
    try {
      const datos = JSON.parse(texto) as DatosQR;
      
      // Verificar que el registro existe y está autorizado
      const registroSnap = await get(ref(db, `acceso/visitas/${datos.id}`));
      if (!registroSnap.exists()) {
        toast({
          title: "Error",
          description: "Código QR no válido o registro no encontrado",
          variant: "destructive",
        });
        return;
      }

      const registro = registroSnap.val();
      if (registro.estado !== "autorizado") {
        toast({
          title: "Acceso Denegado",
          description: "Esta visita no ha sido autorizada",
          variant: "destructive",
        });
        return;
      }

      setDatosQR(datos);
      // Seleccionar todos por defecto
      setVisitantesSeleccionados(new Set(datos.visitantes.map((_, i) => i)));
    } catch (error) {
      console.error("Error al procesar QR:", error);
      toast({
        title: "Error",
        description: "Código QR no válido",
        variant: "destructive",
      });
    }
  };

  const toggleVisitante = (index: number) => {
    const nuevos = new Set(visitantesSeleccionados);
    if (nuevos.has(index)) {
      nuevos.delete(index);
    } else {
      nuevos.add(index);
    }
    setVisitantesSeleccionados(nuevos);
  };

  const registrarEntrada = async () => {
    if (!datosQR || visitantesSeleccionados.size === 0) return;

    setProcesando(true);
    try {
      const now = Date.now();
      
      // Registrar ingreso en el registro de visita
      await update(ref(db, `acceso/visitas/${datosQR.id}`), {
        ingresado: true,
        horaIngreso: now,
        ultimoIngreso: now,
        horaSalida: null,
      });

      // Registrar en historial de seguridad
      await update(ref(db, `seguridad/historial/${datosQR.id}_ingreso_${now}`), {
        tipo: "visitante",
        registroId: datosQR.id,
        accion: "ingreso",
        timestamp: now,
        visitantesIngresados: datosQR.visitantes
          .filter((_, i) => visitantesSeleccionados.has(i))
          .map(v => v.nombre),
      });

      toast({
        title: "Entrada Registrada",
        description: `${visitantesSeleccionados.size} visitante(s) ingresaron correctamente`,
      });

      setDatosQR(null);
      setVisitantesSeleccionados(new Set());
    } catch (error) {
      console.error("Error al registrar entrada:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la entrada",
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const seleccionarTodos = () => {
    if (datosQR) {
      setVisitantesSeleccionados(new Set(datosQR.visitantes.map((_, i) => i)));
    }
  };

  // Búsqueda manual de personas registradas
  const buscarPersona = async () => {
    if (!dniBusqueda && !nombreBusqueda && !apellidoBusqueda) {
      toast({
        title: "Datos requeridos",
        description: "Ingresa al menos un criterio de búsqueda",
        variant: "destructive",
      });
      return;
    }

    setBuscando(true);
    setResultadosBusqueda([]);

    try {
      const resultados: PersonaEncontrada[] = [];

      // Buscar en visitas autorizadas
      const visitasSnap = await get(ref(db, "acceso/visitas"));
      if (visitasSnap.exists()) {
        const visitas = visitasSnap.val();
        Object.entries(visitas).forEach(([id, visita]: [string, any]) => {
          if (visita.estado === "autorizado" && visita.visitantes) {
            visita.visitantes.forEach((v: Visitante) => {
              const coincideDNI = dniBusqueda && v.dni?.toLowerCase().includes(dniBusqueda.toLowerCase());
              const coincideNombre = nombreBusqueda && v.nombre?.toLowerCase().includes(nombreBusqueda.toLowerCase());
              const coincideApellido = apellidoBusqueda && v.nombre?.toLowerCase().includes(apellidoBusqueda.toLowerCase());

              if (coincideDNI || coincideNombre || coincideApellido) {
                resultados.push({
                  id: v.dni || v.nombre,
                  nombre: v.nombre,
                  dni: v.dni,
                  tipo: "visitante",
                  registroId: id,
                  ingresado: visita.ingresado,
                  horaIngreso: visita.horaIngreso,
                  horaSalida: visita.horaSalida,
                });
              }
            });
          }
        });
      }

      // Buscar en trabajadores autorizados
      const trabajadoresSnap = await get(ref(db, "acceso/trabajadores"));
      if (trabajadoresSnap.exists()) {
        const trabajadores = trabajadoresSnap.val();
        Object.entries(trabajadores).forEach(([id, trabajo]: [string, any]) => {
          if (trabajo.estado === "autorizado" && trabajo.trabajadores) {
            trabajo.trabajadores.forEach((t: any) => {
              const coincideDNI = dniBusqueda && t.dni?.toLowerCase().includes(dniBusqueda.toLowerCase());
              const coincideNombre = nombreBusqueda && t.nombre?.toLowerCase().includes(nombreBusqueda.toLowerCase());
              const coincideApellido = apellidoBusqueda && t.nombre?.toLowerCase().includes(apellidoBusqueda.toLowerCase());

              if (coincideDNI || coincideNombre || coincideApellido) {
                resultados.push({
                  id: t.dni || t.nombre,
                  nombre: t.nombre,
                  dni: t.dni,
                  tipo: "trabajador",
                  registroId: id,
                  ingresado: trabajo.ingresado,
                  horaIngreso: trabajo.horaIngreso,
                  horaSalida: trabajo.horaSalida,
                });
              }
            });
          }
        });
      }

      setResultadosBusqueda(resultados);

      if (resultados.length === 0) {
        toast({
          title: "Sin resultados",
          description: "No se encontraron personas registradas con esos datos",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error al buscar persona:", error);
      toast({
        title: "Error",
        description: "Error al buscar en la base de datos",
        variant: "destructive",
      });
    } finally {
      setBuscando(false);
    }
  };

  // Registrar entrada de una persona
  const registrarEntradaPersona = async (persona: PersonaEncontrada) => {
    setProcesando(true);
    try {
      const now = Date.now();
      const ruta = persona.tipo === "visitante" ? "acceso/visitas" : "acceso/trabajadores";

      await update(ref(db, `${ruta}/${persona.registroId}`), {
        ingresado: true,
        horaIngreso: now,
        ultimoIngreso: now,
        horaSalida: null,
      });

      await update(ref(db, `seguridad/historial/${persona.registroId}_ingreso_${now}`), {
        tipo: persona.tipo,
        registroId: persona.registroId,
        accion: "ingreso",
        timestamp: now,
        persona: persona.nombre,
      });

      toast({
        title: "Entrada Registrada",
        description: `${persona.nombre} ingresó correctamente`,
      });

      // Actualizar resultados
      buscarPersona();
    } catch (error) {
      console.error("Error al registrar entrada:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la entrada",
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  // Registrar salida de una persona
  const registrarSalidaPersona = async (persona: PersonaEncontrada) => {
    setProcesando(true);
    try {
      const now = Date.now();
      const ruta = persona.tipo === "visitante" ? "acceso/visitas" : "acceso/trabajadores";

      await update(ref(db, `${ruta}/${persona.registroId}`), {
        ingresado: false,
        horaSalida: now,
      });

      await update(ref(db, `seguridad/historial/${persona.registroId}_salida_${now}`), {
        tipo: persona.tipo,
        registroId: persona.registroId,
        accion: "salida",
        timestamp: now,
        persona: persona.nombre,
      });

      toast({
        title: "Salida Registrada",
        description: `${persona.nombre} salió correctamente`,
      });

      // Actualizar resultados
      buscarPersona();
    } catch (error) {
      console.error("Error al registrar salida:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la salida",
        variant: "destructive",
      });
    } finally {
      setProcesando(false);
    }
  };

  const handleEscanearClick = () => {
    console.log("Botón de escanear QR clickeado");
    console.log("Estado actual de escaneando:", escaneando);
    setEscaneando(true);
    console.log("Estado después de setEscaneando(true)");
  };

  return (
    <>
      {/* Escanear QR - Siempre visible */}
      <Card 
        className="hover:shadow-xl transition-all duration-300 cursor-pointer group" 
        onClick={handleEscanearClick}
      >
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-6 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 group-hover:scale-110 transition-transform duration-300">
              <QrCode className="h-16 w-16 md:h-24 md:w-24 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-2">Escanear Código QR</h3>
              <p className="text-muted-foreground">
                Escanea el código QR de la visita para registrar entrada
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Búsqueda Manual - Disponible en todos los dispositivos */}
      <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group" 
            onClick={() => setMostrarBusqueda(true)}>
        <CardContent className="p-8 md:p-12">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-6 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 group-hover:scale-110 transition-transform duration-300">
              <Search className="h-16 w-16 md:h-24 md:w-24 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-bold mb-2">Buscar Persona</h3>
              <p className="text-muted-foreground">
                Busca visitantes o trabajadores por DNI o nombre
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Búsqueda Manual */}
      <Dialog open={mostrarBusqueda} onOpenChange={setMostrarBusqueda}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Buscar Persona Registrada
            </DialogTitle>
            <DialogDescription>
              Ingresa DNI, nombre o apellido para buscar visitantes o trabajadores autorizados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Formulario de búsqueda */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  placeholder="12345678"
                  value={dniBusqueda}
                  onChange={(e) => setDniBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarPersona()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre</Label>
                <Input
                  id="nombre"
                  placeholder="Juan"
                  value={nombreBusqueda}
                  onChange={(e) => setNombreBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarPersona()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apellido">Apellido</Label>
                <Input
                  id="apellido"
                  placeholder="Pérez"
                  value={apellidoBusqueda}
                  onChange={(e) => setApellidoBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && buscarPersona()}
                />
              </div>
            </div>

            <Button onClick={buscarPersona} disabled={buscando} className="w-full">
              {buscando ? "Buscando..." : "Buscar"}
            </Button>

            {/* Resultados */}
            {resultadosBusqueda.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium">Resultados ({resultadosBusqueda.length})</h4>
                {resultadosBusqueda.map((persona) => (
                  <Card key={persona.id + persona.registroId}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{persona.nombre}</p>
                            <Badge variant={persona.tipo === "visitante" ? "default" : "secondary"}>
                              {persona.tipo === "visitante" ? "Visitante" : "Trabajador"}
                            </Badge>
                            {persona.ingresado && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-300">
                                ADENTRO
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">DNI: {persona.dni}</p>
                          {persona.horaIngreso && (
                            <p className="text-xs text-muted-foreground">
                              Último ingreso: {new Date(persona.horaIngreso).toLocaleString("es-PE")}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!persona.ingresado ? (
                            <Button
                              size="sm"
                              onClick={() => registrarEntradaPersona(persona)}
                              disabled={procesando}
                            >
                              <LogIn className="h-4 w-4 mr-1" />
                              Entrada
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => registrarSalidaPersona(persona)}
                              disabled={procesando}
                            >
                              <LogOut className="h-4 w-4 mr-1" />
                              Salida
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Escaneo */}
      {console.log("Renderizando modal, escaneando =", escaneando)}
      <Dialog open={escaneando} onOpenChange={(open) => {
        console.log("Dialog onChange:", open);
        if (!open) {
          detenerEscaneo();
        } else {
          setEscaneando(true);
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Escaneando Código QR
            </DialogTitle>
            <DialogDescription>
              Coloca el código QR frente a la cámara
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: "400px" }}
              playsInline
              autoPlay
              muted
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => {
                console.log("Cerrando escáner");
                detenerEscaneo();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Visitantes */}
      <Dialog open={!!datosQR} onOpenChange={() => setDatosQR(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Entrada de Visitantes</DialogTitle>
            <DialogDescription>
              Selecciona los visitantes que ingresarán
            </DialogDescription>
          </DialogHeader>

          {datosQR && (
            <div className="space-y-4">
              {/* Información general */}
              <Card>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Tipo de Acceso:</span>
                      <p className="text-muted-foreground capitalize">{datosQR.tipoAcceso}</p>
                    </div>
                    {datosQR.tipoRegistro && (
                      <div>
                        <span className="font-medium">Tipo de Registro:</span>
                        <Badge variant={datosQR.tipoRegistro === "alquiler" ? "default" : "secondary"}>
                          {datosQR.tipoRegistro === "alquiler" ? "Alquiler" : "Visita"}
                        </Badge>
                      </div>
                    )}
                    {datosQR.placas && datosQR.placas.length > 0 && (
                      <div>
                        <span className="font-medium">Placas:</span>
                        <p className="text-muted-foreground">{datosQR.placas.join(", ")}</p>
                      </div>
                    )}
                    {datosQR.menores > 0 && (
                      <div>
                        <span className="font-medium">Menores:</span>
                        <p className="text-muted-foreground">{datosQR.menores}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Lista de visitantes */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Visitantes ({datosQR.visitantes.length})</h4>
                  <Button variant="outline" size="sm" onClick={seleccionarTodos}>
                    Seleccionar Todos
                  </Button>
                </div>

                {datosQR.visitantes.map((visitante, index) => (
                  <Card key={index} className={visitantesSeleccionados.has(index) ? "border-primary" : ""}>
                    <CardContent className="py-3">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={visitantesSeleccionados.has(index)}
                          onCheckedChange={() => toggleVisitante(index)}
                        />
                        <div className="flex-1">
                          <p className="font-medium">{visitante.nombre}</p>
                          {visitante.dni && (
                            <p className="text-sm text-muted-foreground">DNI: {visitante.dni}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Botones de acción */}
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setDatosQR(null)}
                  disabled={procesando}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={registrarEntrada}
                  disabled={visitantesSeleccionados.size === 0 || procesando}
                >
                  {procesando ? "Registrando..." : `Registrar Entrada (${visitantesSeleccionados.size})`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
