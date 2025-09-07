import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmacionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titulo: string;
  contenido: React.ReactNode;
}

export function ConfirmacionDialog({ 
  open, 
  onOpenChange, 
  titulo, 
  contenido 
}: ConfirmacionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{titulo}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {contenido}
        </div>
        
        <div className="flex justify-center">
          <Button 
            onClick={() => onOpenChange(false)}
            className="w-full"
          >
            Entendido
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}