import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, CheckSquare, Square } from 'lucide-react';
import { useRefund } from '@/hooks/sales/useRefund';
import { useToast } from '@/hooks/use-toast';
import { RefundRequest } from '@/types/refund';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RefundDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    saleId: string;
    transactionId: string;
    originalAmount: number;
    customerName?: string;
    items?: any[];
}

interface RefundItemSelection {
    inventory_id: string;
    product_name: string; // fallback in case inventory_id is missing or for display
    quantity: number;
    maxQuantity: number;
    unit_price: number;
    selected: boolean;
}

export const RefundDialog = ({
    open,
    onOpenChange,
    saleId,
    transactionId,
    originalAmount,
    customerName,
    items = [],
}: RefundDialogProps) => {
    const { initiateRefund, isLoading, checkRefundExists } = useRefund();
    const { toast } = useToast();

    // State
    const [refundItems, setRefundItems] = useState<RefundItemSelection[]>([]);
    const [reason, setReason] = useState('');
    const [hasExistingRefund, setHasExistingRefund] = useState(false);
    const [isCheckingRefund, setIsCheckingRefund] = useState(true);
    const [isFetchingItems, setIsFetchingItems] = useState(false);
    const [resolvedUUID, setResolvedUUID] = useState<string>(saleId);

    useEffect(() => {
        if (open) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(saleId);

            const initializeData = async () => {
                setIsCheckingRefund(true);
                let currentId = saleId;
                let currentItems = items;

                // 1. Resolve UUID if it's a Transaction ID
                if (!isUUID || (items && items.length === 0)) {
                    setIsFetchingItems(true);
                    try {
                        const { data: sale, error } = await supabase
                            .from('sales')
                            .select('id, sales_items(*)')
                            .or(`id.eq.${isUUID ? saleId : '00000000-0000-0000-0000-000000000000'},transaction_id.eq.${saleId}`)
                            .maybeSingle();

                        if (sale) {
                            currentId = sale.id;
                            setResolvedUUID(sale.id);
                            if (!items || items.length === 0) {
                                currentItems = sale.sales_items || [];
                            }
                        }
                    } catch (err) {
                        console.error('Error resolving sale:', err);
                    } finally {
                        setIsFetchingItems(false);
                    }
                }

                // 2. Check if refund already exists
                checkRefundExists(currentId).then((exists) => {
                    setHasExistingRefund(exists);
                    setIsCheckingRefund(false);
                });

                // 3. Initialize items for selection
                if (currentItems && currentItems.length > 0) {
                    const mappedItems = currentItems.map(item => {
                        const price = parseFloat(item.unit_price || item.price || 0);
                        const name = item.product_name || item.name || 'Unknown Item';
                        const id = item.inventory_id || item.product_id || item.id;

                        return {
                            inventory_id: id,
                            product_name: name,
                            quantity: 1,
                            maxQuantity: parseInt(item.quantity) || 1,
                            unit_price: price,
                            selected: false
                        };
                    });
                    setRefundItems(mappedItems);
                }
            };

            initializeData();
        } else {
            // Reset form when dialog closes
            setReason('');
            setHasExistingRefund(false);
            setIsCheckingRefund(true);
            setRefundItems([]);
            setResolvedUUID(saleId);
        }
    }, [open, saleId, items]);

    // Calculate total refund amount based on selected items
    const calculateTotalRefund = () => {
        return refundItems.reduce((total, item) => {
            if (item.selected) {
                return total + (item.quantity * item.unit_price);
            }
            return total;
        }, 0);
    };

    const handleQuantityChange = (index: number, val: string) => {
        const qty = parseInt(val) || 0;
        setRefundItems(prev => {
            const next = [...prev];
            const item = next[index];
            // Clamp quantity between 1 and max
            const validatedQty = Math.min(Math.max(1, qty), item.maxQuantity);
            next[index] = { ...item, quantity: validatedQty };
            return next;
        });
    };

    const toggleSelection = (index: number) => {
        setRefundItems(prev => {
            const next = [...prev];
            next[index] = { ...next[index], selected: !next[index].selected };
            return next;
        });
    };

    const handleSubmit = async () => {
        const selectedItems = refundItems.filter(i => i.selected);

        // Validation
        if (selectedItems.length === 0) {
            toast({
                title: "No Items Selected",
                description: "Please select at least one item to refund.",
                variant: "destructive"
            });
            return;
        }

        if (!reason.trim()) {
            toast({
                title: "Missing Reason",
                description: "Please provide a reason for the refund",
                variant: "destructive"
            });
            return;
        }

        const totalRefundAmount = calculateTotalRefund();

        // Prepare backend payload
        // We'll treat this as 'partial' type internally unless it matches original amount exactly, 
        // but 'items' payload is the key for stock restoration.
        const refundType = totalRefundAmount >= originalAmount ? 'full' : 'partial';

        const request: RefundRequest = {
            sale_id: resolvedUUID,
            transaction_id: transactionId,
            refund_amount: totalRefundAmount,
            refund_reason: reason.trim(),
            refund_type: refundType,
            original_amount: originalAmount,
            customer_name: customerName,
            items: selectedItems.map(i => ({
                inventory_id: i.inventory_id,
                quantity: i.quantity,
                unit_price: i.unit_price
            })),
        };

        const success = await initiateRefund(request);
        if (success) {
            onOpenChange(false);
        }
    };

    const totalCalculated = calculateTotalRefund();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>Request Refund</DialogTitle>
                    <DialogDescription>
                        Select items to refund. Stock will be restored upon approval. Transaction: {transactionId}
                    </DialogDescription>
                </DialogHeader>

                {(isCheckingRefund || isFetchingItems) ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading transaction details...</p>
                    </div>
                ) : hasExistingRefund ? (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                            A refund request already exists for this sale. Please check the refund status.
                        </AlertDescription>
                    </Alert>
                ) : (
                    <div className="space-y-4 py-4">
                        <div className="border rounded-md max-h-[300px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Select</TableHead>
                                        <TableHead>Item</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Sold Qty</TableHead>
                                        <TableHead>Return Qty</TableHead>
                                        <TableHead>Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {refundItems.map((item, index) => (
                                        <TableRow key={index} className={item.selected ? "bg-muted/50" : ""}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={item.selected}
                                                    onCheckedChange={() => toggleSelection(index)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium">{item.product_name}</TableCell>
                                            <TableCell>₦{item.unit_price.toLocaleString()}</TableCell>
                                            <TableCell>{item.maxQuantity}</TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    max={item.maxQuantity}
                                                    value={item.quantity}
                                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                                    className="w-20 h-8"
                                                    disabled={!item.selected}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                ₦{(item.quantity * item.unit_price).toLocaleString()}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex justify-between items-center bg-secondary/50 p-4 rounded-lg">
                            <span className="font-semibold">Total Refund Amount:</span>
                            <span className="text-xl font-bold">₦{totalCalculated.toLocaleString()}</span>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason for Refund *</Label>
                            <Textarea
                                id="reason"
                                placeholder="Why are these items being returned?"
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={3}
                                required
                            />
                        </div>

                        <Alert>
                            <AlertDescription>
                                Note: Approved refunds will automatically add the returned quantity back to inventory.
                            </AlertDescription>
                        </Alert>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                        Cancel
                    </Button>
                    {!hasExistingRefund && !isCheckingRefund && (
                        <Button onClick={handleSubmit} disabled={isLoading || totalCalculated <= 0}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit Refund
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
