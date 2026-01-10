
import { useCartItems } from './sales/useCartItems';
import { useSaleDiscount } from './sales/useSaleDiscount';
import { useSaleType } from './sales/useSaleType';
import { useSalesPrinting } from './sales/useSalesPrinting';
import { useSalesCompletion } from './sales/useSalesCompletion';

interface UseSalesOptions {
  cashierName?: string;
  cashierEmail?: string;
  cashierId?: string;
}

export const useSales = (options?: UseSalesOptions) => {
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    updateItemDiscount,
    toggleItemPriceType,
    clearItems
  } = useCartItems();

  const {
    saleType,
    setSaleType: setSaleTypeMode,
    resetSaleType
  } = useSaleType();

  const {
    discount,
    manualDiscount,
    setOverallDiscount,
    setManualDiscount,
    calculateSubtotal,
    calculateDiscountAmount,
    calculateTotal,
    clearDiscount
  } = useSaleDiscount(items);

  const {
    handlePrint,
    executePrint,
    showPreview,
    setShowPreview,
    previewData,
    openPrintWindow
  } = useSalesPrinting(items, discount, manualDiscount, saleType);

  const {
    completeSale: completeTransaction,
    isOfflineMode
  } = useSalesCompletion(items, calculateTotal, discount, manualDiscount, clearItems, clearDiscount, resetSaleType);

  // Wrap the completeSale function to include cashier info from options and reliable printing
  const completeSale = async (completeSaleOptions?: Omit<Parameters<typeof completeTransaction>[0], 'cashierName' | 'cashierEmail' | 'cashierId'> & { existingWindow?: Window | null }) => {
    // Capture items before they are cleared by completeTransaction
    const currentItems = [...items];
    const windowRef = completeSaleOptions?.existingWindow;

    const result = await completeTransaction({
      ...completeSaleOptions,
      cashierName: options?.cashierName,
      cashierEmail: options?.cashierEmail,
      cashierId: options?.cashierId,
    } as Parameters<typeof completeTransaction>[0]);

    // If sale completed successfully and we have a sale ID, trigger print with the ID
    if (result && result.success) {
      const saleId = result.saleId;
      console.log('[useSales] Sale completed. Auto-print disabled per user request. User must click Print manually.', saleId);

      // Auto-print disabled. User will trigger print from the success modal.
      /*
      handlePrint({
        ...completeSaleOptions,
        cashierName: options?.cashierName,
        cashierEmail: options?.cashierEmail,
        cashierId: options?.cashierId,
        saleId,
        items: currentItems,
        directPrint: true,
        existingWindow: windowRef // Pass through the captured window
      }).catch(err => {
        console.error('[useSales] handlePrint failed:', err);
      });
      */
    }

    return result;
  };

  // Enhanced toggleItemPriceType with auto-type switching
  const enhancedToggleItemPriceType = (id: string) => {
    const isWholesale = toggleItemPriceType(id);
    if (isWholesale && saleType !== 'wholesale') {
      setSaleTypeMode('wholesale');
    }
    return isWholesale;
  };

  return {
    items,
    discount,
    manualDiscount,
    saleType,
    addItem: (product: any, quantity: number, isWholesale: boolean = false) => {
      const { success, usedWholesalePrice } = addItem(product, quantity, isWholesale);

      // Only auto-switch the UI tab to 'wholesale' if the user is NOT explicitly on the 'retail' tab
      // and a wholesale price was triggered. If they are on 'retail', we let them keep the 
      // wholesale price (if earned) without jumping to the wholesale customer info form.
      if (usedWholesalePrice && saleType !== 'wholesale' && isWholesale) {
        setSaleTypeMode('wholesale');
      }
      return { success, usedWholesalePrice };
    },
    removeItem,
    updateQuantity,
    updateItemDiscount,
    toggleItemPriceType: enhancedToggleItemPriceType,
    setOverallDiscount,
    setManualDiscount,
    setSaleType: setSaleTypeMode,
    calculateSubtotal,
    calculateDiscountAmount,
    calculateTotal,
    handlePrint,
    executePrint,
    showPreview,
    setShowPreview,
    previewData,
    completeSale,
    clearItems: () => {
      clearItems();
      clearDiscount();
      resetSaleType();
    },
    isOfflineMode,
    openPrintWindow
  };
};
