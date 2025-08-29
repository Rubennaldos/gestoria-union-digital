import React from 'react';
import { PermissionLevel } from '@/types/auth';
import { cn } from '@/lib/utils';
import { Shield, Eye, Edit, CheckCircle, Crown } from 'lucide-react';

interface PermissionSelectorProps {
  value: PermissionLevel;
  onChange: (level: PermissionLevel) => void;
  disabled?: boolean;
  showAdmin?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const PERMISSION_CONFIG = {
  none: {
    label: 'Sin acceso',
    icon: Shield,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/30'
  },
  read: {
    label: 'Lectura',
    icon: Eye,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200'
  },
  write: {
    label: 'Escritura',
    icon: Edit,
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200'
  },
  approve: {
    label: 'Aprobación',
    icon: CheckCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200'
  },
  admin: {
    label: 'Administrador',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200'
  }
};

export const PermissionSelector: React.FC<PermissionSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showAdmin = false,
  size = 'md'
}) => {
  const levels: PermissionLevel[] = showAdmin 
    ? ['none', 'read', 'write', 'approve', 'admin']
    : ['none', 'read', 'write', 'approve'];

  const sizeClasses = {
    sm: 'p-2 text-xs',
    md: 'p-3 text-sm',
    lg: 'p-4 text-base'
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {levels.map((level) => {
          const config = PERMISSION_CONFIG[level];
          const Icon = config.icon;
          const isSelected = value === level;

          return (
            <button
              key={level}
              type="button"
              onClick={() => !disabled && onChange(level)}
              disabled={disabled}
              className={cn(
                'relative flex items-center justify-center gap-2 rounded-lg border-2 transition-all duration-200',
                'hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20',
                sizeClasses[size],
                isSelected 
                  ? cn(config.bgColor, 'border-current ring-2 ring-primary/20')
                  : 'bg-background border-border hover:border-muted-foreground/30',
                disabled && 'opacity-50 cursor-not-allowed hover:scale-100 hover:shadow-none',
                config.color
              )}
            >
              <Icon className={cn(
                size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-5 h-5'
              )} />
              <span className="font-medium">{config.label}</span>
              
              {isSelected && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};