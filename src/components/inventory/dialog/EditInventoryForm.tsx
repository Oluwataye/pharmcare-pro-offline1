
import { Button } from "@/components/ui/button";
import { InventoryItem } from "@/types/inventory";
import { TextField, SelectField } from "@/components/inventory/form/FormField";
import { DatePickerField } from "@/components/inventory/form/DatePickerField";
import { UNIT_OPTIONS } from "@/components/inventory/form/formUtils";
import { SelectItem } from "@/components/ui/select";
import { Supplier } from "@/types/supplier";

interface EditInventoryFormProps {
  formData: InventoryItem;
  setFormData: (data: InventoryItem) => void;
  expiryDate: Date | undefined;
  setExpiryDate: (date: Date | undefined) => void;
  onSubmit: (e: React.FormEvent) => void;
  suppliers?: Supplier[];
  categories?: string[];
}

export const EditInventoryForm = ({
  formData,
  setFormData,
  expiryDate,
  setExpiryDate,
  onSubmit,
  suppliers = [],
  categories = []
}: EditInventoryFormProps) => {

  const handleInputChange = (field: string, value: string | number) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
        <div className="col-span-1 sm:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Basic Information</h3>
        </div>
        <TextField
          id="edit-name"
          label="Product Name"
          value={formData.name}
          onChange={(value) => handleInputChange("name", value)}
          required
        />

        <TextField
          id="edit-sku"
          label="SKU"
          value={formData.sku}
          onChange={(value) => handleInputChange("sku", value)}
          required
        />

        <SelectField
          id="edit-category"
          label="Category"
          value={formData.category}
          onValueChange={(value) => handleInputChange("category", value)}
          required
        >
          {categories.length > 0 ? (
            categories.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))
          ) : (
            <SelectItem value={formData.category}>{formData.category}</SelectItem>
          )}
        </SelectField>

        <DatePickerField
          id="edit-expiryDate"
          label="Expiry Date"
          date={expiryDate}
          onDateChange={setExpiryDate}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-b pb-4">
        <div className="col-span-1 sm:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Stock & Pricing</h3>
        </div>
        <TextField
          id="edit-quantity"
          label="Quantity"
          type="number"
          value={formData.quantity}
          onChange={(value) => handleInputChange("quantity", parseInt(value) || 0)}
          required
          min="0"
        />

        <SelectField
          id="edit-unit"
          label="Unit"
          value={formData.unit}
          onValueChange={(value) => handleInputChange("unit", value)}
          required
        >
          {UNIT_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectField>

        <TextField
          id="edit-cost-price"
          label="Cost Price (₦)"
          type="number"
          value={formData.cost_price || 0}
          onChange={(value) => handleInputChange("cost_price", parseFloat(value) || 0)}
          required
          min="0"
          step="0.01"
        />

        <TextField
          id="edit-price"
          label="Selling Price (₦)"
          type="number"
          value={formData.price}
          onChange={(value) => handleInputChange("price", parseFloat(value) || 0)}
          required
          min="0"
          step="0.01"
        />

        <TextField
          id="edit-reorderLevel"
          label="Reorder Level"
          type="number"
          value={formData.reorderLevel}
          onChange={(value) => handleInputChange("reorderLevel", parseInt(value) || 0)}
          required
          min="0"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="col-span-1 sm:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground mb-1">Supply Chain Details</h3>
        </div>
        <SelectField
          id="edit-supplier_id"
          label="Supplier"
          value={formData.supplier_id || "none"}
          onValueChange={(value) => handleInputChange("supplier_id", value)}
        >
          <SelectItem value="none">No Supplier</SelectItem>
          {suppliers.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name}
            </SelectItem>
          ))}
        </SelectField>

        <TextField
          id="edit-restock_invoice_number"
          label="Invoice #"
          value={formData.restock_invoice_number || ""}
          onChange={(value) => handleInputChange("restock_invoice_number", value)}
          placeholder="Invoice reference"
        />

        <TextField
          id="edit-manufacturer"
          label="Manufacturer"
          value={formData.manufacturer || ""}
          onChange={(value) => handleInputChange("manufacturer", value)}
        />

        <TextField
          id="edit-batchNumber"
          label="Batch Number"
          value={formData.batchNumber || ""}
          onChange={(value) => handleInputChange("batchNumber", value)}
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto mt-4 px-8">Save Changes</Button>
    </form>
  );
};
