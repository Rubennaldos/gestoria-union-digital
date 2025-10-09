import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ref, get, set } from "firebase/database";
import { db } from "@/config/firebase";

const REGLAMENTO_DEFAULT = `Al autorizar el ingreso, usted acepta:

• Cumplir con todas las normas de seguridad establecidas.
• Responsabilizarse por las acciones de sus visitantes/trabajadores/proveedores.
• Permitir la inspección de vigilancia cuando sea necesario.
• Respetar las áreas comunes y privadas de la asociación.
• Acatar las indicaciones del personal de seguridad.`;

export function ReglamentoInterno() {
  const [texto, setTexto] = useState(REGLAMENTO_DEFAULT);
  const [guardando, setGuardando] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    cargarReglamento();
  }, []);

  const cargarReglamento = async () => {
    try {
      const reglamentoRef = ref(db, "configuracion/reglamento_acceso");
      const snapshot = await get(reglamentoRef);
      
      if (snapshot.exists()) {
        setTexto(snapshot.val().texto || REGLAMENTO_DEFAULT);
      }
    } catch (error) {
      console.error("Error al cargar reglamento:", error);
    }
  };

  const guardarReglamento = async () => {
    if (!texto.trim()) {
      toast({
        title: "Error",
        description: "El texto del reglamento no puede estar vacío",
        variant: "destructive",
      });
      return;
    }

    setGuardando(true);
    try {
      const reglamentoRef = ref(db, "configuracion/reglamento_acceso");
      await set(reglamentoRef, {
        texto: texto.trim(),
        actualizadoEn: new Date().toISOString(),
      });

      toast({
        title: "Reglamento actualizado",
        description: "Los cambios se han guardado correctamente",
      });
    } catch (error) {
      console.error("Error al guardar reglamento:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el reglamento",
        variant: "destructive",
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Reglamento Interno de Acceso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="reglamento">
            Texto del compromiso que aparecerá en los formularios de registro
          </Label>
          <Textarea
            id="reglamento"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={12}
            className="font-mono text-sm"
            placeholder="Ingrese el texto del reglamento interno..."
          />
          <p className="text-xs text-muted-foreground">
            Este texto aparecerá en los formularios de registro de visitas, trabajadores y proveedores.
            Los usuarios deberán aceptarlo antes de registrar el acceso.
          </p>
        </div>

        <Button
          onClick={guardarReglamento}
          disabled={guardando}
          className="w-full"
        >
          <Save className="h-4 w-4 mr-2" />
          {guardando ? "Guardando..." : "Guardar Reglamento"}
        </Button>
      </CardContent>
    </Card>
  );
}
