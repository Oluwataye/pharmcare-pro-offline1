// Dispensary Queue Types

export type DispensaryQueueStatus = 'pending' | 'called' | 'processed' | 'cancelled';

export interface DispensaryQueueItem {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  price: number;
  unit?: string;
}

export interface DispensaryQueueEntry {
  id: string;
  queue_number: string;
  patient_name: string | null;
  dispenser_id: string;
  dispenser_name: string;
  items: DispensaryQueueItem[];
  subtotal: number;
  status: DispensaryQueueStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
  sale_id: string | null;
  cashier_id: string | null;
  cashier_name: string | null;
}

export interface CreateDispensaryQueuePayload {
  patient_name?: string;
  items: DispensaryQueueItem[];
  subtotal: number;
  notes?: string;
}

export interface ProcessQueuePayload {
  sale_id: string;
  cashier_name: string;
}
