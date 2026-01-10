
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BulkProductForm } from "./dialog/BulkProductForm";
import { initialInventoryFormState } from "./form/formUtils";
import { useSuppliers } from "@/hooks/useSuppliers";
import { SelectField, TextField } from "./form/FormField";
import { SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories?: string[];
  onAddItem: (item: any) => void;
}

export const AddInventoryDialog = ({
  open,
  onOpenChange,
  categories = [],
  onAddItem,
}: AddInventoryDialogProps) => {
  const [supplierId, setSupplierId] = useState<string>("none");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [items, setItems] = useState<any[]>([{ ...initialInventoryFormState, id: Date.now() }]);
  const { toast } = useToast();
  const { suppliers, fetchSuppliers } = useSuppliers();

  useEffect(() => {
    if (open) {
      fetchSuppliers();
      // Reset to one empty item if opening new
      setItems([{ ...initialInventoryFormState, id: Date.now() }]);
      setSupplierId("none");
      setInvoiceNumber("");
    }
  }, [open, fetchSuppliers]);

  const handleUpdateItem = (index: number, data: any) => {
    const newItems = [...items];
    newItems[index] = data;
    setItems(newItems);
  };

  const handleAddItemForm = () => {
    setItems([...items, { ...initialInventoryFormState, id: Date.now() }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (supplierId === "none" && items.length > 0) {
      toast({
        title: "Supplier Required",
        description: "Please select a supplier for this restock.",
        variant: "destructive"
      });
      return;
    }

    try {
      items.forEach(item => {
        const submitData = {
          ...item,
          expiryDate: item.expiryDateObj ? item.expiryDateObj.toISOString().split('T')[0] : item.expiryDate,
          supplier_id: supplierId === "none" ? undefined : supplierId,
          restock_invoice_number: invoiceNumber || undefined,
        };
        // Remove helper object
        delete submitData.expiryDateObj;
        onAddItem(submitData);
      });

      onOpenChange(false);
      toast({
        title: "Success",
        description: `${items.length} product(s) added successfully`,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to add products. Please check the information provided.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[750px] max-h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b">
          <DialogTitle>Receive Inventory (Bulk)</DialogTitle>
          <DialogDescription>
            Select a supplier and add one or more products to your inventory.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-custom">
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
              <SelectField
                id="supplier_id"
                label="Supplier"
                value={supplierId}
                onValueChange={setSupplierId}
                required
              >
                <SelectItem value="none">Select Supplier</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectField>

              <TextField
                id="invoice_number"
                label="Invoice # (Optional)"
                value={invoiceNumber}
                onChange={setInvoiceNumber}
                placeholder="Reference number"
              />
            </div>

            <BulkProductForm
              items={items}
              onUpdateItem={handleUpdateItem}
              onRemoveItem={handleRemoveItem}
              onAddItem={handleAddItemForm}
              categories={categories}
            />
          </div>
        </div>

        <div className="p-6 border-t bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Receive {items.length} Product{items.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
