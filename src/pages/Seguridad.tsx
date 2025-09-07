import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/layout/BackButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Users, Clock, UserCheck, FileText, Camera, Search, Plus } from "lucide-react";
import { RegistroManualVisitas } from "@/components/seguridad/RegistroManualVisitas";
import { RegistroManualTrabajadores } from "@/components/seguridad/RegistroManualTrabajadores";
import { RegistroManualProveedores } from "@/components/seguridad/RegistroManualProveedores";
import { AutorizacionesSeguridad } from "@/components/seguridad/AutorizacionesSeguridad";
import { ControlIngresoSalida } from "@/components/seguridad/ControlIngresoSalida";
import { HistorialSeguridad } from "@/components/seguridad/HistorialSeguridad";
import { BuscadorInteligente } from "@/components/seguridad/BuscadorInteligente";
import { BotonEmergencia } from "@/components/seguridad/BotonEmergencia";

const Seguridad = () => {
  const [activeTab, setActiveTab] = useState("autorizaciones");

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Seguridad Pórtico Principal
            </h1>
            <p className="text-muted-foreground">
              Control de acceso y seguridad de visitantes, trabajadores y proveedores
            </p>
          </div>
        </div>
        <BotonEmergencia />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Control de Acceso
          </CardTitle>
          <CardDescription>
            Gestión de autorizaciones, registro manual y control de ingreso/salida
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="autorizaciones" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Autorizaciones
              </TabsTrigger>
              <TabsTrigger value="ingreso-salida" className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Ingreso/Salida
              </TabsTrigger>
              <TabsTrigger value="manual-visitas" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Reg. Visitas
              </TabsTrigger>
              <TabsTrigger value="manual-trabajadores" className="flex items-center gap-1">
                <UserCheck className="h-4 w-4" />
                Reg. Trabajadores
              </TabsTrigger>
              <TabsTrigger value="manual-proveedores" className="flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Reg. Proveedores
              </TabsTrigger>
              <TabsTrigger value="historial" className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                Historial
              </TabsTrigger>
            </TabsList>

            <TabsContent value="autorizaciones" className="mt-6">
              <AutorizacionesSeguridad />
            </TabsContent>

            <TabsContent value="ingreso-salida" className="mt-6">
              <ControlIngresoSalida />
            </TabsContent>

            <TabsContent value="manual-visitas" className="mt-6">
              <RegistroManualVisitas />
            </TabsContent>

            <TabsContent value="manual-trabajadores" className="mt-6">
              <RegistroManualTrabajadores />
            </TabsContent>

            <TabsContent value="manual-proveedores" className="mt-6">
              <RegistroManualProveedores />
            </TabsContent>

            <TabsContent value="historial" className="mt-6">
              <HistorialSeguridad />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Buscador Inteligente */}
      <BuscadorInteligente />
    </div>
  );
};

export default Seguridad;