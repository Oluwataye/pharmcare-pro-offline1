
export interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  discount?: number; // Optional discount per item
  unitPrice?: number; // For tracking original price vs wholesale price
  isWholesale?: boolean;
  costPrice?: number;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
  customerName?: string;
  customerPhone?: string;
  discount?: number; // Overall sale discount
  manualDiscount?: number; // Manual amount discount
  cashierName?: string; // Added cashier name
  cashierEmail?: string; // Added cashier email
  cashierId?: string; // Added cashier ID for database references
  transactionId?: string; // Unique transaction identifier
  businessName?: string; // For wholesale customers
  businessAddress?: string; // For wholesale customers
  saleType: 'retail' | 'wholesale';
  profit?: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  wholesalePrice?: number; // Added wholesale price
  minWholesaleQuantity?: number; // Minimum quantity for wholesale
  stock: number;
  discount?: number; // Potential product discount
}

export interface DiscountConfig {
  defaultDiscount: number;
  maxDiscount: number;
  enabled: boolean;
  bulkDiscountEnabled?: boolean;
  loyaltyDiscountEnabled?: boolean;
  wholesaleDiscountEnabled?: boolean;
  manualAmountEnabled?: boolean; // New manual amount discount
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  username: string;
  email: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: string;
  timestamp: Date;
}

export interface WholesaleCustomer {
  id: string;
  businessName: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  creditLimit?: number;
  balance?: number;
  lastOrderDate?: string;
}
