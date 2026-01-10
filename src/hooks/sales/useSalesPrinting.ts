
import { useToast } from '@/hooks/use-toast';
import { printReceipt, PrintReceiptProps, PrintError, openPrintWindow } from '@/utils/receiptPrinter';
import { SaleItem } from '@/types/sales';
import { db } from "@/lib/db-client";
import { useState, useCallback } from 'react';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { logPrintAnalytics } from '@/utils/printAnalytics';

interface HandlePrintOptions {
  customerName?: string;
  customerPhone?: string;
  cashierName?: string;
  cashierEmail?: string;
  businessName?: string;
  businessAddress?: string;
  cashierId?: string;
  saleId?: string;
  items?: SaleItem[];
  directPrint?: boolean;
  existingWindow?: Window | null; // Pass an already opened window to preserve user gesture
}

export const useSalesPrinting = (
  items: SaleItem[],
  discount: number,
  manualDiscount: number,
  saleType: 'retail' | 'wholesale'
) => {
  const { toast } = useToast();
  const { settings: storeSettings, isLoading: isLoadingSettings } = useStoreSettings();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PrintReceiptProps | null>(null);



  const executePrint = useCallback(async (customData?: PrintReceiptProps, windowRef?: Window | null) => {
    const dataToPrint = customData || previewData;
    if (!dataToPrint) return;

    const startTime = Date.now();
    let printStatus: 'success' | 'failed' | 'cancelled' = 'success';
    let errorType: string | undefined;
    let errorMessage: string | undefined;

    console.log('[executePrint] Starting print execution with saleId:', dataToPrint.saleId);

    try {
      // Use the provided windowRef if available, otherwise printReceipt will try to open a new one
      console.log('[executePrint] Calling printReceipt...');
      const success = await printReceipt(dataToPrint, windowRef);
      console.log('[executePrint] printReceipt returned:', success);

      if (!success) {
        printStatus = 'cancelled';
        throw new Error("Print operation failed");
      }

      const duration = Date.now() - startTime;

      // Log successful print
      const calculatedTotal = dataToPrint.items.reduce((sum, item) => {
        const itemTotal = typeof item.total === 'number' ? item.total : (Number(item.price) * Number(item.quantity) || 0);
        return sum + itemTotal;
      }, 0) - (dataToPrint.discount || 0);

      console.log('[executePrint] Calling logPrintAnalytics with saleId:', dataToPrint.saleId);
      await logPrintAnalytics({
        saleId: dataToPrint.saleId,
        cashierId: dataToPrint.cashierId,
        cashierName: dataToPrint.cashierName,
        customerName: dataToPrint.customerName,
        printStatus: 'success',
        printDurationMs: duration,
        isReprint: false,
        saleType: dataToPrint.saleType,
        totalAmount: calculatedTotal,
      });
      console.log('[executePrint] logPrintAnalytics completed successfully');

      setShowPreview(false);
      toast({
        title: "Receipt Printed",
        description: "The receipt has been sent to the printer successfully.",
      });
    } catch (error: any) {
      console.error("Error printing receipt:", error);

      if (error?.type === PrintError.POPUP_BLOCKED) {
        printStatus = 'failed';
        errorType = 'POPUP_BLOCKED';
        errorMessage = "Popup blocked";
      } else if (error instanceof Error) {
        printStatus = 'failed';
        errorType = 'UNKNOWN';
        errorMessage = error.message;
      }

      const duration = Date.now() - startTime;

      const calculatedTotalErr = dataToPrint.items.reduce((sum, item) => {
        const itemTotal = typeof item.total === 'number' ? item.total : (Number(item.price) * Number(item.quantity) || 0);
        return sum + itemTotal;
      }, 0) - (dataToPrint.discount || 0);

      await logPrintAnalytics({
        saleId: dataToPrint.saleId,
        cashierId: dataToPrint.cashierId,
        cashierName: dataToPrint.cashierName,
        customerName: dataToPrint.customerName,
        printStatus,
        errorType,
        errorMessage,
        printDurationMs: duration,
        isReprint: false,
        saleType: dataToPrint.saleType,
        totalAmount: calculatedTotalErr,
      });

      toast({
        title: errorType === 'POPUP_BLOCKED' ? "🖨️ Printer Window Blocked" : "Print Failed",
        description: errorType === 'POPUP_BLOCKED'
          ? "Your browser blocked the print window. Please click the 'pop-up blocked' icon in your address bar and choose 'Always allow'."
          : (errorMessage || "Failed to print receipt. Please try again."),
        variant: errorType === 'POPUP_BLOCKED' ? "default" : "destructive",
        duration: errorType === 'POPUP_BLOCKED' ? 10000 : 5000,
      });
    }
  }, [previewData, toast]);

  const handlePrint = useCallback(async (options?: HandlePrintOptions) => {
    // If we're doing a direct print (e.g. after sale completion), we should ideally
    // have a window reference passed in to avoid gesture blocks.
    const windowRef = options?.existingWindow;

    if (!storeSettings && isLoadingSettings) {
      if (windowRef && !windowRef.closed) windowRef.close();
      toast({
        title: "Settings Loading",
        description: "Please wait for store settings to load...",
        variant: "destructive",
      });
      return;
    }

    try {
      const receiptProps: PrintReceiptProps = {
        items: options?.items || items,
        discount,
        manualDiscount,
        date: new Date(),
        cashierName: options?.cashierName || undefined,
        cashierEmail: options?.cashierEmail || undefined,
        customerName: options?.customerName || undefined,
        customerPhone: options?.customerPhone || undefined,
        businessName: options?.businessName || undefined,
        businessAddress: options?.businessAddress || undefined,
        saleType,
        cashierId: options?.cashierId || undefined,
        saleId: options?.saleId,
        storeSettings: storeSettings!,
      };

      console.log('[useSalesPrinting] handlePrint called. saleId:', options?.saleId, 'receiptProps.saleId:', receiptProps.saleId);

      if (options?.directPrint) {
        await executePrint(receiptProps, windowRef);
      } else {
        // Show preview first (User will trigger executePrint from the preview manually)
        setPreviewData(receiptProps);
        setShowPreview(true);
      }


    } catch (error) {
      if (windowRef && !windowRef.closed) windowRef.close();
      console.error("Error preparing receipt:", error);
      toast({
        title: "Error",
        description: "Failed to prepare receipt. Please try again.",
        variant: "destructive",
      });
    }
  }, [items, discount, saleType, storeSettings, isLoadingSettings, toast, executePrint]);

  return {
    handlePrint,
    executePrint,
    showPreview,
    setShowPreview,
    previewData,
    isLoadingSettings,
    openPrintWindow // Export this so components can open the window synchronously
  };
};
