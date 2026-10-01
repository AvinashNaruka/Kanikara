import Link from 'next/link';

export default function CheckoutReturnPage() {
  return (
    <div className="wrap" style={{ padding: '120px var(--pad)', textAlign: 'center', maxWidth: 560 }}>
      <div style={{ fontSize: 44, color: 'var(--gold)' }}>✧</div>
      <h1 className="h-section" style={{ marginTop: 14 }}>Payment received</h1>
      <p className="lede-light" style={{ margin: '16px auto' }}>
        PayU is confirming the payment. Your order appears in My Orders once the store records it.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 30 }}>
        <Link className="btn btn-line-dark" href="/account/orders">Track Order</Link>
        <Link className="btn btn-gold" href="/shop">Continue Shopping</Link>
      </div>
    </div>
  );
}
