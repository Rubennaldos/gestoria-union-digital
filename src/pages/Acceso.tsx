import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, HardHat, Truck, History } from "lucide-react";
import BackButton from "@/components/layout/BackButton";
import { VisitaTab } from "@/components/acceso/VisitaTab";
import { TrabajadoresTab } from "@/components/acceso/TrabajadoresTab";
import { ProveedoresTab } from "@/components/acceso/ProveedoresTab";
import { HistorialTab } from "@/components/acceso/HistorialTab";

export default function Acceso() {
  const [activeTab, setActiveTab] = useState("visita");

  return (
    <div className="container mx-auto p-4 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <BackButton />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Control de Acceso</h1>
          <p className="text-sm text-muted-foreground">
            Gestión de visitantes, trabajadores y proveedores
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Autorización de Acceso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="visita" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Visitas</span>
              </TabsTrigger>
              <TabsTrigger value="trabajadores" className="flex items-center gap-2">
                <HardHat className="h-4 w-4" />
                <span className="hidden sm:inline">Trabajadores</span>
              </TabsTrigger>
              <TabsTrigger value="proveedores" className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Proveedores</span>
              </TabsTrigger>
              <TabsTrigger value="historial" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Historial</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visita">
              <VisitaTab />
            </TabsContent>

            <TabsContent value="trabajadores">
              <TrabajadoresTab />
            </TabsContent>

            <TabsContent value="proveedores">
              <ProveedoresTab />
            </TabsContent>

            <TabsContent value="historial">
              <HistorialTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}