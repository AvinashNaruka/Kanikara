'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { currentPage, identifyVisitor, trackEvent } from '@/lib/site-analytics';

export function LeadPopup() {
  const { token, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const show = () => {
      if (document.body.classList.contains('admin-mode')) return;
      if (localStorage.getItem('kk_has_phone') === '1') return;
      if (Date.now() - Number(localStorage.getItem('kk_lead_seen') || 0) < 7 * 864e5) return;
      if (sessionStorage.getItem('kk_lead_open') === '1') return;
      if (['checkout', 'order-confirm', 'dashboard'].includes(currentPage())) return;
      sessionStorage.setItem('kk_lead_open', '1');
      const metadata = session?.user?.user_metadata as { phone?: string } | undefined;
      if (metadata?.phone) return;
      setOpen(true);
      trackEvent('lead_popup_shown', { trigger: 'visit' });
    };
    window.addEventListener('kk-lead', show);
    return () => window.removeEventListener('kk-lead', show);
  }, [session]);

  function close() {
    sessionStorage.removeItem('kk_lead_open');
    localStorage.setItem('kk_lead_seen', String(Date.now()));
    trackEvent('lead_popup_dismiss', { trigger: 'visit' });
    setOpen(false);
  }

  function submit() {
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      setError('Enter a 10-digit WhatsApp number.');
      return;
    }
    if (!consent) {
      setError('Tick the consent box so we can message you.');
      return;
    }
    identifyVisitor({ phone: digits, name, email: session?.user?.email, source: 'lead_popup', consent: true, token });
    trackEvent('lead_captured', { trigger: 'visit' });
    sessionStorage.removeItem('kk_lead_open');
    localStorage.setItem('kk_lead_seen', String(Date.now()));
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="kk-lead" role="dialog">
      <button aria-label="Close" className="kk-lead-x" onClick={close} type="button">✕</button>
      <h4>Want a note on this piece?</h4>
      <p>Share your WhatsApp number and Kanikara will help with size, price, and availability.</p>
      <input autoComplete="name" onChange={(event) => setName(event.target.value)} placeholder="Your name (optional)" type="text" value={name} />
      <input autoComplete="tel-national" inputMode="numeric" maxLength={10} onChange={(event) => setPhone(event.target.value)} placeholder="WhatsApp number (10 digits)" type="tel" value={phone} />
      <label className="kk-lead-c">
        <input checked={consent} onChange={(event) => setConsent(event.target.checked)} type="checkbox" />
        <span>I agree to be contacted by Kanikara on WhatsApp / call about products and offers. I can opt out anytime.</span>
      </label>
      <div className="kk-lead-err">{error}</div>
      <button className="kk-lead-go" onClick={submit} type="button">Notify me on WhatsApp</button>
    </div>
  );
}
