'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { corporateEnquirySchema } from '@kanikara/contracts';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { clientRequest } from '@/lib/client-api';
import { identifyVisitor, trackEvent } from '@/lib/site-analytics';

interface CorporateInput {
  companyName: string;
  contactName: string;
  phone: string;
  email?: string;
  estimatedQuantity?: string;
  requirement?: string;
}

export default function CorporatePage() {
  const [note, setNote] = useState('');
  const form = useForm<CorporateInput>({ resolver: zodResolver(corporateEnquirySchema) });

  return (
    <>
      <div className="page-head">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>B2B</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>Corporate Gifting</h1>
      </div>
      <div className="wrap" style={{ padding: '48px var(--pad) 90px', maxWidth: 640 }}>
        <p className="lede-light" style={{ marginBottom: 30 }}>
          Diwali hampers, employee milestones, client appreciation — bulk-order fine jewellery with custom branding and packaging. Our team responds within 2 business days with a quote.
        </p>
        <form
          className="dash-card"
          onSubmit={form.handleSubmit(async (values) => {
            await clientRequest('/programs/corporate', null, { method: 'POST', body: JSON.stringify(values) });
            identifyVisitor({ phone: values.phone, name: values.contactName, email: values.email, source: 'corporate' });
            trackEvent('corporate_enquiry', { company: values.companyName });
            setNote('Enquiry received.');
            form.reset();
          })}
        >
          <div className="field"><label>Company Name</label><input required {...form.register('companyName')} /></div>
          <div className="field"><label>Contact Person</label><input required {...form.register('contactName')} /></div>
          <div className="field"><label>Phone</label><input required {...form.register('phone')} /></div>
          <div className="field"><label>Email</label><input type="email" {...form.register('email')} /></div>
          <div className="field"><label>Estimated Quantity</label><input placeholder="e.g. 50-100 pieces" {...form.register('estimatedQuantity')} /></div>
          <div className="field"><label>Requirement Details</label><textarea placeholder="Occasion, budget per piece, branding needs…" rows={4} {...form.register('requirement')} /></div>
          <button className="btn btn-gold btn-block" type="submit">Submit Enquiry</button>
          {note ? <p className="form-note">{note}</p> : null}
        </form>
      </div>
    </>
  );
}
