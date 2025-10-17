import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, TrendingDown, BarChart3, Calendar, CreditCard } from "lucide-react";
import { ResumenCaja } from "@/components/finanzas/ResumenCaja";
import { ConfiguracionMediosPago } from "@/components/finanzas/ConfiguracionMediosPago";
import { NuevoMovimientoModal } from "@/components/finanzas/NuevoMovimientoModal";
import { NuevoEventoModal } from "@/components/finanzas/NuevoEventoModal";
import { ListaMovimientos } from "@/components/finanzas/ListaMovimientos";
import { DetalleMovimientoModal } from "@/components/finanzas/DetalleMovimientoModal";
import { MovimientoFinanciero } from "@/types/finanzas";
import MiBreadcrumb from "@/components/layout/MiBreadcrumb";
import { toast } from "sonner";
import { deleteMovimiento } from "@/services/finanzas";

import { useAuth } from "@/contexts/AuthContext";

export default function Finanzas() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoModal, setTipoModal] = useState<"ingreso" | "egreso">("egreso");
  const [eventoModalOpen, setEventoModalOpen] = useState(false);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoFinanciero | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Protección de permisos de módulo
  if (!user?.modules || !user.modules.finanzas) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-lg text-muted-foreground font-semibold">
          No tienes permiso para acceder a este módulo
        </div>
      </div>
    );
  }

  const abrirModalIngreso = () => {
    setTipoModal("ingreso");
    setModalOpen(true);
  };

  const abrirModalEgreso = () => {
    setTipoModal("egreso");
    setModalOpen(true);
  };

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleVerDetalle = (movimiento: MovimientoFinanciero) => {
    setMovimientoSeleccionado(movimiento);
    setDetalleOpen(true);
  };

  const handleEditar = (_movimiento: MovimientoFinanciero) => {
    toast.info("Función de edición próximamente");
  };

  const handleEliminar = async (movimientoId: string) => {
    try {
      await deleteMovimiento(movimientoId);
      toast.success("Movimiento eliminado exitosamente");
      handleSuccess();
    } catch (error) {
      console.error("Error al eliminar movimiento:", error);
      toast.error("Error al eliminar el movimiento");
    }
  };

  return (
    <div className="container mx-auto p-3 md:p-6 space-y-4 md:space-y-6 pb-20 md:pb-6">
      {/* Header Section */}
      <div className="space-y-3">
        <MiBreadcrumb paginaActual="Finanzas" />
        <div className="flex flex-col gap-3">
          <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Gestión Financiera
          </h1>
          <p className="text-sm text-muted-foreground">
            Control de ingresos, egresos y caja
          </p>
        </div>
        
        {/* Action Buttons - Mobile Optimized */}
        <div className="grid grid-cols-2 md:flex gap-2">
          <Button 
            onClick={abrirModalIngreso} 
            size="sm"
            className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 shadow-md hover:shadow-lg transition-all"
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            <span className="hidden md:inline">Nuevo </span>Ingreso
          </Button>
          <Button 
            onClick={abrirModalEgreso}
            size="sm"
            className="bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 shadow-md hover:shadow-lg transition-all"
          >
            <TrendingDown className="h-4 w-4 mr-1" />
            <span className="hidden md:inline">Nuevo </span>Egreso
          </Button>
          <Button 
            onClick={() => setEventoModalOpen(true)} 
            variant="outline"
            size="sm"
            className="col-span-2 md:col-span-1"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Ingresar Eventos
          </Button>
        </div>
      </div>

      {/* Resumen de Caja */}
      <ResumenCaja key={refreshKey} />

      {/* Tabs Section */}
      <div className="bg-card rounded-xl border shadow-sm">
        <Tabs defaultValue="todos" className="w-full">
          <div className="p-3 md:p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold text-lg">Movimientos</h2>
            </div>
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
              <TabsTrigger value="todos" className="text-xs md:text-sm py-2">
                Todos
              </TabsTrigger>
              <TabsTrigger value="ingresos" className="text-xs md:text-sm py-2">
                Ingresos
              </TabsTrigger>
              <TabsTrigger value="egresos" className="text-xs md:text-sm py-2">
                Egresos
              </TabsTrigger>
              <TabsTrigger value="medios-pago" className="text-xs md:text-sm py-2 col-span-2 md:col-span-1">
                <CreditCard className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                Medios de Pago
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-3 md:p-4">
            <TabsContent value="todos" className="mt-0">
              <ListaMovimientos
                onVerDetalle={handleVerDetalle}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                refreshKey={refreshKey}
              />
            </TabsContent>

            <TabsContent value="ingresos" className="mt-0">
              <ListaMovimientos
                onVerDetalle={handleVerDetalle}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                refreshKey={refreshKey}
                filtroTipo="ingreso"
              />
            </TabsContent>

            <TabsContent value="egresos" className="mt-0">
              <ListaMovimientos
                onVerDetalle={handleVerDetalle}
                onEditar={handleEditar}
                onEliminar={handleEliminar}
                refreshKey={refreshKey}
                filtroTipo="egreso"
              />
            </TabsContent>

            <TabsContent value="medios-pago" className="mt-0">
              <ConfiguracionMediosPago />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      {/* Modales */}
      <NuevoMovimientoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
        tipoInicial={tipoModal}
      />

      <NuevoEventoModal
        open={eventoModalOpen}
        onOpenChange={setEventoModalOpen}
        onSuccess={handleSuccess}
      />

      <DetalleMovimientoModal
        movimiento={movimientoSeleccionado}
        open={detalleOpen}
        onOpenChange={setDetalleOpen}
      />
    </div>
  );
}
