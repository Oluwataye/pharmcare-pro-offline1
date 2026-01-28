import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface OfflineContextType {
  isOnline: boolean; // Now represents "Local Server Reachable"
  lastOnlineTime: Date | null;
  serverStatus: 'connected' | 'disconnected' | 'checking';
  checkConnectivity: () => Promise<void>;
}

const defaultOfflineContext: OfflineContextType = {
  isOnline: true,
  lastOnlineTime: new Date(),
  serverStatus: 'connected',
  checkConnectivity: async () => { },
};

const OfflineContext = createContext<OfflineContextType>(defaultOfflineContext);

export const useOffline = () => useContext(OfflineContext);

interface OfflineProviderProps {
  children: ReactNode;
}

export const OfflineProvider = ({ children }: OfflineProviderProps) => {
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnlineTime, setLastOnlineTime] = useState<Date | null>(new Date());
  const [serverStatus, setServerStatus] = useState<'connected' | 'disconnected' | 'checking'>('connected');
  const { toast } = useToast();

  const API_URL = `${window.location.protocol}//${window.location.hostname}:80/api/health`;

  const checkConnectivity = async () => {
    try {
      setServerStatus('checking');
      // Timeout after 2 seconds to fail fast
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);

      const response = await fetch(API_URL, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(id);

      if (response.ok) {
        if (!isOnline) {
          console.log('[Offline Context] Reconnected to local server.');
          toast({
            title: "System Online",
            description: "Connected to local database server.",
          });
        }
        setIsOnline(true);
        setServerStatus('connected');
        setLastOnlineTime(new Date());
      } else {
        throw new Error('Server returned error');
      }
    } catch (error) {
      if (isOnline) {
        console.warn('[Offline Context] Lost connection to local server.');
        toast({
          title: "Connection Lost",
          description: "Cannot reach local database server. Please check if the server is running.",
          variant: "destructive",
        });
      }
      setIsOnline(false);
      setServerStatus('disconnected');
    }
  };

  // Initial Check
  useEffect(() => {
    checkConnectivity();
  }, []);

  // Periodic Heartbeat (every 10 seconds)
  useEffect(() => {
    const interval = setInterval(checkConnectivity, 10000);
    return () => clearInterval(interval);
  }, [isOnline]); // Dep on isOnline to avoid stale closure if we expanded logic

  return (
    <OfflineContext.Provider
      value={{
        isOnline,
        lastOnlineTime,
        serverStatus,
        checkConnectivity,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
};
