import { supabase } from './supabase';

export type SellerSettings = {
  shop_name: string;
  description: string;
  contact_email: string;
};

export async function loadSellerSettings(userId: string): Promise<SellerSettings> {
  const { data, error } = await supabase
    .from('seller_settings')
    .select('shop_name, description, contact_email')
    .eq('user_id', userId)
    .abortSignal(AbortSignal.timeout(15_000))
    .maybeSingle();
  if (error) throw error;
  return data ?? { shop_name: 'Shine', description: '', contact_email: '' };
}

export async function saveSellerSettings(userId: string, settings: SellerSettings) {
  const { error } = await supabase.from('seller_settings').upsert({
    user_id: userId,
    ...settings,
    updated_at: new Date().toISOString(),
  }).abortSignal(AbortSignal.timeout(15_000));
  if (error) throw error;
}
