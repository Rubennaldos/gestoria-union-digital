import { Button } from "@/components/ui/button";
import { seedFirebaseData } from "@/utils/seedData";
import { addPlanillaModule } from "@/utils/addPlanillaModule";
import { useState } from "react";
import { Database, Briefcase } from "lucide-react";

export const SeedDataButton = () => {
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);
  const [loadingPlanilla, setLoadingPlanilla] = useState(false);
  const [planillaAdded, setPlanillaAdded] = useState(false);

  const handleSeedData = async () => {
    setLoading(true);
    const success = await seedFirebaseData();
    setLoading(false);
    if (success) {
      setSeeded(true);
      setTimeout(() => setSeeded(false), 3000);
    }
  };

  const handleAddPlanilla = async () => {
    setLoadingPlanilla(true);
    try {
      await addPlanillaModule();
      setPlanillaAdded(true);
      setTimeout(() => {
        setPlanillaAdded(false);
        window.location.reload(); // Recargar para mostrar el nuevo módulo
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoadingPlanilla(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button 
        onClick={handleSeedData} 
        disabled={loading || seeded}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Database className="h-4 w-4" />
        {loading ? "Cargando..." : seeded ? "¡Datos cargados!" : "Cargar datos de prueba"}
      </Button>
      <Button 
        onClick={handleAddPlanilla} 
        disabled={loadingPlanilla || planillaAdded}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Briefcase className="h-4 w-4" />
        {loadingPlanilla ? "Agregando..." : planillaAdded ? "¡Agregado!" : "Agregar Planilla"}
      </Button>
    </div>
  );
};