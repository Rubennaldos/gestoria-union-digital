import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Copy, CreditCard, Calendar, DollarSign, Download, FileText, CheckCircle, Clock, XCircle, AlertCircle, Trash2, Edit, FileSpreadsheet, Ban, CheckSquare, Square, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Empadronado } from '@/types/empadronados';
import type { ChargeV2, PagoV2 } from '@/types/cobranzas-v2';
import { obtenerPagosV2, eliminarPagoV2, actualizarPagoV2, anularMultiplesChargesV2 } from '@/services/cobranzas-v2';
import { AnularBoletasModal } from './AnularBoletasModal';
import { subirComprobanteCobranza } from '@/services/storage';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface DetalleEmpadronadoModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  charges: ChargeV2[];
  onRegistrarPago: (chargeId: string, monto: number, metodoPago: string, numeroOperacion?: string, observaciones?: string, archivoComprobante?: string) => Promise<void>;
}

interface DeudaItem {
  chargeId: string;
  periodo: string;
  saldo: number;
  estado: 'pendiente' | 'pagado' | 'moroso';
  fechaVencimiento: number;
  esMoroso: boolean;
  montoMorosidad?: number;
}

export default function DetalleEmpadronadoModalV2({ 
  open, 
  onOpenChange, 
  empadronado, 
  charges,
  onRegistrarPago 
}: DetalleEmpadronadoModalV2Props) {
  const [activeTab, setActiveTab] = useState("estado-cuenta");
  const [pagos, setPagos] = useState<PagoV2[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [nuevoPago, setNuevoPago] = useState({
    chargeId: '',
    monto: '',
    metodoPago: '',
    numeroOperacion: '',
    observaciones: ''
  });
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [pagosSeleccionados, setPagosSeleccionados] = useState<string[]>([]);
  const [pagoEditando, setPagoEditando] = useState<PagoV2 | null>(null);
  const [pagoAEliminar, setPagoAEliminar] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    monto: '',
    metodoPago: '',
    numeroOperacion: '',
    observaciones: ''
  });
  const [chargesSeleccionados, setChargesSeleccionados] = useState<string[]>([]);
  const [showAnularModal, setShowAnularModal] = useState(false);

  // Cargar pagos del empadronado cuando se abre el modal
  useEffect(() => {
    if (open && empadronado) {
      cargarPagosEmpadronado();
    }
  }, [open, empadronado]);

  const cargarPagosEmpadronado = async () => {
    if (!empadronado) return;
    
    setCargandoPagos(true);
    try {
      const todosPagos = await obtenerPagosV2();
      // Filtrar pagos del empadronado actual
      const pagosEmpadronado = todosPagos.filter(p => p.empadronadoId === empadronado.id);
      // Ordenar por fecha más reciente primero
      pagosEmpadronado.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
      setPagos(pagosEmpadronado);
    } catch (error) {
      console.error('Error cargando pagos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pagos del asociado",
        variant: "destructive"
      });
    } finally {
      setCargandoPagos(false);
    }
  };

  // Calcular deuda total y items (solo VENCIDOS, considerando pagos)
  const { deudaTotal, deudaItems, deudaFutura, deudaItemsFuturos } = useMemo(() => {
    // Esperar a que se carguen los pagos para calcular correctamente
    if (!empadronado || cargandoPagos) return { deudaTotal: 0, deudaItems: [], deudaFutura: 0, deudaItemsFuturos: [] };

    const ahora = Date.now();
    
    const allItems = charges
      .filter(charge => {
        if (charge.empadronadoId !== empadronado.id) return false;
        if (charge.saldo <= 0) return false;
        if (charge.anulado) return false; // Excluir anulados
        
        // Verificar si hay pagos pendientes/aprobados que cubran el cargo
        const pagosDelCargo = pagos.filter(p => 
          p.chargeId === charge.id && 
          (p.estado === 'aprobado' || p.estado === 'pendiente')
        );
        const totalPagado = pagosDelCargo.reduce((sum, p) => sum + p.monto, 0);
        
        return totalPagado < charge.montoOriginal;
      })
      .map(charge => {
        const pagosDelCargo = pagos.filter(p => 
          p.chargeId === charge.id && 
          (p.estado === 'aprobado' || p.estado === 'pendiente')
        );
        const totalPagado = pagosDelCargo.reduce((sum, p) => sum + p.monto, 0);
        const saldoReal = Math.max(0, charge.montoOriginal - totalPagado);
        
        return {
          chargeId: charge.id,
          periodo: charge.periodo,
          saldo: saldoReal,
          estado: charge.estado,
          fechaVencimiento: charge.fechaVencimiento,
          esMoroso: charge.esMoroso,
          montoMorosidad: charge.montoMorosidad,
          esVencido: ahora > charge.fechaVencimiento
        };
      })
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    // Separar vencidos de futuros
    const vencidos = allItems.filter(item => item.esVencido);
    const futuros = allItems.filter(item => !item.esVencido);
    
    const totalVencido = vencidos.reduce((sum, item) => sum + item.saldo, 0);
    const totalFuturo = futuros.reduce((sum, item) => sum + item.saldo, 0);

    return { 
      deudaTotal: totalVencido, 
      deudaItems: vencidos,
      deudaFutura: totalFuturo,
      deudaItemsFuturos: futuros
    };
  }, [empadronado, charges, pagos, cargandoPagos]);

  // Charges seleccionados para anular
  const chargesParaAnular = useMemo(() => {
    return charges.filter(c => chargesSeleccionados.includes(c.id));
  }, [charges, chargesSeleccionados]);

  const toggleChargeSeleccion = (chargeId: string) => {
    setChargesSeleccionados(prev => 
      prev.includes(chargeId) 
        ? prev.filter(id => id !== chargeId)
        : [...prev, chargeId]
    );
  };

  const seleccionarTodosDeudas = () => {
    const todosIds = [...deudaItems, ...deudaItemsFuturos].map(item => item.chargeId);
    if (chargesSeleccionados.length === todosIds.length) {
      setChargesSeleccionados([]);
    } else {
      setChargesSeleccionados(todosIds);
    }
  };

  const handleAnulacionConfirmada = async (motivoAnulacion: string) => {
    if (!empadronado) return;
    
    try {
      await anularMultiplesChargesV2(
        chargesSeleccionados, 
        motivoAnulacion, 
        empadronado.id,
        `${empadronado.nombre} ${empadronado.apellidos}`
      );
      
      toast({
        title: "Boletas anuladas",
        description: `Se anularon ${chargesSeleccionados.length} boleta(s) correctamente`,
      });
      
      setChargesSeleccionados([]);
    } catch (error) {
      console.error("Error anulando boletas:", error);
      toast({
        title: "Error",
        description: "No se pudieron anular las boletas",
        variant: "destructive"
      });
      throw error;
    }
  };

  const generarLinkCompartir = () => {
    if (!empadronado) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/#/portal-asociado/${empadronado.numeroPadron}`;
  };

  const copiarLink = () => {
    const link = generarLinkCompartir();
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Link copiado",
        description: "El enlace ha sido copiado al portapapeles"
      });
    });
  };

  const handleRegistrarPago = async () => {
    if (!nuevoPago.chargeId) {
      toast({
        title: "Error",
        description: "Debe seleccionar las cuotas a pagar desde Estado de Cuenta",
        variant: "destructive"
      });
      return;
    }
    
    if (!nuevoPago.monto || !nuevoPago.metodoPago) {
      toast({
        title: "Error",
        description: "Complete todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      let archivoComprobanteURL: string | undefined = undefined;

      // Subir archivo si existe (usando la misma función que el portal del asociado)
      if (archivoComprobante && empadronado) {
        setSubiendoArchivo(true);
        try {
          // Obtener el período del primer cargo seleccionado
          const chargeIds = nuevoPago.chargeId.split(',').map(id => id.trim()).filter(id => id);
          const primerChargeId = chargeIds[0];
          const charge = charges.find(c => c.id === primerChargeId);
          
          if (charge) {
            archivoComprobanteURL = await subirComprobanteCobranza(
              empadronado.id,
              charge.periodo,
              archivoComprobante
            );
            console.log('✅ Comprobante subido:', archivoComprobanteURL);
          } else {
            throw new Error("No se encontró el cargo para obtener el período");
          }
        } catch (error) {
          console.error("Error subiendo comprobante:", error);
          toast({
            title: "Advertencia",
            description: "No se pudo subir el comprobante, pero el pago se registrará sin él",
            variant: "default"
          });
        } finally {
          setSubiendoArchivo(false);
        }
      }

      await onRegistrarPago(
        nuevoPago.chargeId,
        parseFloat(nuevoPago.monto),
        nuevoPago.metodoPago,
        nuevoPago.numeroOperacion || undefined,
        nuevoPago.observaciones || undefined,
        archivoComprobanteURL
      );

      // Limpiar form
      setNuevoPago({
        chargeId: '',
        monto: '',
        metodoPago: '',
        numeroOperacion: '',
        observaciones: ''
      });
      setArchivoComprobante(null);

      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado exitosamente"
      });
      
      // Recargar pagos
      cargarPagosEmpadronado();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al registrar el pago",
        variant: "destructive"
      });
    }
  };

  const handleSeleccionarTodos = (checked: boolean) => {
    if (checked) {
      setPagosSeleccionados(pagos.map(p => p.id));
    } else {
      setPagosSeleccionados([]);
    }
  };

  const handleSeleccionarPago = (pagoId: string, checked: boolean) => {
    if (checked) {
      setPagosSeleccionados([...pagosSeleccionados, pagoId]);
    } else {
      setPagosSeleccionados(pagosSeleccionados.filter(id => id !== pagoId));
    }
  };

  const handleEditarPago = (pago: PagoV2) => {
    setPagoEditando(pago);
    setEditForm({
      monto: pago.monto.toString(),
      metodoPago: pago.metodoPago,
      numeroOperacion: pago.numeroOperacion || '',
      observaciones: pago.observaciones || ''
    });
  };

  const handleGuardarEdicion = async () => {
    if (!pagoEditando) return;

    try {
      await actualizarPagoV2(pagoEditando.id, {
        monto: parseFloat(editForm.monto),
        metodoPago: editForm.metodoPago as any,
        numeroOperacion: editForm.numeroOperacion || undefined,
        observaciones: editForm.observaciones || undefined
      });

      toast({
        title: "Pago actualizado",
        description: "El pago ha sido actualizado exitosamente"
      });

      setPagoEditando(null);
      cargarPagosEmpadronado();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al actualizar el pago",
        variant: "destructive"
      });
    }
  };

  const handleEliminarPago = async (pagoId: string) => {
    try {
      await eliminarPagoV2(pagoId);
      
      toast({
        title: "Pago eliminado",
        description: "El pago ha sido eliminado exitosamente"
      });

      setPagoAEliminar(null);
      cargarPagosEmpadronado();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar el pago",
        variant: "destructive"
      });
    }
  };

  const handleEliminarSeleccionados = async () => {
    try {
      for (const pagoId of pagosSeleccionados) {
        await eliminarPagoV2(pagoId);
      }
      
      toast({
        title: "Pagos eliminados",
        description: `${pagosSeleccionados.length} pago(s) eliminado(s) exitosamente`
      });

      setPagosSeleccionados([]);
      cargarPagosEmpadronado();
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al eliminar los pagos",
        variant: "destructive"
      });
    }
  };

  const exportarExcel = () => {
    const pagosExportar = pagosSeleccionados.length > 0 
      ? pagos.filter(p => pagosSeleccionados.includes(p.id))
      : pagos;

    const datosExcel = pagosExportar.map(pago => {
      const charge = charges.find(c => c.id === pago.chargeId);
      return {
        'ID': pago.id,
        'Período': charge ? obtenerNombreMes(charge.periodo) : pago.periodo,
        'Monto': pago.monto,
        'Método de Pago': formatearMetodoPago(pago.metodoPago),
        'Nº Operación': pago.numeroOperacion || '-',
        'Estado': pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1),
        'Fecha de Pago': formatearFecha(pago.fechaPagoRegistrada),
        'Fecha de Registro': formatearFechaHora(pago.fechaCreacion),
        'Observaciones': pago.observaciones || '-'
      };
    });

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial de Pagos');
    
    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 25 }, // ID
      { wch: 20 }, // Período
      { wch: 12 }, // Monto
      { wch: 20 }, // Método
      { wch: 20 }, // Operación
      { wch: 12 }, // Estado
      { wch: 15 }, // Fecha Pago
      { wch: 20 }, // Fecha Registro
      { wch: 30 }  // Observaciones
    ];
    ws['!cols'] = colWidths;

    const nombreArchivo = `Historial_Pagos_${empadronado?.numeroPadron}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);

    toast({
      title: "Excel generado",
      description: `Se ha exportado ${datosExcel.length} pago(s) a Excel`
    });
  };

  const exportarPDF = () => {
    const pagosExportar = pagosSeleccionados.length > 0 
      ? pagos.filter(p => pagosSeleccionados.includes(p.id))
      : pagos;

    const doc = new jsPDF();
    
    // Encabezado
    doc.setFontSize(16);
    doc.text('Historial de Pagos', 14, 15);
    
    if (empadronado) {
      doc.setFontSize(10);
      doc.text(`Asociado: ${empadronado.nombre} ${empadronado.apellidos}`, 14, 22);
      doc.text(`DNI: ${empadronado.dni} | Padrón: ${empadronado.numeroPadron}`, 14, 28);
      doc.text(`Fecha de exportación: ${formatearFechaHora(Date.now())}`, 14, 34);
    }

    // Tabla
    const headers = [['Período', 'Monto', 'Método', 'Estado', 'Fecha', 'Nº Op.']];
    const datos = pagosExportar.map(pago => {
      const charge = charges.find(c => c.id === pago.chargeId);
      return [
        charge ? obtenerNombreMes(charge.periodo) : pago.periodo,
        formatearMoneda(pago.monto),
        formatearMetodoPago(pago.metodoPago),
        pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1),
        formatearFecha(pago.fechaPagoRegistrada),
        pago.numeroOperacion || '-'
      ];
    });

    autoTable(doc, {
      head: headers,
      body: datos,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    const nombreArchivo = `Historial_Pagos_${empadronado?.numeroPadron}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(nombreArchivo);

    toast({
      title: "PDF generado",
      description: `Se ha exportado ${pagosExportar.length} pago(s) a PDF`
    });
  };

  const formatearMoneda = (monto: number) => {
    return `S/ ${monto.toFixed(2)}`;
  };

  const formatearFecha = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE');
  };

  const formatearFechaHora = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearMetodoPago = (metodo: string) => {
    const metodos: Record<string, string> = {
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia Bancaria',
      'yape': 'Yape',
      'plin': 'Plin',
      'tarjeta': 'Tarjeta',
      'importacion_masiva': 'Importación Masiva'
    };
    return metodos[metodo] || metodo;
  };

  const obtenerNombreMes = (periodo: string) => {
    // Formato: YYYYMM (ej: 202501)
    if (periodo.length !== 6) return periodo;
    
    const año = periodo.substring(0, 4);
    const mes = parseInt(periodo.substring(4, 6));
    
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${meses[mes - 1]} ${año}`;
  };

  const getBadgeVariantEstado = (estado: string) => {
    switch (estado) {
      case 'aprobado': return 'default';
      case 'pendiente': return 'secondary';
      case 'rechazado': return 'destructive';
      default: return 'outline';
    }
  };

  if (!empadronado) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Detalle de Asociado - Sistema V2</span>
            <span className="sm:hidden">Detalle Asociado V2</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información personal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm font-medium">Nombre Completo</Label>
                <p className="text-xs sm:text-sm truncate">{empadronado.nombre} {empadronado.apellidos}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium">DNI</Label>
                <p className="text-xs sm:text-sm">{empadronado.dni}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium">Número de Padrón</Label>
                <p className="text-xs sm:text-sm">{empadronado.numeroPadron}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium">Estado</Label>
                <Badge variant={empadronado.habilitado ? "default" : "secondary"} className="text-xs">
                  {empadronado.habilitado ? "Habilitado" : "Deshabilitado"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de deuda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Resumen de Deuda Vencida
                {cargandoPagos ? (
                  <span className="text-muted-foreground text-sm">Calculando...</span>
                ) : (
                  <span className={`text-2xl font-bold ${deudaTotal > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatearMoneda(deudaTotal)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cargandoPagos ? (
                <div className="text-center py-4 text-muted-foreground">
                  Cargando información de pagos...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Label className="text-xs font-medium text-red-700">Meses vencidos</Label>
                    <p className="text-lg font-bold text-red-600">{deudaItems.length}</p>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Label className="text-xs font-medium text-orange-700">Morosos</Label>
                    <p className="text-lg font-bold text-orange-600">{deudaItems.filter(item => item.esMoroso).length}</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Label className="text-xs font-medium text-blue-700">Próximos</Label>
                    <p className="text-lg font-bold text-blue-600">{deudaItemsFuturos.length}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Label className="text-xs font-medium text-gray-700">Deuda futura</Label>
                    <p className="text-sm font-bold text-gray-600">{formatearMoneda(deudaFutura)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


          {/* Tabs para detalles */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1">
              <TabsTrigger value="estado-cuenta" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Estado de Cuenta</span>
                <span className="sm:hidden">Estado</span>
              </TabsTrigger>
              <TabsTrigger value="historial-pagos" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Historial de Pagos</span>
                <span className="sm:hidden">Historial</span>
              </TabsTrigger>
              <TabsTrigger value="registrar-pago" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Registrar Pago</span>
                <span className="sm:hidden">Pago</span>
              </TabsTrigger>
            </TabsList>

            {/* Estado de Cuenta */}
            <TabsContent value="estado-cuenta">
              <div className="space-y-4">
                {/* Botón seleccionar todos y anular */}
                {(deudaItems.length > 0 || deudaItemsFuturos.length > 0) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-muted rounded-lg">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={seleccionarTodosDeudas}
                    >
                      {chargesSeleccionados.length === [...deudaItems, ...deudaItemsFuturos].length && chargesSeleccionados.length > 0 ? (
                        <>
                          <Square className="h-4 w-4 mr-1" />
                          Quitar todas
                        </>
                      ) : (
                        <>
                          <CheckSquare className="h-4 w-4 mr-1" />
                          Seleccionar todas
                        </>
                      )}
                    </Button>
                    
                    {chargesSeleccionados.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">
                          {chargesSeleccionados.length} seleccionadas
                        </Badge>
                        <Badge variant="outline" className="font-bold text-primary">
                          Total: {formatearMoneda(
                            [...deudaItems, ...deudaItemsFuturos]
                              .filter(item => chargesSeleccionados.includes(item.chargeId))
                              .reduce((sum, item) => sum + item.saldo, 0)
                          )}
                        </Badge>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => {
                            const totalSeleccionado = [...deudaItems, ...deudaItemsFuturos]
                              .filter(item => chargesSeleccionados.includes(item.chargeId))
                              .reduce((sum, item) => sum + item.saldo, 0);
                            setNuevoPago({
                              chargeId: chargesSeleccionados.join(','),
                              monto: totalSeleccionado.toString(),
                              metodoPago: '',
                              numeroOperacion: '',
                              observaciones: `Pago conjunto de ${chargesSeleccionados.length} cuotas`
                            });
                            setActiveTab("registrar-pago");
                          }}
                        >
                          <CreditCard className="h-4 w-4 mr-1" />
                          Pagar Seleccionadas
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setShowAnularModal(true)}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Anular
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Deudas VENCIDAS */}
                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      Deudas Vencidas ({deudaItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {deudaItems.length === 0 ? (
                        <p className="text-center text-green-600 py-2 text-sm">
                          ✓ Sin deudas vencidas
                        </p>
                      ) : (
                        deudaItems.map((item) => (
                          <div key={item.chargeId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg gap-2">
                            <Checkbox
                              checked={chargesSeleccionados.includes(item.chargeId)}
                              onCheckedChange={() => toggleChargeSeleccion(item.chargeId)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{item.periodo}</div>
                              <div className="text-xs text-muted-foreground">
                                Venció: {formatearFecha(item.fechaVencimiento)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="font-bold text-red-600">{formatearMoneda(item.saldo)}</div>
                                <Badge variant="destructive" className="text-[10px]">
                                  {item.esMoroso ? 'Moroso' : 'Vencido'}
                                </Badge>
                              </div>
                              
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setNuevoPago({
                                    chargeId: item.chargeId,
                                    monto: item.saldo.toString(),
                                    metodoPago: '',
                                    numeroOperacion: '',
                                    observaciones: ''
                                  });
                                  setActiveTab("registrar-pago");
                                }}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Pagar
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Cuotas PRÓXIMAS */}
                {deudaItemsFuturos.length > 0 && (
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                        <Calendar className="h-4 w-4" />
                        Próximas Cuotas ({deudaItemsFuturos.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {deudaItemsFuturos.map((item) => (
                          <div key={item.chargeId} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg gap-2">
                            <Checkbox
                              checked={chargesSeleccionados.includes(item.chargeId)}
                              onCheckedChange={() => toggleChargeSeleccion(item.chargeId)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{item.periodo}</div>
                              <div className="text-xs text-muted-foreground">
                                Vence: {formatearFecha(item.fechaVencimiento)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="font-bold text-blue-600">{formatearMoneda(item.saldo)}</div>
                                <Badge variant="secondary" className="text-[10px]">
                                  Por vencer
                                </Badge>
                              </div>
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setNuevoPago({
                                    chargeId: item.chargeId,
                                    monto: item.saldo.toString(),
                                    metodoPago: '',
                                    numeroOperacion: '',
                                    observaciones: ''
                                  });
                                  setActiveTab("registrar-pago");
                                }}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Adelantar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Historial de Pagos */}
            <TabsContent value="historial-pagos">
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CardTitle className="flex items-center gap-2">
                        <span>Historial de Pagos</span>
                        <Badge variant="outline">{pagos.length} pagos</Badge>
                      </CardTitle>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      {pagosSeleccionados.length > 0 && (
                        <>
                          <Badge variant="secondary" className="text-xs">
                            {pagosSeleccionados.length} seleccionado(s)
                          </Badge>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={handleEliminarSeleccionados}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Eliminar
                          </Button>
                        </>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportarExcel}
                        disabled={pagos.length === 0}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-1" />
                        Excel
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportarPDF}
                        disabled={pagos.length === 0}
                      >
                        <FileText className="h-4 w-4 mr-1" />
                        PDF
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {cargandoPagos ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Cargando historial...
                    </div>
                  ) : pagos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay pagos registrados
                    </div>
                  ) : (
                    <>
                      {/* Seleccionar todos */}
                      <div className="flex items-center space-x-2 mb-4 pb-3 border-b">
                        <Checkbox
                          id="select-all"
                          checked={pagosSeleccionados.length === pagos.length && pagos.length > 0}
                          onCheckedChange={handleSeleccionarTodos}
                        />
                        <label
                          htmlFor="select-all"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          Seleccionar todos
                        </label>
                      </div>

                      <div className="space-y-3">
                        {pagos.map((pago) => {
                          const charge = charges.find(c => c.id === pago.chargeId);
                          const isSeleccionado = pagosSeleccionados.includes(pago.id);
                          
                          return (
                            <Card 
                              key={pago.id} 
                              className={`border-l-4 transition-all ${isSeleccionado ? 'ring-2 ring-primary' : ''}`}
                              style={{
                                borderLeftColor: 
                                  pago.estado === 'aprobado' ? '#22c55e' : 
                                  pago.estado === 'rechazado' ? '#ef4444' : 
                                  '#94a3b8'
                              }}
                            >
                              <CardContent className="p-4 space-y-3">
                                {/* Checkbox y encabezado */}
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={isSeleccionado}
                                    onCheckedChange={(checked) => handleSeleccionarPago(pago.id, checked as boolean)}
                                    className="mt-1"
                                  />
                                  
                                  <div className="flex-1">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                      <div>
                                        <div className="font-semibold text-base">
                                          {charge ? obtenerNombreMes(charge.periodo) : `Período: ${pago.periodo}`}
                                        </div>
                                        <div className="text-sm text-muted-foreground">
                                          ID: {pago.id}
                                        </div>
                                      </div>
                                      <div className="flex flex-col sm:items-end gap-1">
                                        <div className="text-xl font-bold text-primary">
                                          {formatearMoneda(pago.monto)}
                                        </div>
                                        <Badge variant={getBadgeVariantEstado(pago.estado)} className="w-fit">
                                          {pago.estado === 'aprobado' && <CheckCircle className="h-3 w-3 mr-1" />}
                                          {pago.estado === 'pendiente' && <Clock className="h-3 w-3 mr-1" />}
                                          {pago.estado === 'rechazado' && <XCircle className="h-3 w-3 mr-1" />}
                                          {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Botones de acción */}
                                    <div className="flex gap-2 mt-3">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleEditarPago(pago)}
                                      >
                                        <Edit className="h-3 w-3 mr-1" />
                                        Editar
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                        onClick={() => setPagoAEliminar(pago.id)}
                                      >
                                        <Trash2 className="h-3 w-3 mr-1" />
                                        Eliminar
                                      </Button>
                                    </div>

                                    {/* Detalles del pago */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mt-3 pt-3 border-t">
                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Método de Pago</Label>
                                        <p className="font-medium">{formatearMetodoPago(pago.metodoPago)}</p>
                                      </div>
                                      
                                      {pago.numeroOperacion && (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">Nº Operación</Label>
                                          <p className="font-medium">{pago.numeroOperacion}</p>
                                        </div>
                                      )}

                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Fecha de Pago</Label>
                                        <p>{formatearFecha(pago.fechaPagoRegistrada)}</p>
                                      </div>

                                      <div>
                                        <Label className="text-xs font-medium text-muted-foreground">Fecha de Registro</Label>
                                        <p>{formatearFechaHora(pago.fechaCreacion)}</p>
                                      </div>

                                      {pago.montoOriginal && pago.montoOriginal !== pago.monto && (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">Monto Original</Label>
                                          <p>{formatearMoneda(pago.montoOriginal)}</p>
                                        </div>
                                      )}

                                      {pago.descuentoProntoPago && pago.descuentoProntoPago > 0 && (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">Descuento Pronto Pago</Label>
                                          <p className="text-green-600 font-medium">
                                            -{formatearMoneda(pago.descuentoProntoPago)}
                                          </p>
                                        </div>
                                      )}

                                      {charge && (
                                        <div>
                                          <Label className="text-xs font-medium text-muted-foreground">Cargo Asociado</Label>
                                          <p className="text-xs">
                                            {formatearMoneda(charge.montoOriginal)}
                                            {charge.saldo > 0 && (
                                              <span className="text-orange-600 ml-1">
                                                (Saldo: {formatearMoneda(charge.saldo)})
                                              </span>
                                            )}
                                          </p>
                                        </div>
                                      )}
                                    </div>

                                    {/* Observaciones */}
                                    {pago.observaciones && (
                                      <div className="pt-2 border-t">
                                        <Label className="text-xs font-medium text-muted-foreground">Observaciones</Label>
                                        <p className="text-sm mt-1">{pago.observaciones}</p>
                                      </div>
                                    )}

                                    {/* Información de aprobación */}
                                    {pago.estado === 'aprobado' && pago.fechaAprobacion && (
                                      <div className="pt-2 border-t bg-green-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg mt-3">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm pt-2">
                                          <div>
                                            <Label className="text-xs font-medium text-green-700">Aprobado Por</Label>
                                            <p className="font-medium text-green-900">{pago.aprobadoPor || 'Sistema'}</p>
                                          </div>
                                          <div>
                                            <Label className="text-xs font-medium text-green-700">Fecha de Aprobación</Label>
                                            <p className="text-green-900">{formatearFechaHora(pago.fechaAprobacion)}</p>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Información de rechazo */}
                                    {pago.estado === 'rechazado' && pago.motivoRechazo && (
                                      <div className="pt-2 border-t bg-red-50 -mx-4 -mb-4 px-4 pb-4 rounded-b-lg mt-3">
                                        <Label className="text-xs font-medium text-red-700">Motivo de Rechazo</Label>
                                        <p className="text-sm text-red-900 mt-1">{pago.motivoRechazo}</p>
                                      </div>
                                    )}

                                    {/* Comprobante */}
                                    {pago.archivoComprobante && (
                                      <div className="pt-2 border-t mt-3">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="w-full"
                                          onClick={async () => {
                                            try {
                                              // Si es una ruta de RTDB (legacy), cargar los datos y migrar
                                              if (pago.archivoComprobante?.includes('cobranzas_v2/comprobantes') && 
                                                  (pago.archivoComprobante.includes('firebaseio.com') || !pago.archivoComprobante.startsWith('http'))) {
                                                let path = pago.archivoComprobante;
                                                
                                                // Si es una URL completa, extraer solo la ruta
                                                if (path.includes('firebaseio.com')) {
                                                  const match = path.match(/cobranzas_v2\/comprobantes\/[^.]+/);
                                                  if (match) {
                                                    path = match[0];
                                                  }
                                                }
                                                
                                                const comprobanteRef = ref(db, path);
                                                const snapshot = await get(comprobanteRef);
                                                
                                                if (snapshot.exists()) {
                                                  const data = snapshot.val();
                                                  // Crear un enlace de descarga desde base64
                                                  const link = document.createElement('a');
                                                  link.href = data.data; // base64 data URL
                                                  link.download = data.nombre || 'comprobante';
                                                  link.click();
                                                } else {
                                                  toast({
                                                    title: "Error",
                                                    description: "No se pudo cargar el comprobante",
                                                    variant: "destructive"
                                                  });
                                                }
                                              } else {
                                                // Es una URL de Storage (nuevo formato) o URL directa
                                                window.open(pago.archivoComprobante, '_blank');
                                              }
                                            } catch (error) {
                                              console.error('Error abriendo comprobante:', error);
                                              toast({
                                                title: "Error",
                                                description: "No se pudo abrir el comprobante",
                                                variant: "destructive"
                                              });
                                            }
                                          }}
                                        >
                                          <Download className="h-4 w-4 mr-2" />
                                          Descargar Comprobante
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Registrar Pago */}
            <TabsContent value="registrar-pago">
              <Card>
                <CardHeader>
                  <CardTitle>Registrar Nuevo Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Resumen de cuotas seleccionadas */}
                  {nuevoPago.chargeId && nuevoPago.chargeId.includes(',') ? (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <Label className="text-sm font-medium text-primary">Cuotas Seleccionadas</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {nuevoPago.chargeId.split(',').map(chargeId => {
                          const item = [...deudaItems, ...deudaItemsFuturos].find(i => i.chargeId === chargeId);
                          return item ? (
                            <Badge key={chargeId} variant="secondary" className="text-xs">
                              {obtenerNombreMes(item.periodo)} - {formatearMoneda(item.saldo)}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  ) : nuevoPago.chargeId ? (
                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                      <Label className="text-sm font-medium text-primary">Cuota Seleccionada</Label>
                      <div className="mt-2">
                        {(() => {
                          const item = [...deudaItems, ...deudaItemsFuturos].find(i => i.chargeId === nuevoPago.chargeId);
                          return item ? (
                            <Badge variant="secondary" className="text-xs">
                              {obtenerNombreMes(item.periodo)} - {formatearMoneda(item.saldo)}
                            </Badge>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-muted border border-border rounded-lg text-center">
                      <p className="text-sm text-muted-foreground">
                        Seleccione las cuotas a pagar desde la pestaña "Estado de Cuenta"
                      </p>
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="mt-1"
                        onClick={() => setActiveTab("estado-cuenta")}
                      >
                        Ir a Estado de Cuenta
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monto">Monto</Label>
                      <Input
                        id="monto"
                        type="number"
                        step="0.01"
                        value={nuevoPago.monto}
                        onChange={(e) => setNuevoPago(prev => ({ ...prev, monto: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="metodo">Método de Pago</Label>
                      <Select 
                        value={nuevoPago.metodoPago} 
                        onValueChange={(value) => setNuevoPago(prev => ({ ...prev, metodoPago: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione método" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="efectivo">Efectivo</SelectItem>
                          <SelectItem value="transferencia">Transferencia</SelectItem>
                          <SelectItem value="yape">Yape</SelectItem>
                          <SelectItem value="plin">Plin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="operacion">Número de Operación (Opcional)</Label>
                      <Input
                        id="operacion"
                        value={nuevoPago.numeroOperacion}
                        onChange={(e) => setNuevoPago(prev => ({ ...prev, numeroOperacion: e.target.value }))}
                        placeholder="Número de operación"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observaciones">Observaciones (Opcional)</Label>
                    <Textarea
                      id="observaciones"
                      value={nuevoPago.observaciones}
                      onChange={(e) => setNuevoPago(prev => ({ ...prev, observaciones: e.target.value }))}
                      placeholder="Observaciones adicionales..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="comprobante">Comprobante de Pago (Opcional)</Label>
                    <div className="mt-2">
                      {archivoComprobante ? (
                        <div className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50">
                          <ImageIcon className="h-5 w-5 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{archivoComprobante.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(archivoComprobante.size / 1024).toFixed(2)} KB
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setArchivoComprobante(null)}
                            className="h-8 w-8 p-0"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center w-full">
                          <label
                            htmlFor="comprobante"
                            className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-muted/50 hover:bg-muted transition-colors"
                          >
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
                              <p className="mb-2 text-sm text-muted-foreground">
                                <span className="font-semibold">Haz clic para subir</span> o arrastra y suelta
                              </p>
                              <p className="text-xs text-muted-foreground">
                                PNG, JPG, PDF (MAX. 5MB)
                              </p>
                            </div>
                            <input
                              id="comprobante"
                              type="file"
                              className="hidden"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  // Validar tamaño (5MB)
                                  if (file.size > 5 * 1024 * 1024) {
                                    toast({
                                      title: "Error",
                                      description: "El archivo no debe superar los 5MB",
                                      variant: "destructive"
                                    });
                                    return;
                                  }
                                  setArchivoComprobante(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                  <Button 
                    onClick={handleRegistrarPago} 
                    className="w-full"
                    disabled={subiendoArchivo}
                  >
                    {subiendoArchivo ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Subiendo comprobante...
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Registrar Pago
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Diálogo de edición de pago */}
        <Dialog open={!!pagoEditando} onOpenChange={(open) => !open && setPagoEditando(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Pago</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-monto">Monto</Label>
                <Input
                  id="edit-monto"
                  type="number"
                  step="0.01"
                  value={editForm.monto}
                  onChange={(e) => setEditForm(prev => ({ ...prev, monto: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="edit-metodo">Método de Pago</Label>
                <Select 
                  value={editForm.metodoPago} 
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, metodoPago: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="yape">Yape</SelectItem>
                    <SelectItem value="plin">Plin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-operacion">Número de Operación (Opcional)</Label>
                <Input
                  id="edit-operacion"
                  value={editForm.numeroOperacion}
                  onChange={(e) => setEditForm(prev => ({ ...prev, numeroOperacion: e.target.value }))}
                  placeholder="Número de operación"
                />
              </div>

              <div>
                <Label htmlFor="edit-observaciones">Observaciones (Opcional)</Label>
                <Textarea
                  id="edit-observaciones"
                  value={editForm.observaciones}
                  onChange={(e) => setEditForm(prev => ({ ...prev, observaciones: e.target.value }))}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setPagoEditando(null)}>
                  Cancelar
                </Button>
                <Button onClick={handleGuardarEdicion}>
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de confirmación de eliminación */}
        <AlertDialog open={!!pagoAEliminar} onOpenChange={(open) => !open && setPagoAEliminar(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta acción eliminará el pago permanentemente. Si el pago fue aprobado, se revertirán los cambios en el cargo asociado.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => pagoAEliminar && handleEliminarPago(pagoAEliminar)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Modal de anulación */}
        <AnularBoletasModal
          open={showAnularModal}
          onOpenChange={setShowAnularModal}
          chargesSeleccionados={chargesParaAnular}
          onAnulacionConfirmada={async (motivoAnulacion: string) => {
            await handleAnulacionConfirmada(motivoAnulacion);
            setShowAnularModal(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}