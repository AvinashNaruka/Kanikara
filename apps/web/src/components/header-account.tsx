'use client';

import type { CartItem, Profile } from '@kanikara/contracts';
import Link from 'next/link';
import { useAuthedQuery } from '@/components/auth-provider';

export function HeaderAccount() {
  const cart = useAuthedQuery<CartItem[]>(['cart'], '/commerce/cart');
  const profile = useAuthedQuery<Profile>(['me'], '/account/me');
  const count = cart.data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const admin = profile.data && ['admin', 'superadmin'].includes(profile.data.role);

  return (
    <div className="header-actions">
      {admin ? <Link href="/admin">Admin</Link> : null}
      <Link href="/account" aria-label="My account">Account</Link>
      <Link href="/cart" aria-label="Shopping bag">
        Bag{count ? ` (${count})` : ''}
      </Link>
    </div>
  );
}
