'use client';

import { useState } from 'react';
import { rememberPincode } from '@/lib/site-analytics';

export function DeliveryPincode() {
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [saved, setSaved] = useState('');

  return (
    <>
      <button className="mq-pincode" onClick={() => setOpen(true)} type="button">
        {saved ? `Delivery PIN ${saved}` : 'Update Delivery Pincode'}
      </button>
      {open ? (
        <form
          className="kk-lead"
          onSubmit={(event) => {
            event.preventDefault();
            rememberPincode(pin);
            setSaved(pin.replace(/\D/g, '').slice(0, 6));
            setOpen(false);
          }}
        >
          <button aria-label="Close" className="kk-lead-x" onClick={() => setOpen(false)} type="button">✕</button>
          <h4>Delivery pincode</h4>
          <p>We use this to estimate delivery to your city.</p>
          <input inputMode="numeric" maxLength={6} onChange={(event) => setPin(event.target.value)} placeholder="6-digit PIN" value={pin} />
          <button className="kk-lead-go" type="submit">Save pincode</button>
        </form>
      ) : null}
    </>
  );
}
