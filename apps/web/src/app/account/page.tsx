'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { profileSchema, type Profile } from '@kanikara/contracts';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';

interface ProfileInput {
  fullName: string;
  phone: string;
}

export default function AccountPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { ready, token, signOut } = useAuth();
  const profile = useAuthedQuery<Profile>(['me'], '/account/me');
  const referrals = useAuthedQuery<{ code: string | null; referrals: Array<{ id: string; referred_email?: string }> }>(
    ['referrals'],
    '/account/referrals',
  );
  const customOrders = useAuthedQuery<Array<{ id: string; jewellery_type: string; status?: string }>>(
    ['custom-orders'],
    '/programs/custom-orders',
  );
  const form = useForm<ProfileInput>({ resolver: zodResolver(profileSchema) });
  const [tab, setTab] = useState<'orders' | 'custom' | 'profile' | 'refer'>('profile');

  useEffect(() => {
    if (profile.data) {
      form.reset({
        fullName: profile.data.fullName ?? '',
        phone: profile.data.phone ?? '',
      });
    }
  }, [form, profile.data]);

  return (
    <>
      <div className="page-head">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Account</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>{profile.data?.fullName || 'My Account'}</h1>
      </div>
      {!ready ? <p className="wrap lede-light" style={{ padding: 48 }}>Opening your account…</p> : null}
      {ready && !token ? (
        <p className="wrap lede-light" style={{ padding: 48 }}>
          <Link href="/login?next=/account">Sign in</Link> to view your account.
        </p>
      ) : null}
      {token ? (
        <div className="dash">
          <nav className="dash-nav">
            <Link href="/account/orders">Orders</Link>
            <Link href="/wishlist">Wishlist</Link>
            <Link href="/checkout">Addresses</Link>
            <a className={tab === 'custom' ? 'active' : ''} href="#custom" onClick={(event) => { event.preventDefault(); setTab('custom'); }}>Custom Requests</a>
            <a className={tab === 'profile' ? 'active' : ''} href="#profile" onClick={(event) => { event.preventDefault(); setTab('profile'); }}>Profile</a>
            <a className={tab === 'refer' ? 'active' : ''} href="#refer" onClick={(event) => { event.preventDefault(); setTab('refer'); }}>Refer & Earn</a>
            <a href="#sign-out" onClick={async (event) => { event.preventDefault(); await signOut(); router.push('/'); }} style={{ color: 'var(--danger)' }}>Sign Out</a>
          </nav>
          <div>
            {tab === 'profile' ? (
              <form className="dash-card" onSubmit={form.handleSubmit(async (values) => {
                await clientRequest('/account/me', token, { method: 'PATCH', body: JSON.stringify(values) });
                await queryClient.invalidateQueries({ queryKey: ['me'] });
              })} style={{ maxWidth: 420 }}>
                <div className="field"><label>Full Name</label><input {...form.register('fullName')} /></div>
                <div className="field"><label>Phone</label><input {...form.register('phone')} /></div>
                <p className="lede-light" style={{ marginBottom: 16 }}>Loyalty points: {profile.data?.loyaltyPoints ?? 0}</p>
                <button className="btn btn-gold" type="submit">Save Changes</button>
              </form>
            ) : null}
            {tab === 'refer' ? (
              <div className="dash-card">
                <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>Refer & Earn</h3>
                <p className="lede-light" style={{ marginTop: 8 }}>Your code: {referrals.data?.code ?? 'Available after your profile is created'}</p>
                <ul>
                  {(referrals.data?.referrals ?? []).map((item) => (
                    <li key={item.id}>{item.referred_email || 'New customer'}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {tab === 'custom' ? (
              <div>
                {(customOrders.data ?? []).map((item) => (
                  <article className="dash-card" key={item.id} style={{ marginBottom: 12 }}>
                    {item.jewellery_type} — {item.status ?? 'received'}
                  </article>
                ))}
                {customOrders.data && !customOrders.data.length ? <p className="lede-light">No custom requests yet.</p> : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
