
export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  reorderLevel: number;
  expiryDate?: string;
  manufacturer?: string;
  batchNumber?: string;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  user_id?: string;
  cost_price?: number;
  supplier_id?: string;
  restock_invoice_number?: string;
}
