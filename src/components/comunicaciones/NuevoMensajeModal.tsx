import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { crearMensajeMasivo } from '@/services/comunicaciones';
import { uploadFileAndGetURL } from '@/services/FileStorageService';
import { CreateMensajeMasivoForm, FUENTES_DISPONIBLES } from '@/types/comunicaciones';
import { Loader2, Upload, X, Type, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface NuevoMensajeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NuevoMensajeModal: React.FC<NuevoMensajeModalProps> = ({
  open,
  onOpenChange,
  onSuccess
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string>('');
  const [imagenFile, setImagenFile] = useState<File | null>(null);
  
  const [formData, setFormData] = useState<CreateMensajeMasivoForm>({
    titulo: '',
    descripcion: '',
    imagen: '',
    link: '',
    estiloTexto: {
      fuente: 'Inter',
      tamano: 16,
      color: '#000000',
      negrita: false,
      cursiva: false,
      alineacion: 'left'
    }
  });

  const handleImagenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona una imagen válida');
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 5MB');
        return;
      }

      setImagenFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagenPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      toast.error('Debes iniciar sesión');
      return;
    }

    if (!formData.titulo.trim() || !formData.descripcion.trim()) {
      toast.error('Completa los campos obligatorios');
      return;
    }

    setLoading(true);

    try {
      let imagenUrl = formData.imagen;

      // Subir imagen si hay una seleccionada
      if (imagenFile) {
        imagenUrl = await uploadFileAndGetURL(imagenFile, 'comunicaciones');
      }

      const nuevoMensaje: CreateMensajeMasivoForm = {
        ...formData,
        imagen: imagenUrl
      };

      await crearMensajeMasivo(user.uid, nuevoMensaje);
      
      toast.success('Mensaje masivo creado exitosamente');
      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creando mensaje:', error);
      toast.error('Error al crear el mensaje');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      imagen: '',
      link: '',
      estiloTexto: {
        fuente: 'Inter',
        tamano: 16,
        color: '#000000',
        negrita: false,
        cursiva: false,
        alineacion: 'left'
      }
    });
    setImagenPreview('');
    setImagenFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Mensaje Masivo</DialogTitle>
          <DialogDescription>
            Crea un mensaje que se mostrará a todos los vecinos cuando ingresen al portal
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información básica */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Título del mensaje"
                required
              />
            </div>

            <div>
              <Label htmlFor="descripcion">Descripción *</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Contenido del mensaje"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="link">Link (opcional)</Label>
              <Input
                id="link"
                type="url"
                value={formData.link}
                onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                placeholder="https://ejemplo.com"
              />
            </div>
          </div>

          {/* Imagen */}
          <div>
            <Label>Imagen (JPG o PNG)</Label>
            <div className="mt-2">
              {imagenPreview ? (
                <div className="relative">
                  <img 
                    src={imagenPreview} 
                    alt="Preview" 
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setImagenPreview('');
                      setImagenFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent/50 transition-colors">
                  <Upload className="h-12 w-12 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Click para subir imagen
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png"
                    onChange={handleImagenChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Estilos de texto */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold flex items-center gap-2">
              <Type className="h-5 w-5" />
              Personalizar Texto
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fuente">Fuente</Label>
                <Select
                  value={formData.estiloTexto.fuente}
                  onValueChange={(value) => 
                    setFormData({
                      ...formData,
                      estiloTexto: { ...formData.estiloTexto, fuente: value }
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUENTES_DISPONIBLES.map((fuente) => (
                      <SelectItem key={fuente.value} value={fuente.value}>
                        {fuente.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="color">Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.estiloTexto.color}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estiloTexto: { ...formData.estiloTexto, color: e.target.value }
                      })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.estiloTexto.color}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        estiloTexto: { ...formData.estiloTexto, color: e.target.value }
                      })
                    }
                    placeholder="#000000"
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label>Tamaño: {formData.estiloTexto.tamano}px</Label>
                <Slider
                  value={[formData.estiloTexto.tamano]}
                  onValueChange={([value]) =>
                    setFormData({
                      ...formData,
                      estiloTexto: { ...formData.estiloTexto, tamano: value }
                    })
                  }
                  min={12}
                  max={32}
                  step={1}
                  className="mt-2"
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Negrita</Label>
                  <Switch
                    checked={formData.estiloTexto.negrita}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        estiloTexto: { ...formData.estiloTexto, negrita: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Cursiva</Label>
                  <Switch
                    checked={formData.estiloTexto.cursiva}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        estiloTexto: { ...formData.estiloTexto, cursiva: checked }
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <Label>Alineación</Label>
              <div className="flex gap-2 mt-2">
                {[
                  { value: 'left' as const, icon: AlignLeft },
                  { value: 'center' as const, icon: AlignCenter },
                  { value: 'right' as const, icon: AlignRight }
                ].map(({ value, icon: Icon }) => (
                  <Button
                    key={value}
                    type="button"
                    variant={formData.estiloTexto.alineacion === value ? 'default' : 'outline'}
                    size="icon"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        estiloTexto: { ...formData.estiloTexto, alineacion: value }
                      })
                    }
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Vista previa */}
          <div className="p-4 border rounded-lg bg-muted/30">
            <Label className="mb-2 block">Vista Previa</Label>
            <div
              style={{
                fontFamily: formData.estiloTexto.fuente,
                textAlign: formData.estiloTexto.alineacion
              }}
            >
              <h3
                style={{
                  color: formData.estiloTexto.color,
                  fontSize: `${formData.estiloTexto.tamano + 8}px`,
                  fontWeight: formData.estiloTexto.negrita ? 'bold' : 'normal',
                  fontStyle: formData.estiloTexto.cursiva ? 'italic' : 'normal',
                  marginBottom: '0.5rem'
                }}
              >
                {formData.titulo || 'Título del mensaje'}
              </h3>
              <p
                style={{
                  color: formData.estiloTexto.color,
                  fontSize: `${formData.estiloTexto.tamano}px`,
                  fontWeight: formData.estiloTexto.negrita ? 'bold' : 'normal',
                  fontStyle: formData.estiloTexto.cursiva ? 'italic' : 'normal'
                }}
              >
                {formData.descripcion || 'Descripción del mensaje'}
              </p>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear Mensaje'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
