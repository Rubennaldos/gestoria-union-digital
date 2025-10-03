import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BackButton from "@/components/layout/BackButton";
import { Shield, Clock, Users, Ban, FileText, AlertTriangle } from "lucide-react";
import { AuditoriaAccesos } from "@/components/admin-seguridad/AuditoriaAccesos";
import { GestionMaestrosObra } from "@/components/admin-seguridad/GestionMaestrosObra";
import { SolicitudesMaestros } from "@/components/admin-seguridad/SolicitudesMaestros";
import { ControlTrabajadores } from "@/components/admin-seguridad/ControlTrabajadores";
import { SancionesSeguridad } from "@/components/admin-seguridad/SancionesSeguridad";
import { Can } from "@/components/auth/Can";

const AdminSeguridad = () => {
  const [activeTab, setActiveTab] = useState("auditoria");

  return (
    <Can module="admin_seguridad" level="read" fallback={
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Acceso Denegado
            </CardTitle>
            <CardDescription>
              No tienes permisos para acceder al módulo de Administración de Seguridad.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <BackButton />
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Shield className="h-6 w-6" />
                Administración de Seguridad
              </h1>
              <p className="text-muted-foreground">
                Control total de accesos, maestros de obra, trabajadores y sanciones
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Panel de Control
            </CardTitle>
            <CardDescription>
              Gestión completa de seguridad, auditoría y sanciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="auditoria" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  Auditoría
                </TabsTrigger>
                <TabsTrigger value="maestros" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Maestros
                </TabsTrigger>
                <TabsTrigger value="solicitudes" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  Solicitudes
                </TabsTrigger>
                <TabsTrigger value="trabajadores" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Trabajadores
                </TabsTrigger>
                <TabsTrigger value="sanciones" className="flex items-center gap-1">
                  <Ban className="h-4 w-4" />
                  Sanciones
                </TabsTrigger>
              </TabsList>

              <TabsContent value="auditoria" className="mt-6">
                <AuditoriaAccesos />
              </TabsContent>

              <TabsContent value="maestros" className="mt-6">
                <GestionMaestrosObra />
              </TabsContent>

              <TabsContent value="solicitudes" className="mt-6">
                <SolicitudesMaestros />
              </TabsContent>

              <TabsContent value="trabajadores" className="mt-6">
                <ControlTrabajadores />
              </TabsContent>

              <TabsContent value="sanciones" className="mt-6">
                <SancionesSeguridad />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Can>
  );
};

export default AdminSeguridad;
