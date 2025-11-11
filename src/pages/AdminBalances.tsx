import { useState } from "react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, FileBarChart, Plus, Upload } from "lucide-react";

const AdminBalances = () => {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <BackButton />
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
            <Settings className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Administrador de Balances
            </h1>
            <p className="text-muted-foreground">
              Gestión y administración de balances financieros
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="mensuales" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mensuales">Balances Mensuales</TabsTrigger>
            <TabsTrigger value="anuales">Balances Anuales</TabsTrigger>
          </TabsList>

          <TabsContent value="mensuales" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileBarChart className="h-5 w-5" />
                      Gestión de Balances Mensuales
                    </CardTitle>
                    <CardDescription>
                      Crear, editar y publicar balances mensuales
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Balance
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No hay balances mensuales registrados. Crea el primer balance.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anuales" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileBarChart className="h-5 w-5" />
                      Gestión de Balances Anuales
                    </CardTitle>
                    <CardDescription>
                      Crear, editar y publicar balances anuales consolidados
                    </CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Balance Anual
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No hay balances anuales registrados. Crea el primer balance anual.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Configuración */}
        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>
              Opciones de configuración para la gestión de balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                <Upload className="h-4 w-4 mr-2" />
                Importar Balances desde Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default AdminBalances;
