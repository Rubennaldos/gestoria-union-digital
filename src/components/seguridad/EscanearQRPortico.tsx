import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QrCode, Camera, X } from "lucide-react";
import { BrowserQRCodeReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ref, update, get } from "firebase/database";
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

export function EscanearQRPortico() {
  const [escaneando, setEscaneando] = useState(false);
  const [datosQR, setDatosQR] = useState<DatosQR | null>(null);
  const [visitantesSeleccionados, setVisitantesSeleccionados] = useState<Set<number>>(new Set());
  const [procesando, setProcesando] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (escaneando && videoRef.current) {
      iniciarEscaneo();
    }
    return () => {
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

  return (
    <>
      <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group" 
            onClick={() => setEscaneando(true)}>
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

      {/* Modal de Escaneo */}
      <Dialog open={escaneando} onOpenChange={setEscaneando}>
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
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2"
              onClick={detenerEscaneo}
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
