'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { getSupabase } from '@/lib/supabase';
import { identifyVisitor, trackEvent } from '@/lib/site-analytics';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  fullName: z.string().optional(),
  phone: z.string().optional(),
  referralCode: z.string().optional(),
});

type AuthInput = z.infer<typeof authSchema>;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/account';
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [message, setMessage] = useState('');
  const form = useForm<AuthInput>({ resolver: zodResolver(authSchema) });
  const supabase = getSupabase();

  async function onSubmit(values: AuthInput) {
    if (!supabase) {
      setMessage('Add the public Supabase URL and anon key to the web environment.');
      return;
    }
    setMessage('');
    if (mode === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email);
      if (error) throw error;
      setMessage('Reset link sent.');
      return;
    }
    if ((values.password?.length ?? 0) < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password ?? '',
        options: { data: { full_name: values.fullName, phone: values.phone } },
      });
      if (error) throw error;
      trackEvent('signup_submit');
      if (values.phone) identifyVisitor({ phone: values.phone, name: values.fullName, email: values.email, source: 'signup', token: data.session?.access_token });
      if (values.referralCode && data.session && data.user) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'}/account/referrals`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${data.session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: values.referralCode }),
        });
      }
      setMessage(data.session ? 'Account created.' : 'Check your email to confirm the account.');
      if (data.session) router.push(next);
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password ?? '',
    });
    if (error) throw error;
    router.push(next);
  }

  return (
    <>
      <div className="page-head">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Account</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>
          {mode === 'signup' ? 'Create Account' : mode === 'forgot' ? 'Reset Password' : 'Sign In'}
        </h1>
      </div>
      <div className="wrap" style={{ padding: '48px var(--pad) 90px', maxWidth: 520 }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 22 }}>
          <button className={mode === 'login' ? 'btn btn-gold btn-sm' : 'btn btn-line-dark btn-sm'} onClick={() => setMode('login')} type="button">Sign In</button>
          <button className={mode === 'signup' ? 'btn btn-gold btn-sm' : 'btn btn-line-dark btn-sm'} onClick={() => setMode('signup')} type="button">Create Account</button>
        </div>
        <form className="dash-card" onSubmit={form.handleSubmit(async (values) => {
          try {
            await onSubmit(values);
          } catch (error) {
            setMessage(error instanceof Error ? error.message : 'Could not continue');
          }
        })}>
          {mode === 'signup' ? (
            <>
              <div className="field"><label>Full Name</label><input {...form.register('fullName')} /></div>
              <div className="field"><label>Phone</label><input {...form.register('phone')} /></div>
              <div className="field"><label>Referral code</label><input {...form.register('referralCode')} /></div>
            </>
          ) : null}
          <div className="field"><label>Email</label><input type="email" {...form.register('email')} /></div>
          {mode === 'forgot' ? null : (
            <div className="field"><label>Password</label><input type="password" {...form.register('password')} /></div>
          )}
          <button className="btn btn-gold btn-block" type="submit">
            {mode === 'forgot' ? 'Send Reset Link' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </button>
          {mode === 'login' ? (
            <button className="btn-ghost" onClick={() => setMode('forgot')} style={{ marginTop: 14 }} type="button">Forgot password?</button>
          ) : null}
          {message ? <p className="form-note">{message}</p> : null}
        </form>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
