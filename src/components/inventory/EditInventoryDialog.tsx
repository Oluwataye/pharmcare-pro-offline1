
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
      setFormData(item);
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
