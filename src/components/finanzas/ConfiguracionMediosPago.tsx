// src/components/finanzas/ConfiguracionMediosPago.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Building2, Smartphone, Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { CuentaBancaria, BilleteraDigital } from "@/types/medios-pago";
import {
  obtenerMediosPago,
  agregarCuentaBancaria,
  actualizarCuentaBancaria,
  eliminarCuentaBancaria,
  agregarBilleteraDigital,
  actualizarBilleteraDigital,
  eliminarBilleteraDigital,
} from "@/services/medios-pago";
import { ConfiguracionWhatsAppPagos } from "@/components/cobranzas/ConfiguracionWhatsAppPagos";

export const ConfiguracionMediosPago = () => {
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([]);
  const [billeterasDigitales, setBilleterasDigitales] = useState<BilleteraDigital[]>([]);
  const [loading, setLoading] = useState(true);

  // Nuevas cuentas/billeteras
  const [nuevoBanco, setNuevoBanco] = useState("");
  const [nuevaCuenta, setNuevaCuenta] = useState("");
  const [nuevoTitularBanco, setNuevoTitularBanco] = useState("");
  const [nuevaBilletera, setNuevaBilletera] = useState("");
  const [nuevoNumero, setNuevoNumero] = useState("");
  const [nuevoTitularBilletera, setNuevoTitularBilletera] = useState("");

  useEffect(() => {
    cargarMediosPago();
  }, []);

  const cargarMediosPago = async () => {
    try {
      const configuracion = await obtenerMediosPago();
      setCuentasBancarias(configuracion.cuentasBancarias || []);
      setBilleterasDigitales(configuracion.billeterasDigitales || []);
    } catch (error) {
      console.error("Error al cargar medios de pago:", error);
      toast.error("Error al cargar la configuración");
    } finally {
      setLoading(false);
    }
  };

  const handleAgregarBanco = async () => {
    if (!nuevoBanco.trim() || !nuevaCuenta.trim() || !nuevoTitularBanco.trim()) {
      toast.error("Completa todos los campos");
      return;
    }

    try {
      await agregarCuentaBancaria({
        nombreBanco: nuevoBanco.trim(),
        numeroCuenta: nuevaCuenta.trim(),
        titular: nuevoTitularBanco.trim(),
        activo: true,
      });
      
      setNuevoBanco("");
      setNuevaCuenta("");
      setNuevoTitularBanco("");
      await cargarMediosPago();
      toast.success("Cuenta bancaria agregada");
    } catch (error) {
      console.error("Error al agregar cuenta:", error);
      toast.error("Error al agregar cuenta bancaria");
    }
  };

  const handleAgregarBilletera = async () => {
    if (!nuevaBilletera.trim() || !nuevoNumero.trim() || !nuevoTitularBilletera.trim()) {
      toast.error("Completa todos los campos");
      return;
    }

    try {
      await agregarBilleteraDigital({
        nombreBilletera: nuevaBilletera.trim(),
        numeroTelefono: nuevoNumero.trim(),
        titular: nuevoTitularBilletera.trim(),
        activo: true,
      });
      
      setNuevaBilletera("");
      setNuevoNumero("");
      setNuevoTitularBilletera("");
      await cargarMediosPago();
      toast.success("Billetera digital agregada");
    } catch (error) {
      console.error("Error al agregar billetera:", error);
      toast.error("Error al agregar billetera digital");
    }
  };

  const handleToggleBanco = async (id: string, activo: boolean) => {
    try {
      await actualizarCuentaBancaria(id, { activo });
      await cargarMediosPago();
      toast.success(activo ? "Cuenta activada" : "Cuenta desactivada");
    } catch (error) {
      console.error("Error al actualizar cuenta:", error);
      toast.error("Error al actualizar cuenta");
    }
  };

  const handleToggleBilletera = async (id: string, activo: boolean) => {
    try {
      await actualizarBilleteraDigital(id, { activo });
      await cargarMediosPago();
      toast.success(activo ? "Billetera activada" : "Billetera desactivada");
    } catch (error) {
      console.error("Error al actualizar billetera:", error);
      toast.error("Error al actualizar billetera");
    }
  };

  const handleEliminarBanco = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta cuenta bancaria?")) return;

    try {
      await eliminarCuentaBancaria(id);
      await cargarMediosPago();
      toast.success("Cuenta bancaria eliminada");
    } catch (error) {
      console.error("Error al eliminar cuenta:", error);
      toast.error("Error al eliminar cuenta");
    }
  };

  const handleEliminarBilletera = async (id: string) => {
    if (!confirm("¿Seguro que deseas eliminar esta billetera digital?")) return;

    try {
      await eliminarBilleteraDigital(id);
      await cargarMediosPago();
      toast.success("Billetera digital eliminada");
    } catch (error) {
      console.error("Error al eliminar billetera:", error);
      toast.error("Error al eliminar billetera");
    }
  };

  if (loading) {
    return <div className="text-center p-8">Cargando configuración...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Cuentas Bancarias */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cuentas Bancarias
          </CardTitle>
          <CardDescription>
            Configura las cuentas bancarias disponibles para la pasarela de pagos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de cuentas existentes */}
          {cuentasBancarias.map((cuenta) => (
            <div
              key={cuenta.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-semibold">{cuenta.nombreBanco}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {cuenta.numeroCuenta}
                </p>
                <p className="text-sm text-muted-foreground">
                  Titular: {cuenta.titular}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`banco-${cuenta.id}`} className="text-sm">
                    {cuenta.activo ? "Activo" : "Inactivo"}
                  </Label>
                  <Switch
                    id={`banco-${cuenta.id}`}
                    checked={cuenta.activo}
                    onCheckedChange={(checked) => handleToggleBanco(cuenta.id, checked)}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEliminarBanco(cuenta.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {/* Agregar nueva cuenta */}
          <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
            <p className="font-semibold text-sm">Agregar nueva cuenta bancaria</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="nuevoBanco">Nombre del banco</Label>
                <Input
                  id="nuevoBanco"
                  placeholder="Ej: BANCO DE CREDITO DEL PERU ( BCP)"
                  value={nuevoBanco}
                  onChange={(e) => setNuevoBanco(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nuevaCuenta">Número de cuenta</Label>
                  <Input
                    id="nuevaCuenta"
                    placeholder="Ej: 193-0464"
                    value={nuevaCuenta}
                    onChange={(e) => setNuevaCuenta(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nuevoTitularBanco">Titular de la cuenta</Label>
                  <Input
                    id="nuevoTitularBanco"
                    placeholder="Ej: Juan Pérez"
                    value={nuevoTitularBanco}
                    onChange={(e) => setNuevoTitularBanco(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleAgregarBanco} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Cuenta Bancaria
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Billeteras Digitales */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Billeteras Digitales
          </CardTitle>
          <CardDescription>
            Configura las billeteras digitales disponibles para la pasarela de pagos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lista de billeteras existentes */}
          {billeterasDigitales.map((billetera) => (
            <div
              key={billetera.id}
              className="flex items-center justify-between p-4 border rounded-lg"
            >
              <div className="flex-1">
                <p className="font-semibold">{billetera.nombreBilletera}</p>
                <p className="text-sm text-muted-foreground font-mono">
                  {billetera.numeroTelefono}
                </p>
                <p className="text-sm text-muted-foreground">
                  Titular: {billetera.titular}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Label htmlFor={`billetera-${billetera.id}`} className="text-sm">
                    {billetera.activo ? "Activo" : "Inactivo"}
                  </Label>
                  <Switch
                    id={`billetera-${billetera.id}`}
                    checked={billetera.activo}
                    onCheckedChange={(checked) =>
                      handleToggleBilletera(billetera.id, checked)
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEliminarBilletera(billetera.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}

          {/* Agregar nueva billetera */}
          <div className="p-4 border-2 border-dashed rounded-lg space-y-3">
            <p className="font-semibold text-sm">Agregar nueva billetera digital</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <Label htmlFor="nuevaBilletera">Nombre de la billetera</Label>
                <Input
                  id="nuevaBilletera"
                  placeholder="Ej: Yape, Plin"
                  value={nuevaBilletera}
                  onChange={(e) => setNuevaBilletera(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="nuevoNumero">Número de teléfono</Label>
                  <Input
                    id="nuevoNumero"
                    placeholder="Ej: 987654321"
                    value={nuevoNumero}
                    onChange={(e) => setNuevoNumero(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="nuevoTitularBilletera">Titular de la billetera</Label>
                  <Input
                    id="nuevoTitularBilletera"
                    placeholder="Ej: María García"
                    value={nuevoTitularBilletera}
                    onChange={(e) => setNuevoTitularBilletera(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <Button onClick={handleAgregarBilletera} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Billetera Digital
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuración de WhatsApp para notificaciones de pago */}
      <ConfiguracionWhatsAppPagos />
    </div>
  );
};
