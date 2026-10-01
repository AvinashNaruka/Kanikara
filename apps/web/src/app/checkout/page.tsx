'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  addressSchema,
  checkoutSchema,
  type Address,
  type CartItem,
  type SiteSettings,
} from '@kanikara/contracts';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';
import { money } from '@/lib/money';
import { rememberPincode, trackEvent } from '@/lib/site-analytics';

interface AddressInput {
  fullName: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  pincode: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ready, token } = useAuth();
  const cart = useAuthedQuery<CartItem[]>(['cart'], '/commerce/cart');
  const addresses = useAuthedQuery<Address[]>(['addresses'], '/commerce/addresses');
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: () => clientRequest<SiteSettings>('/settings/public', null),
  });
  const [addressId, setAddressId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'payu' | 'upi' | 'gift_card'>('cod');
  const [showAddress, setShowAddress] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [giftCardCode, setGiftCardCode] = useState('');
  const [giftBalance, setGiftBalance] = useState(0);
  const [agree, setAgree] = useState(false);
  const [message, setMessage] = useState('');
  const addressForm = useForm<AddressInput>({ resolver: zodResolver(addressSchema) });

  const subtotal = useMemo(
    () => (cart.data ?? []).reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [cart.data],
  );
  const codFee = paymentMethod === 'cod' ? settings.data?.codFee ?? 250 : 0;
  const giftUsed = Math.min(giftBalance, Math.max(0, subtotal - discount));
  const total = Math.max(0, subtotal - discount - giftUsed) + codFee;

  async function saveAddress(values: AddressInput) {
    await clientRequest('/commerce/addresses', token, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    await queryClient.invalidateQueries({ queryKey: ['addresses'] });
    addressForm.reset();
  }

  async function applyCoupon() {
    const result = await clientRequest<{ valid: boolean; message?: string; discount?: number }>(
      '/commerce/coupons/validate',
      token,
      { method: 'POST', body: JSON.stringify({ code: couponCode, subtotal }) },
    );
    trackEvent('coupon_try', { code: couponCode.trim().toUpperCase() });
    setDiscount(result.valid ? result.discount ?? 0 : 0);
    setMessage(result.valid ? `Coupon applied: ${money.format(result.discount ?? 0)}` : result.message ?? 'Coupon was not applied');
  }

  async function applyGiftCard() {
    const card = await clientRequest<{ balance: number }>('/commerce/gift-cards/check', token, {
      method: 'POST',
      body: JSON.stringify({ code: giftCardCode }),
    });
    setGiftBalance(Number(card.balance));
    setMessage(`Gift card balance ${money.format(Number(card.balance))}`);
  }

  function submitPayu(fields: Record<string, string>) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = fields.action;
    ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'phone', 'surl', 'furl', 'udf1', 'hash'].forEach((name) => {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.value = fields[name] ?? '';
      form.appendChild(input);
    });
    document.body.appendChild(form);
    form.submit();
  }

  async function place() {
    const parsed = checkoutSchema.safeParse({
      addressId,
      paymentMethod: total <= 0 && giftUsed > 0 ? 'gift_card' : paymentMethod,
      couponCode: couponCode || undefined,
      giftCardCode: giftCardCode || undefined,
      agreeToTerms: agree ? true : undefined,
    });
    if (!parsed.success) {
      setMessage(parsed.error.issues[0]?.message ?? 'Check the checkout details');
      return;
    }
    const chosen = addresses.data?.find((item) => item.id === addressId);
    if (chosen?.pincode) rememberPincode(chosen.pincode);
    trackEvent('checkout_click', { method: parsed.data.paymentMethod, items: cart.data?.length ?? 0 });
    if (parsed.data.paymentMethod === 'payu') {
      const address = addresses.data?.find((item) => item.id === addressId);
      const fields = await clientRequest<Record<string, string>>('/commerce/payments/payu', token, {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'order',
          amount: total,
          firstname: address?.fullName,
          email: '',
          phone: address?.phone,
          shipping_address: address,
          discount_amount: discount,
          coupon_code: couponCode || null,
          shipping_amount: 0,
        }),
      });
      submitPayu(fields);
      return;
    }
    const order = await clientRequest<{ order_number?: string }>('/commerce/checkout', token, {
      method: 'POST',
      body: JSON.stringify(parsed.data),
    });
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
    router.push(`/account/orders/${order.order_number ?? ''}`);
  }

  const payLabels = {
    cod: 'Cash on Delivery',
    payu: 'Pay Online (PayU) — UPI, Cards, NetBanking',
    upi: 'Pay via UPI',
    gift_card: 'Gift card covers the order',
  } as const;

  return (
    <>
      <div className="page-head"><h1 className="h-section">Checkout</h1></div>
      {!ready ? <p className="wrap lede-light" style={{ padding: 48 }}>Preparing checkout…</p> : null}
      {ready && !token ? (
        <p className="wrap lede-light" style={{ padding: 48 }}>
          <Link href="/login?next=/checkout">Sign in</Link> to checkout.
        </p>
      ) : null}
      {token ? (
        <div className="checkout-grid">
          <div>
            <div className="co-step">
              <h3>1. Delivery Address</h3>
              {(addresses.data ?? []).map((address) => (
                <label className={addressId === address.id ? 'pay-opt selected' : 'pay-opt'} key={address.id}>
                  <input checked={addressId === address.id} name="address" onChange={() => setAddressId(address.id)} type="radio" />
                  <span>{address.fullName}, {address.addressLine1}, {address.city} {address.pincode}</span>
                </label>
              ))}
              <button className="btn-ghost" onClick={() => setShowAddress((value) => !value)} type="button">+ Add new address</button>
              {showAddress ? (
                <form onSubmit={addressForm.handleSubmit(saveAddress)} style={{ marginTop: 16 }}>
                  <div className="field"><label>Full Name</label><input required {...addressForm.register('fullName')} /></div>
                  <div className="field"><label>Phone</label><input required {...addressForm.register('phone')} /></div>
                  <div className="field"><label>Address Line 1</label><input required {...addressForm.register('addressLine1')} /></div>
                  <div className="field"><label>City</label><input required {...addressForm.register('city')} /></div>
                  <div className="field"><label>State</label><input required {...addressForm.register('state')} /></div>
                  <div className="field"><label>Pincode</label><input required {...addressForm.register('pincode')} /></div>
                  <button className="btn btn-line-dark" type="submit">Save Address</button>
                </form>
              ) : null}
            </div>
            <div className="co-step">
              <h3>2. Payment Method</h3>
              {(['cod', 'payu', 'upi', 'gift_card'] as const).map((method) => (
                <label className={paymentMethod === method ? 'pay-opt selected' : 'pay-opt'} key={method}>
                  <input checked={paymentMethod === method} name="pay" onChange={() => setPaymentMethod(method)} type="radio" />
                  <span>{payLabels[method]}</span>
                </label>
              ))}
              {paymentMethod === 'upi' ? <p className="lede-light">Pay {money.format(total)} to Kanikara@upi, then confirm below.</p> : null}
            </div>
            <div className="co-step">
              <h3>3. Have a coupon?</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter code" style={{ flex: 1, border: '1px solid var(--line-light)', padding: '11px 13px' }} value={couponCode} />
                <button className="btn btn-line-dark" onClick={() => applyCoupon().catch((error) => setMessage(error.message))} type="button">Apply</button>
              </div>
            </div>
            <div className="co-step">
              <h3>4. Have a Kanikara gift card?</h3>
              <div style={{ display: 'flex', gap: 10 }}>
                <input onChange={(event) => setGiftCardCode(event.target.value)} placeholder="GIFT-XXXX-XXXX" style={{ flex: 1, border: '1px solid var(--line-light)', padding: '11px 13px' }} value={giftCardCode} />
                <button className="btn btn-line-dark" onClick={() => applyGiftCard().catch((error) => setMessage(error.message))} type="button">Apply</button>
              </div>
            </div>
            {message ? <p className="form-note">{message}</p> : null}
          </div>
          <aside className="co-summary dash-card">
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 19, marginBottom: 14 }}>Order Summary</h3>
            <div className="sum-row"><span>Subtotal</span><span>{money.format(subtotal)}</span></div>
            <div className="sum-row"><span>Shipping</span><span>Free</span></div>
            {codFee ? <div className="sum-row"><span>COD Charge</span><span>{money.format(codFee)}</span></div> : null}
            <div className="sum-row"><span>Discount</span><span>{discount ? money.format(discount) : '—'}</span></div>
            <div className="sum-row"><span>Gift Card</span><span>{giftUsed ? money.format(giftUsed) : '—'}</span></div>
            <div className="sum-row total"><span>Total</span><span>{money.format(total)}</span></div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, margin: '14px 0', fontSize: 13 }}>
              <input checked={agree} onChange={(event) => setAgree(event.target.checked)} type="checkbox" />
              <span>I agree to the <Link href="/policies" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>Terms & Refund Policy</Link></span>
            </label>
            <button className="btn btn-gold btn-block" onClick={() => place().catch((error) => setMessage(error.message))} type="button">Place Order</button>
          </aside>
        </div>
      ) : null}
    </>
  );
}
