import { useState } from "react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileBarChart, TrendingUp, Calendar } from "lucide-react";

const Balances = () => {
  const [selectedYear] = useState(new Date().getFullYear());

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <BackButton />
        
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileBarChart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Balances
            </h1>
            <p className="text-muted-foreground">
              Consulta de balances financieros
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
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Balances Mensuales {selectedYear}
                </CardTitle>
                <CardDescription>
                  Consulta los balances financieros mensuales del año en curso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No hay balances mensuales registrados para mostrar
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="anuales" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Balances Anuales
                </CardTitle>
                <CardDescription>
                  Consulta los balances financieros anuales históricos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No hay balances anuales registrados para mostrar
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Balances;
