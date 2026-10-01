'use client';

import type { StoreOrder } from '@kanikara/contracts';
import { useParams } from 'next/navigation';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';
import { money } from '@/lib/money';

export default function InvoicePage() {
  const params = useParams<{ orderNumber: string }>();
  const { token } = useAuth();
  const order = useAuthedQuery<StoreOrder>(
    ['order', params.orderNumber],
    `/commerce/orders/number/${params.orderNumber}`,
  );
  const invoice = order.data;
  if (!token) return <p className="page-heading">Sign in to view this order.</p>;
  if (!invoice) return <p className="page-heading">Loading invoice…</p>;

  return (
    <article className="section invoice">
      <header className="page-heading">
        <span className="eyebrow">KANIKARA</span>
        <h1>Invoice {invoice.orderNumber}</h1>
      </header>
      <p>Status: {invoice.status}</p>
      <p>Payment: {invoice.paymentMethod} · {invoice.paymentStatus}</p>
      {invoice.shippingAddress ? (
        <p>
          {invoice.shippingAddress.fullName}, {invoice.shippingAddress.addressLine1}, {invoice.shippingAddress.city} {invoice.shippingAddress.pincode}
        </p>
      ) : null}
      <table className="data-table">
        <thead><tr><th>Piece</th><th>Qty</th><th>Amount</th></tr></thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={`${item.productName}-${item.unitPrice}`}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td>{money.format(item.totalPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Subtotal {money.format(invoice.subtotal)}</p>
      <p>Discount {money.format(invoice.discountAmount)}</p>
      <p>Shipping {money.format(invoice.shippingAmount)}</p>
      <strong>Total {money.format(invoice.totalAmount)}</strong>
      <button onClick={() => window.print()} type="button">Print invoice</button>
    </article>
  );
}
