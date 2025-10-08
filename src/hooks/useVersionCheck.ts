import { useEffect, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useVersionCheck = (checkInterval = 60000) => { // Check every 60 seconds
  const { toast } = useToast();
  const currentVersionRef = useRef<string | null>(null);
  const hasShownUpdateRef = useRef(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Add timestamp to prevent caching
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) return;
        
        const data = await response.json();
        const newVersion = data.version || data.timestamp;
        
        // Initialize on first check
        if (currentVersionRef.current === null) {
          currentVersionRef.current = newVersion;
          return;
        }
        
        // Check if version changed
        if (currentVersionRef.current !== newVersion && !hasShownUpdateRef.current) {
          hasShownUpdateRef.current = true;
          
          toast({
            title: "🎉 Nueva actualización disponible",
            description: "Hay una nueva versión del sistema. Haz clic para actualizar.",
            duration: 10000,
            onClick: () => window.location.reload(),
          });
        }
      } catch (error) {
        // Silently fail - don't bother users with version check errors
        console.debug('Version check failed:', error);
      }
    };

    // Check immediately on mount
    checkVersion();

    // Then check periodically
    const interval = setInterval(checkVersion, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval, toast]);
};
