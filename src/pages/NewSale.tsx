
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useSales } from "@/hooks/useSales";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, Save, ShoppingBag, Package, Shield } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { cn } from "@/lib/utils";
import ProductSearchSection from "@/components/sales/ProductSearchSection";
import CurrentSaleTable from "@/components/sales/CurrentSaleTable";
import SaleTotals from "@/components/sales/SaleTotals";
import { useOffline } from "@/contexts/OfflineContext";
import { customerInfoSchema, validateAndSanitize } from "@/lib/validation";
import { logSecurityEvent } from "@/components/security/SecurityProvider";
import { ReceiptPreview } from "@/components/receipts/ReceiptPreview";
import { useShift } from "@/hooks/useShift";
import PaymentModeSelector, { PaymentMode } from "@/components/sales/PaymentModeSelector";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const NewSale = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useOffline();
  const { canCreateWholesale } = usePermissions();
  const { activeShift, isLoading: isLoadingShift } = useShift();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
  const [lastCompletedSaleId, setLastCompletedSaleId] = useState<string | null>(null);
  const [lastCompletedItems, setLastCompletedItems] = useState<any[]>([]);
  const [isCompleting, setIsCompleting] = useState(false);

  const {
    items,
    discount,
    manualDiscount,
    saleType,
    addItem,
    removeItem,
    updateQuantity,
    toggleItemPriceType,
    setOverallDiscount,
    setManualDiscount,
    setSaleType,
    calculateTotal,
    calculateSubtotal,
    calculateDiscountAmount,
    handlePrint,
    executePrint,
    showPreview,
    setShowPreview,
    previewData,
    completeSale,
    clearItems,
    isOfflineMode,
    openPrintWindow
  } = useSales({
    cashierName: user ? user.username || user.name : undefined,
    cashierEmail: user ? user.email : undefined,
    cashierId: user ? user.id : undefined
  });

  const [payments, setPayments] = useState<PaymentMode[]>([
    { mode: 'cash', amount: calculateTotal() }
  ]);

  // Update payment amount when total changes (if only one payment mode)
  useEffect(() => {
    if (payments.length === 1) {
      setPayments([{ ...payments[0], amount: calculateTotal() }]);
    }
  }, [items, discount, manualDiscount]);

  const { settings } = useStoreSettings();
  const manualDiscountEnabled = settings?.discount_config?.manualAmountEnabled || false;

  const validateCustomerInfo = () => {
    const customerData = {
      customerName,
      customerPhone,
      businessName: saleType === 'wholesale' ? businessName : undefined,
      businessAddress: saleType === 'wholesale' ? businessAddress : undefined
    };

    const validation = validateAndSanitize(customerInfoSchema, customerData);

    if (!validation.success) {
      setValidationErrors({ general: validation.error || 'Invalid customer information' });
      return false;
    }

    // Additional validation for wholesale
    if (saleType === 'wholesale' && !businessName.trim()) {
      setValidationErrors({ businessName: 'Business name is required for wholesale orders' });
      return false;
    }

    setValidationErrors({});
    return true;
  };

  const handleInputChange = (field: string, value: string) => {
    // Sanitize input and limit length
    const sanitizedValue = value.replace(/[<>'"&]/g, '').substring(0, 200);

    switch (field) {
      case 'customerName':
        setCustomerName(sanitizedValue);
        break;
      case 'customerPhone':
        setCustomerPhone(sanitizedValue.replace(/[^0-9+\-\s\(\)]/g, ''));
        break;
      case 'businessName':
        setBusinessName(sanitizedValue);
        break;
      case 'businessAddress':
        setBusinessAddress(sanitizedValue);
        break;
    }

    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to the sale",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to complete a sale",
        variant: "destructive",
      });
      return;
    }

    if (!validateCustomerInfo()) {
      toast({
        title: "Validation Error",
        description: "Please check customer information",
        variant: "destructive",
      });
      return;
    }

    // Validate manual discount range if enabled and used
    if (manualDiscountEnabled && manualDiscount > 0 && (manualDiscount < 500 || manualDiscount > 1000)) {
      toast({
        title: "Invalid Discount",
        description: "Manual discount must be between ₦500 and ₦1,000",
        variant: "destructive",
      });
      return;
    }

    if (!activeShift) {
      toast({
        title: "Shift Required",
        description: "You must start a shift before you can record sales.",
        variant: "destructive",
      });
      return;
    }

    // Verify payment amount matches total
    const totalPayment = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalPayment - calculateTotal()) > 0.01) {
      toast({
        title: "Payment Mismatch",
        description: "Payment amount does not match the total sale amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCompleting(true);

      // 1. Generate Transaction ID client-side immediately
      const transactionId = `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      // 2. Capture the window synchronously (Optional, if we want to pass it to useSales)
      // For now, let's trust the user has allowed popups or useSales opens it.
      // We removed the optimistic print to ensure correct Sale ID in logs.

      const currentItems = [...items];

      logSecurityEvent('SALE_COMPLETION_ATTEMPT', {
        userId: user.id,
        saleType,
        itemCount: items.length,
        total: calculateTotal(),
        transactionId
      });

      // 3. SAVE THE SALE IN BACKGROUND (with the same ID)
      const result = await completeSale({
        customerName,
        customerPhone,
        businessName: saleType === 'wholesale' ? businessName : undefined,
        businessAddress: saleType === 'wholesale' ? businessAddress : undefined,
        saleType,
        transactionId,
        payments
      });

      if (result && result.success) {
        setLastCompletedItems(currentItems);
        logSecurityEvent('SALE_COMPLETED', {
          userId: user.id,
          saleType,
          total: calculateTotal(),
          transactionId
        });

        setLastCompletedSaleId(result.saleId);
        setIsSuccessModalOpen(true);
      }
      // Note: If save fails, handlePrint already ran, so the user has a receipt.
      // The offline fallback in useSalesCompletion ensures we almost always get a result anyway.

    } catch (error) {
      logSecurityEvent('SALE_COMPLETION_FAILED', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      toast({
        title: "Error",
        description: "Failed to save sale record (but receipt may have printed)",
        variant: "destructive",
      });
    } finally {
      setIsCompleting(false);
    }
  };

  const handleManualPrint = () => {
    // Open window synchronously
    const windowRef = openPrintWindow();

    handlePrint({
      cashierName: user ? user.username || user.name : undefined,
      cashierEmail: user ? user.email : undefined,
      cashierId: user ? user.id : undefined,
      customerName: customerName || undefined,
      customerPhone: customerPhone || undefined,
      businessName: saleType === 'wholesale' ? businessName : undefined,
      businessAddress: saleType === 'wholesale' ? businessAddress : undefined,
      existingWindow: windowRef,
      directPrint: true
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">New Sale</h1>
          {!isOnline && (
            <p className="text-sm text-amber-600">Working in offline mode - sale will sync when you're back online</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/sales")}>
            Cancel
          </Button>
          <Button
            onClick={handleCompleteSale}
            disabled={isCompleting || !activeShift}
            className={!activeShift ? "opacity-50 grayscale" : ""}
          >
            {isCompleting ? "Processing..." : (isOfflineMode ? (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Sale
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Complete Sale
              </>
            ))}
          </Button>
        </div>
      </div>

      {!isLoadingShift && !activeShift && (
        <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 animate-pulse">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Active Shift Required</AlertTitle>
          <AlertDescription>
            No active shift found for your account. Please <Button variant="link" className="p-0 h-auto font-bold text-destructive hover:underline" onClick={() => navigate('/shifts')}>start a shift</Button> to begin selling.
          </AlertDescription>
        </Alert>
      )}

      {canCreateWholesale && (
        <Tabs
          value={saleType}
          onValueChange={(value) => setSaleType(value as 'retail' | 'wholesale')}
          className="w-full"
        >
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="retail" className="flex items-center">
              <ShoppingBag className="mr-2 h-4 w-4" />
              Retail Sale
            </TabsTrigger>
            <TabsTrigger value="wholesale" className="flex items-center">
              <Package className="mr-2 h-4 w-4" />
              Wholesale
            </TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-4 w-4" />
              {saleType === 'wholesale' ? 'Wholesale Order' : 'Customer Info'}
            </CardTitle>
          </CardHeader>
          <CardContent className="sensitive-data">
            <div className="space-y-4">
              {validationErrors.general && (
                <div className="text-red-500 text-sm">{validationErrors.general}</div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="customer-name">
                    {saleType === 'wholesale' ? 'Contact Person' : 'Customer Name'}
                  </Label>
                  <Input
                    id="customer-name"
                    value={customerName}
                    onChange={(e) => handleInputChange('customerName', e.target.value)}
                    placeholder={saleType === 'wholesale' ? 'Contact person name' : 'Customer name'}
                    className={validationErrors.customerName ? 'border-red-500' : ''}
                    maxLength={100}
                  />
                  {validationErrors.customerName && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.customerName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="customer-phone">Phone Number</Label>
                  <Input
                    id="customer-phone"
                    value={customerPhone}
                    onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                    placeholder="Phone number"
                    className={validationErrors.customerPhone ? 'border-red-500' : ''}
                    maxLength={20}
                  />
                  {validationErrors.customerPhone && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.customerPhone}</p>
                  )}
                </div>
              </div>

              {saleType === 'wholesale' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="business-name" className="text-red-500">Business Name*</Label>
                    <Input
                      id="business-name"
                      value={businessName}
                      onChange={(e) => handleInputChange('businessName', e.target.value)}
                      placeholder="Business name"
                      required
                      className={validationErrors.businessName ? 'border-red-500' : ''}
                      maxLength={200}
                    />
                    {validationErrors.businessName && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.businessName}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="business-address">Business Address</Label>
                    <Input
                      id="business-address"
                      value={businessAddress}
                      onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                      placeholder="Business address"
                      className={validationErrors.businessAddress ? 'border-red-500' : ''}
                      maxLength={500}
                    />
                    {validationErrors.businessAddress && (
                      <p className="text-red-500 text-xs mt-1">{validationErrors.businessAddress}</p>
                    )}
                  </div>
                </div>
              )}

              <ProductSearchSection
                onAddProduct={(product, quantity) => {
                  console.log('NewSale: onAddProduct called', { product, quantity, saleType });
                  try {
                    const result = addItem(product, quantity, saleType === 'wholesale');
                    console.log('NewSale: addItem result', result.success ? 'Success' : 'Failed', result);
                  } catch (error) {
                    console.error('NewSale: Error in addItem', error);
                  }
                }}
                isWholesale={saleType === 'wholesale'}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{saleType === 'wholesale' ? 'Wholesale Order Items' : 'Current Sale'}</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentSaleTable
              items={items}
              onUpdateQuantity={updateQuantity}
              onRemoveItem={removeItem}
              onTogglePriceType={canCreateWholesale ? toggleItemPriceType : undefined}
              isWholesale={saleType === 'wholesale'}
            />

            {items.length > 0 && (
              <>
                <SaleTotals
                  subtotal={calculateSubtotal()}
                  discount={discount}
                  manualDiscount={manualDiscount}
                  total={calculateTotal()}
                  discountAmount={calculateDiscountAmount()}
                  onDiscountChange={setOverallDiscount}
                  onManualDiscountChange={setManualDiscount}
                  isWholesale={saleType === 'wholesale'}
                  manualDiscountEnabled={manualDiscountEnabled}
                />

                <div className="mt-4 pt-4 border-t">
                  <PaymentModeSelector
                    total={calculateTotal()}
                    payments={payments}
                    onPaymentsChange={setPayments}
                  />
                </div>

                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    onClick={handleCompleteSale}
                    disabled={isCompleting || !activeShift}
                    className={cn(
                      "w-full text-white font-bold h-12 text-lg",
                      activeShift ? "bg-green-600 hover:bg-green-700" : "bg-muted text-muted-foreground grayscale cursor-not-allowed"
                    )}
                  >
                    {isCompleting ? "Processing..." : (
                      <>
                        <Save className="mr-2 h-5 w-5" />
                        COMPLETE SALE
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {
        previewData && (
          <ReceiptPreview
            open={showPreview}
            onOpenChange={setShowPreview}
            receiptData={previewData}
            onPrint={() => {
              const windowRef = openPrintWindow();
              executePrint(undefined, windowRef);
            }}
          />
        )
      }

      {/* Sale Success Modal */}
      <Dialog open={isSuccessModalOpen} onOpenChange={setIsSuccessModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-green-600">Sale Successful!</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="rounded-full bg-green-100 p-3">
              <Shield className="h-12 w-12 text-green-600" />
            </div>
            <p className="text-center text-muted-foreground">
              Transaction has been completed successfully. The receipt should be printing now.
            </p>
          </div>
          <DialogFooter className="flex sm:justify-center gap-2">
            <Button
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const windowRef = openPrintWindow();
                handlePrint({
                  saleId: lastCompletedSaleId || undefined,
                  items: lastCompletedItems,
                  existingWindow: windowRef,
                  directPrint: true
                });
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
            <Button onClick={() => navigate("/sales")}>
              Go to Sales List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div >
  );
};

export default NewSale;
