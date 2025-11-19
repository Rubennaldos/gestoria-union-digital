import { useState } from "react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileBarChart, Calendar, Search } from "lucide-react";
import { db } from "@/config/firebase";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface BalanceMeses {
  enero?: any;
  febrero?: any;
  marzo?: any;
  abril?: any;
  mayo?: any;
  junio?: any;
  julio?: any;
  agosto?: any;
  septiembre?: any;
  octubre?: any;
  noviembre?: any;
  diciembre?: any;
}

interface BalanceRecord {
  nombre: string;
  manzana: string;
  lote: string;
  busqueda_id: string;
  meses: BalanceMeses;
}

const Balances = () => {
  const [manzana, setManzana] = useState("");
  const [lote, setLote] = useState("");
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<BalanceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const year = 2025;

  const buscar = async () => {
    const m = manzana.trim();
    const l = lote.trim();
    setResultado(null);
    setError(null);

    if (!m || !l) {
      setError("Ingresa Manzana y Lote.");
      return;
    }

    const searchId = `${m}-${l}`;
    setLoading(true);
    try {
      const baseRef = ref(db, `balances/${year}`);
      const q = query(baseRef, orderByChild("busqueda_id"), equalTo(searchId));
      const snap = await get(q);

      if (!snap.exists()) {
        setError(`No se encontraron datos para la Manzana ${m} Lote ${l}`);
        return;
      }

      let encontrado: BalanceRecord | null = null;
      snap.forEach(child => {
        const val = child.val();
        encontrado = {
          nombre: val.nombre || "—",
            manzana: val.manzana || m,
            lote: val.lote || l,
            busqueda_id: val.busqueda_id || searchId,
            meses: val.meses || {}
        };
      });

      if (!encontrado) {
        setError(`No se encontraron datos para la Manzana ${m} Lote ${l}`);
      } else {
        setResultado(encontrado);
        console.log("Registro encontrado:", encontrado);
      }
    } catch (e: any) {
      setError("Error consultando balances. Intenta nuevamente.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const monthLabels: { key: keyof BalanceMeses; label: string }[] = [
    { key: "enero", label: "Enero" },
    { key: "febrero", label: "Febrero" },
    { key: "marzo", label: "Marzo" },
    { key: "abril", label: "Abril" },
    { key: "mayo", label: "Mayo" },
    { key: "junio", label: "Junio" },
    { key: "julio", label: "Julio" },
    { key: "agosto", label: "Agosto" },
    { key: "septiembre", label: "Septiembre" },
    { key: "octubre", label: "Octubre" },
    { key: "noviembre", label: "Noviembre" },
    { key: "diciembre", label: "Diciembre" }
  ];

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

        <Tabs defaultValue="mensuales" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mensuales">Busqueda Segura</TabsTrigger>
            <TabsTrigger value="anuales" disabled>Histórico (Próximamente)</TabsTrigger>
          </TabsList>

          <TabsContent value="mensuales" className="space-y-6">
            {/* Formulario de búsqueda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Buscador Seguro Anti‑Chismes {year}
                </CardTitle>
                <CardDescription>
                  Consulta tu estado mensual usando Manzana y Lote
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Manzana</label>
                    <Input
                      value={manzana}
                      onChange={e => setManzana(e.target.value)}
                      placeholder="Ej: A"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lote</label>
                    <Input
                      value={lote}
                      onChange={e => setLote(e.target.value)}
                      placeholder="Ej: 12"
                      disabled={loading}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={buscar}
                      disabled={loading}
                      className="w-full"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {loading ? "Buscando..." : "Buscar"}
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-600 font-medium">
                    {error}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resultado */}
            {resultado && (
              <Card>
                <CardHeader>
                  <CardTitle>Resultado encontrado</CardTitle>
                  <CardDescription>
                    Nombre del Vecino: <span className="font-semibold">{resultado.nombre}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-border rounded-md">
                      <thead>
                        <tr className="bg-muted">
                          <th className="p-2 text-left font-medium">Mes</th>
                          <th className="p-2 text-left font-medium">Estado / Valor</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthLabels.map(m => (
                          <tr key={m.key} className="border-t border-border">
                            <td className="p-2">{m.label}</td>
                            <td className="p-2">
                              {resultado.meses?.[m.key] !== undefined && resultado.meses?.[m.key] !== ""
                                ? String(resultado.meses?.[m.key])
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mensaje inicial sin búsqueda y sin resultado */}
            {!resultado && !error && (
              <Card>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    Ingresa tu Manzana y Lote para consultar tus balances.
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="anuales">
            <Card>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  Próximamente.
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