import { clientRequest } from '@/lib/client-api';

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp\/|telegrambot|curl|wget|python|node-fetch|vercel|screenshot/i;
const DATA_CENTRE = /amazon|aws|digitalocean|ovh|hetzner|linode|vultr|contabo|leaseweb|vercel|datacamp|m247|scaleway|choopa/i;

export interface VisitGeo {
  country?: string | null;
  region?: string | null;
  city?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string | null;
  isp?: string | null;
}

interface VisitContext {
  page: string;
  slug: string | null;
  since: number;
}

let current: VisitContext | null = null;
let lastKey = '';
let lastAt = 0;
let geoPromise: Promise<VisitGeo> | null = null;
let leadTimer = false;

function storageGet(store: Storage, key: string) {
  try { return store.getItem(key); } catch { return null; }
}

function storageSet(store: Storage, key: string, value: string) {
  try { store.setItem(key, value); } catch { /* private mode */ }
}

function visitorId() {
  const existing = storageGet(localStorage, 'kk_visitor_id') || storageGet(localStorage, 'kk_visitor');
  if (existing) {
    storageSet(localStorage, 'kk_visitor_id', existing);
    return { id: existing, isNew: false };
  }
  const created = crypto.randomUUID();
  storageSet(localStorage, 'kk_visitor_id', created);
  return { id: created, isNew: true };
}

function sessionId() {
  const existing = storageGet(sessionStorage, 'kk_session_id') || storageGet(sessionStorage, 'kk_session');
  if (existing) {
    storageSet(sessionStorage, 'kk_session_id', existing);
    return existing;
  }
  const created = crypto.randomUUID();
  storageSet(sessionStorage, 'kk_session_id', created);
  return created;
}

function utm() {
  let saved: Record<string, string> = {};
  try { saved = JSON.parse(storageGet(sessionStorage, 'kk_utm') || '{}'); } catch { saved = {}; }
  const params = new URLSearchParams(window.location.search);
  ['utm_source', 'utm_medium', 'utm_campaign'].forEach((key) => {
    const value = params.get(key);
    if (value) saved[key] = value;
  });
  if (Object.keys(saved).length) storageSet(sessionStorage, 'kk_utm', JSON.stringify(saved));
  return saved;
}

function referrer() {
  const saved = storageGet(sessionStorage, 'kk_ref');
  if (saved !== null) return saved;
  const value = document.referrer || '';
  storageSet(sessionStorage, 'kk_ref', value);
  return value;
}

function hostOf(url: string) {
  try {
    if (!url) return null;
    const host = new URL(url).hostname.replace(/^www\./, '');
    return host === window.location.hostname.replace(/^www\./, '') ? null : host;
  } catch {
    return null;
  }
}

function deviceInfo() {
  const agent = navigator.userAgent || '';
  const device = /iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(agent) ? 'tablet'
    : /Mobi|Android|iPhone|iPod|Windows Phone/i.test(agent) ? 'mobile' : 'desktop';
  const browser = /Edg\//i.test(agent) ? 'Edge' : /OPR\//i.test(agent) ? 'Opera' : /Chrome\//i.test(agent) ? 'Chrome'
    : /Firefox\//i.test(agent) ? 'Firefox' : /Safari\//i.test(agent) ? 'Safari' : 'Other';
  const os = /Windows/i.test(agent) ? 'Windows' : /Android/i.test(agent) ? 'Android'
    : /iPhone|iPad|iPod/i.test(agent) ? 'iOS' : /Mac OS X/i.test(agent) ? 'macOS' : /Linux/i.test(agent) ? 'Linux' : 'Other';
  return { device, browser, os };
}

export function pageFromPath(pathname: string) {
  if (pathname === '/') return { page: 'home', slug: null as string | null };
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] === 'products') return { page: 'product', slug: decodeURIComponent(parts[1] ?? '') || null };
  if (parts[0] === 'account' && parts[1] === 'orders' && parts[2]) return { page: 'order-confirm', slug: null };
  const names: Record<string, string> = {
    shop: 'shop', checkout: 'checkout', cart: 'cart', wishlist: 'wishlist', login: 'login',
    'custom-order': 'custom-order', corporate: 'corporate-gifting', 'gift-store': 'gift-store',
    'smart-plan': 'smart-plan', stores: 'store-locator', 'jewellery-care': 'jewellery-care',
    policies: 'policies', account: 'dashboard', admin: 'admin',
  };
  return { page: names[parts[0]] ?? parts[0], slug: null };
}

function shouldTrack(isAdmin: boolean) {
  if (isAdmin || document.body.classList.contains('admin-mode')) return false;
  if (window.location.pathname.startsWith('/admin')) return false;
  return true;
}

async function geo(): Promise<VisitGeo> {
  if (geoPromise) return geoPromise;
  geoPromise = (async () => {
    try {
      const cached = JSON.parse(storageGet(localStorage, 'kk_geo2') || 'null') as { t?: number; g?: VisitGeo } | null;
      if (cached?.g && cached.t && Date.now() - cached.t < 24 * 60 * 60 * 1000) return cached.g;
    } catch { /* fresh lookup */ }
    const lookedUp = await clientRequest<VisitGeo>('/analytics/geo', null).catch(() => ({}));
    if (lookedUp.city || lookedUp.region || lookedUp.country) {
      storageSet(localStorage, 'kk_geo2', JSON.stringify({ t: Date.now(), g: lookedUp }));
    }
    return lookedUp;
  })();
  return geoPromise;
}

async function send(token: string | null, event: string, page: string, slug: string | null, detail: Record<string, unknown> | null, isNew: boolean) {
  const place = await Promise.race([geo(), new Promise<VisitGeo>((resolve) => setTimeout(() => resolve({}), 2500))]);
  const campaign = utm();
  const from = referrer();
  const device = deviceInfo();
  const bot = BOT_UA.test(navigator.userAgent || '') || navigator.webdriver === true || DATA_CENTRE.test(place.isp || '');
  await clientRequest('/analytics/events', token, {
    method: 'POST',
    body: JSON.stringify({
      visitorId: visitorId().id,
      sessionId: sessionId(),
      page,
      path: window.location.pathname,
      productSlug: slug,
      event,
      detail,
      referrer: from || null,
      referrerHost: hostOf(from),
      utmSource: campaign.utm_source ?? null,
      utmMedium: campaign.utm_medium ?? null,
      utmCampaign: campaign.utm_campaign ?? null,
      ...device,
      screenW: window.screen?.width ?? null,
      screenH: window.screen?.height ?? null,
      lang: navigator.language || null,
      isNewVisitor: isNew,
      isBot: bot,
      enteredPincode: storageGet(localStorage, 'kk_pincode'),
      country: place.country ?? null,
      region: place.region ?? null,
      city: place.city ?? null,
      postalCode: place.postalCode ?? null,
      latitude: place.latitude ?? null,
      longitude: place.longitude ?? null,
      timezone: place.timezone ?? null,
      isp: place.isp ?? null,
    }),
  }).catch(() => undefined);
}

export function flushTime(token: string | null, isAdmin: boolean) {
  if (!current || !shouldTrack(isAdmin)) {
    if (current) current.since = 0;
    return;
  }
  const seconds = Math.round((Date.now() - current.since) / 1000);
  const page = current.page;
  const slug = current.slug;
  current.since = 0;
  if (seconds < 3) return;
  void send(token, 'time_spent', page, slug, { seconds: Math.min(seconds, 1800) }, false);
}

export function trackPage(token: string | null, isAdmin: boolean, pathname: string, detail: Record<string, unknown> | null = null) {
  if (!shouldTrack(isAdmin)) return;
  const { page, slug } = pageFromPath(pathname);
  const key = `${page}|${slug ?? ''}`;
  const now = Date.now();
  if (key === lastKey && now - lastAt < 1500) return;
  lastKey = key;
  lastAt = now;
  flushTime(token, isAdmin);
  const identity = visitorId();
  current = { page, slug, since: now };
  void send(token, 'page_view', page, slug, detail, identity.isNew);
  if (!leadTimer) {
    leadTimer = true;
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('kk-lead', { detail: 'time' })), 60_000);
  }
  if (page === 'product') {
    const seen = Number(storageGet(sessionStorage, 'kk_pv_prod') || 0) + 1;
    storageSet(sessionStorage, 'kk_pv_prod', String(seen));
    if (seen >= 2) window.setTimeout(() => window.dispatchEvent(new CustomEvent('kk-lead', { detail: 'products' })), 4000);
  }
}

export function trackEvent(event: string, detail: Record<string, unknown> | null = null) {
  if (document.body.classList.contains('admin-mode') || window.location.pathname.startsWith('/admin')) return;
  const page = current?.page ?? pageFromPath(window.location.pathname).page;
  const slug = current?.slug ?? pageFromPath(window.location.pathname).slug;
  void send(null, event, page, slug, detail, false);
}

export function rememberPincode(pincode: string) {
  const digits = pincode.replace(/\D/g, '');
  if (digits.length !== 6) return;
  storageSet(localStorage, 'kk_pincode', digits);
  trackEvent('pincode_set', { pincode: digits });
}

export function identifyVisitor(input: { phone: string; name?: string | null; email?: string | null; source: string; consent?: boolean; token?: string | null }) {
  const phone = input.phone.replace(/\D/g, '').slice(-10);
  if (phone.length !== 10) return;
  storageSet(localStorage, 'kk_has_phone', '1');
  void clientRequest('/analytics/identify', input.token ?? null, {
    method: 'POST',
    body: JSON.stringify({
      visitorId: visitorId().id,
      phone,
      name: input.name ?? null,
      email: input.email ?? null,
      source: input.source,
      consent: Boolean(input.consent),
    }),
  }).catch(() => undefined);
}

export function currentPage() {
  return current?.page ?? 'home';
}
