import { DollarSign, TrendingUp, CreditCard, FileText, AlertCircle, Home } from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Finanzas = () => {
  const resumenFinanciero = {
    ingresosMes: "S/ 15,420",
    egresosMes: "S/ 8,750",
    saldoActual: "S/ 45,280",
    cuotasPendientes: 23
  };

  const ultimosMovimientos = [
    { id: 1, fecha: "2024-08-25", concepto: "Cuota ordinaria - Etapa 3", monto: "S/ 180", tipo: "ingreso" },
    { id: 2, fecha: "2024-08-24", concepto: "Pago vigilancia", monto: "S/ 2,500", tipo: "egreso" },
    { id: 3, fecha: "2024-08-23", concepto: "Mantenimiento parques", monto: "S/ 850", tipo: "egreso" },
    { id: 4, fecha: "2024-08-22", concepto: "Cuota extraordinaria", monto: "S/ 300", tipo: "ingreso" }
  ];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/'}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Inicio
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Finanzas</h1>
              <p className="text-muted-foreground">Gestión económica y presupuestaria</p>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary-hover">
            <DollarSign className="h-4 w-4 mr-2" />
            Registrar Pago
          </Button>
        </div>

        {/* Resumen Financiero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-success/20 bg-success-light">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-success font-medium">Ingresos</p>
                  <p className="text-xl font-bold text-success">{resumenFinanciero.ingresosMes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/20 bg-warning-light">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm text-warning font-medium">Egresos</p>
                  <p className="text-xl font-bold text-warning">{resumenFinanciero.egresosMes}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary-light">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-primary font-medium">Saldo</p>
                  <p className="text-xl font-bold text-primary">{resumenFinanciero.saldoActual}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-destructive font-medium">Pendientes</p>
                  <p className="text-xl font-bold text-destructive">{resumenFinanciero.cuotasPendientes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <DollarSign className="h-6 w-6" />
            <span className="text-sm">Registrar Pago</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <CreditCard className="h-6 w-6" />
            <span className="text-sm">Nuevo Egreso</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <FileText className="h-6 w-6" />
            <span className="text-sm">Balance Mensual</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <TrendingUp className="h-6 w-6" />
            <span className="text-sm">Reportes</span>
          </Button>
        </div>

        {/* Últimos Movimientos */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ultimosMovimientos.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{mov.concepto}</p>
                    <p className="text-xs text-muted-foreground">{mov.fecha}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={mov.tipo === "ingreso" ? "default" : "secondary"}>
                      {mov.tipo === "ingreso" ? "+" : "-"}{mov.monto}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Finanzas;