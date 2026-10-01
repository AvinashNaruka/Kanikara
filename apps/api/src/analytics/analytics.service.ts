import { Injectable } from '@nestjs/common';
import type { analyticsEventSchema, visitorIdentitySchema } from '@kanikara/contracts';
import type { z } from 'zod';
import { assertNoError } from '../common/supabase.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly supabase: SupabaseService) {}

  async record(input: z.infer<typeof analyticsEventSchema>, authorization?: string) {
    let userId: string | null = null;
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      const { data } = await this.supabase.anon.auth.getUser(token);
      userId = data.user?.id ?? null;
    }
    const { error } = await this.supabase.anon.from('page_views').insert({
      visitor_id: input.visitorId,
      session_id: input.sessionId,
      user_id: userId,
      page: input.page,
      path: input.path ?? null,
      product_slug: input.productSlug ?? null,
      event: input.event,
      detail: input.detail ?? null,
      referrer: input.referrer ?? null,
      referrer_host: input.referrerHost ?? null,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      device: input.device ?? null,
      browser: input.browser ?? null,
      os: input.os ?? null,
      screen_w: input.screenW ?? null,
      screen_h: input.screenH ?? null,
      lang: input.lang ?? null,
      is_new_visitor: input.isNewVisitor ?? false,
      is_bot: input.isBot ?? false,
      entered_pincode: input.enteredPincode ?? null,
      country: input.country ?? null,
      region: input.region ?? null,
      city: input.city ?? null,
      postal_code: input.postalCode ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      timezone: input.timezone ?? null,
      isp: input.isp ?? null,
    });
    assertNoError(error);
  }

  async geo(headers: Record<string, string | string[] | undefined>, ip?: string) {
    const vercel = this.vercelGeo(headers);
    if (vercel) return vercel;
    const lookupIp = this.publicIp(headers, ip);
    const url = lookupIp ? `https://ipwho.is/${encodeURIComponent(lookupIp)}` : 'https://ipwho.is/';
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1800) });
      if (!response.ok) return {};
      return this.parseIpwho(await response.json());
    } catch {
      return {};
    }
  }

  async identify(input: z.infer<typeof visitorIdentitySchema>, authorization?: string) {
    const phone = input.phone.replace(/\D/g, '').slice(-10);
    if (phone.length !== 10) return { ok: false };
    let userId: string | null = null;
    const token = authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      const { data } = await this.supabase.anon.auth.getUser(token);
      userId = data.user?.id ?? null;
    }
    const { error } = await this.supabase.anon.from('visitor_identities').upsert({
      visitor_id: input.visitorId,
      phone,
      name: input.name || null,
      email: input.email || null,
      source: input.source || null,
      user_id: userId,
      consent: Boolean(input.consent),
      consent_at: input.consent ? new Date().toISOString() : null,
      note: input.note || null,
    }, { onConflict: 'visitor_id,phone', ignoreDuplicates: true });
    if (error) return { ok: false };
    return { ok: true };
  }

  private vercelGeo(headers: Record<string, string | string[] | undefined>) {
    const country = this.header(headers, 'x-vercel-ip-country');
    const city = this.header(headers, 'x-vercel-ip-city');
    if (!country && !city) return null;
    const regionCode = this.header(headers, 'x-vercel-ip-country-region');
    let countryName = country;
    try {
      if (country) countryName = new Intl.DisplayNames(['en'], { type: 'region' }).of(country) ?? country;
    } catch {
      countryName = country;
    }
    return {
      country: countryName,
      region: country === 'IN' ? (IN_STATES[regionCode ?? ''] ?? regionCode) : regionCode,
      city: city ? decodeURIComponent(city) : null,
      postalCode: this.header(headers, 'x-vercel-ip-postal-code'),
      latitude: Number(this.header(headers, 'x-vercel-ip-latitude')) || null,
      longitude: Number(this.header(headers, 'x-vercel-ip-longitude')) || null,
      timezone: this.header(headers, 'x-vercel-ip-timezone'),
      isp: null,
    };
  }

  private parseIpwho(body: { success?: boolean; country?: string; region?: string; city?: string; postal?: string; latitude?: number; longitude?: number; timezone?: { id?: string }; connection?: { isp?: string; org?: string } }) {
    if (!body || body.success === false || !(body.city || body.region || body.country)) return {};
    return {
      country: body.country ?? null,
      region: body.region ?? null,
      city: body.city ?? null,
      postalCode: body.postal ?? null,
      latitude: body.latitude ?? null,
      longitude: body.longitude ?? null,
      timezone: body.timezone?.id ?? null,
      isp: body.connection?.isp || body.connection?.org || null,
    };
  }

  private publicIp(headers: Record<string, string | string[] | undefined>, ip?: string) {
    const forwarded = this.header(headers, 'x-forwarded-for')?.split(',')[0]?.trim();
    const value = (forwarded || this.header(headers, 'x-real-ip') || ip || '').replace(/^::ffff:/, '');
    if (!value || value === '127.0.0.1' || value === '::1') return null;
    return value;
  }

  private header(headers: Record<string, string | string[] | undefined>, name: string) {
    const value = headers[name];
    const text = Array.isArray(value) ? value[0] : value;
    return text ? String(text) : null;
  }

  async dashboard(token: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const client = this.supabase.privileged(token);
    const [views, identities, products, profiles, addresses] = await Promise.all([
      this.fetchSince(client, 'page_views', since),
      this.fetchOptional(client, 'visitor_identities'),
      this.fetchOptional(client, 'products', 'id,name,slug,serial_no'),
      this.fetchOptional(client, 'profiles', 'id,full_name,phone,role,created_at'),
      this.fetchOptional(client, 'addresses', 'user_id,city,state,pincode,is_default'),
    ]);
    const userIds = [...new Set(views.map((row) => row.user_id).filter(Boolean))];
    let emails: Record<string, string> = {};
    if (userIds.length) {
      const { data } = await this.supabase.asUser(token).functions.invoke('admin-customers', {
        body: { action: 'list_emails', ids: userIds },
      }).catch(() => ({ data: null }));
      emails = data?.emails ?? {};
    }
    return { views, identities, products, profiles, addresses, emails };
  }

  private async fetchSince(client: ReturnType<SupabaseService['privileged']>, table: string, since: string) {
    const rows: Array<Record<string, unknown>> = [];
    for (let from = 0; from < 15000; from += 1000) {
      const { data, error } = await client
        .from(table)
        .select('*')
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .range(from, from + 999);
      assertNoError(error);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return rows;
  }

  private async fetchOptional(client: ReturnType<SupabaseService['privileged']>, table: string, columns = '*') {
    const { data, error } = await client.from(table).select(columns).limit(10000);
    if (error) return [];
    return data ?? [];
  }

  async summary(token: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.supabase
      .privileged(token)
      .from('page_views')
      .select('page,event,device,referrer,product_slug,visitor_id,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    assertNoError(error);
    const rows = data ?? [];
    return {
      since,
      events: rows.length,
      visitors: new Set(rows.map((row) => row.visitor_id)).size,
      byPage: this.count(rows, 'page'),
      byEvent: this.count(rows, 'event'),
      byDevice: this.count(rows, 'device'),
      topProducts: this.count(rows.filter((row) => row.product_slug), 'product_slug'),
    };
  }

  async csv(token: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await this.supabase
      .privileged(token)
      .from('page_views')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(5000);
    assertNoError(error);
    const rows = data ?? [];
    const headers = ['created_at', 'visitor_id', 'page', 'event', 'product_slug', 'device', 'referrer'];
    const lines = rows.map((row) =>
      headers.map((key) => JSON.stringify(row[key] ?? '')).join(','),
    );
    return [headers.join(','), ...lines].join('\n');
  }

  private count(rows: Array<Record<string, unknown>>, key: string) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const value = String(row[key] ?? 'unknown');
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 12)
      .map(([name, count]) => ({ name, count }));
  }
}

const IN_STATES: Record<string, string> = {
  AN: 'Andaman and Nicobar Islands', AP: 'Andhra Pradesh', AR: 'Arunachal Pradesh', AS: 'Assam', BR: 'Bihar',
  CH: 'Chandigarh', CG: 'Chhattisgarh', CT: 'Chhattisgarh', DL: 'Delhi', GA: 'Goa', GJ: 'Gujarat', HR: 'Haryana',
  HP: 'Himachal Pradesh', JK: 'Jammu and Kashmir', JH: 'Jharkhand', KA: 'Karnataka', KL: 'Kerala', LA: 'Ladakh',
  MP: 'Madhya Pradesh', MH: 'Maharashtra', OD: 'Odisha', OR: 'Odisha', PB: 'Punjab', RJ: 'Rajasthan', TN: 'Tamil Nadu',
  TG: 'Telangana', TS: 'Telangana', UP: 'Uttar Pradesh', UK: 'Uttarakhand', UT: 'Uttarakhand', WB: 'West Bengal',
};
