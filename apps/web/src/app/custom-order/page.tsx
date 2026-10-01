'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { customOrderSchema } from '@kanikara/contracts';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';
import { identifyVisitor, trackEvent } from '@/lib/site-analytics';

interface CustomInput {
  fullName: string;
  phone: string;
  email?: string;
  jewelleryType: string;
  occasion?: string;
  budgetRange?: string;
  description?: string;
}

const types = ['Ring', 'Necklace', 'Earrings', 'Bangle', 'Bridal Set', 'Other'];
const budgets = ['Under ₹25,000', '₹25,000 – ₹75,000', '₹75,000 – ₹2,00,000', 'Above ₹2,00,000'];

export default function CustomOrderPage() {
  const { token } = useAuth();
  const [note, setNote] = useState('');
  const form = useForm<CustomInput>({
    resolver: zodResolver(customOrderSchema),
    defaultValues: { jewelleryType: 'Ring', budgetRange: budgets[0] },
  });

  return (
    <>
      <div className="page-head">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Bespoke</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>Design a Custom Piece</h1>
      </div>
      <div className="wrap" style={{ padding: '48px var(--pad) 90px', maxWidth: 640 }}>
        <p className="lede-light" style={{ marginBottom: 30 }}>
          Tell us what you&apos;re imagining — our design team responds within 24 hours with next steps and an indicative quote.
        </p>
        <form
          className="dash-card"
          onSubmit={form.handleSubmit(async (values) => {
            if (!token) {
              setNote('Sign in so we can attach this request to your account.');
              return;
            }
            await clientRequest('/programs/custom-orders', token, { method: 'POST', body: JSON.stringify(values) });
            identifyVisitor({ phone: values.phone, name: values.fullName, email: values.email, source: 'custom_order', token });
            trackEvent('custom_order_submit', { type: values.jewelleryType, budget: values.budgetRange ?? '' });
            setNote('Request received. We will contact you shortly.');
            form.reset();
          })}
        >
          <div className="field"><label>Full Name</label><input required {...form.register('fullName')} /></div>
          <div className="field"><label>Phone</label><input required {...form.register('phone')} /></div>
          <div className="field"><label>Email</label><input type="email" {...form.register('email')} /></div>
          <div className="field">
            <label>Jewellery Type</label>
            <select {...form.register('jewelleryType')}>
              {types.map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div className="field"><label>Occasion</label><input placeholder="Wedding, anniversary, gifting…" {...form.register('occasion')} /></div>
          <div className="field">
            <label>Budget Range</label>
            <select {...form.register('budgetRange')}>
              {budgets.map((budget) => <option key={budget}>{budget}</option>)}
            </select>
          </div>
          <div className="field"><label>Describe what you have in mind</label><textarea rows={4} {...form.register('description')} /></div>
          <button className="btn btn-gold btn-block" type="submit">Submit Request</button>
          {note ? <p className="form-note">{note}</p> : null}
        </form>
      </div>
    </>
  );
}
