import { supabase } from '~/lib/supabase.server';
import type { Database } from '~/lib/supabase.server';

type Order = Database['public']['Tables']['orders']['Row'];
type OrderStatus = 'pending' | 'paid' | 'cancelled';

interface OrderFilters {
  page: number;
  limit: number;
  search?: string;
  status?: OrderStatus;
}

export class OrderService {
  static async getOrders({ page, limit, search, status }: OrderFilters) {
    const offset = (page - 1) * limit;
    let query = supabase.from('orders').select('*', { count: 'exact' });

    if (search) {
      query = query.or(`shopify_order_id.ilike.%${search}%,customer_name.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('final_payment_status', status);
    }

    const { data: orders, error, count } = await query
      .range(offset, offset + limit - 1)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      orders,
      total: count || 0,
    };
  }

  static async createOrder(data: Partial<Order>) {
    const { data: order, error } = await supabase
      .from('orders')
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return order;
  }

  static async updateOrder(id: string, data: Partial<Order>) {
    const { data: order, error } = await supabase
      .from('orders')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return order;
  }

  static async deleteOrder(id: string) {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  static async getOrderById(id: string) {
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return order;
  }
} 