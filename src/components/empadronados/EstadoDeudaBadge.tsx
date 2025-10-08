import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useDeudaAsociado } from '@/hooks/useDeudaAsociado';
import { Empadronado } from '@/types/empadronados';

interface EstadoDeudaBadgeProps {
  empadronado: Empadronado;
}

export const EstadoDeudaBadge: React.FC<EstadoDeudaBadgeProps> = ({ empadronado }) => {
  const { meses } = useDeudaAsociado(empadronado);

  // Determinar color y texto según meses de deuda
  const getEstado = () => {
    if (meses < 1) {
      return {
        variant: 'default' as const,
        className: 'bg-green-500 hover:bg-green-600 text-white',
        texto: 'Aportante'
      };
    } else if (meses >= 1 && meses < 3) {
      return {
        variant: 'secondary' as const,
        className: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        texto: 'Aportante'
      };
    } else {
      return {
        variant: 'destructive' as const,
        className: 'bg-red-500 hover:bg-red-600 text-white',
        texto: 'No Aportante'
      };
    }
  };

  const estado = getEstado();

  return (
    <Badge 
      variant={estado.variant}
      className={`${estado.className} text-[10px] md:text-xs font-semibold`}
    >
      {estado.texto}
    </Badge>
  );
};
