import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/layout/BackButton";
import { Shield, Clock, Users, Ban, FileText, AlertTriangle, ScrollText, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { notificationService } from "@/services/notifications";
import { AuditoriaAccesos } from "@/components/admin-seguridad/AuditoriaAccesos";
import { GestionMaestrosObra } from "@/components/admin-seguridad/GestionMaestrosObra";
import { SolicitudesMaestros } from "@/components/admin-seguridad/SolicitudesMaestros";
import { ControlTrabajadores } from "@/components/admin-seguridad/ControlTrabajadores";
import { SancionesSeguridad } from "@/components/admin-seguridad/SancionesSeguridad";
import { ReglamentoInterno } from "@/components/admin-seguridad/ReglamentoInterno";
import { Can } from "@/components/auth/Can";
import { useAuthz } from "@/contexts/AuthzContext";

import { AutorizacionesSeguridad as AutorizacionesAdmin } from "@/components/seguridad/AutorizacionesSeguridad";

const AdminSeguridad = () => {
  const [activeTab, setActiveTab] = useState("autorizaciones");
  const { toast } = useToast();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { can } = useAuthz();

  // Verificar si el usuario tiene permisos de administración de seguridad
  const hasAdminPermission = can("admin_seguridad", "read");

  useEffect(() => {
    // Solo verificar notificaciones si tiene permisos
    if (hasAdminPermission) {
      setNotificationsEnabled(notificationService.isRunning());
    }
  }, [hasAdminPermission]);

  const toggleNotifications = async () => {
    // Verificar permisos del módulo primero
    if (!hasAdminPermission) {
      toast({
        title: "Sin permisos",
        description: "No tienes permisos para recibir notificaciones de este módulo",
        variant: "destructive",
      });
      return;
    }

    if (notificationsEnabled) {
      notificationService.stop();
      setNotificationsEnabled(false);
      toast({
        title: "Notificaciones desactivadas",
        description: "Ya no recibirás alertas de nuevas solicitudes",
      });
    } else {
      const permission = notificationService.getPermissionStatus();
      
      if (permission === "denied") {
        toast({
          title: "Permisos denegados",
          description: "Activa las notificaciones en la configuración de tu navegador para recibir alertas",
          variant: "destructive",
        });
        return;
      }

      await notificationService.start();
      
      // Verificar si realmente se activó
      if (notificationService.isRunning()) {
        setNotificationsEnabled(true);
        toast({
          title: "✅ Notificaciones activadas",
          description: "Recibirás alertas con sonido cuando haya nuevas solicitudes de acceso",
        });
      } else {
        toast({
          title: "Error al activar",
          description: "No se pudieron activar las notificaciones. Verifica los permisos del navegador",
          variant: "destructive",
        });
      }
    }
  };

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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Panel de Control
                </CardTitle>
                <CardDescription>
                  Gestión completa de seguridad, auditoría y sanciones
                </CardDescription>
              </div>
              {hasAdminPermission && (
                <Button
                  variant={notificationsEnabled ? "default" : "outline"}
                  size="lg"
                  onClick={toggleNotifications}
                  className="gap-2"
                >
                  {notificationsEnabled ? (
                    <>
                      <Bell className="h-5 w-5 animate-pulse" />
                      <span className="hidden sm:inline">Notificaciones Activas</span>
                      <span className="sm:hidden">ON</span>
                    </>
                  ) : (
                    <>
                      <BellOff className="h-5 w-5" />
                      <span className="hidden sm:inline">Activar Notificaciones</span>
                      <span className="sm:hidden">OFF</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="autorizaciones" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Autorizaciones</span>
                </TabsTrigger>
                <TabsTrigger value="auditoria" className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span className="hidden sm:inline">Auditoría</span>
                </TabsTrigger>
                <TabsTrigger value="maestros" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Maestros</span>
                </TabsTrigger>
                <TabsTrigger value="solicitudes" className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Solicitudes</span>
                </TabsTrigger>
                <TabsTrigger value="trabajadores" className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Trabajadores</span>
                </TabsTrigger>
                <TabsTrigger value="sanciones" className="flex items-center gap-1">
                  <Ban className="h-4 w-4" />
                  <span className="hidden sm:inline">Sanciones</span>
                </TabsTrigger>
                <TabsTrigger value="reglamento" className="flex items-center gap-1">
                  <ScrollText className="h-4 w-4" />
                  <span className="hidden sm:inline">Reglamento</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="autorizaciones" className="mt-6">
                <AutorizacionesAdmin />
              </TabsContent>

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

              <TabsContent value="reglamento" className="mt-6">
                <ReglamentoInterno />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Can>
  );
};

export default AdminSeguridad;
