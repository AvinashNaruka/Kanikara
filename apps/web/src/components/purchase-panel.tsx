'use client';

import type { ProductDetail } from '@kanikara/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';
import { trackEvent } from '@/lib/site-analytics';

export function PurchasePanel({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function add(redirect: boolean) {
    if (!token) {
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }
    const variant = product.variants.find((item) => item.id === variantId);
    setPending(true);
    setMessage('');
    try {
      await clientRequest('/commerce/cart', token, {
        method: 'POST',
        body: JSON.stringify({
          productId: product.id,
          quantity,
          variantId: variant?.id ?? null,
          variantLabel: variant?.colorName ?? null,
        }),
      });
      await queryClient.invalidateQueries({ queryKey: ['cart'] });
      trackEvent(redirect ? 'buy_now' : 'add_to_cart', { product_id: product.id, qty: quantity, variant: variant?.colorName ?? null });
      if (redirect) router.push('/checkout');
      else setMessage('Added to your bag');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not add this piece');
    } finally {
      setPending(false);
    }
  }

  async function save() {
    if (!token) {
      router.push(`/login?next=/products/${product.slug}`);
      return;
    }
    setPending(true);
    try {
      const result = await clientRequest<{ saved: boolean }>(
        `/commerce/wishlist/${product.id}`,
        token,
        { method: 'POST' },
      );
      trackEvent('wishlist_toggle', { product_id: product.id });
      setMessage(result.saved ? 'Saved to wishlist' : 'Removed from wishlist');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not update wishlist');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="purchase-panel">
      {product.variants.length ? (
        <div className="variants">
          <h2>Available colours</h2>
          <div>
            {product.variants.map((variant) => (
              <button
                className={variant.id === variantId ? 'active' : ''}
                key={variant.id}
                onClick={() => setVariantId(variant.id)}
                type="button"
              >
                <i style={{ backgroundColor: variant.colorHex ?? undefined }} />
                {variant.colorName}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <label className="field quantity-field">
        Quantity
        <input
          max={20}
          min={1}
          onChange={(event) => setQuantity(Number(event.target.value))}
          type="number"
          value={quantity}
        />
      </label>
      <div className="pd-actions">
        <button className="btn btn-line-dark" disabled={pending || product.stockQuantity < 1} onClick={() => add(false)} type="button">
          Add to bag
        </button>
        <button className="btn btn-gold" disabled={pending || product.stockQuantity < 1} onClick={() => add(true)} type="button">
          Buy now
        </button>
        <button className="btn btn-line-dark" disabled={pending} onClick={save} type="button">
          Wishlist
        </button>
      </div>
      {product.stockQuantity < 1 ? <p className="form-note">This piece is currently out of stock.</p> : null}
      {message ? <p className="form-note">{message}</p> : null}
    </div>
  );
}
