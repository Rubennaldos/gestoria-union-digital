import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Users, UserCheck, Shield, User, Building2, Car, Calendar } from "lucide-react";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { Empadronado } from "@/types/empadronados";
import { useEffect, useState } from "react";
import { obtenerMaestroObraPorId } from "@/services/acceso";

interface DetalleAutorizacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "visitante" | "trabajador" | "proveedor";
  data: RegistroVisita | RegistroTrabajadores | RegistroProveedor;
  empadronado?: Empadronado | null;
  fechaCreacion: number;
}

export const DetalleAutorizacionModal = ({
  open,
  onOpenChange,
  tipo,
  data,
  empadronado,
  fechaCreacion,
}: DetalleAutorizacionModalProps) => {
  const [maestroObra, setMaestroObra] = useState<any>(null);
  const [loadingMaestro, setLoadingMaestro] = useState(false);

  useEffect(() => {
    if (tipo === "trabajador" && open) {
      const trabajadorData = data as RegistroTrabajadores;
      
      // Si hay maestro temporal, usarlo directamente
      if (trabajadorData.maestroObraTemporal) {
        setMaestroObra(trabajadorData.maestroObraTemporal);
        setLoadingMaestro(false);
      } 
      // Si hay maestroObraId, buscar en la base de datos
      else if (trabajadorData.maestroObraId && trabajadorData.maestroObraId !== "temporal") {
        setLoadingMaestro(true);
        obtenerMaestroObraPorId(trabajadorData.maestroObraId)
          .then(setMaestroObra)
          .catch(console.error)
          .finally(() => setLoadingMaestro(false));
      } else {
        setMaestroObra(null);
        setLoadingMaestro(false);
      }
    }
  }, [tipo, data, open]);

  const getIcon = () => {
    switch (tipo) {
      case "visitante":
        return Users;
      case "trabajador":
        return UserCheck;
      case "proveedor":
        return Shield;
      default:
        return Users;
    }
  };

  const Icon = getIcon();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Icon className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle className="capitalize">Detalle de {tipo}</DialogTitle>
              <DialogDescription>
                Información completa de la solicitud
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Solicitante */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              Solicitado por
            </h4>
            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              {empadronado ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-sm text-muted-foreground">Nombre:</span>
                      <p className="font-medium">{empadronado.nombre} {empadronado.apellidos}</p>
                    </div>
                    <div>
                      <span className="text-sm text-muted-foreground">Padrón:</span>
                      <p className="font-medium">{empadronado.numeroPadron}</p>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm text-muted-foreground">Fecha de Solicitud:</span>
                    <p className="font-medium flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(fechaCreacion).toLocaleString()}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Información no disponible</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Información de Acceso */}
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Car className="h-4 w-4" />
              Tipo de Acceso
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-muted-foreground">Acceso:</span>
                <p className="font-medium capitalize">{(data as any).tipoAcceso}</p>
              </div>
              {(data as any).placa && (
                <div>
                  <span className="text-sm text-muted-foreground">Placa:</span>
                  <p className="font-medium uppercase">{(data as any).placa}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Detalles específicos por tipo */}
          {tipo === "visitante" && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Visitantes ({(data as RegistroVisita).visitantes?.length || 0})
              </h4>
              <div className="space-y-2">
                {(data as RegistroVisita).visitantes?.map((visitante, index) => (
                  <div
                    key={index}
                    className="bg-muted/50 p-3 rounded-lg flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div>
                        <p className="font-medium">{visitante.nombre}</p>
                        <p className="text-sm text-muted-foreground">DNI: {visitante.dni}</p>
                      </div>
                    </div>
                    {visitante.esMenor && (
                      <Badge variant="secondary">Menor</Badge>
                    )}
                  </div>
                ))}
                {(data as RegistroVisita).menores > 0 && (
                  <div className="bg-muted/30 p-3 rounded-lg">
                    <p className="text-sm">
                      <span className="font-medium">Menores adicionales:</span>{" "}
                      {(data as RegistroVisita).menores}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {tipo === "trabajador" && (
            <div className="space-y-4">
              {/* Información del Maestro de Obra */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Maestro de Obra
                </h4>
                {loadingMaestro ? (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">Cargando información...</p>
                  </div>
                ) : maestroObra ? (
                  <div className="bg-primary/10 p-4 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Nombre:</span>
                        <p className="font-medium">{maestroObra.nombre}</p>
                      </div>
                      {maestroObra.dni && (
                        <div>
                          <span className="text-sm text-muted-foreground">DNI:</span>
                          <p className="font-medium">{maestroObra.dni}</p>
                        </div>
                      )}
                    </div>
                    {maestroObra.telefono && (
                      <div>
                        <span className="text-sm text-muted-foreground">Teléfono:</span>
                        <p className="font-medium">{maestroObra.telefono}</p>
                      </div>
                    )}
                    {maestroObra.empresa && (
                      <div>
                        <span className="text-sm text-muted-foreground">Empresa:</span>
                        <p className="font-medium">{maestroObra.empresa}</p>
                      </div>
                    )}
                    {(data as RegistroTrabajadores).maestroObraTemporal && (
                      <Badge variant="secondary" className="mt-2">Registro Temporal</Badge>
                    )}
                  </div>
                ) : (
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Información del maestro de obra no disponible
                    </p>
                  </div>
                )}
              </div>

              {/* Lista de Trabajadores */}
              <div className="space-y-3">
                <h4 className="font-semibold flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Trabajadores Acompañantes ({(data as any).trabajadores?.length || 0})
                </h4>
                <div className="space-y-2">
                  {(data as any).trabajadores?.map((trabajador: any, index: number) => (
                    <div
                      key={index}
                      className="bg-muted/50 p-3 rounded-lg flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{trabajador.nombre}</p>
                          <p className="text-sm text-muted-foreground">DNI: {trabajador.dni}</p>
                        </div>
                      </div>
                      {trabajador.esMaestroObra && (
                        <Badge variant="secondary">Maestro de Obra</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tipo === "proveedor" && (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Información del Proveedor
              </h4>
              <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Empresa:</span>
                  <p className="font-medium text-lg">{(data as RegistroProveedor).empresa}</p>
                </div>
                {(data as RegistroProveedor).tipoServicio && (
                  <div>
                    <span className="text-sm text-muted-foreground">Tipo de Servicio:</span>
                    <p className="font-medium capitalize">
                      {(data as RegistroProveedor).tipoServicio}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
