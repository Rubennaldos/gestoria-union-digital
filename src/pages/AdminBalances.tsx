import { useRef, useState } from "react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Settings, FileBarChart, Plus, Upload } from "lucide-react";
import * as XLSX from "xlsx";
import { db } from "@/config/firebase";
import { ref, push, set } from "firebase/database";

interface BalanceRow {
  Manzana: string;
  Lote: string;
  Nombre: string;
  Enero?: any;
  Febrero?: any;
  Marzo?: any;
  Abril?: any;
  Mayo?: any;
  Junio?: any;
  Julio?: any;
  Agosto?: any;
  Septiembre?: any;
  Octubre?: any;
  Noviembre?: any;
  Diciembre?: any;
}

const AdminBalances = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importCount, setImportCount] = useState<number | null>(null);

  const triggerFileSelect = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      setImportCount(null);

      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        alert("Formato inválido. Usa un archivo .xlsx o .xls");
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: BalanceRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const yearPath = "balances/2025";
      const baseRef = ref(db, yearPath);

      const promises: Promise<void>[] = [];
      let count = 0;

      for (const row of rows) {
        // Validación mínima de columnas requeridas
        if (!row.Manzana || !row.Lote || !row.Nombre) continue;

        const manzana = String(row.Manzana).trim();
        const lote = String(row.Lote).trim();
        const nombre = String(row.Nombre).trim();

        const meses = {
          enero: row.Enero ?? "",
            febrero: row.Febrero ?? "",
            marzo: row.Marzo ?? "",
            abril: row.Abril ?? "",
            mayo: row.Mayo ?? "",
            junio: row.Junio ?? "",
            julio: row.Julio ?? "",
            agosto: row.Agosto ?? "",
            septiembre: row.Septiembre ?? "",
            octubre: row.Octubre ?? "",
            noviembre: row.Noviembre ?? "",
            diciembre: row.Diciembre ?? ""
        };

        const newRef = push(baseRef);
        const data = {
          manzana,
          lote,
          nombre,
          meses,
          busqueda_id: `${manzana}-${lote}`,
          createdAt: Date.now()
        };
        promises.push(set(newRef, data));
        count++;
      }

      await Promise.all(promises);
      setImportCount(count);
      console.log(`Importación completada. Registros subidos: ${count}`);
      alert(`Importación completada. Registros subidos: ${count}`);
    } catch (err) {
      console.error("Error importando balances:", err);
      alert("Error importando el archivo. Revisa la consola.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

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
                  <Button disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Balance
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No hay balances mensuales registrados. Importa un Excel para comenzar.
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
                  <Button disabled>
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Balance Anual
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  No hay balances anuales registrados.
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={triggerFileSelect}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "Importando..." : "Importar Balances desde Excel"}
              </Button>
              {importCount !== null && (
                <p className="text-sm text-muted-foreground">
                  Registros importados: {importCount}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default AdminBalances;