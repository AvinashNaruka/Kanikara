import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { assertNoError } from '../common/supabase.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  private client(token: string) {
    return this.supabase.privileged(token);
  }

  async stats(token: string) {
    const client = this.client(token);
    const [orders, products, profiles, paid] = await Promise.all([
      client.from('orders').select('*', { count: 'exact', head: true }),
      client.from('products').select('*', { count: 'exact', head: true }),
      client.from('profiles').select('*', { count: 'exact', head: true }),
      client.from('orders').select('total_amount').eq('payment_status', 'paid'),
    ]);
    assertNoError(orders.error);
    assertNoError(products.error);
    assertNoError(profiles.error);
    assertNoError(paid.error);
    const revenue = (paid.data ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
    return {
      orders: orders.count ?? 0,
      products: products.count ?? 0,
      customers: profiles.count ?? 0,
      revenue,
    };
  }

  async list(token: string, table: string, order = 'created_at') {
    const { data, error } = await this.client(token).from(table).select('*').order(order, { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async products(token: string) {
    const { data, error } = await this.client(token)
      .from('products')
      .select('*, categories(name)')
      .order('created_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async giftCards(token: string) {
    const { data, error } = await this.client(token)
      .from('gift_cards')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async subscriptions(token: string) {
    const { data, error } = await this.client(token)
      .from('savings_subscriptions')
      .select('*, savings_plans(name), profiles(full_name, phone)')
      .order('started_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async assignPlan(token: string, userId: string, planId: string) {
    const { error } = await this.client(token)
      .from('savings_subscriptions')
      .insert({ user_id: userId, plan_id: planId });
    assertNoError(error);
  }

  async save(token: string, table: string, payload: Record<string, unknown>) {
    const client = this.client(token);
    if (payload.id) {
      const { id, ...changes } = payload;
      const { error } = await client.from(table).update(changes).eq('id', id);
      assertNoError(error);
      return;
    }
    const { error } = await client.from(table).insert(payload);
    assertNoError(error);
  }

  async remove(token: string, table: string, id: string) {
    const { error } = await this.client(token).from(table).delete().eq('id', id);
    assertNoError(error);
  }

  async orders(token: string) {
    const { data, error } = await this.client(token)
      .from('orders')
      .select('*, order_items(*, products(serial_no)), profiles(full_name, phone)')
      .order('created_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async updateOrder(token: string, id: string, body: Record<string, unknown>) {
    const status = String(body.status ?? '');
    const { error } = await this.client(token).from('orders').update({
      ...body,
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    assertNoError(error);
    if (status) {
      const { error: historyError } = await this.client(token).from('order_status_history').insert({
        order_id: id,
        status,
      });
      assertNoError(historyError);
    }
  }

  async reviews(token: string) {
    const { data, error } = await this.client(token)
      .from('reviews')
      .select('*, products(name), profiles(full_name)')
      .order('created_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async moderateReview(token: string, id: string, approve: boolean) {
    const { error } = await this.client(token).from('reviews').update({ is_approved: approve }).eq('id', id);
    assertNoError(error);
  }

  async customers(token: string) {
    const { data, error } = await this.client(token)
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async customerAction(token: string, body: Record<string, unknown>) {
    const { data, error } = await this.supabase.asUser(token).functions.invoke('admin-customers', { body });
    if (error) throw error;
    if (data && typeof data === 'object' && 'error' in data && data.error) {
      throw new Error(String(data.error));
    }
    return data;
  }

  async settings(token: string) {
    const { data, error } = await this.client(token).from('site_settings').select('*');
    assertNoError(error);
    return data ?? [];
  }

  async updateSetting(token: string, key: string, value: string) {
    const { error } = await this.client(token).from('site_settings').update({
      value,
      updated_at: new Date().toISOString(),
    }).eq('key', key);
    assertNoError(error);
  }

  async signUpload(filename: string) {
    if (!this.supabase.admin) {
      throw new ServiceUnavailableException('Image uploads need SUPABASE_SERVICE_ROLE_KEY on the API');
    }
    const path = `${Date.now()}-${filename.replace(/[^\w.-]+/g, '-')}`;
    const { data, error } = await this.supabase.admin.storage
      .from('product-images')
      .createSignedUploadUrl(path);
    assertNoError(error);
    const { data: publicData } = this.supabase.admin.storage.from('product-images').getPublicUrl(path);
    return { path, signedUrl: data?.signedUrl, token: data?.token, publicUrl: publicData.publicUrl };
  }
}
