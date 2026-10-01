'use client';

import type { ProductSummary } from '@kanikara/contracts';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import { useAuth } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';
import { trackEvent } from '@/lib/site-analytics';
import { money } from '@/lib/money';

function stars(value: number | null) {
  const rating = Math.round(value ?? 0);
  return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`;
}

export function ProductCard({ product }: { product: ProductSummary }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  async function add() {
    if (!token) {
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }
    await clientRequest('/commerce/cart', token, {
      method: 'POST',
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    });
    trackEvent('add_to_cart', { product_id: product.id, qty: 1 });
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
  }

  async function save(event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!token) {
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }
    await clientRequest(`/commerce/wishlist/${product.id}`, token, { method: 'POST' });
    trackEvent('wishlist_toggle', { product_id: product.id });
    await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
  }

  return (
    <article className="p-card">
      <div className="thumb">
        <Link href={`/products/${product.slug}`}>
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt={product.name} src={product.images[0]} />
          ) : (
            <span className="image-placeholder">KANIKARA</span>
          )}
        </Link>
        {product.badge ? <span className="tag">{product.badge}</span> : null}
        <button className="wish-btn" onClick={save} type="button" aria-label="Save">
          <svg strokeWidth="1.6" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.2C.5 8.2 2.3 4.8 5.7 4.2c2-.3 3.9.7 5 2.3.1.1.3.1.4 0 1.1-1.6 3-2.6 5-2.3 3.4.6 5.2 4 3.7 7.6C19.5 16.4 12 21 12 21z" /></svg>
        </button>
      </div>
      <div className="info">
        <div className="cat">{product.category?.name ?? ''}</div>
        <Link href={`/products/${product.slug}`}><h3>{product.name}</h3></Link>
        {product.ratingCount ? (
          <div className="rating"><span className="stars">{stars(product.ratingAverage)}</span> ({product.ratingCount})</div>
        ) : null}
        <div className="price-row">
          <span className="price">{money.format(product.price)}</span>
          {product.mrp && product.mrp > product.price ? <span className="mrp">{money.format(product.mrp)}</span> : null}
        </div>
        <button className="add" onClick={add} type="button">Add to Bag</button>
      </div>
    </article>
  );
}
