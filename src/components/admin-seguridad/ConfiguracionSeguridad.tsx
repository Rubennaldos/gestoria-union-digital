import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, MessageSquare } from "lucide-react";
import { ReglamentoInterno } from "./ReglamentoInterno";
import { ConfiguracionWhatsApp } from "./ConfiguracionWhatsApp";

export function ConfiguracionSeguridad() {
  return (
    <Tabs defaultValue="whatsapp" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="whatsapp" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          WhatsApp
        </TabsTrigger>
        <TabsTrigger value="reglamento" className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Reglamento
        </TabsTrigger>
      </TabsList>

      <TabsContent value="whatsapp" className="mt-4">
        <ConfiguracionWhatsApp />
      </TabsContent>

      <TabsContent value="reglamento" className="mt-4">
        <ReglamentoInterno />
      </TabsContent>
    </Tabs>
  );
}
