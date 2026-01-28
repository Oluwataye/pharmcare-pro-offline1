
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InventoryItem } from "@/types/inventory";
import { EditInventoryForm } from "./dialog/EditInventoryForm";
import { useSuppliers } from "@/hooks/useSuppliers";

interface EditInventoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: InventoryItem;
  onSave: (updatedItem: InventoryItem) => void;
  categories?: string[];
}

export const EditInventoryDialog = ({
  open,
  onOpenChange,
  item,
  onSave,
  categories = [],
}: EditInventoryDialogProps) => {
  const [formData, setFormData] = useState<InventoryItem>(item);
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(
    item.expiryDate ? new Date(item.expiryDate) : undefined
  );
  const { toast } = useToast();
  const { suppliers, fetchSuppliers } = useSuppliers();

  useEffect(() => {
    if (open) {
      fetchSuppliers();

      // Calculate initial profit margin
      let margin = 0;
      const cost = item.cost_price || 0;
      if (cost > 0 && item.price > 0) {
        // Margin = (Price - Cost) / Cost * 100 ? 
        // Or Markup? Usually Margin = (Price - Cost) / Price. 
        // BUT user screenshot says "Profit Margin (%)". 
        // If Cost=100, Margin=20, Price=120. That is Markup (Cost + 20% Cost).
        // Online code: sellingPrice = cost + (cost * (margin / 100)).
        // This is clearly MARKUP logic (Percentage of Cost). 
        // So Margin = (Price - Cost) / Cost * 100.
        margin = ((item.price - cost) / cost) * 100;
      }

      setFormData({
        ...item,
        profit_margin: parseFloat(margin.toFixed(1))
      });

      setExpiryDate(item.expiryDate ? new Date(item.expiryDate) : undefined);
    }
  }, [open, item, fetchSuppliers]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedItem = {
      ...formData,
      expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : undefined,
      // Handle "none" supplier
      supplier_id: formData.supplier_id === "none" ? undefined : formData.supplier_id,
    };

    onSave(updatedItem);
    onOpenChange(false);
    toast({
      title: "Success",
      description: "Item updated successfully",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
        </DialogHeader>
        <EditInventoryForm
          formData={formData}
          setFormData={setFormData}
          expiryDate={expiryDate}
          setExpiryDate={setExpiryDate}
          onSubmit={handleSubmit}
          suppliers={suppliers}
          categories={categories}
        />
      </DialogContent>
    </Dialog>
  );
};
