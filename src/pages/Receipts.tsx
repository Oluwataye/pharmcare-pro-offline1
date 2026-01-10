import { useState, useEffect } from "react";
import { db } from "@/lib/db-client";
import { useReceiptReprint } from "@/hooks/sales/useReceiptReprint";
import { ReceiptPreview } from "@/components/receipts/ReceiptPreview";
import { RefundDialog } from "@/components/refunds/RefundDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedCard } from "@/components/ui/EnhancedCard";
import { Printer, Receipt, Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ReceiptRecord {
  id: string;
  sale_id: string;
  receipt_data: any;
  created_at: string;
}

const Receipts = () => {
  const { toast } = useToast();
  const [receipts, setReceipts] = useState<ReceiptRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const {
    fetchAndPreviewReceipt,
    executePrint,
    showPreview,
    setShowPreview,
    previewData,
    openPrintWindow
  } = useReceiptReprint();

  // Refund state
  const [showRefundDialog, setShowRefundDialog] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<{
    saleId: string;
    transactionId: string;
    amount: number;
    customerName?: string;
    items?: any[];
  } | null>(null);

  useEffect(() => {
    fetchReceipts();
  }, []);

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await db.auth.getUser();

      let query = db
        .from('receipts')
        .select('*')
        .order('created_at', { ascending: false });

      if (user) {
        const { data: profile } = await db.from('users').select('role').eq('id', user.id).single();
        if (profile && profile.role !== 'SUPER_ADMIN' && profile.role !== 'ADMIN') {
          // In offline mode, receipts are simplified. 
          // Ideally we'd join, but since we explicitly set cashier_id in sales, 
          // and offline-client might not handle joins perfectly, 
          // we can filter the resulting list OR just join if supported.
          // Let's try the inner join approach which is standard Local DB.
          query = db
            .from('receipts')
            .select('*, sales!inner(cashier_id)')
            .eq('sales.cashier_id', user.id)
            .order('created_at', { ascending: false }) as any;
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setReceipts(data || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      toast({
        title: "Error",
        description: "Failed to load receipts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewReceipt = (saleId: string) => {
    // Open window synchronously to capture gesture
    const windowRef = openPrintWindow();
    fetchAndPreviewReceipt(saleId, windowRef);
  };

  const handleRefund = (receipt: ReceiptRecord) => {
    let data = receipt.receipt_data;

    // Parse if it's a string
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) {
        console.error('Refund handle parsing failed:', e);
        data = {};
      }
    }

    // Use stored total if available, otherwise calculate
    const amount = data.total ?? (data.items?.reduce(
      (sum: number, item: any) => sum + (item.price || item.unit_price || 0) * (item.quantity || 0),
      0
    ) || 0);

    setSelectedRefund({
      saleId: receipt.sale_id,
      transactionId: data.transactionId || receipt.sale_id,
      amount: amount,
      customerName: data.customerName || data.businessName,
      items: data.items
    });
    setShowRefundDialog(true);
  };

  return (
    <div className="p-6 space-y-6">
      <EnhancedCard colorScheme="primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Receipt History
              </CardTitle>
              <CardDescription>
                View and reprint all stored receipts
              </CardDescription>
            </div>
            <Button variant="outline" onClick={fetchReceipts} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Refresh"
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : receipts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Receipt className="h-16 w-16 mb-4 opacity-20" />
              <p>No receipts found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Sale Type</TableHead>
                    <TableHead>Customer/Business</TableHead>
                    <TableHead>Dispenser</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt) => {
                    let data = receipt.receipt_data;

                    // Parse if it's a string (common with generic JSON columns in offline mode)
                    if (typeof data === 'string') {
                      try {
                        data = JSON.parse(data);
                      } catch (e) {
                        console.error('Receipt record parsing failed:', e);
                        // Fallback to empty object to prevent crash
                        data = {};
                      }
                    }

                    if (!data) return null;

                    const displayTotal = data.total ?? (data.items?.reduce(
                      (sum: number, item: any) => sum + (item.price || item.unit_price || 0) * (item.quantity || 0),
                      0
                    ) || 0);

                    return (
                      <TableRow key={receipt.id}>
                        <TableCell>
                          {format(new Date(receipt.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="capitalize">
                          {data.saleType || 'retail'}
                        </TableCell>
                        <TableCell>
                          {data.businessName || data.customerName || 'Walk-in'}
                        </TableCell>
                        <TableCell>
                          {data.cashierName || 'Unknown'}
                        </TableCell>
                        <TableCell>
                          {data.items?.length || 0} item(s)
                        </TableCell>
                        <TableCell>
                          ₦{displayTotal.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handlePreviewReceipt(receipt.sale_id)}
                              title="Reprint Receipt"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefund(receipt)}
                              title="Request Refund"
                              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </EnhancedCard>

      {previewData && (
        <ReceiptPreview
          open={showPreview}
          onOpenChange={setShowPreview}
          receiptData={previewData}
          onPrint={() => {
            const windowRef = openPrintWindow();
            executePrint(undefined, windowRef);
          }}
        />
      )}

      {selectedRefund && (
        <RefundDialog
          open={showRefundDialog}
          onOpenChange={setShowRefundDialog}
          saleId={selectedRefund.saleId}
          transactionId={selectedRefund.transactionId}
          originalAmount={selectedRefund.amount}
          customerName={selectedRefund.customerName}
          items={selectedRefund.items}
        />
      )}
    </div>
  );
};

export default Receipts;
