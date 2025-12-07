import { Loader2 } from "lucide-react";

interface LoadingSpinnerProps {
  mensaje?: string;
  submensaje?: string;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  progress?: number;
}

export function LoadingSpinner({ 
  mensaje = "Cargando...", 
  submensaje,
  size = 'md',
  showProgress = false,
  progress = 0
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      {/* Spinner animado con pulso */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <Loader2 className={`${sizeClasses[size]} text-primary animate-spin relative z-10`} />
      </div>
      
      {/* Mensaje principal */}
      <p className={`${textSizes[size]} font-medium text-foreground animate-pulse`}>
        {mensaje}
      </p>
      
      {/* Submensaje */}
      {submensaje && (
        <p className="text-sm text-muted-foreground">
          {submensaje}
        </p>
      )}
      
      {/* Barra de progreso opcional */}
      {showProgress && (
        <div className="w-48 space-y-1">
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">{progress}%</p>
        </div>
      )}
      
      {/* Indicador de actividad (puntos animados) */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
}

// Componente de pantalla completa de carga
export function FullPageLoading({ 
  mensaje = "Cargando datos...",
  submensaje
}: { 
  mensaje?: string;
  submensaje?: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner mensaje={mensaje} submensaje={submensaje} size="lg" />
    </div>
  );
}

// Skeleton loader para tablas
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3 p-4">
      {/* Header skeleton */}
      <div className="flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-muted rounded animate-pulse flex-1" />
        ))}
      </div>
      
      {/* Rows skeleton */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div 
              key={colIndex} 
              className="h-8 bg-muted rounded animate-pulse flex-1"
              style={{ animationDelay: `${(rowIndex * columns + colIndex) * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="h-4 bg-muted rounded w-1/2 animate-pulse" />
      <div className="h-8 bg-muted rounded w-3/4 animate-pulse" />
      <div className="h-3 bg-muted rounded w-1/4 animate-pulse" />
    </div>
  );
}

