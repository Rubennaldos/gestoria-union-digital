import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { ResumenCaja } from "@/components/finanzas/ResumenCaja";
import { NuevoMovimientoModal } from "@/components/finanzas/NuevoMovimientoModal";
import { ListaMovimientos } from "@/components/finanzas/ListaMovimientos";
import { DetalleMovimientoModal } from "@/components/finanzas/DetalleMovimientoModal";
import { MovimientoFinanciero } from "@/types/finanzas";
import MiBreadcrumb from "@/components/layout/MiBreadcrumb";

export default function Finanzas() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tipoModal, setTipoModal] = useState<"ingreso" | "egreso">("egreso");
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [movimientoSeleccionado, setMovimientoSeleccionado] = useState<MovimientoFinanciero | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const abrirModalIngreso = () => {
    setTipoModal("ingreso");
    setModalOpen(true);
  };

  const abrirModalEgreso = () => {
    setTipoModal("egreso");
    setModalOpen(true);
  };

  const handleSuccess = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleVerDetalle = (movimiento: MovimientoFinanciero) => {
    setMovimientoSeleccionado(movimiento);
    setDetalleOpen(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <MiBreadcrumb paginaActual="Finanzas" />
          <h1 className="text-3xl font-bold mt-2">Gestión Financiera</h1>
          <p className="text-muted-foreground">
            Control de ingresos, egresos y caja de la asociación
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={abrirModalIngreso} variant="outline">
            <TrendingUp className="h-4 w-4 mr-2" />
            Nuevo Ingreso
          </Button>
          <Button onClick={abrirModalEgreso}>
            <TrendingDown className="h-4 w-4 mr-2" />
            Nuevo Egreso
          </Button>
        </div>
      </div>

      {/* Resumen de Caja */}
      <ResumenCaja key={refreshKey} />

      {/* Tabs de Movimientos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Movimientos Financieros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
              <TabsTrigger value="egresos">Egresos</TabsTrigger>
            </TabsList>

            <TabsContent value="todos" className="mt-4">
              <ListaMovimientos
                onVerDetalle={handleVerDetalle}
                refreshKey={refreshKey}
              />
            </TabsContent>

            <TabsContent value="ingresos" className="mt-4">
              <ListaMovimientos
                onVerDetalle={handleVerDetalle}
                refreshKey={refreshKey}
              />
            </TabsContent>

            <TabsContent value="egresos" className="mt-4">
              <ListaMovimientos
                onVerDetalle={handleVerDetalle}
                refreshKey={refreshKey}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modales */}
      <NuevoMovimientoModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={handleSuccess}
        tipoInicial={tipoModal}
      />

      <DetalleMovimientoModal
        movimiento={movimientoSeleccionado}
        open={detalleOpen}
        onOpenChange={setDetalleOpen}
      />
    </div>
  );
}
