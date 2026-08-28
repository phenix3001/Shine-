import type { CartItem } from './cart';
import { supabase } from './supabase';

export async function createOrder(items: CartItem[], customerName: string, phone: string, address: string) {
  const { data, error } = await supabase.rpc('create_market_order', {
    cart_items: items.map((item) => ({ product_id: item.id, quantity: item.quantity })),
    customer_name: customerName,
    customer_phone: phone,
    customer_address: address,
  });
  if (error) throw error;
  return data as string;
}
