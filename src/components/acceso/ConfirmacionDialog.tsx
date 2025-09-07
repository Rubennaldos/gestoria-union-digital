import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  mensaje?: string;
  contenido?: React.ReactNode;
  onConfirmar?: () => void;
}

export function ConfirmacionDialog({ 
  open, 
  onOpenChange, 
  titulo, 
  mensaje,
  contenido,
  onConfirmar
}: ConfirmacionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{titulo}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {mensaje && <p className="text-center text-muted-foreground">{mensaje}</p>}
          {contenido}
        </div>
        
        <div className="flex gap-2">
          {onConfirmar ? (
            <>
              <Button 
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button 
                onClick={onConfirmar}
                className="flex-1"
              >
                Confirmar
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Entendido
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}