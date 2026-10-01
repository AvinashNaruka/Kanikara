'use client';

import type { ProductSummary } from '@kanikara/contracts';
import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';

export default function WishlistPage() {
  const { ready, token } = useAuth();
  const wishlist = useAuthedQuery<ProductSummary[]>(['wishlist'], '/commerce/wishlist');

  return (
    <>
      <div className="page-head"><h1 className="h-section">Your Wishlist</h1></div>
      <div className="wrap" style={{ padding: '44px var(--pad) 90px' }}>
        {!ready ? <p className="lede-light">Loading wishlist…</p> : null}
        {ready && !token ? (
          <p className="lede-light"><Link href="/login?next=/wishlist">Sign in</Link> to see saved pieces.</p>
        ) : null}
        {token && wishlist.data?.length ? (
          <div className="p-grid">
            {wishlist.data.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : null}
        {token && wishlist.data && !wishlist.data.length ? (
          <p className="lede-light">Nothing saved yet.</p>
        ) : null}
      </div>
    </>
  );
}
