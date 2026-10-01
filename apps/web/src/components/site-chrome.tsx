'use client';

import type { CartItem, FlashSale, ProductSummary, Profile } from '@kanikara/contracts';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';
import { money } from '@/lib/money';

export function SiteChrome({
  announcement,
  flash,
  whatsapp,
}: {
  announcement: string;
  flash: FlashSale | null;
  whatsapp: string;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const cart = useAuthedQuery<CartItem[]>(['cart'], '/commerce/cart');
  const wishlist = useAuthedQuery<ProductSummary[]>(['wishlist'], '/commerce/wishlist');
  const profile = useAuthedQuery<Profile>(['me'], '/account/me');
  const [menuOpen, setMenuOpen] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [remaining, setRemaining] = useState('');
  const count = cart.data?.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const saved = wishlist.data?.length ?? 0;
  const admin = profile.data && ['admin', 'superadmin'].includes(profile.data.role);
  const subtotal = (cart.data ?? []).reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  useEffect(() => {
    if (!flash?.active || !flash.endsAt) return;
    const tick = () => {
      const left = new Date(flash.endsAt ?? '').getTime() - Date.now();
      if (left <= 0) {
        setRemaining('00:00:00');
        return;
      }
      const hours = Math.floor(left / 3_600_000);
      const minutes = Math.floor((left % 3_600_000) / 60_000);
      const seconds = Math.floor((left % 60_000) / 1000);
      setRemaining([hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':'));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [flash]);

  async function changeQuantity(id: string, quantity: number) {
    await clientRequest(`/commerce/cart/${id}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    });
    await queryClient.invalidateQueries({ queryKey: ['cart'] });
  }

  return (
    <>
      <div className="announce"><span>{announcement}</span></div>
      {flash?.active ? (
        <Link className="flash-bar" href="/shop?tags=collection:flash-sale">
          <div className="flash-bar-inner">
            <span className="flash-title">{flash.title}</span>
            <span className="flash-count">{remaining || '00:00:00'}</span>
            <span className="flash-cta">Shop Now →</span>
          </div>
        </Link>
      ) : null}
      <header className="site">
        <div className="nav-row">
          <Link className="brand" href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Kanikara" src="/logo.jpeg" />
            <span>
              <span className="name">Kanikara</span>
              <span className="tag">GRACE IN GOLD, STORIES UNTOLD</span>
            </span>
          </Link>
          <nav className="main-nav">
            <Link href="/">Home</Link>
            <Link href="/shop">Shop</Link>
            <Link href="/gift-store">Gift Store</Link>
            <Link href="/smart-plan">Smart Plan</Link>
            <Link href="/custom-order">Custom Orders</Link>
            <Link href="/account/orders">My Orders</Link>
            {admin ? <Link href="/admin">Admin</Link> : null}
            <Link href="/policies">Policies</Link>
          </nav>
          <div className="nav-actions">
            <Link className="icon-btn" href="/shop" title="Search">
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></svg>
            </Link>
            <Link className="icon-btn" href="/wishlist" title="Wishlist">
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.2C.5 8.2 2.3 4.8 5.7 4.2c2-.3 3.9.7 5 2.3.1.1.3.1.4 0 1.1-1.6 3-2.6 5-2.3 3.4.6 5.2 4 3.7 7.6C19.5 16.4 12 21 12 21z" /></svg>
              {saved ? <span className="badge">{saved}</span> : null}
            </Link>
            <button className="icon-btn" onClick={() => setBagOpen(true)} title="Bag" type="button">
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8z" /><path d="M9 8a3 3 0 016 0" /></svg>
              {count ? <span className="badge">{count}</span> : null}
            </button>
            <Link className="icon-btn" href={token ? '/account' : '/login'} id="accountBtn" title="Account">
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.4" /><path d="M4.5 20c1.6-3.6 4.6-5.4 7.5-5.4s5.9 1.8 7.5 5.4" /></svg>
            </Link>
            <button className="icon-btn hamburger" onClick={() => setMenuOpen((open) => !open)} title="Menu" type="button">
              <svg fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
          </div>
        </div>
        <div id="mobileMenu" style={{ display: menuOpen ? 'block' : 'none' }}>
          <nav>
            {[
              ['/', 'Home'],
              ['/shop', 'Shop'],
              ['/custom-order', 'Custom Orders'],
              ['/gift-store', 'Gift Store'],
              ['/smart-plan', 'Smart Plan'],
              ['/wishlist', 'Wishlist'],
              ['/account/orders', 'My Orders'],
              [token ? '/account' : '/login', 'Account'],
            ].map(([href, label]) => (
              <Link href={href} key={label} onClick={() => setMenuOpen(false)}>{label}</Link>
            ))}
          </nav>
        </div>
      </header>
      {whatsapp ? (
        <a className="wa-float" href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} rel="noopener" target="_blank" title="Chat on WhatsApp">WhatsApp</a>
      ) : null}
      <div className={bagOpen ? 'overlay open' : 'overlay'} onClick={() => setBagOpen(false)} />
      <aside className={bagOpen ? 'drawer open' : 'drawer'}>
        <div className="drawer-head">
          <h3>Your Bag</h3>
          <button className="icon-btn" onClick={() => setBagOpen(false)} type="button">✕</button>
        </div>
        <div className="drawer-body">
          {(cart.data ?? []).map((item) => (
            <div className="cart-row" key={item.id}>
              {item.product.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="" src={item.product.images[0]} />
              ) : null}
              <div className="meta">
                <h4>{item.product.name}</h4>
                <div className="price">{money.format(item.product.price)} × {item.quantity}</div>
                <button className="rm" onClick={() => changeQuantity(item.id, 0)} type="button">Remove</button>
              </div>
            </div>
          ))}
          {!cart.data?.length ? <p>Your bag is empty.</p> : null}
        </div>
        <div className="drawer-foot">
          <div className="sum-row"><span>Subtotal</span><span>{money.format(subtotal)}</span></div>
          <div className="sum-row"><span>Shipping</span><span>Free</span></div>
          <div className="sum-row total"><span>Total</span><span>{money.format(subtotal)}</span></div>
          <Link className="btn btn-gold btn-block" href="/checkout" onClick={() => setBagOpen(false)} style={{ marginTop: 16 }}>Checkout</Link>
        </div>
      </aside>
    </>
  );
}
