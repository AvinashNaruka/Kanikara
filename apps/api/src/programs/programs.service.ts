import { Injectable } from '@nestjs/common';
import type {
  corporateEnquirySchema,
  customOrderSchema,
  newsletterSchema,
} from '@kanikara/contracts';
import type { z } from 'zod';
import { assertNoError } from '../common/supabase.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class ProgramsService {
  constructor(private readonly supabase: SupabaseService) {}

  async customOrders(token: string, userId: string) {
    const { data, error } = await this.supabase
      .asUser(token)
      .from('custom_order_requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async createCustomOrder(token: string, userId: string, input: z.infer<typeof customOrderSchema>) {
    const { error } = await this.supabase.asUser(token).from('custom_order_requests').insert({
      user_id: userId,
      full_name: input.fullName,
      phone: input.phone,
      email: input.email || null,
      jewellery_type: input.jewelleryType,
      occasion: input.occasion || null,
      budget_range: input.budgetRange || null,
      description: input.description || null,
    });
    assertNoError(error);
  }

  async giftCards(token: string, userId: string) {
    const { data, error } = await this.supabase
      .asUser(token)
      .from('gift_cards')
      .select('*')
      .eq('purchased_by', userId)
      .order('created_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async savingsPlans() {
    const { data, error } = await this.supabase.anon
      .from('savings_plans')
      .select('*')
      .eq('is_active', true)
      .order('monthly_amount');
    assertNoError(error);
    return data ?? [];
  }

  async subscriptions(token: string, userId: string) {
    const { data, error } = await this.supabase
      .asUser(token)
      .from('savings_subscriptions')
      .select('*, savings_plans(*), savings_payments(*)')
      .eq('user_id', userId)
      .order('started_at', { ascending: false });
    assertNoError(error);
    return data ?? [];
  }

  async subscribe(token: string, userId: string, planId: string) {
    const { data, error } = await this.supabase
      .asUser(token)
      .from('savings_subscriptions')
      .insert({ user_id: userId, plan_id: planId })
      .select()
      .single();
    assertNoError(error);
    return data;
  }

  async cancelSubscription(token: string, subscriptionId: string) {
    const { error } = await this.supabase
      .asUser(token)
      .from('savings_subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);
    assertNoError(error);
  }

  async recordSavingsPayment(token: string, subscriptionId: string, amount: number, paymentId: string) {
    const client = this.supabase.asUser(token);
    const { error: payError } = await client.from('savings_payments').insert({
      subscription_id: subscriptionId,
      amount,
      payment_id: paymentId,
    });
    assertNoError(payError);
    const { data: subscription, error } = await client
      .from('savings_subscriptions')
      .select('*, savings_plans(duration_months)')
      .eq('id', subscriptionId)
      .single();
    assertNoError(error);
    const monthsPaid = Number(subscription.months_paid ?? 0) + 1;
    const totalPaid = Number(subscription.total_paid ?? 0) + Number(amount);
    const matured = monthsPaid >= Number(subscription.savings_plans?.duration_months ?? 0);
    const { error: updateError } = await client.from('savings_subscriptions').update({
      months_paid: monthsPaid,
      total_paid: totalPaid,
      status: matured ? 'matured' : 'active',
      matured_at: matured ? new Date().toISOString() : null,
    }).eq('id', subscriptionId);
    assertNoError(updateError);
  }

  async corporate(input: z.infer<typeof corporateEnquirySchema>) {
    const { error } = await this.supabase.anon.from('corporate_enquiries').insert({
      company_name: input.companyName,
      contact_name: input.contactName,
      phone: input.phone,
      email: input.email || null,
      estimated_quantity: input.estimatedQuantity || null,
      requirement: input.requirement || null,
    });
    assertNoError(error);
  }

  async newsletter(input: z.infer<typeof newsletterSchema>) {
    const { error } = await this.supabase.anon.from('email_subscriptions').insert({
      email: input.email,
      source: 'website',
    });
    assertNoError(error);
  }

  async stores() {
    const { data, error } = await this.supabase.anon
      .from('store_locations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    assertNoError(error);
    return data ?? [];
  }

  async press() {
    const { data, error } = await this.supabase.anon
      .from('press_mentions')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    assertNoError(error);
    return data ?? [];
  }
}
