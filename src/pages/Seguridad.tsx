import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/layout/BackButton";
import { AlertTriangle, Shield, Users, Clock, UserCheck, FileText, Camera, Search, Plus } from "lucide-react";
import { EscanearQRPortico } from "@/components/seguridad/EscanearQRPortico";
import { HistorialAsociado } from "@/components/seguridad/HistorialAsociado";
import { BotonEmergencia } from "@/components/seguridad/BotonEmergencia";

const Seguridad = () => {
  const { user, loading } = useAuth();
  const [mostrarHistorial, setMostrarHistorial] = useState(false);

  // Mostrar spinner/cargando mientras se carga el usuario
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-lg text-muted-foreground font-semibold">
          Cargando...
        </div>
      </div>
    );
    // Alternativamente: return null;
  }

  // Protección de permisos de módulo (solo después de cargar)
  if (!user?.modules || !user.modules.seguridad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-lg text-muted-foreground font-semibold">
          No tienes permiso para acceder a este módulo
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-3 md:px-6 py-4 space-y-4 md:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 md:gap-4">
              <BackButton fallbackTo="/" label="Inicio" />
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

        {/* Opciones principales - Mobile Optimized */}
        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Escanear QR */}
          <EscanearQRPortico />

          {/* Historial */}
          <Card 
            className="hover:shadow-xl transition-all duration-300 cursor-pointer group"
            onClick={() => setMostrarHistorial(!mostrarHistorial)}
          >
            <CardContent className="p-8 md:p-12">
              <div className="flex flex-col items-center text-center space-y-6">
                <div className="p-6 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-500/5 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-16 w-16 md:h-24 md:w-24 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-2">Historial de Visitas</h3>
                  <p className="text-muted-foreground">
                    Consulta tus visitas y horarios de entrada/salida
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Historial detallado - solo visible cuando se hace clic */}
        {mostrarHistorial && <HistorialAsociado />}
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Seguridad;