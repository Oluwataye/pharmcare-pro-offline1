
import { Button } from "@/components/ui/button";
import { InventoryItem } from "@/types/inventory";
import { TextField, SelectField } from "@/components/inventory/form/FormField";
import { DatePickerField } from "@/components/inventory/form/DatePickerField";
import { UNIT_OPTIONS } from "@/components/inventory/form/formUtils";
import { SelectItem } from "@/components/ui/select";
import { Supplier } from "@/types/supplier";
import { AddSupplierForm } from "@/components/suppliers/AddSupplierForm";
import { useState } from "react";

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
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);

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
          onChange={(value) => {
            const cost = parseFloat(value) || 0;
            const margin = formData.profit_margin || 0;
            const price = margin > 0 ? cost + (cost * (margin / 100)) : formData.price; // Markup logic
            setFormData({
              ...formData,
              cost_price: cost,
              price: parseFloat(price.toFixed(2))
            });
          }}
          required
          min="0"
          step="0.01"
        />

        <TextField
          id="edit-profit-margin"
          label="Profit Margin (%)"
          type="number"
          value={formData.profit_margin || 0}
          onChange={(value) => {
            const margin = parseFloat(value) || 0;
            const cost = formData.cost_price || 0;
            const price = cost + (cost * (margin / 100));
            setFormData({
              ...formData,
              profit_margin: margin,
              price: parseFloat(price.toFixed(2))
            });
          }}
          min="0"
          step="0.1"
          placeholder="0"
        />

        <div className="space-y-1">
          <TextField
            id="edit-price"
            label="Selling Price (₦)"
            type="number"
            value={formData.price}
            onChange={(value) => {
              const price = parseFloat(value) || 0;
              const cost = formData.cost_price || 0;
              // Calculate margin from price
              const margin = cost > 0 ? ((price - cost) / cost) * 100 : 0;
              setFormData({
                ...formData,
                price: price,
                profit_margin: parseFloat(margin.toFixed(1))
              });
            }}
            required
            min="0"
            step="0.01"
          />
          {(formData.price > 0 || (formData.cost_price || 0) > 0) && (
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-muted-foreground">
                Profit: <span className={formData.price >= (formData.cost_price || 0) ? "text-green-600 font-medium" : "text-destructive font-medium"}>
                  ₦{(formData.price - (formData.cost_price || 0)).toLocaleString()}
                </span>
              </span>
            </div>
          )}
        </div>

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
        <div className="space-y-4">
          {isAddingSupplier ? (
            <div className="col-span-1 sm:col-span-2 p-4 bg-primary/5 rounded-lg border border-primary/20 animate-in fade-in zoom-in duration-200">
              <h4 className="text-sm font-semibold text-primary mb-2">New Supplier Details</h4>
              <AddSupplierForm
                onSuccess={(newSupplier) => {
                  handleInputChange("supplier_id", newSupplier.id);
                  setIsAddingSupplier(false);
                }}
                onCancel={() => setIsAddingSupplier(false)}
              />
            </div>
          ) : (
            <SelectField
              id="edit-supplier_id"
              label="Supplier"
              value={formData.supplier_id || "none"}
              onValueChange={(value) => {
                if (value === "add-new") {
                  setIsAddingSupplier(true);
                } else {
                  handleInputChange("supplier_id", value);
                }
              }}
            >
              <SelectItem value="none">No Supplier</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
              <SelectItem value="add-new" className="text-primary font-medium border-t">
                + Add New Supplier
              </SelectItem>
            </SelectField>
          )}
        </div>

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
