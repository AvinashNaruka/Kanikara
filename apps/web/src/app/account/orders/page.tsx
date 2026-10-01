'use client';

import type { StoreOrder } from '@kanikara/contracts';
import Link from 'next/link';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';
import { money } from '@/lib/money';

export default function OrdersPage() {
  const { ready, token } = useAuth();
  const orders = useAuthedQuery<StoreOrder[]>(['orders'], '/commerce/orders');

  async function cancel(id: string) {
    await clientRequest(`/commerce/orders/${id}/cancel`, token, { method: 'POST' });
    await orders.refetch();
  }

  return (
    <>
      <div className="page-head">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Account</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>My Orders</h1>
      </div>
      <div className="wrap" style={{ padding: '44px var(--pad) 90px', maxWidth: 760 }}>
        {!ready ? <p className="lede-light">Loading orders…</p> : null}
        {ready && !token ? <p className="lede-light"><Link href="/login?next=/account/orders">Sign in</Link> to track orders.</p> : null}
        {(orders.data ?? []).map((order) => (
          <article className="dash-card" key={order.id} style={{ marginBottom: 14 }}>
            <Link href={`/account/orders/${order.orderNumber}`}><strong>{order.orderNumber}</strong></Link>
            <p className="lede-light">{order.status} · {order.paymentStatus} · {money.format(order.totalAmount)}</p>
            {order.trackingNumber ? <p className="lede-light">Tracking {order.courierName} {order.trackingNumber}</p> : null}
            {order.status === 'pending' || order.status === 'confirmed' ? (
              <button className="btn btn-line-dark btn-sm" onClick={() => cancel(order.id)} style={{ marginTop: 12 }} type="button">Cancel</button>
            ) : null}
          </article>
        ))}
        {orders.data && !orders.data.length ? <p className="lede-light">No orders yet.</p> : null}
      </div>
    </>
  );
}
