import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TopNavigation, BottomNavigation } from '@/components/layout/Navigation';
import { NuevoItemModal } from '@/components/patrimonio/NuevoItemModal';
import { DetalleItemModal } from '@/components/patrimonio/DetalleItemModal';
import { ResumenPatrimonio as ResumenWidget } from '@/components/patrimonio/ResumenPatrimonio';
import { ItemPatrimonio, FiltrosPatrimonio, TipoVistaPatrimonio } from '@/types/patrimonio';
import { obtenerItems } from '@/services/patrimonio';
import { toast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Grid3X3, 
  List, 
  Table,
  Package,
  MapPin,
  User,
  Calendar,
  DollarSign,
  Wrench,
  Gift,
  AlertTriangle
} from 'lucide-react';

export default function Patrimonio() {
  const [items, setItems] = useState<ItemPatrimonio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<FiltrosPatrimonio>({});
  const [tipoVista, setTipoVista] = useState<TipoVistaPatrimonio>('tarjetas');
  const [modalNuevoOpen, setModalNuevoOpen] = useState(false);
  const [modalDetalleOpen, setModalDetalleOpen] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemPatrimonio | null>(null);

  const cargarItems = async () => {
    try {
      setLoading(true);
      const data = await obtenerItems(filtros);
      setItems(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los items del patrimonio",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarItems();
  }, [filtros]);

  const aplicarFiltro = (key: keyof FiltrosPatrimonio, value: any) => {
    setFiltros(prev => ({ ...prev, [key]: value }));
  };

  const limpiarFiltros = () => {
    setFiltros({});
  };

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'bueno': return 'bg-green-100 text-green-800';
      case 'regular': return 'bg-yellow-100 text-yellow-800';
      case 'malo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const obtenerColorCondicion = (condicion: string) => {
    switch (condicion) {
      case 'nuevo': return 'bg-blue-100 text-blue-800';
      case 'segunda': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const abrirDetalle = (item: ItemPatrimonio) => {
    setItemSeleccionado(item);
    setModalDetalleOpen(true);
  };

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(valor);
  };

  const renderTarjetas = () => (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <Card key={item.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => abrirDetalle(item)}>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">{item.nombre}</CardTitle>
                <CardDescription className="font-mono text-sm">{item.codigo}</CardDescription>
              </div>
              <div className="flex gap-1">
                {item.donacion.esDonacion && (
                  <Badge variant="outline" className="text-xs">
                    <Gift className="w-3 h-3 mr-1" />
                    Donación
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{item.ubicacion.zona}</span>
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>Cantidad: {item.cantidad}</span>
            </div>

            <div className="flex gap-2">
              <Badge className={obtenerColorEstado(item.estado.conservacion)}>
                {item.estado.conservacion}
              </Badge>
              <Badge className={obtenerColorCondicion(item.estado.condicion)}>
                {item.estado.condicion}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <DollarSign className="w-4 h-4 inline mr-1" />
                {formatearMoneda(item.donacion.esDonacion ? (item.donacion.valorAproximado || 0) : item.valorEstimado)}
              </div>
              {item.mantenimiento.requiere && (
                <Badge variant="outline" className="text-orange-600">
                  <Wrench className="w-3 h-3 mr-1" />
                  Mantenimiento
                </Badge>
              )}
            </div>

            <div className="text-xs text-muted-foreground">
              <User className="w-3 h-3 inline mr-1" />
              {item.responsable}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderLista = () => (
    <div className="space-y-2">
      {items.map((item) => (
        <Card key={item.id} className="cursor-pointer hover:shadow-sm transition-shadow" onClick={() => abrirDetalle(item)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <h3 className="font-medium truncate">{item.nombre}</h3>
                    <p className="text-sm text-muted-foreground truncate">{item.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={obtenerColorEstado(item.estado.conservacion)}>
                      {item.estado.conservacion}
                    </Badge>
                    <span className="text-sm font-mono">{item.codigo}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="text-right">
                  <div className="text-sm font-medium">
                    {formatearMoneda(item.donacion.esDonacion ? (item.donacion.valorAproximado || 0) : item.valorEstimado)}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.ubicacion.zona}</div>
                </div>
                {item.mantenimiento.requiere && (
                  <Wrench className="w-4 h-4 text-orange-500" />
                )}
                {item.donacion.esDonacion && (
                  <Gift className="w-4 h-4 text-blue-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 pb-24 md:pb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Patrimonio e Inventario</h1>
            <p className="text-muted-foreground">Gestión completa del patrimonio del consorcio</p>
          </div>
          <Button onClick={() => setModalNuevoOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Item
          </Button>
        </div>

        <Tabs defaultValue="inventario" className="space-y-6">
          <TabsList>
            <TabsTrigger value="inventario">Inventario</TabsTrigger>
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen">
            <ResumenWidget />
          </TabsContent>

          <TabsContent value="inventario" className="space-y-6">
            {/* Filtros */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar items..."
                      value={filtros.busqueda || ''}
                      onChange={(e) => aplicarFiltro('busqueda', e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <Select value={filtros.estado || 'todos'} onValueChange={(value) => aplicarFiltro('estado', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="bueno">Bueno</SelectItem>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="malo">Malo</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filtros.condicion || 'todos'} onValueChange={(value) => aplicarFiltro('condicion', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Condición" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todas las condiciones</SelectItem>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="segunda">Segunda</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={limpiarFiltros}>
                      Limpiar
                    </Button>
                    <div className="flex gap-1">
                      <Button
                        variant={tipoVista === 'tarjetas' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTipoVista('tarjetas')}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={tipoVista === 'lista' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setTipoVista('lista')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Lista de items */}
            <div className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2">Cargando items...</p>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">No hay items registrados</h3>
                    <p className="text-muted-foreground mb-4">
                      Comienza agregando el primer item al inventario del patrimonio.
                    </p>
                    <Button onClick={() => setModalNuevoOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Agregar Primer Item
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {items.length} item{items.length !== 1 ? 's' : ''} encontrado{items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {tipoVista === 'tarjetas' ? renderTarjetas() : renderLista()}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />

      <NuevoItemModal
        open={modalNuevoOpen}
        onOpenChange={setModalNuevoOpen}
        onSuccess={cargarItems}
      />

      <DetalleItemModal
        open={modalDetalleOpen}
        onOpenChange={setModalDetalleOpen}
        item={itemSeleccionado}
        onSuccess={cargarItems}
      />
    </div>
  );
}