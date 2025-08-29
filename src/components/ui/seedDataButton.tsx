import { Button } from "@/components/ui/button";
import { seedFirebaseData } from "@/utils/seedData";
import { useState } from "react";
import { Database } from "lucide-react";

export const SeedDataButton = () => {
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleSeedData = async () => {
    setLoading(true);
    const success = await seedFirebaseData();
    setLoading(false);
    if (success) {
      setSeeded(true);
      setTimeout(() => setSeeded(false), 3000);
    }
  };

  return (
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
  );
};