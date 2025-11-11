import React, { useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { es } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { NuevaReservaModal } from './NuevaReservaModal';
import { Cancha } from '@/types/deportes';

type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: any;
};

interface CalendarioDeportesProps {
  events: CalendarEvent[];
  canchas: Cancha[];
  onSelectEvent?: (event: CalendarEvent) => void;
  onSuccess?: () => void;
}

const locales = { es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export const CalendarioDeportes: React.FC<CalendarioDeportesProps> = ({ events, canchas, onSelectEvent, onSuccess }) => {
  const [openNueva, setOpenNueva] = useState(false);
  const [prefilled, setPrefilled] = useState<{ start: Date; end: Date } | null>(null);

  const handleSelectSlot = (slotInfo: any) => {
    try {
      const start = slotInfo.start as Date;
      const end = slotInfo.end as Date;
      setPrefilled({ start, end });
      setOpenNueva(true);
    } catch (err) {
      console.error('Error handling slot select', err);
    }
  };

  return (
    <div className="mb-8">
      {/* Carga: mostrar indicador si no hay canchas cargadas aún */}
      {(!canchas || canchas.length === 0) ? (
        <div className="p-6 bg-muted/10 rounded-lg text-center">
          <div className="animate-pulse">
            <div className="h-6 w-48 mx-auto mb-2 bg-muted rounded" />
            <div className="text-sm text-muted-foreground">Cargando calendario...</div>
          </div>
        </div>
      ) : (
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          onSelectEvent={onSelectEvent as any}
          selectable
          onSelectSlot={handleSelectSlot as any}
          defaultView="week"
          views={["week", "day", "agenda"]}
          min={new Date(0, 0, 0, 7, 0, 0)}
          max={new Date(0, 0, 0, 21, 0, 0)}
          style={{ height: '70vh' }}
          popup
        />
      )}

      <NuevaReservaModal
        open={openNueva}
        onOpenChange={setOpenNueva}
        canchas={canchas}
        onSuccess={() => {
          setOpenNueva(false);
          setPrefilled(null);
          if (onSuccess) onSuccess();
        }}
        prefilledData={prefilled || undefined}
      />
    </div>
  );
};

export default CalendarioDeportes;
