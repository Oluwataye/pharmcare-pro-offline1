import { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OfflineContextType {
  isOnline: boolean;
  lastOnlineTime: Date | null;
  serverStatus: 'connected' | 'disconnected' | 'checking';
  checkConnectivity: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) throw new Error('useOffline must be used within OfflineProvider');
  return context;
};

export const OfflineProvider = ({ children }: { children: ReactNode }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(new Date());
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('connected');
  const { toast } = useToast();

  const API_URL = `${window.location.protocol}//${window.location.hostname}:80/api/health`;
  const checkCount = useRef(0);
  const consecutiveFailures = useRef(0);

  const checkConnectivity = async () => {
    const currentCheck = ++checkCount.current;

    try {
      setServerStatus('checking');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(API_URL, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (currentCheck !== checkCount.current) return;

      if (response.ok) {
        consecutiveFailures.current = 0;
        setIsOnline(prev => {
          if (!prev) {
            toast({
              title: "System Online",
              description: "Connected to local database server.",
            });
          }
          return true;
        });
        setServerStatus('connected');
        setLastOnlineTime(new Date());
      } else {
        throw new Error('Server error');
      }
    } catch (error) {
      if (currentCheck !== checkCount.current) return;

      consecutiveFailures.current++;

      // Only set offline if we fail 2 times in a row (filter micro-hiccups)
      if (consecutiveFailures.current >= 2) {
        setIsOnline(prev => {
          if (prev) {
            toast({
              title: "Connection Lost",
              description: "Cannot reach local database server.",
              variant: "destructive",
            });
          }
          return false;
        });
        setServerStatus('disconnected');
      }
    }
  };

  useEffect(() => {
    checkConnectivity();
    const interval = setInterval(checkConnectivity, 15000); // 15s to reduce noise
    return () => clearInterval(interval);
  }, []);

  return (
    <OfflineContext.Provider value={{ isOnline, lastOnlineTime, serverStatus, checkConnectivity }}>
      {children}
    </OfflineContext.Provider>
  );
};
