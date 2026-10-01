'use client';

import type { ProductSummary } from '@kanikara/contracts';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { ProductCard } from '@/components/product-card';
import { useAuth } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';

const amounts = [1000, 2500, 5000, 10000];

export default function GiftStorePage() {
  const { token } = useAuth();
  const [amount, setAmount] = useState(1000);
  const [custom, setCustom] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const forHer = useQuery({
    queryKey: ['gifts', 'her'],
    queryFn: () => clientRequest<ProductSummary[]>('/catalog/products?tags=audience:her&limit=4', null),
  });
  const forHim = useQuery({
    queryKey: ['gifts', 'him'],
    queryFn: () => clientRequest<ProductSummary[]>('/catalog/products?tags=audience:him&limit=4', null),
  });

  async function buy() {
    if (!token) {
      setNote('Sign in before buying a gift card.');
      return;
    }
    const fields = await clientRequest<Record<string, string>>('/commerce/payments/payu', token, {
      method: 'POST',
      body: JSON.stringify({
        purpose: 'gift_card',
        amount,
        recipient_name: recipientName,
        recipient_email: recipientEmail,
        message,
      }),
    });
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

  return (
    <>
      <div className="page-head">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Gifting</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>Gift Store</h1>
      </div>
      <div className="wrap" style={{ padding: '48px var(--pad) 30px' }}>
        <div className="story" style={{ alignItems: 'start' }}>
          <form
            className="dash-card"
            onSubmit={(event) => {
              event.preventDefault();
              buy().catch((error) => setNote(error.message));
            }}
          >
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>Send a Gift Card</h3>
            <p className="lede-light" style={{ marginTop: 8 }}>
              Let them pick exactly what they love. Delivered instantly as a code you can share.
            </p>
            <div style={{ marginTop: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.03em', color: 'rgba(34,31,28,.6)' }}>Choose Amount</label>
              <div style={{ display: 'flex', gap: 10, margin: '10px 0 16px', flexWrap: 'wrap' }}>
                {amounts.map((value) => (
                  <button
                    className={amount === value && !custom ? 'btn btn-line-dark btn-sm gift-amt active' : 'btn btn-line-dark btn-sm gift-amt'}
                    key={value}
                    onClick={() => { setAmount(value); setCustom(''); }}
                    type="button"
                  >
                    ₹{value.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <div className="field">
                <label>Or enter custom amount (₹)</label>
                <input
                  min={500}
                  onChange={(event) => {
                    setCustom(event.target.value);
                    setAmount(Number(event.target.value) || 0);
                  }}
                  required
                  type="number"
                  value={custom || amount}
                />
              </div>
              <div className="field"><label>Recipient&apos;s Name</label><input onChange={(event) => setRecipientName(event.target.value)} value={recipientName} /></div>
              <div className="field"><label>Recipient&apos;s Email (optional)</label><input onChange={(event) => setRecipientEmail(event.target.value)} type="email" value={recipientEmail} /></div>
              <div className="field"><label>Personal Message</label><textarea onChange={(event) => setMessage(event.target.value)} rows={3} value={message} /></div>
              <button className="btn btn-gold btn-block" type="submit">Buy Gift Card</button>
              {note ? <p className="form-note">{note}</p> : null}
            </div>
          </form>
          <div>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 14 }}>Your Gift Cards</h3>
            <p className="lede-light">Sign in to view gift cards you&apos;ve purchased.</p>
          </div>
        </div>
      </div>
      <section className="block tight">
        <div className="block-inner">
          <div className="block-head">
            <div><span className="eyebrow">Curated</span><h2 className="h-section">Gifts for Her</h2></div>
            <Link className="btn-ghost" href="/shop?tags=audience:her">View all</Link>
          </div>
          <div className="p-grid">
            {(forHer.data ?? []).map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>
      <section className="block tight on-ink">
        <div className="block-inner">
          <div className="block-head">
            <div><span className="eyebrow">Curated</span><h2 className="h-section" style={{ color: 'var(--ivory)' }}>Gifts for Him</h2></div>
            <Link className="btn-ghost" href="/shop?tags=audience:him">View all</Link>
          </div>
          <div className="p-grid">
            {(forHim.data ?? []).map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>
    </>
  );
}
