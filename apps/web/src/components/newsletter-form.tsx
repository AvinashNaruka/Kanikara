'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { newsletterSchema } from '@kanikara/contracts';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { clientRequest } from '@/lib/client-api';

interface NewsletterInput {
  email: string;
}

export function NewsletterForm() {
  const [message, setMessage] = useState('');
  const form = useForm<NewsletterInput>({ resolver: zodResolver(newsletterSchema) });

  async function onSubmit(values: NewsletterInput) {
    await clientRequest('/programs/newsletter', null, {
      method: 'POST',
      body: JSON.stringify(values),
    });
    setMessage('You are on the list.');
    form.reset();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input placeholder="you@example.com" type="email" {...form.register('email')} />
      <button className="btn btn-gold" type="submit">Subscribe</button>
      {message ? <p className="form-note">{message}</p> : null}
    </form>
  );
}
