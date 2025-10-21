import { User, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { abrirWhatsApp } from "@/lib/whatsappAcceso";

const Modulos = () => {
  const navigate = useNavigate();

  const handleSoporte = () => {
    const mensaje = "Hola, necesito soporte con el sistema de Gestoría Digital.";
    abrirWhatsApp("917004875", mensaje);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            Más Opciones
          </h1>
          <p className="text-muted-foreground">
            Accede a configuración y soporte
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 gap-4 max-w-2xl mx-auto">
          {/* Mis Datos */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={() => navigate("/configuracion-cuenta")}
          >
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Mis Datos</CardTitle>
                  <CardDescription>
                    Gestiona tu información personal y configuración de cuenta
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Soporte */}
          <Card 
            className="cursor-pointer hover:bg-accent/50 transition-colors"
            onClick={handleSoporte}
          >
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-success/10">
                  <MessageCircle className="h-6 w-6 text-success" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Soporte</CardTitle>
                  <CardDescription>
                    Contacta con nosotros por WhatsApp para ayuda y asistencia
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Modulos;
