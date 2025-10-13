import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileDown, ExternalLink, TrendingUp, TrendingDown, Download, Eye, Calendar, CreditCard, Hash, CheckCircle, XCircle, Users } from "lucide-react";
import { MovimientoFinanciero } from "@/types/finanzas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { generarComprobanteFinanciero } from "@/lib/pdf/comprobanteFinanciero";
import { generarVoucherEvento, archivoABase64 } from "@/lib/pdf/voucherEvento";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { get, ref } from "firebase/database";
import { db } from "@/config/firebase";
import { InscripcionEvento, Evento } from "@/types/eventos";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DetalleMovimientoModalProps {
  movimiento: MovimientoFinanciero | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categoriasLabels: Record<string, string> = {
  donacion: "Donación",
  multa_externa: "Multa Externa",
  evento: "Evento",
  alquiler: "Alquiler",
  intereses: "Intereses",
  mantenimiento: "Mantenimiento",
  servicios: "Servicios",
  personal: "Personal",
  seguridad: "Seguridad",
  compras: "Compras",
  eventos: "Eventos",
  reparaciones: "Reparaciones",
  otro: "Otro",
};

interface InscripcionDetallada extends InscripcionEvento {
  evento?: Evento;
  medioPago?: string;
  numeroOperacion?: string;
  comprobanteImagenUrl?: string;
}

export const DetalleMovimientoModal = ({
  movimiento,
  open,
  onOpenChange,
}: DetalleMovimientoModalProps) => {
  const [descargando, setDescargando] = useState(false);
  const [inscripciones, setInscripciones] = useState<InscripcionDetallada[]>([]);
  const [cargandoInscripciones, setCargandoInscripciones] = useState(false);
  const [imagenComprobanteModal, setImagenComprobanteModal] = useState<string | null>(null);

  useEffect(() => {
    if (open && movimiento && movimiento.categoria === "evento" && movimiento.tipo === "ingreso") {
      cargarInscripcionesEvento();
    } else {
      setInscripciones([]);
    }
  }, [open, movimiento]);

  const cargarInscripcionesEvento = async () => {
    if (!movimiento?.descripcion) {
      console.log("No hay descripción en el movimiento");
      return;
    }
    
    try {
      setCargandoInscripciones(true);
      
      console.log("Cargando inscripciones para movimiento:", movimiento);
      
      // Extraer el nombre del evento de la descripción
      const match = movimiento.descripcion.match(/Inscripción:\s*(.+)/);
      if (!match) {
        console.log("No se pudo extraer el nombre del evento de la descripción:", movimiento.descripcion);
        return;
      }

      const eventoNombre = match[1].trim();
      console.log("Buscando inscripciones para evento:", eventoNombre);
      
      // Buscar todas las inscripciones
      const inscripcionesRef = ref(db, "inscripcionesEventos");
      const inscripcionesSnap = await get(inscripcionesRef);
      
      if (!inscripcionesSnap.exists()) {
        console.log("No hay inscripciones en la base de datos");
        return;
      }

      const inscripcionesData: InscripcionDetallada[] = [];
      
      for (const [key, value] of Object.entries(inscripcionesSnap.val())) {
        const inscripcion = value as InscripcionEvento;
        
        // Cargar el evento correspondiente
        const eventoRef = ref(db, `eventos/${inscripcion.eventoId}`);
        const eventoSnap = await get(eventoRef);
        
        if (eventoSnap.exists()) {
          const evento = { id: eventoSnap.key!, ...eventoSnap.val() } as Evento;
          
          // Verificar si el nombre del evento coincide y tiene pago realizado
          if (evento.titulo === eventoNombre && inscripcion.pagoRealizado) {
            console.log("Encontrada inscripción:", inscripcion);
            
            // Obtener información adicional del comprobante
            let medioPago = "No especificado";
            let numeroOperacion = "No especificado";
            let comprobanteImagenUrl: string | undefined;
            
            if (inscripcion.observaciones) {
              try {
                const obs = JSON.parse(inscripcion.observaciones);
                console.log("Observaciones parseadas:", obs);
                if (obs.medioPago) medioPago = obs.medioPago;
                if (obs.numeroOperacion) numeroOperacion = obs.numeroOperacion;
                if (obs.comprobanteUrl) comprobanteImagenUrl = obs.comprobanteUrl;
              } catch (e) {
                console.log("No se pudieron parsear las observaciones como JSON");
              }
            }
            
            inscripcionesData.push({
              ...inscripcion,
              id: key,
              evento,
              medioPago,
              numeroOperacion,
              comprobanteImagenUrl
            });
          }
        }
      }
      
      console.log("Total de inscripciones encontradas:", inscripcionesData.length);
      setInscripciones(inscripcionesData);
    } catch (error) {
      console.error("Error al cargar inscripciones:", error);
      toast.error("Error al cargar detalles de inscripciones");
    } finally {
      setCargandoInscripciones(false);
    }
  };

  if (!movimiento) return null;

  const descargarComprobanteInscripcion = async (inscripcion: InscripcionDetallada) => {
    try {
      if (!inscripcion.evento) {
        toast.error("No se encontró información del evento");
        return;
      }

      // Parsear personas y sesiones de observaciones
      let personas: Array<{nombre: string, dni: string}> = [];
      let sesiones: Array<{lugar: string, fecha: string, horaInicio: string, horaFin: string, precio: number}> = [];
      let comprobanteBase64: string | undefined;

      if (inscripcion.observaciones) {
        try {
          const obs = JSON.parse(inscripcion.observaciones);
          personas = obs.personas || [];
          sesiones = obs.sesiones || [];
          if (inscripcion.comprobanteImagenUrl) {
            // Convertir URL a base64
            const response = await fetch(inscripcion.comprobanteImagenUrl);
            const blob = await response.blob();
            comprobanteBase64 = await archivoABase64(new File([blob], "comprobante.jpg"));
          }
        } catch (e) {
          console.error("Error al parsear observaciones:", e);
        }
      }

      const pdfBlob = await generarVoucherEvento({
        eventoTitulo: inscripcion.evento.titulo,
        eventoCategoria: inscripcion.evento.categoria,
        personas: personas.length > 0 ? personas : [{
          nombre: inscripcion.nombreEmpadronado,
          dni: "No especificado"
        }],
        sesiones: sesiones.length > 0 ? sesiones : inscripcion.evento.sesiones.map(s => ({
          lugar: s.lugar,
          fecha: new Date(s.fecha).toISOString(),
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          precio: s.precio
        })),
        montoTotal: inscripcion.montoPagado || 0,
        fechaPago: new Date(inscripcion.fechaPago || Date.now()),
        numeroVoucher: inscripcion.comprobanteId || inscripcion.id,
        comprobanteBase64
      });

      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Comprobante-${inscripcion.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Comprobante descargado correctamente");
    } catch (error) {
      console.error("Error al descargar comprobante:", error);
      toast.error("Error al descargar el comprobante");
    }
  };

  const descargarComprobante = async () => {
    try {
      setDescargando(true);
      
      const pdfBlob = await generarComprobanteFinanciero({
        id: movimiento.id,
        tipo: movimiento.tipo,
        categoria: categoriasLabels[movimiento.categoria] || movimiento.categoria,
        monto: movimiento.monto,
        descripcion: movimiento.descripcion,
        fecha: movimiento.fecha,
        numeroComprobante: movimiento.numeroComprobante,
        beneficiario: movimiento.beneficiario,
        proveedor: movimiento.proveedor,
        observaciones: movimiento.observaciones,
        registradoPorNombre: movimiento.registradoPorNombre,
        createdAt: movimiento.createdAt,
        comprobantes: movimiento.comprobantes,
      });

      // Descargar el PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante-${movimiento.tipo}-${movimiento.id.slice(-8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Comprobante descargado correctamente");
    } catch (error) {
      console.error("Error al descargar comprobante:", error);
      toast.error("Error al descargar el comprobante");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {movimiento.tipo === "ingreso" ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <TrendingDown className="h-6 w-6 text-red-600" />
              )}
              <DialogTitle>
                Detalle de {movimiento.tipo === "ingreso" ? "Ingreso" : "Egreso"}
              </DialogTitle>
            </div>
            <Button
              onClick={descargarComprobante}
              disabled={descargando}
              size="sm"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              {descargando ? "Descargando..." : "Descargar PDF"}
            </Button>
          </div>
          <DialogDescription className="sr-only">
            Información detallada del movimiento financiero
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información Principal */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Información General</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Tipo</p>
                <Badge
                  variant={movimiento.tipo === "ingreso" ? "default" : "destructive"}
                  className="mt-1"
                >
                  {movimiento.tipo === "ingreso" ? "Ingreso" : "Egreso"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-medium">{categoriasLabels[movimiento.categoria]}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monto</p>
                <p className="text-2xl font-bold">
                  <span
                    className={
                      movimiento.tipo === "ingreso" ? "text-green-600" : "text-red-600"
                    }
                  >
                    S/ {movimiento.monto.toFixed(2)}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">
                  {format(new Date(movimiento.fecha), "dd 'de' MMMM 'de' yyyy", {
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Descripción */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Descripción</h3>
            <p className="text-sm whitespace-pre-wrap">{movimiento.descripcion}</p>
          </div>

          {/* Información Adicional */}
          {(movimiento.numeroComprobante ||
            movimiento.proveedor ||
            movimiento.beneficiario ||
            movimiento.observaciones) && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">Información Adicional</h3>
                <div className="grid grid-cols-2 gap-4">
                  {movimiento.numeroComprobante && (
                    <div>
                      <p className="text-sm text-muted-foreground">N° Comprobante</p>
                      <p className="font-medium">{movimiento.numeroComprobante}</p>
                    </div>
                  )}
                  {movimiento.proveedor && (
                    <div>
                      <p className="text-sm text-muted-foreground">Proveedor</p>
                      <p className="font-medium">{movimiento.proveedor}</p>
                    </div>
                  )}
                  {movimiento.beneficiario && (
                    <div>
                      <p className="text-sm text-muted-foreground">Beneficiario</p>
                      <p className="font-medium">{movimiento.beneficiario}</p>
                    </div>
                  )}
                </div>
                {movimiento.observaciones && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground">Observaciones</p>
                    <p className="text-sm mt-1 whitespace-pre-wrap">
                      {movimiento.observaciones}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Comprobantes */}
          {movimiento.comprobantes && movimiento.comprobantes.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-3">
                  Comprobantes ({movimiento.comprobantes.length})
                </h3>
                <div className="space-y-2">
                  {movimiento.comprobantes.map((comprobante, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{comprobante.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {(comprobante.tamano / 1024).toFixed(2)} KB •{" "}
                          {format(comprobante.fechaSubida, "dd/MM/yyyy HH:mm", {
                            locale: es,
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(comprobante.url, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = comprobante.url;
                            link.download = comprobante.nombre;
                            link.click();
                          }}
                        >
                          <FileDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Detalles de Inscritos (Solo para eventos) */}
          {movimiento.categoria === "evento" && movimiento.tipo === "ingreso" && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Detalles de Inscritos
                </h3>
                
                {cargandoInscripciones ? (
                  <p className="text-sm text-muted-foreground">Cargando inscripciones...</p>
                ) : inscripciones.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No se encontraron inscripciones</p>
                ) : (
                  <div className="space-y-4">
                    {inscripciones.map((inscripcion) => {
                      // Parsear personas y sesiones de observaciones
                      let personas: Array<{nombre: string, dni: string}> = [];
                      let sesiones: Array<{lugar: string, fecha: string, horaInicio: string, horaFin: string}> = [];
                      let correo = "";
                      
                      if (inscripcion.observaciones) {
                        try {
                          const obs = JSON.parse(inscripcion.observaciones);
                          personas = obs.personas || [];
                          sesiones = obs.sesiones || [];
                          correo = obs.correo || "";
                        } catch (e) {
                          console.error("Error al parsear observaciones:", e);
                        }
                      }
                      
                      return (
                        <div key={inscripcion.id} className="border rounded-lg p-4 space-y-4 bg-card">
                          {/* Encabezado con info de registro */}
                          <div className="flex justify-between items-start pb-3 border-b">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  Fecha de Registro: {format(new Date(inscripcion.fechaInscripcion), "dd/MM/yyyy HH:mm", { locale: es })}
                                </span>
                              </div>
                              {correo && (
                                <div className="flex items-center gap-2">
                                  <Hash className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm text-muted-foreground">{correo}</span>
                                </div>
                              )}
                            </div>
                            <Badge variant={inscripcion.pagoRealizado ? "default" : "secondary"}>
                              {inscripcion.estado}
                            </Badge>
                          </div>
                          
                          {/* Personas Inscritas */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              Personas Inscritas
                            </h4>
                            {personas.length > 0 ? (
                              <div className="bg-muted/50 rounded-md p-3 space-y-2">
                                {personas.map((persona, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm">
                                    <span className="font-medium">{persona.nombre}</span>
                                    <span className="text-muted-foreground">DNI: {persona.dni}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="bg-muted/50 rounded-md p-3">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="font-medium">{inscripcion.nombreEmpadronado}</span>
                                  <span className="text-muted-foreground">
                                    {inscripcion.acompanantes > 0 ? `+ ${inscripcion.acompanantes} acompañantes` : "Sin acompañantes"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          {/* Sesiones Seleccionadas */}
                          <div>
                            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              Días y Horarios Seleccionados
                            </h4>
                            {sesiones.length > 0 ? (
                              <div className="space-y-2">
                                {sesiones.map((sesion, idx) => (
                                  <div key={idx} className="bg-muted/50 rounded-md p-3">
                                    <div className="flex justify-between items-start text-sm">
                                      <div>
                                        <p className="font-medium">{sesion.lugar}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {format(new Date(sesion.fecha), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-medium">{sesion.horaInicio} - {sesion.horaFin}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : inscripcion.evento?.sesiones ? (
                              <div className="space-y-2">
                                {inscripcion.evento.sesiones.map((sesion, idx) => (
                                  <div key={idx} className="bg-muted/50 rounded-md p-3">
                                    <div className="flex justify-between items-start text-sm">
                                      <div>
                                        <p className="font-medium">{sesion.lugar}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                          {format(new Date(sesion.fecha), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: es })}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-medium">{sesion.horaInicio} - {sesion.horaFin}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No hay sesiones disponibles</p>
                            )}
                          </div>
                          
                          {/* Información de Pago */}
                          <div className="pt-3 border-t">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Monto Pagado</p>
                                <p className="font-bold text-green-600">S/ {inscripcion.montoPagado?.toFixed(2) || "0.00"}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Medio de Pago</p>
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                                  <p className="text-sm font-medium">{inscripcion.medioPago}</p>
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">N° Operación</p>
                                <div className="flex items-center gap-2">
                                  {inscripcion.numeroOperacion === "No especificado" ? (
                                    <>
                                      <XCircle className="h-4 w-4 text-red-500" />
                                      <p className="text-sm text-muted-foreground">No proporcionado</p>
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                      <p className="text-sm font-medium">{inscripcion.numeroOperacion}</p>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Comprobante</p>
                                <div className="flex gap-2">
                                  {inscripcion.comprobanteImagenUrl ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setImagenComprobanteModal(inscripcion.comprobanteImagenUrl!)}
                                      className="gap-2"
                                    >
                                      <Eye className="h-4 w-4" />
                                      Ver Imagen
                                    </Button>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">Sin imagen</span>
                                  )}
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => descargarComprobanteInscripcion(inscripcion)}
                                    className="gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    PDF
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}

          <Separator />

          {/* Información de Registro */}
          <div>
            <h3 className="font-semibold text-lg mb-3">Información de Registro</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Registrado por</p>
                <p className="font-medium">{movimiento.registradoPorNombre}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha de Registro</p>
                <p className="font-medium">
                  {format(movimiento.createdAt, "dd/MM/yyyy HH:mm", { locale: es })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal para ver imagen de comprobante */}
        {imagenComprobanteModal && (
          <Dialog open={!!imagenComprobanteModal} onOpenChange={() => setImagenComprobanteModal(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Comprobante de Pago</DialogTitle>
                <DialogDescription className="sr-only">
                  Imagen del comprobante de pago adjunto
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center">
                <img
                  src={imagenComprobanteModal}
                  alt="Comprobante de pago"
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
};
