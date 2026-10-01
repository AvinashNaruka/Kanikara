'use client';

import { useEffect, useState } from 'react';

export function FlashCountdown({ endsAt, title }: { endsAt: string | null; title: string }) {
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (!endsAt) return;
    const tick = () => {
      const remaining = new Date(endsAt).getTime() - Date.now();
      if (remaining <= 0) {
        setLabel('Ended');
        return;
      }
      const hours = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      const seconds = Math.floor((remaining % 60_000) / 1000);
      setLabel(`${hours}h ${minutes}m ${seconds}s`);
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  return (
    <section className="flash-banner">
      <span className="eyebrow">{title}</span>
      <strong>{label || 'Live now'}</strong>
    </section>
  );
}
