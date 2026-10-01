'use client';

import type { CartItem } from '@kanikara/contracts';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';
import { money } from '@/lib/money';

export default function CartPage() {
  const { ready, token } = useAuth();
  const queryClient = useQueryClient();
  const cart = useAuthedQuery<CartItem[]>(['cart'], '/commerce/cart');

  async function update(id: string, quantity: number) {
    await clientRequest(`/commerce/cart/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
  }

  const items = cart.data ?? [];
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <>
      <div className="page-head"><h1 className="h-section">Your Bag</h1></div>
      <div className="wrap" style={{ padding: '44px var(--pad) 90px', maxWidth: 760 }}>
        {!ready ? <p className="lede-light">Loading your bag…</p> : null}
        {ready && !token ? <p className="lede-light"><Link href="/login?next=/cart">Sign in</Link> to see your bag.</p> : null}
        {token && items.length ? (
          <>
            {items.map((item) => (
              <article className="cart-row" key={item.id}>
                {item.product.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt="" src={item.product.images[0]} />
                ) : null}
                <div className="meta">
                  <h4><Link href={`/products/${item.product.slug}`}>{item.product.name}</Link></h4>
                  {item.variantLabel ? <p>{item.variantLabel}</p> : null}
                  <div className="price">{money.format(item.product.price)}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
                    <button className="btn btn-line-dark btn-sm" onClick={() => update(item.id, item.quantity - 1)} type="button">−</button>
                    <span>{item.quantity}</span>
                    <button className="btn btn-line-dark btn-sm" onClick={() => update(item.id, item.quantity + 1)} type="button">+</button>
                    <button className="rm" onClick={() => update(item.id, 0)} type="button">Remove</button>
                  </div>
                </div>
              </article>
            ))}
            <div className="sum-row" style={{ marginTop: 18 }}><span>Subtotal</span><span>{money.format(subtotal)}</span></div>
            <div className="sum-row"><span>Shipping</span><span>Free</span></div>
            <div className="sum-row total"><span>Total</span><span>{money.format(subtotal)}</span></div>
            <Link className="btn btn-gold btn-block" href="/checkout" style={{ marginTop: 18 }}>Checkout</Link>
          </>
        ) : null}
        {token && cart.data && !items.length ? (
          <p className="lede-light">Your bag is empty. <Link href="/shop">Continue shopping</Link></p>
        ) : null}
      </div>
    </>
  );
}
