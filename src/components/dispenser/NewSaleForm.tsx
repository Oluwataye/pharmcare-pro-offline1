
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Plus, Printer, Tag, User, ShoppingCart, Save, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProductSearch } from "./ProductSearch";
import { SaleItemsTable } from "./SaleItemsTable";
import { useSalesPrinting } from "@/hooks/sales/useSalesPrinting";
import { useSalesCompletion } from "@/hooks/sales/useSalesCompletion";
import { useAuth } from "@/contexts/AuthContext";
import { SaleItem } from "@/types/sales";
import SaleTotals from "../sales/SaleTotals";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface NewSaleFormProps {
  onComplete: () => void;
  onCancel: () => void;
}

interface Product {
  id: string;
  name: string;
  price: number;
  wholesalePrice: number;
  stock: number;
}

import { db } from "@/lib/db-client";

// ... imports

export function NewSaleForm({ onComplete, onCancel }: NewSaleFormProps) {
  const [items, setItems] = useState<SaleItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showSearch, setShowSearch] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [isWholesale, setIsWholesale] = useState(false);

  // Real Products State
  const [products, setProducts] = useState<Product[]>([]);

  // Success & Print State
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);
  const [lastItems, setLastItems] = useState<SaleItem[]>([]);

  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch Products on Mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await db
          .from('inventory')
          .select('*')
          .gt('quantity', 0); // Only show available stock

        if (error) throw error;

        if (data) {
          const mappedProducts: Product[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            price: Number(item.unit_price) || 0,
            wholesalePrice: Number(item.wholesale_price) || Number(item.unit_price) || 0, // Fallback logic
            stock: Number(item.quantity) || 0
          }));
          setProducts(mappedProducts);
        }
      } catch (error) {
        console.error('Failed to load products:', error);
        toast({ title: "Error", description: "Failed to load product list", variant: "destructive" });
      }
    };
    fetchProducts();
  }, [toast]);

  const { handlePrint, openPrintWindow } = useSalesPrinting(items, discount, 0, isWholesale ? 'wholesale' : 'retail');

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const discountAmount = subtotal * (discount / 100);
  const total = subtotal - discountAmount;

  const { completeSale } = useSalesCompletion(
    items,
    () => total,
    discount,
    0, // manualDiscount
    () => setItems([]),
    () => setDiscount(0),
    () => setIsWholesale(false)
  );

  const form = useForm({
    defaultValues: {
      customerName: "",
      customerPhone: "",
    },
  });

  const filteredProducts = products.filter(
    product => product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddItem = () => {
    if (!selectedProduct) {
      toast({ title: "Error", description: "Please select a product first", variant: "destructive" });
      return;
    }
    if (quantity <= 0) {
      toast({ title: "Error", description: "Quantity must be greater than zero", variant: "destructive" });
      return;
    }

    const price = isWholesale ? selectedProduct.wholesalePrice : selectedProduct.price;
    const existingItemIndex = items.findIndex(item => item.id === selectedProduct.id && item.isWholesale === isWholesale);

    if (existingItemIndex >= 0) {
      const newItems = [...items];
      newItems[existingItemIndex].quantity += quantity;
      newItems[existingItemIndex].total = newItems[existingItemIndex].quantity * newItems[existingItemIndex].price;
      setItems(newItems);
    } else {
      setItems([
        ...items,
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          quantity: quantity,
          price: price,
          total: price * quantity,
          isWholesale: isWholesale,
          unitPrice: price
        },
      ]);
    }
    setSelectedProduct(null);
    setQuantity(1);
    setSearchQuery("");
    setShowSearch(false);
  };

  const handleToggleWholesale = () => setIsWholesale(!isWholesale);

  const handleToggleItemPriceType = (id: string) => {
    const itemIndex = items.findIndex(item => item.id === id);
    if (itemIndex === -1) return;
    const item = items[itemIndex];
    const product = products.find(p => p.id === id);
    if (!product) return;
    const newPrice = item.isWholesale ? product.price : product.wholesalePrice;
    const newItems = [...items];
    newItems[itemIndex] = { ...item, isWholesale: !item.isWholesale, price: newPrice, total: newPrice * item.quantity };
    setItems(newItems);
  };

  const handleUpdateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setItems(items.filter(item => item.id !== id));
      return;
    }
    const newItems = items.map(item => {
      if (item.id === id) return { ...item, quantity: newQuantity, total: item.price * newQuantity };
      return item;
    });
    setItems(newItems);
  };

  const handleCompleteSale = async () => {
    if (items.length === 0) {
      toast({ title: "Error", description: "Please add at least one item to the sale", variant: "destructive" });
      return;
    }

    try {
      const transactionId = `TR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const currentItems = [...items]; // Capture items for receipt

      // SAVE THE SALE
      const result = await completeSale({
        customerName: form.getValues().customerName,
        customerPhone: form.getValues().customerPhone,
        saleType: isWholesale ? 'wholesale' : 'retail',
        transactionId,
        cashierName: user ? user.username || user.name : undefined,
        cashierEmail: user ? user.email : undefined,
        cashierId: user ? user.id : undefined,
      });

      // Update Success State
      const finalSaleId = (result && typeof result === 'object' && 'saleId' in result) ? result.saleId : transactionId;
      setLastSaleId(finalSaleId);
      setLastItems(currentItems);
      setIsSuccess(true);

      toast({
        title: "Sale Completed",
        description: "The transaction was processed successfully",
      });

      // AUTO-PRINT: Automatically trigger receipt printing
      console.log('[useSales] Sale completed. Auto-printing receipt...', finalSaleId);

      // Open print window synchronously to avoid popup blockers
      const windowRef = openPrintWindow();

      // Trigger automatic printing
      setTimeout(() => {
        handlePrint({
          saleId: finalSaleId,
          items: currentItems,
          existingWindow: windowRef,
          directPrint: true,
          customerName: form.getValues().customerName,
          customerPhone: form.getValues().customerPhone,
          cashierName: user ? user.username || user.name : undefined,
          cashierEmail: user ? user.email : undefined,
          cashierId: user ? user.id : undefined,
        });
      }, 100); // Small delay to ensure state is updated

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process sale",
        variant: "destructive",
      });
    }
  };

  if (isSuccess) {
    return (
      <Card className="border-2 border-green-500/20 bg-green-50/50">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-6">
          <div className="rounded-full bg-green-100 p-4">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-green-700">Sale Successful!</h2>
            <p className="text-muted-foreground">Transaction ID: {lastSaleId}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md pt-4">
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                const windowRef = openPrintWindow();
                handlePrint({
                  saleId: lastSaleId || undefined,
                  items: lastItems,
                  existingWindow: windowRef,
                  directPrint: true,
                  customerName: form.getValues().customerName,
                  customerPhone: form.getValues().customerPhone,
                  cashierName: user ? user.username || user.name : undefined,
                  cashierEmail: user ? user.email : undefined,
                  cashierId: user ? user.id : undefined,
                });
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={onComplete} // This will close the form
            >
              New Sale
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const cardStyle = cn(
    "relative overflow-hidden transition-all duration-300 hover:shadow-lg border-l-4",
    isWholesale ? "border-l-indigo-500" : "border-l-primary"
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{isWholesale ? 'New Wholesale Sale' : 'New Retail Sale'}</h2>
        <Button
          variant="outline"
          onClick={handleToggleWholesale}
          className="flex items-center gap-2"
        >
          <Tag className="h-4 w-4" />
          {isWholesale ? 'Switch to Retail' : 'Switch to Wholesale'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={cardStyle}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              {isWholesale ? "Wholesale Order" : "Customer Info"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isWholesale ? "Contact Person" : "Customer Name"}</FormLabel>
                      <FormControl>
                        <Input placeholder={isWholesale ? "Contact person name" : "Customer name"} {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Phone number" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {isWholesale && (
                  <div className="pt-2">
                    <p className="text-sm font-medium text-red-500 mb-1">Business Name*</p>
                    <Input placeholder="Business name" />
                  </div>
                )}

                <div className="pt-4">
                  {showSearch ? (
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-2">
                        <ProductSearch
                          searchQuery={searchQuery}
                          onSearchChange={setSearchQuery}
                          filteredProducts={filteredProducts}
                          onProductSelect={(product) => {
                            setSelectedProduct(product);
                            setSearchQuery(product.name);
                          }}
                        />
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                          className="w-20"
                        />
                      </div>
                      <Button onClick={handleAddItem} className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Item
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => setShowSearch(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Search products...
                    </Button>
                  )}
                </div>
              </div>
            </Form>
          </CardContent>
        </Card>

        <Card className={cardStyle}>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-muted-foreground" />
              {isWholesale ? "Wholesale Order Items" : "Current Sale"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[200px] flex flex-col justify-between">
              <SaleItemsTable
                items={items}
                onRemoveItem={(id) => setItems(items.filter(item => item.id !== id))}
                onUpdateQuantity={handleUpdateQuantity}
                onTogglePriceType={handleToggleItemPriceType}
                isWholesale={isWholesale}
              />

              <div className="mt-4 pt-4 border-t">
                <SaleTotals
                  subtotal={subtotal}
                  discount={discount}
                  total={total}
                  discountAmount={discountAmount}
                  onDiscountChange={setDiscount}
                  isWholesale={isWholesale}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleCompleteSale}>
          <Save className="mr-2 h-4 w-4" />
          Complete Sale
        </Button>
      </div>
    </div>
  );
}
