import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Download } from "lucide-react";

interface ReglamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  texto: string;
  onAceptar: () => void;
}

export function ReglamentoDialog({
  open,
  onOpenChange,
  texto,
  onAceptar,
}: ReglamentoDialogProps) {
  const descargarPDF = () => {
    // Crear un blob con el contenido del reglamento
    const contenido = `
      REGLAMENTO INTERNO DE ACCESO
      
      ${texto}
      
      ---
      Generado el ${new Date().toLocaleDateString()}
    `;
    
    const blob = new Blob([contenido], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "reglamento-interno.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAceptar = () => {
    onAceptar();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Términos y Condiciones - Reglamento Interno
          </DialogTitle>
          <DialogDescription>
            Por favor, lea cuidadosamente el reglamento interno antes de aceptar.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <div className="whitespace-pre-line text-sm leading-relaxed">
            {texto || "No hay reglamento configurado."}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={descargarPDF}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Descargar
          </Button>
          <Button
            onClick={handleAceptar}
            className="w-full sm:w-auto"
          >
            Aceptar y Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
