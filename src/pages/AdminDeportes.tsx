import { useState } from "react";
import { TopNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Building2, Shield, Bell } from "lucide-react";
import { AgendaReservas } from "@/components/admin-deportes/AgendaReservas";
import { GestionCanchas } from "@/components/admin-deportes/GestionCanchas";
import { BloqueosCancha } from "@/components/admin-deportes/BloqueosCancha";
import { AvisosDeportivos } from "@/components/admin-deportes/AvisosDeportivos";

export default function AdminDeportes() {
  const [activeTab, setActiveTab] = useState("agenda");

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      <div className="container mx-auto px-4 py-6 pb-20 md:pb-6">
        <BackButton />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Administración de Lozas Deportivas
          </h1>
          <p className="text-muted-foreground">
            Gestiona reservas, canchas, bloqueos y avisos del sistema deportivo
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="agenda" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Agenda</span>
            </TabsTrigger>
            <TabsTrigger value="canchas" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Canchas</span>
            </TabsTrigger>
            <TabsTrigger value="bloqueos" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Bloqueos</span>
            </TabsTrigger>
            <TabsTrigger value="avisos" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Avisos</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agenda" className="space-y-4">
            <AgendaReservas />
          </TabsContent>

          <TabsContent value="canchas" className="space-y-4">
            <GestionCanchas />
          </TabsContent>

          <TabsContent value="bloqueos" className="space-y-4">
            <BloqueosCancha />
          </TabsContent>

          <TabsContent value="avisos" className="space-y-4">
            <AvisosDeportivos />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
