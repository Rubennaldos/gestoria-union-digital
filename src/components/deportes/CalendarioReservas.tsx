import { useState, useEffect, useMemo } from 'react';
import { Calendar, momentLocalizer, View, Views } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Cancha, Reserva } from '@/types/deportes';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

// Configurar moment para español
moment.locale('es');
const localizer = momentLocalizer(moment);

interface CalendarioReservasProps {
  canchas: Cancha[];
  reservas: Reserva[];
  onReservaClick: (reserva: Reserva) => void;
  onNuevaReserva: (fechaInicio?: Date, fechaFin?: Date) => void;
  onReservaUpdate: () => void;
}

interface EventoCalendario {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: string;
  reserva: Reserva;
  color: string;
}

export const CalendarioReservas = ({
  canchas,
  reservas,
  onReservaClick,
  onNuevaReserva,
  onReservaUpdate
}: CalendarioReservasProps) => {
  const [vista, setVista] = useState<View>(Views.WEEK);
  const [fecha, setFecha] = useState(new Date());

  // Convertir reservas a eventos del calendario
  const eventos: EventoCalendario[] = useMemo(() => {
    return reservas.map(reserva => {
      const cancha = canchas.find(c => c.id === reserva.canchaId);
      let color = '#6b7280'; // gris por defecto
      
      switch (reserva.estado) {
        case 'pendiente':
          color = '#eab308'; // amarillo
          break;
        case 'pagado':
          color = '#22c55e'; // verde
          break;
        case 'completado':
          color = '#3b82f6'; // azul
          break;
        case 'cancelado':
          color = '#ef4444'; // rojo
          break;
        case 'no-show':
          color = '#6b7280'; // gris
          break;
      }

      return {
        id: reserva.id,
        title: `${reserva.nombreCliente} ${reserva.esAportante ? '(A)' : ''}`,
        start: new Date(reserva.fechaInicio),
        end: new Date(reserva.fechaFin),
        resource: reserva.canchaId,
        reserva,
        color
      };
    });
  }, [reservas, canchas]);

  // Recursos (canchas) para el calendario
  const recursos = useMemo(() => {
    return canchas.map(cancha => ({
      resourceId: cancha.id,
      resourceTitle: `${cancha.nombre} (${cancha.ubicacion === 'boulevard' ? 'Boulevard' : 'Quinta Llana'})`
    }));
  }, [canchas]);

  const handleSelectSlot = ({ start, end, resource }: { start: Date; end: Date; resource?: string }) => {
    onNuevaReserva(start, end);
  };

  const handleSelectEvent = (evento: EventoCalendario) => {
    onReservaClick(evento.reserva);
  };

  const EventComponent = ({ event }: { event: EventoCalendario }) => (
    <div
      className="p-1 text-xs text-white rounded cursor-pointer hover:opacity-80 transition-opacity"
      style={{ backgroundColor: event.color }}
      title={`${event.reserva.nombreCliente} - ${event.reserva.estado} - S/${event.reserva.precio.total}`}
    >
      <div className="font-medium truncate">{event.title}</div>
      <div className="text-xs opacity-90">
        S/{event.reserva.precio.total} - {event.reserva.estado}
      </div>
    </div>
  );

  const messages = {
    allDay: 'Todo el día',
    previous: 'Anterior',
    next: 'Siguiente',
    today: 'Hoy',
    month: 'Mes',
    week: 'Semana',
    day: 'Día',
    agenda: 'Agenda',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    noEventsInRange: 'No hay reservas en este rango',
    showMore: (total: number) => `+ Ver ${total} más`
  };

  return (
    <div className="w-full space-y-4">
      {/* Controles del calendario */}
      <div className="flex flex-col gap-3 md:gap-0 md:flex-row md:justify-between md:items-center">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFecha(moment(fecha).subtract(1, vista === Views.DAY ? 'day' : 'week').toDate())}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Button
            variant="outline" 
            size="sm"
            onClick={() => setFecha(new Date())}
          >
            Hoy
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFecha(moment(fecha).add(1, vista === Views.DAY ? 'day' : 'week').toDate())}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          <span className="font-medium text-sm md:text-base ml-2">
            {moment(fecha).format(vista === Views.DAY ? 'dddd, D [de] MMMM' : 'MMMM YYYY')}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={vista === Views.DAY ? "default" : "outline"}
            size="sm"
            onClick={() => setVista(Views.DAY)}
          >
            <CalendarIcon className="h-4 w-4 mr-1" />
            Día
          </Button>
          
          <Button
            variant={vista === Views.WEEK ? "default" : "outline"}
            size="sm"
            onClick={() => setVista(Views.WEEK)}
          >
            <Clock className="h-4 w-4 mr-1" />
            Semana
          </Button>
        </div>
      </div>

      {/* Calendario */}
      <div className="border rounded-lg overflow-auto bg-white" style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={eventos}
          resources={recursos}
          resourceIdAccessor="resourceId"
          resourceTitleAccessor="resourceTitle"
          startAccessor="start"
          endAccessor="end"
          titleAccessor="title"
          view={vista}
          onView={setVista}
          date={fecha}
          onNavigate={setFecha}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          selectable
          components={{
            event: EventComponent
          }}
          messages={messages}
          min={new Date(2023, 0, 1, 6, 0)} // 6:00 AM
          max={new Date(2023, 0, 1, 22, 0)} // 10:00 PM
          step={30}
          timeslots={2}
          style={{ height: '100%', minHeight: '500px' }}
          formats={{
            timeGutterFormat: 'HH:mm',
            eventTimeRangeFormat: ({ start, end }) => 
              `${moment(start).format('HH:mm')} - ${moment(end).format('HH:mm')}`
          }}
        />
      </div>

      {/* Ayuda */}
      <div className="text-sm text-muted-foreground space-y-1">
        <p>💡 <strong>Tip:</strong> Haz clic en un espacio libre para crear una nueva reserva, o haz clic en una reserva existente para editarla.</p>
        <p>📋 <strong>Leyenda:</strong> (A) = Aportante</p>
      </div>
    </div>
  );
};