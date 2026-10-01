'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { reviewSchema } from '@kanikara/contracts';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '@/components/auth-provider';
import { clientRequest } from '@/lib/client-api';

interface ReviewInput {
  rating: number;
  title?: string;
  body: string;
}

export function ReviewForm({ productId }: { productId: string }) {
  const router = useRouter();
  const { token } = useAuth();
  const [message, setMessage] = useState('');
  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 5, title: '', body: '' },
  });

  async function onSubmit(values: ReviewInput) {
    if (!token) {
      router.push('/login');
      return;
    }
    await clientRequest(`/catalog/products/${productId}/reviews`, token, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    setMessage('Thank you. Your review will appear after it is approved.');
    form.reset();
  }

  return (
    <form className="dash-card" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="field">
        <label>Rating</label>
        <select {...form.register('rating', { valueAsNumber: true })}>
          <option value={5}>★★★★★ Excellent</option>
          <option value={4}>★★★★☆ Good</option>
          <option value={3}>★★★☆☆ Average</option>
          <option value={2}>★★☆☆☆ Poor</option>
          <option value={1}>★☆☆☆☆ Bad</option>
        </select>
      </div>
      <div className="field"><label>Title</label><input {...form.register('title')} /></div>
      <div className="field"><label>Your review</label><textarea rows={4} {...form.register('body')} /></div>
      {form.formState.errors.body ? <p className="form-note">{form.formState.errors.body.message}</p> : null}
      <button className="btn btn-gold" type="submit">Submit Review</button>
      {message ? <p className="form-note">{message}</p> : null}
    </form>
  );
}
