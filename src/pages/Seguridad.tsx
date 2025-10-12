import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Shield, Users, Clock, UserCheck, FileText, Camera, Search, Plus, Home } from "lucide-react";
import { RegistroManualVisitas } from "@/components/seguridad/RegistroManualVisitas";
import { RegistroManualTrabajadores } from "@/components/seguridad/RegistroManualTrabajadores";
import { RegistroManualProveedores } from "@/components/seguridad/RegistroManualProveedores";
import { HistorialAutorizaciones } from "@/components/seguridad/HistorialAutorizaciones";
import { ControlIngresoSalida } from "@/components/seguridad/ControlIngresoSalida";
import { HistorialSeguridad } from "@/components/seguridad/HistorialSeguridad";
import { BuscadorInteligente } from "@/components/seguridad/BuscadorInteligente";
import { BotonEmergencia } from "@/components/seguridad/BotonEmergencia";

const Seguridad = () => {
  const [activeTab, setActiveTab] = useState("autorizaciones");

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-3 md:px-6 py-4 space-y-4 md:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (window.location.href = "/")}
                className="gap-1.5 h-8 md:h-9 px-2 md:px-3"
              >
                <Home className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="text-xs md:text-sm">Inicio</span>
              </Button>
              <div className="h-6 w-px bg-border" />
              <div>
                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent flex items-center gap-1.5 md:gap-2">
                  <Shield className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                  <span className="hidden sm:inline">Seguridad Pórtico Principal</span>
                  <span className="sm:hidden">Seguridad</span>
                </h1>
                <p className="text-[10px] md:text-sm text-muted-foreground hidden md:block">
                  Control de acceso y seguridad de visitantes, trabajadores y proveedores
                </p>
              </div>
            </div>
            <BotonEmergencia />
          </div>
        </div>

        {/* Control de Acceso - Mobile Optimized */}
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="p-3 md:p-6 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="flex items-center gap-2 text-sm md:text-base">
              <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
                <UserCheck className="h-3.5 w-3.5 md:h-5 md:w-5 text-primary" />
              </div>
              Control de Acceso
            </CardTitle>
            <CardDescription className="text-xs md:text-sm hidden md:block">
              Gestión de autorizaciones, registro manual y control de ingreso/salida
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 h-auto p-0.5 md:p-1 gap-0.5 md:gap-1 bg-muted/50">
                <TabsTrigger 
                  value="autorizaciones" 
                  className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1 text-[10px] md:text-sm py-2 md:py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Historial Autorizaciones</span>
                  <span className="sm:hidden">Historial</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="ingreso-salida" 
                  className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1 text-[10px] md:text-sm py-2 md:py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Clock className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Ingreso/Salida</span>
                  <span className="sm:hidden">I/S</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="manual-visitas" 
                  className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1 text-[10px] md:text-sm py-2 md:py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Users className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Reg. Visitas</span>
                  <span className="sm:hidden">Visitas</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="manual-trabajadores" 
                  className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1 text-[10px] md:text-sm py-2 md:py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <UserCheck className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Reg. Trabajadores</span>
                  <span className="sm:hidden">Trabaj.</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="manual-proveedores" 
                  className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1 text-[10px] md:text-sm py-2 md:py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <Shield className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Reg. Proveedores</span>
                  <span className="sm:hidden">Proveed.</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="historial" 
                  className="flex flex-col md:flex-row items-center gap-0.5 md:gap-1 text-[10px] md:text-sm py-2 md:py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
                >
                  <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                  <span className="hidden sm:inline">Historial</span>
                  <span className="sm:hidden">Historial</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="autorizaciones" className="mt-3 md:mt-6">
                <HistorialAutorizaciones />
              </TabsContent>

              <TabsContent value="ingreso-salida" className="mt-3 md:mt-6">
                <ControlIngresoSalida />
              </TabsContent>

              <TabsContent value="manual-visitas" className="mt-3 md:mt-6">
                <RegistroManualVisitas />
              </TabsContent>

              <TabsContent value="manual-trabajadores" className="mt-3 md:mt-6">
                <RegistroManualTrabajadores />
              </TabsContent>

              <TabsContent value="manual-proveedores" className="mt-3 md:mt-6">
                <RegistroManualProveedores />
              </TabsContent>

              <TabsContent value="historial" className="mt-3 md:mt-6">
                <HistorialSeguridad />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Buscador Inteligente */}
        <BuscadorInteligente />
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Seguridad;