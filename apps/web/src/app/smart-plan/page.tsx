'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';
import { money } from '@/lib/money';

interface Plan {
  id: string;
  name: string;
  monthly_amount: number;
  duration_months: number;
  bonus_percent?: number;
  description?: string;
}

interface Subscription {
  id: string;
  status: string;
  months_paid: number;
  total_paid: number;
  savings_plans?: { name?: string; monthly_amount?: number };
}

export default function SmartPlanPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const plans = useQuery({
    queryKey: ['plans'],
    queryFn: () => clientRequest<Plan[]>('/programs/savings/plans', null),
  });
  const subscriptions = useQuery({
    queryKey: ['subscriptions', token],
    enabled: Boolean(token),
    queryFn: () => clientRequest<Subscription[]>('/programs/savings/subscriptions', token),
  });

  async function subscribe(planId: string) {
    if (!token) {
      setNote('Sign in to start a plan.');
      return;
    }
    await clientRequest('/programs/savings/subscriptions', token, {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
    await queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
    setNote('Plan started.');
  }

  async function pay(subscription: Subscription) {
    const amount = Number(subscription.savings_plans?.monthly_amount ?? 0);
    const fields = await clientRequest<Record<string, string>>('/commerce/payments/payu', token, {
      method: 'POST',
      body: JSON.stringify({ purpose: 'savings_payment', amount, subscription_id: subscription.id }),
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
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Save Monthly, Buy Later</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>Smart Purchase Plan</h1>
      </div>
      <div className="wrap" style={{ padding: '48px var(--pad) 30px' }}>
        <p className="lede-light" style={{ marginBottom: 30, maxWidth: '60ch' }}>
          Pay a fixed amount every month, get bonus value added at the end of the term, and redeem the full amount towards any Kanikara piece — a simple way to save towards that one big purchase.
        </p>
        <div className="stat-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {(plans.data ?? []).map((plan) => (
            <article className="dash-card" key={plan.id}>
              <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>{plan.name}</h3>
              <p className="lede-light" style={{ marginTop: 8 }}>{money.format(plan.monthly_amount)} / month · {plan.duration_months} months</p>
              {plan.bonus_percent ? <p className="lede-light">{plan.bonus_percent}% bonus on maturity</p> : null}
              <button className="btn btn-gold" onClick={() => subscribe(plan.id).catch((error) => setNote(error.message))} style={{ marginTop: 16 }} type="button">Start plan</button>
            </article>
          ))}
        </div>
      </div>
      <div className="wrap" style={{ padding: '0 var(--pad) 90px' }}>
        <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22, marginBottom: 14 }}>My Plans</h3>
        {!token ? <p className="lede-light">Sign in to view or start a plan.</p> : null}
        {(subscriptions.data ?? []).map((subscription) => (
          <article className="dash-card" key={subscription.id} style={{ marginBottom: 14 }}>
            <strong>{subscription.savings_plans?.name}</strong>
            <p className="lede-light">{subscription.status} · {subscription.months_paid} months paid · {money.format(Number(subscription.total_paid ?? 0))}</p>
            <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
              <button className="btn btn-gold btn-sm" onClick={() => pay(subscription).catch((error) => setNote(error.message))} type="button">Pay this month</button>
              <button className="btn btn-line-dark btn-sm" onClick={() => clientRequest(`/programs/savings/subscriptions/${subscription.id}/cancel`, token, { method: 'POST' }).then(() => subscriptions.refetch())} type="button">Cancel</button>
            </div>
          </article>
        ))}
        {note ? <p className="form-note">{note}</p> : null}
      </div>
    </>
  );
}
