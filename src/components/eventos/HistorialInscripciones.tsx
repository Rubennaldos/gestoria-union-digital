import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Download, FileText, Clock, Users } from "lucide-react";
import { obtenerInscripcionesPorEmpadronado, obtenerEventoPorId } from "@/services/eventos";
import { InscripcionEvento, Evento } from "@/types/eventos";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { generarVoucherEvento, archivoABase64 } from "@/lib/pdf/voucherEvento";

interface InscripcionConEvento extends InscripcionEvento {
  evento?: Evento;
}

interface HistorialInscripcionesProps {
  empadronadoId: string;
}

export const HistorialInscripciones = ({ empadronadoId }: HistorialInscripcionesProps) => {
  const [inscripciones, setInscripciones] = useState<InscripcionConEvento[]>([]);
  const [loading, setLoading] = useState(true);
  const [descargando, setDescargando] = useState<string | null>(null);

  useEffect(() => {
    cargarInscripciones();
  }, [empadronadoId]);

  const cargarInscripciones = async () => {
    try {
      setLoading(true);
      const data = await obtenerInscripcionesPorEmpadronado(empadronadoId);
      
      // Cargar los detalles de cada evento
      const inscripcionesConEvento = await Promise.all(
        data.map(async (inscripcion) => {
          const evento = await obtenerEventoPorId(inscripcion.eventoId);
          return { ...inscripcion, evento };
        })
      );

      setInscripciones(inscripcionesConEvento);
    } catch (error) {
      console.error("Error al cargar inscripciones:", error);
      toast.error("Error al cargar el historial de inscripciones");
    } finally {
      setLoading(false);
    }
  };

  const descargarComprobante = async (inscripcion: InscripcionConEvento) => {
    if (!inscripcion.evento || !inscripcion.comprobanteId) {
      toast.error("No se encontró el comprobante");
      return;
    }

    try {
      setDescargando(inscripcion.id);

      // Obtener datos del comprobante desde Firebase
      const receiptRef = ref(db, `receipts/${inscripcion.comprobanteId}`);
      const receiptSnap = await get(receiptRef);

      if (!receiptSnap.exists()) {
        toast.error("Comprobante no encontrado");
        return;
      }

      const receiptData = receiptSnap.val();

      // Parsear las observaciones para obtener personas y sesiones
      let personas: Array<{ nombre: string; dni: string }> = [];
      let sesiones: Array<any> = [];

      if (inscripcion.observaciones) {
        const lines = inscripcion.observaciones.split('\n');
        let enPersonas = false;
        let enSesiones = false;

        lines.forEach(line => {
          if (line.includes('PERSONAS INSCRITAS:')) {
            enPersonas = true;
            enSesiones = false;
          } else if (line.includes('SESIONES SELECCIONADAS:')) {
            enPersonas = false;
            enSesiones = true;
          } else if (enPersonas && line.includes('DNI:')) {
            const match = line.match(/- (.+) - DNI: (\d+)/);
            if (match) {
              personas.push({ nombre: match[1], dni: match[2] });
            }
          } else if (enSesiones && line.includes('Lugar:')) {
            const lugarMatch = line.match(/Lugar: (.+)/);
            if (lugarMatch) {
              const lugar = lugarMatch[1];
              // Buscar la siguiente línea con fecha y precio
              sesiones.push({ lugar });
            }
          }
        });
      }

      // Si no hay personas parseadas, usar el empadronado
      if (personas.length === 0) {
        personas = [{ nombre: inscripcion.nombreEmpadronado, dni: "" }];
      }

      // Si no hay sesiones, usar las sesiones del evento
      if (sesiones.length === 0 && inscripcion.evento.sesiones) {
        sesiones = inscripcion.evento.sesiones.map(s => ({
          lugar: s.lugar,
          fecha: new Date(s.fecha).toISOString(),
          horaInicio: s.horaInicio,
          horaFin: s.horaFin,
          precio: s.precio
        }));
      }

      // Generar PDF
      const voucherData = {
        eventoTitulo: inscripcion.evento.titulo,
        eventoCategoria: inscripcion.evento.categoria,
        personas,
        sesiones,
        montoTotal: inscripcion.montoPagado || inscripcion.evento.precio,
        fechaPago: new Date(inscripcion.fechaPago || inscripcion.fechaInscripcion),
        numeroVoucher: receiptData.code || `INS-${inscripcion.id.slice(-8)}`,
      };

      const pdfBlob = await generarVoucherEvento(voucherData);

      // Descargar
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante-${inscripcion.evento.titulo.replace(/\s+/g, '-')}-${voucherData.numeroVoucher}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Comprobante descargado exitosamente");
    } catch (error) {
      console.error("Error al descargar comprobante:", error);
      toast.error("Error al generar el comprobante");
    } finally {
      setDescargando(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { variant: any; label: string }> = {
      inscrito: { variant: "default", label: "Inscrito" },
      confirmado: { variant: "default", label: "Confirmado" },
      cancelado: { variant: "destructive", label: "Cancelado" },
      asistio: { variant: "default", label: "Asistió" },
      no_asistio: { variant: "secondary", label: "No asistió" },
    };
    return badges[estado] || { variant: "default", label: estado };
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Cargando historial...</p>
      </div>
    );
  }

  if (inscripciones.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            No tienes inscripciones registradas aún
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {inscripciones.map((inscripcion) => {
        const estadoBadge = getEstadoBadge(inscripcion.estado);
        
        return (
          <Card key={inscripcion.id} className="overflow-hidden">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {inscripcion.evento?.titulo || "Evento no disponible"}
                  </CardTitle>
                  <CardDescription>
                    Inscrito el {format(new Date(inscripcion.fechaInscripcion), "dd/MM/yyyy HH:mm", { locale: es })}
                  </CardDescription>
                </div>
                <Badge variant={estadoBadge.variant}>
                  {estadoBadge.label}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {inscripcion.evento && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {format(new Date(inscripcion.evento.fechaInicio), "dd MMM yyyy", { locale: es })}
                      </span>
                    </div>

                    {inscripcion.evento.sesiones?.[0] && (
                      <>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {inscripcion.evento.sesiones[0].horaInicio} - {inscripcion.evento.sesiones[0].horaFin}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{inscripcion.evento.sesiones[0].lugar}</span>
                        </div>
                      </>
                    )}

                    {inscripcion.acompanantes > 0 && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{inscripcion.acompanantes} acompañante(s)</span>
                      </div>
                    )}
                  </div>

                  {inscripcion.pagoRealizado && (
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Pago confirmado</p>
                          <p className="text-sm text-muted-foreground">
                            S/ {inscripcion.montoPagado?.toFixed(2) || inscripcion.evento.precio.toFixed(2)}
                          </p>
                        </div>
                        {inscripcion.comprobanteId && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => descargarComprobante(inscripcion)}
                            disabled={descargando === inscripcion.id}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            {descargando === inscripcion.id ? "Descargando..." : "Descargar Comprobante"}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
