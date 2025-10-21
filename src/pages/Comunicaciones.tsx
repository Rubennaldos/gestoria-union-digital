import React, { useState, useEffect } from 'react';
import { TopNavigation, BottomNavigation } from '@/components/layout/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Plus, 
  Eye, 
  EyeOff, 
  Trash2, 
  Calendar,
  Users,
  Image as ImageIcon,
  Link as LinkIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { MensajeMasivo } from '@/types/comunicaciones';
import { obtenerTodosMensajes, toggleMensajeActivo, eliminarMensajeMasivo } from '@/services/comunicaciones';
import { NuevoMensajeModal } from '@/components/comunicaciones/NuevoMensajeModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import MiBreadcrumb from '@/components/layout/MiBreadcrumb';

export default function Comunicaciones() {
  const [mensajes, setMensajes] = useState<MensajeMasivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalNuevo, setModalNuevo] = useState(false);
  const [mensajeAEliminar, setMensajeAEliminar] = useState<string | null>(null);

  useEffect(() => {
    cargarMensajes();
  }, []);

  const cargarMensajes = async () => {
    try {
      const data = await obtenerTodosMensajes();
      setMensajes(data);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
      toast.error('Error al cargar los mensajes');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (mensajeId: string, activo: boolean) => {
    try {
      await toggleMensajeActivo(mensajeId, !activo);
      toast.success(activo ? 'Mensaje desactivado' : 'Mensaje activado');
      cargarMensajes();
    } catch (error) {
      console.error('Error actualizando mensaje:', error);
      toast.error('Error al actualizar el mensaje');
    }
  };

  const handleEliminar = async () => {
    if (!mensajeAEliminar) return;

    try {
      await eliminarMensajeMasivo(mensajeAEliminar);
      toast.success('Mensaje eliminado exitosamente');
      cargarMensajes();
    } catch (error) {
      console.error('Error eliminando mensaje:', error);
      toast.error('Error al eliminar el mensaje');
    } finally {
      setMensajeAEliminar(null);
    }
  };

  const formatearFecha = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <MiBreadcrumb paginaActual="Comunicaciones" />

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-7 w-7" />
              Comunicaciones
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestiona mensajes masivos para todos los vecinos
            </p>
          </div>
          <Button onClick={() => setModalNuevo(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Mensaje
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Mensajes</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mensajes.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <Eye className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {mensajes.filter(m => m.activo).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {mensajes.filter(m => !m.activo).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de mensajes */}
        <Card>
          <CardHeader>
            <CardTitle>Mensajes Masivos</CardTitle>
            <CardDescription>
              Los mensajes activos se mostrarán automáticamente a los vecinos cuando ingresen al portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Cargando mensajes...</p>
              </div>
            ) : mensajes.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No hay mensajes</h3>
                <p className="text-muted-foreground mb-4">
                  Crea tu primer mensaje masivo para comunicarte con los vecinos
                </p>
                <Button onClick={() => setModalNuevo(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Mensaje
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {mensajes.map((mensaje) => (
                  <div
                    key={mensaje.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex gap-4">
                      {/* Thumbnail de imagen */}
                      {mensaje.imagen && (
                        <div className="flex-shrink-0">
                          <img
                            src={mensaje.imagen}
                            alt={mensaje.titulo}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        </div>
                      )}

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg flex items-center gap-2">
                              {mensaje.titulo}
                              {mensaje.activo ? (
                                <Badge variant="default" className="ml-2">Activo</Badge>
                              ) : (
                                <Badge variant="secondary">Inactivo</Badge>
                              )}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                              {mensaje.descripcion}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatearFecha(mensaje.fechaCreacion)}
                          </div>
                          {mensaje.imagen && (
                            <div className="flex items-center gap-1">
                              <ImageIcon className="h-4 w-4" />
                              Imagen
                            </div>
                          )}
                          {mensaje.link && (
                            <div className="flex items-center gap-1">
                              <LinkIcon className="h-4 w-4" />
                              Enlace
                            </div>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2 mt-4">
                          <Button
                            size="sm"
                            variant={mensaje.activo ? 'outline' : 'default'}
                            onClick={() => handleToggleActivo(mensaje.id, mensaje.activo)}
                          >
                            {mensaje.activo ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Activar
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setMensajeAEliminar(mensaje.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />

      {/* Modal nuevo mensaje */}
      <NuevoMensajeModal
        open={modalNuevo}
        onOpenChange={setModalNuevo}
        onSuccess={cargarMensajes}
      />

      {/* Dialog confirmación eliminar */}
      <AlertDialog open={!!mensajeAEliminar} onOpenChange={() => setMensajeAEliminar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar mensaje?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El mensaje será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleEliminar}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
