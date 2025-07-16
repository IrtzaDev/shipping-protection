import type { BuilderConfig } from './builder';

export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'deposit_paid' | 'paid' | 'refunded';

export interface Order {
  id: string;
  shopify_order_id: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  build_config: BuilderConfig;
  deposit_paid: boolean;
  deposit_amount: number;
  total_amount: number;
  final_payment_status: PaymentStatus;
  order_status: OrderStatus;
  quickbooks_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderFilters {
  page: number;
  limit: number;
  search?: string;
  status?: OrderStatus;
  payment_status?: PaymentStatus;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface OrderSummary {
  total_orders: number;
  total_revenue: number;
  pending_payments: number;
  completed_orders: number;
} 