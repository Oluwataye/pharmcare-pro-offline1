import { useState, useEffect, useCallback } from 'react';
import { db } from "@/lib/db-client";
import { useToast } from '@/hooks/use-toast';

export interface StoreSettings {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  print_show_logo: boolean;
  print_show_address: boolean;
  print_show_email: boolean;
  print_show_phone: boolean;
  print_show_footer: boolean;
  discount_config: any | null; // Flexible JSON for discounts
}

// Global cache for store settings
let cachedSettings: StoreSettings | null = null;
let cacheTimestamp: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Listeners for cache invalidation
const listeners = new Set<() => void>();

export const invalidateStoreSettingsCache = () => {
  cachedSettings = null;
  cacheTimestamp = null;
  listeners.forEach(listener => listener());
};

const DEFAULT_SETTINGS: StoreSettings = {
  id: 'default',
  name: 'PharmaCare Pro',
  address: 'Address Not Set',
  phone: 'Phone Not Set',
  email: 'Email Not Set',
  logo_url: null,
  print_show_logo: true,
  print_show_address: true,
  print_show_email: true,
  print_show_phone: true,
  print_show_footer: true,
  discount_config: {
    manualAmountEnabled: false,
    defaultDiscount: 0,
    maxDiscount: 20,
    enabled: true
  }
};

export const useStoreSettings = () => {
  const { toast } = useToast();
  // Initialize with defaults if cache is missing to prevent UI blocking
  const [settings, setSettings] = useState<StoreSettings>(cachedSettings || DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(!cachedSettings);
  const [error, setError] = useState<Error | null>(null);

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    // Use cache if valid and not forcing refresh
    if (!forceRefresh && cachedSettings && cacheTimestamp) {
      const age = Date.now() - cacheTimestamp;
      if (age < CACHE_DURATION) {
        setSettings(cachedSettings);
        setIsLoading(false);
        return cachedSettings;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await db
        .from('store_settings')
        .select('*')
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        const result = data[0] as StoreSettings;
        // Robustly handle JSON column if it comes back as a string
        if (result.discount_config && typeof result.discount_config === 'string') {
          try {
            result.discount_config = JSON.parse(result.discount_config);
          } catch (e) {
            console.error('Failed to parse discount_config', e);
          }
        }
        cachedSettings = result;
        cacheTimestamp = Date.now();
        setSettings(cachedSettings);
        return cachedSettings;
      }

      // If no data (e.g. RLS block), use default settings but don't cache globally
      // so that if a higher-privileged user logs in, they get the real ones.
      setSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch store settings');
      setError(error);
      console.error('Error fetching store settings:', error);

      // If error (e.g. network), also use defaults
      setSettings(DEFAULT_SETTINGS);

      // Don't show toast on mount, only on explicit refresh
      if (forceRefresh) {
        toast({
          title: 'Error',
          description: 'Failed to load store settings',
          variant: 'destructive',
        });
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const refresh = useCallback(() => {
    return fetchSettings(true);
  }, [fetchSettings]);

  useEffect(() => {
    fetchSettings();

    // Register listener for cache invalidation
    const listener = () => {
      fetchSettings(true);
    };
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, [fetchSettings]);

  return {
    settings,
    isLoading,
    error,
    refresh,
  };
};
