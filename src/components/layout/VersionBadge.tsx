import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const VersionBadge = () => {
  const [version, setVersion] = useState<string>('');
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-cache',
        });
        if (response.ok) {
          const data = await response.json();
          setVersion(data.version || '1.0.0');
          setTimestamp(data.timestamp || '');
        }
      } catch (error) {
        console.debug('Could not fetch version info');
      }
    };

    fetchVersion();
  }, []);

  if (!version) return null;

  const formattedDate = timestamp 
    ? new Date(timestamp).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="text-[10px] px-1.5 py-0 h-5 cursor-help opacity-60 hover:opacity-100 transition-opacity"
          >
            v{version}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Versión {version}
            {formattedDate && <><br />Actualizado: {formattedDate}</>}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
