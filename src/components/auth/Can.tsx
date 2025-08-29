import React from 'react';
import { useAuthz } from '@/contexts/AuthzContext';
import { PermissionLevel } from '@/types/auth';

interface CanProps {
  module: string;
  level: PermissionLevel;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({ module, level, children, fallback = null }) => {
  const { can } = useAuthz();

  if (can(module, level)) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
};