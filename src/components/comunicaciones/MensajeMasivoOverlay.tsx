import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { MensajeMasivo } from '@/types/comunicaciones';
import { obtenerMensajesActivos } from '@/services/comunicaciones';

interface MensajeMasivoOverlayProps {
  empadronadoId: string;
}

export const MensajeMasivoOverlay: React.FC<MensajeMasivoOverlayProps> = ({ empadronadoId }) => {
  const [mensajes, setMensajes] = useState<MensajeMasivo[]>([]);
  const [mensajeActual, setMensajeActual] = useState<MensajeMasivo | null>(null);
  const [indiceActual, setIndiceActual] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    cargarMensajes();
  }, []);

  const cargarMensajes = async () => {
    try {
      const mensajesActivos = await obtenerMensajesActivos();
      if (mensajesActivos.length > 0) {
        // Verificar si ya se vio este mensaje en esta sesión
        const mensajesVistos = JSON.parse(sessionStorage.getItem('mensajes_vistos') || '[]');
        const mensajesNoVistos = mensajesActivos.filter(m => !mensajesVistos.includes(m.id));
        
        if (mensajesNoVistos.length > 0) {
          setMensajes(mensajesNoVistos);
          setMensajeActual(mensajesNoVistos[0]);
          setIndiceActual(0);
          setOpen(true);
        }
      }
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
  };

  const handleClose = () => {
    if (mensajeActual) {
      // Marcar como visto en sessionStorage
      const mensajesVistos = JSON.parse(sessionStorage.getItem('mensajes_vistos') || '[]');
      mensajesVistos.push(mensajeActual.id);
      sessionStorage.setItem('mensajes_vistos', JSON.stringify(mensajesVistos));
    }

    // Si hay más mensajes, mostrar el siguiente
    if (indiceActual < mensajes.length - 1) {
      setIndiceActual(indiceActual + 1);
      setMensajeActual(mensajes[indiceActual + 1]);
    } else {
      setOpen(false);
      setMensajeActual(null);
    }
  };

  if (!mensajeActual) return null;

  const { estiloTexto } = mensajeActual;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent 
        className="max-w-4xl p-0 overflow-hidden"
        onEscapeKeyDown={handleClose}
      >
        <div className="relative">
          {/* Botón cerrar */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-background/80 backdrop-blur-sm hover:bg-background"
            onClick={handleClose}
          >
            <X className="h-5 w-5" />
          </Button>

          <div className="flex flex-col md:flex-row">
            {/* Imagen */}
            {mensajeActual.imagen && (
              <div className="md:w-2/3 relative">
                <img 
                  src={mensajeActual.imagen} 
                  alt={mensajeActual.titulo}
                  className="w-full h-full object-cover max-h-[70vh] md:max-h-[80vh]"
                />
              </div>
            )}

            {/* Contenido de texto */}
            <div 
              className={`${mensajeActual.imagen ? 'md:w-1/3' : 'w-full'} p-6 md:p-8 flex flex-col justify-center bg-card`}
              style={{
                fontFamily: estiloTexto.fuente,
                textAlign: estiloTexto.alineacion
              }}
            >
              <h2 
                className="text-2xl md:text-3xl mb-4"
                style={{
                  color: estiloTexto.color,
                  fontSize: `${estiloTexto.tamano + 8}px`,
                  fontWeight: estiloTexto.negrita ? 'bold' : 'normal',
                  fontStyle: estiloTexto.cursiva ? 'italic' : 'normal'
                }}
              >
                {mensajeActual.titulo}
              </h2>

              <p 
                className="mb-6 leading-relaxed"
                style={{
                  color: estiloTexto.color,
                  fontSize: `${estiloTexto.tamano}px`,
                  fontWeight: estiloTexto.negrita ? 'bold' : 'normal',
                  fontStyle: estiloTexto.cursiva ? 'italic' : 'normal'
                }}
              >
                {mensajeActual.descripcion}
              </p>

              {mensajeActual.link && (
                <Button 
                  asChild
                  className="w-full md:w-auto"
                >
                  <a 
                    href={mensajeActual.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2"
                  >
                    Ver más
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}

              {/* Indicador de mensajes múltiples */}
              {mensajes.length > 1 && (
                <div className="mt-6 text-sm text-muted-foreground text-center">
                  Mensaje {indiceActual + 1} de {mensajes.length}
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
