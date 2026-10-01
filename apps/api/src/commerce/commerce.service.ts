import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Address,
  CartItem,
  FlashSale,
  ProductSummary,
  StoreOrder,
} from '@kanikara/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { assertNoError } from '../common/supabase.js';
import { effectivePrice } from '../catalog/pricing.js';
import { SettingsService } from '../settings/settings.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class CommerceService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly settings: SettingsService,
  ) {}

  async cart(token: string, userId: string): Promise<CartItem[]> {
    const flash = await this.settings.flashSale();
    const { data, error } = await this.client(token)
      .from('cart_items')
      .select('*, products(*)')
      .eq('user_id', userId);
    assertNoError(error);
    return (data ?? []).map((row) => ({
      id: row.id,
      productId: row.product_id,
      quantity: row.quantity,
      variantId: row.variant_id,
      variantLabel: row.variant_label,
      product: this.summary(row.products, flash),
    }));
  }

  async addToCart(token: string, userId: string, input: {
    productId: string;
    quantity: number;
    variantId?: string | null;
    variantLabel?: string | null;
  }) {
    const client = this.client(token);
    let query = client.from('cart_items').select('*').eq('user_id', userId).eq('product_id', input.productId);
    query = input.variantId ? query.eq('variant_id', input.variantId) : query.is('variant_id', null);
    const { data: existing, error } = await query.maybeSingle();
    assertNoError(error);
    if (existing) {
      const { error: updateError } = await client.from('cart_items').update({
        quantity: existing.quantity + input.quantity,
        updated_at: new Date().toISOString(),
      }).eq('id', existing.id);
      assertNoError(updateError);
    } else {
      const { error: insertError } = await client.from('cart_items').insert({
        user_id: userId,
        product_id: input.productId,
        quantity: input.quantity,
        variant_id: input.variantId ?? null,
        variant_label: input.variantLabel ?? null,
      });
      assertNoError(insertError);
    }
    return this.cart(token, userId);
  }

  async updateQuantity(token: string, itemId: string, quantity: number) {
    const client = this.client(token);
    if (quantity < 1) {
      const { error } = await client.from('cart_items').delete().eq('id', itemId);
      assertNoError(error);
      return;
    }
    const { error } = await client.from('cart_items').update({
      quantity,
      updated_at: new Date().toISOString(),
    }).eq('id', itemId);
    assertNoError(error);
  }

  async removeItem(token: string, itemId: string) {
    const { error } = await this.client(token).from('cart_items').delete().eq('id', itemId);
    assertNoError(error);
  }

  async wishlist(token: string, userId: string) {
    const flash = await this.settings.flashSale();
    const { data, error } = await this.client(token)
      .from('wishlists')
      .select('*, products(*)')
      .eq('user_id', userId);
    assertNoError(error);
    return (data ?? []).map((row) => this.summary(row.products, flash));
  }

  async toggleWishlist(token: string, userId: string, productId: string) {
    const client = this.client(token);
    const { data, error } = await client.from('wishlists').select('id').eq('user_id', userId).eq('product_id', productId).maybeSingle();
    assertNoError(error);
    if (data) {
      const { error: deleteError } = await client.from('wishlists').delete().eq('id', data.id);
      assertNoError(deleteError);
      return { saved: false };
    }
    const { error: insertError } = await client.from('wishlists').insert({ user_id: userId, product_id: productId });
    assertNoError(insertError);
    return { saved: true };
  }

  async addresses(token: string, userId: string): Promise<Address[]> {
    const { data, error } = await this.client(token).from('addresses').select('*').eq('user_id', userId).order('is_default', { ascending: false });
    assertNoError(error);
    return (data ?? []).map(this.address);
  }

  async saveAddress(token: string, userId: string, input: {
    label: string;
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }) {
    const { error } = await this.client(token).from('addresses').insert({
      user_id: userId,
      label: input.label,
      full_name: input.fullName,
      phone: input.phone,
      address_line1: input.addressLine1,
      address_line2: input.addressLine2 ?? null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      is_default: input.isDefault,
    });
    assertNoError(error);
  }

  async deleteAddress(token: string, id: string) {
    const { error } = await this.client(token).from('addresses').delete().eq('id', id);
    assertNoError(error);
  }

  async validateCoupon(token: string, userId: string, code: string, subtotal: number) {
    const { data, error } = await this.client(token).from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).maybeSingle();
    assertNoError(error);
    if (!data) return { valid: false, message: 'Invalid or expired coupon code' };
    if (data.valid_until && new Date(data.valid_until) < new Date()) return { valid: false, message: 'This coupon has expired' };
    if (data.usage_limit && data.used_count >= data.usage_limit) return { valid: false, message: 'This coupon has reached its usage limit' };
    if (subtotal < data.min_order_amount) return { valid: false, message: `Add items worth ₹${data.min_order_amount} more to use this coupon` };
    if (data.per_user_limit) {
      const { count } = await this.client(token).from('coupon_redemptions').select('*', { count: 'exact', head: true }).eq('coupon_id', data.id).eq('user_id', userId);
      if ((count ?? 0) >= data.per_user_limit) return { valid: false, message: 'You have already used this coupon the maximum number of times' };
    }
    let discount = data.discount_type === 'percent' ? (subtotal * data.discount_value) / 100 : data.discount_value;
    if (data.max_discount) discount = Math.min(discount, data.max_discount);
    return { valid: true, code: data.code, discount: Math.round(discount) };
  }

  async checkGiftCard(token: string, code: string) {
    const { data, error } = await this.client(token).from('gift_cards').select('id,code,balance,status').eq('code', code.trim().toUpperCase()).eq('status', 'active').maybeSingle();
    assertNoError(error);
    if (!data) throw new NotFoundException('Invalid or already-used gift card code');
    return data;
  }

  async checkout(token: string, userId: string, input: {
    addressId: string;
    paymentMethod: string;
    couponCode?: string;
    giftCardCode?: string;
  }) {
    const addresses = await this.addresses(token, userId);
    const address = addresses.find((item) => item.id === input.addressId);
    if (!address) throw new NotFoundException('Delivery address not found');
    const items = await this.cart(token, userId);
    if (!items.length) throw new NotFoundException('Your bag is empty');
    const { data, error } = await this.client(token).rpc('place_order', {
      p_items: items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        variant_id: item.variantId,
        variant_label: item.variantLabel,
      })),
      p_shipping_address: {
        full_name: address.fullName,
        phone: address.phone,
        address_line1: address.addressLine1,
        address_line2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        label: address.label,
      },
      p_payment_method: input.paymentMethod,
      p_coupon_code: input.couponCode || null,
      p_gift_card_code: input.giftCardCode || null,
    });
    assertNoError(error);
    try {
      await this.client(token).rpc('reward_referrer_on_first_order', { p_user_id: userId });
    } catch {
      // Referral reward must not undo a successfully placed order.
    }
    return data;
  }

  async payu(token: string, body: Record<string, unknown>) {
    const { data, error } = await this.client(token).functions.invoke('payu-initiate', { body });
    if (error) throw new NotFoundException(error.message);
    if (!data?.action || !data?.key || !data?.hash) {
      throw new NotFoundException(data?.error ?? 'Incomplete response from payment gateway');
    }
    return data;
  }

  async orders(token: string, userId: string): Promise<StoreOrder[]> {
    const { data, error } = await this.client(token).from('orders').select('*, order_items(*)').eq('user_id', userId).order('created_at', { ascending: false });
    assertNoError(error);
    return (data ?? []).map(this.order);
  }

  async orderByNumber(token: string, orderNumber: string): Promise<StoreOrder> {
    const { data, error } = await this.client(token).from('orders').select('*, order_items(*)').eq('order_number', orderNumber).maybeSingle();
    assertNoError(error);
    if (!data) throw new NotFoundException('Order not found');
    return this.order(data);
  }

  async cancelOrder(token: string, orderId: string) {
    const { error } = await this.client(token).from('orders').update({ status: 'cancelled' }).eq('id', orderId);
    assertNoError(error);
  }

  private client(token: string): SupabaseClient {
    return this.supabase.asUser(token);
  }

  private summary(product: Record<string, unknown>, flash: FlashSale): ProductSummary {
    const tags = Array.isArray(product?.tags) ? product.tags.map(String) : [];
    const price = effectivePrice(Number(product?.price ?? 0), product?.mrp == null ? null : Number(product.mrp), tags, flash);
    return {
      id: String(product?.id ?? ''),
      name: String(product?.name ?? 'Piece'),
      slug: String(product?.slug ?? ''),
      price: price.price,
      mrp: price.mrp,
      images: Array.isArray(product?.images) ? product.images.map(String) : [],
      badge: price.isFlash ? 'Flash Sale' : null,
      stockQuantity: Number(product?.stock_quantity ?? 0),
      ratingAverage: null,
      ratingCount: 0,
      isFlash: price.isFlash,
      category: null,
    };
  }

  private address = (row: Record<string, any>): Address => ({
    id: row.id,
    label: row.label ?? 'Home',
    fullName: row.full_name,
    phone: row.phone,
    addressLine1: row.address_line1,
    addressLine2: row.address_line2,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    isDefault: Boolean(row.is_default),
  });

  private order = (row: Record<string, any>): StoreOrder => ({
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    subtotal: Number(row.subtotal ?? 0),
    discountAmount: Number(row.discount_amount ?? 0),
    shippingAmount: Number(row.shipping_amount ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    createdAt: row.created_at,
    courierName: row.courier_name,
    trackingNumber: row.tracking_number,
    trackingUrl: row.tracking_url,
    shippingAddress: row.shipping_address ?? null,
    items: (row.order_items ?? []).map((item: Record<string, any>) => ({
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: Number(item.unit_price),
      totalPrice: Number(item.total_price),
    })),
  });
}
