
import { useToast } from '@/hooks/use-toast';
import { useOffline } from '@/contexts/OfflineContext';
import { useOfflineData } from '@/hooks/useOfflineData';
import { SaleItem } from '@/types/sales';
import { customerInfoSchema, validateAndSanitize } from '@/lib/validation';
import { secureStorage } from '@/lib/secureStorage';
import { db } from "@/lib/db-client";

interface CompleteSaleOptions {
  customerName?: string;
  customerPhone?: string;
  businessName?: string;
  businessAddress?: string;
  saleType: 'retail' | 'wholesale';
  cashierName?: string;
  cashierEmail?: string;
  cashierId?: string;
  transactionId?: string;
  payments?: { mode: string; amount: number }[];
}

export const useSalesCompletion = (
  items: SaleItem[],
  calculateTotal: () => number,
  discount: number,
  manualDiscount: number,
  clearItems: () => void,
  clearDiscount: () => void,
  resetSaleType: () => void
) => {
  const { toast } = useToast();
  const { isOnline } = useOffline();
  const { createOfflineItem } = useOfflineData();

  const completeSale = async (options?: CompleteSaleOptions) => {
    console.log(`[Sales Completion] Start. isOnline: ${isOnline}, Items: ${items.length}`);
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Cannot complete sale with no items",
        variant: "destructive",
      });
      return false;
    }

    const currentSaleType = options?.saleType || 'retail';
    const transactionId = options?.transactionId || `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    try {
      // Validate customer information
      if (options) {
        const customerValidation = validateAndSanitize(customerInfoSchema, {
          customerName: options.customerName,
          customerPhone: options.customerPhone,
          businessName: options.businessName,
          businessAddress: options.businessAddress
        });

        if (!customerValidation.success) {
          toast({
            title: "Validation Error",
            description: customerValidation.error,
            variant: "destructive",
          });
          return false;
        }
      }

      const saleData = {
        items: [...items],
        total: calculateTotal(),
        discount: discount,
        manualDiscount: manualDiscount,
        customerName: options?.customerName,
        customerPhone: options?.customerPhone,
        businessName: options?.businessName,
        businessAddress: options?.businessAddress,
        cashierName: options?.cashierName,
        cashierEmail: options?.cashierEmail,
        cashierId: options?.cashierId,
        user_id: options?.cashierId,
        transactionId,
        saleType: currentSaleType,
        payments: options?.payments || [{ mode: 'cash', amount: calculateTotal() }]
      };

      // If offline, save this sale for later sync
      // CRITICAL: In standalone mode, we are ALWAYS online relative to our local server
      const IS_STANDALONE = import.meta.env.VITE_APP_MODE === 'offline' || window.location.hostname === 'localhost';

      if (!isOnline && !IS_STANDALONE) {
        createOfflineItem('sales', saleData);
        toast({
          title: "Offline Sale Completed",
          description: `${currentSaleType === 'wholesale' ? 'Wholesale' : 'Retail'} sale has been saved offline and will sync when you're back online`,
        });
      } else {
        try {
          // Complete sale online via edge function
          console.log('[Sales Completion] Invoking complete-sale...', saleData);
          const { data, error } = await db.functions.invoke('complete-sale', {
            body: saleData
          });

          if (error) throw error;
          if (!data || !data.success) throw new Error('Sale completion failed');

          toast({
            title: `${currentSaleType === 'wholesale' ? 'Wholesale' : 'Retail'} Sale Completed`,
            description: `Transaction ID: ${data.transactionId}`,
          });

          // Cleanup
          clearItems();
          clearDiscount();
          resetSaleType();
          secureStorage.removeItem('CURRENT_SALE_ITEMS');
          secureStorage.removeItem('CURRENT_SALE_DISCOUNT');
          secureStorage.removeItem('CURRENT_SALE_TYPE');

          return {
            success: true,
            saleId: data.saleId,
            transactionId: data.transactionId || transactionId
          };

        } catch (onlineError) {
          console.warn('Online sale completion failed, falling back to offline mode:', onlineError);
          // Fallback to offline save
          createOfflineItem('sales', saleData);

          toast({
            title: "Saved Offline (Network Issue)",
            description: "Connection unstable. Sale saved offline and will sync automatically.",
            variant: "default"
          });

          // Cleanup
          clearItems();
          clearDiscount();
          resetSaleType();
          secureStorage.removeItem('CURRENT_SALE_ITEMS');
          secureStorage.removeItem('CURRENT_SALE_DISCOUNT');
          secureStorage.removeItem('CURRENT_SALE_TYPE');

          return { success: true, saleId: transactionId, transactionId, isOffline: true };
        }
      }

      // Cleanup for offline mode - this part seems unreachable due to the if/else above but kept for safety
      clearItems();
      clearDiscount();
      resetSaleType();
      secureStorage.removeItem('CURRENT_SALE_ITEMS');
      secureStorage.removeItem('CURRENT_SALE_DISCOUNT');
      secureStorage.removeItem('CURRENT_SALE_TYPE');

      return { success: true, saleId: transactionId, transactionId, isOffline: true };
    } catch (error) {
      console.error('Sale completion error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete sale",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  return { completeSale, isOfflineMode: !isOnline };
};
