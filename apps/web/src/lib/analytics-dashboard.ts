export interface ViewRow {
  visitor_id: string;
  session_id: string;
  user_id?: string | null;
  page?: string | null;
  product_slug?: string | null;
  event?: string | null;
  detail?: Record<string, unknown> | null;
  created_at: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postal_code?: string | null;
  isp?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  screen_w?: number | null;
  screen_h?: number | null;
  is_new_visitor?: boolean | null;
  is_bot?: boolean | null;
  entered_pincode?: string | null;
  referrer_host?: string | null;
  utm_source?: string | null;
}

export interface IdentityRow {
  visitor_id: string;
  user_id?: string | null;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
  source?: string | null;
  consent?: boolean | null;
  note?: string | null;
}

export interface DashboardSource {
  views: ViewRow[];
  identities: IdentityRow[];
  products: Array<{ id: string; name: string; slug: string; serial_no?: string | null }>;
  profiles: Array<{ id: string; full_name?: string | null; phone?: string | null }>;
  addresses: Array<{ user_id?: string | null; city?: string | null; state?: string | null; pincode?: string | null; is_default?: boolean | null }>;
  emails: Record<string, string>;
}

export interface Visitor {
  id: string;
  rows: ViewRow[];
  firstRow: ViewRow;
  last: string;
  views: number;
  prodViews: number;
  seconds: number;
  sessionCount: number;
  returning: boolean;
  converted: boolean;
  userId: string | null;
  name: string | null;
  phones: string[];
  phoneSrc: Record<string, string>;
  emails: string[];
  optin: boolean;
  notes: string[];
  pin: string | null;
  score: number;
  temp: 'Hot' | 'Warm' | 'Cold' | 'Customer';
  contact: 'phone' | 'email' | 'none';
  counts: Record<string, number>;
  products: Record<string, number>;
  pages: Record<string, number>;
  geo: { city?: string | null; region?: string | null; country?: string | null; postal_code?: string | null; isp?: string | null; _src?: string | null } | null;
  noGeo: 'before' | null;
  device: string;
  os: string;
  browser: string;
  source: string;
}

export interface CountItem { name: string; count: number }
export interface GeoItem { name: string; visitors: number; views: number; phones: number }
export interface ProductItem { name: string; views: number; visitors: number; bag: number; wish: number }
export interface SourceItem { name: string; visitors: number; bag: number; ordered: number }
export interface Bucket { label: string; views: number }
export interface FunnelStep { label: string; count: number }

export interface AnalyticsReport {
  cards: Array<Array<{ value: string; label: string; delta?: number | null; live?: boolean }>>;
  footnote: string;
  botCount: number;
  chartTitle: string;
  buckets: Bucket[];
  funnel: FunnelStep[];
  hot: Visitor[];
  states: GeoItem[];
  cities: GeoItem[];
  products: ProductItem[];
  searches: CountItem[];
  hours: Bucket[];
  sources: SourceItem[];
  pages: CountItem[];
  devices: CountItem[];
  visitors: Visitor[];
  popupShown: number;
  popupCaptured: number;
}

const DATA_CENTRE = /amazon|aws|digitalocean|ovh|hetzner|linode|vultr|contabo|leaseweb|vercel|datacamp|m247|scaleway|choopa/i;
const PAGE_TITLES: Record<string, string> = {
  home: 'Home', shop: 'Shop', product: 'Product', wishlist: 'Wishlist', dashboard: 'My Account / Orders',
  checkout: 'Checkout', 'order-confirm': 'Order confirmation', 'custom-order': 'Custom Order', 'gift-store': 'Gift Store',
  'corporate-gifting': 'Corporate Gifting', 'smart-plan': 'Smart Plan', 'store-locator': 'Store Locator',
  'jewellery-care': 'Jewellery Care', policies: 'Policies',
};

function phone(value: unknown) {
  const digits = String(value ?? '').replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? digits : null;
}

function pinState(pin: string | null) {
  const digits = String(pin ?? '').replace(/\D/g, '');
  if (digits.length !== 6) return null;
  const prefix = Number(digits.slice(0, 2));
  const bands: Array<[number, number, string]> = [
    [11, 11, 'Delhi'], [12, 13, 'Haryana'], [14, 16, 'Punjab'], [17, 17, 'Himachal Pradesh'],
    [18, 19, 'Jammu and Kashmir'], [20, 28, 'Uttar Pradesh / Uttarakhand'], [30, 34, 'Rajasthan'],
    [36, 39, 'Gujarat'], [40, 44, 'Maharashtra'], [45, 48, 'Madhya Pradesh'], [49, 49, 'Chhattisgarh'],
    [50, 53, 'Telangana / Andhra Pradesh'], [56, 59, 'Karnataka'], [60, 64, 'Tamil Nadu'],
    [67, 69, 'Kerala'], [70, 74, 'West Bengal'], [75, 77, 'Odisha'], [78, 78, 'Assam'],
    [79, 79, 'North-East'], [80, 85, 'Bihar / Jharkhand'],
  ];
  return bands.find(([from, to]) => prefix >= from && prefix <= to)?.[2] ?? null;
}

function isBot(row: ViewRow) {
  return row.is_bot === true || DATA_CENTRE.test(row.isp ?? '');
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function delta(current: number, previous: number) {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 100);
}

function productName(source: DashboardSource, ref: string | null | undefined) {
  if (!ref) return '—';
  const match = source.products.find((item) => item.slug === ref || item.id === ref);
  return match ? `${match.serial_no ? `${match.serial_no} · ` : ''}${match.name}` : ref;
}

function shortName(source: DashboardSource, ref: string) {
  const full = productName(source, ref);
  return full.includes(' · ') ? full.split(' · ').slice(1).join(' · ') : full;
}

export function buildReport(source: DashboardSource, days: number, includeBots: boolean): AnalyticsReport {
  const from = days === 1 ? startOfDay(new Date()) : new Date(Date.now() - days * 864e5);
  const span = days === 1 ? 864e5 : days * 864e5;
  const previousFrom = new Date(from.getTime() - span);
  const inRange = (row: ViewRow, start: Date, end: number) => {
    const time = new Date(row.created_at).getTime();
    return time >= start.getTime() && time < end;
  };
  const human = includeBots ? source.views : source.views.filter((row) => !isBot(row));
  const rows = human.filter((row) => inRange(row, from, Infinity));
  const previous = days <= 7 ? human.filter((row) => inRange(row, previousFrom, from.getTime())) : [];
  const views = rows.filter((row) => (row.event || 'page_view') === 'page_view');
  const previousViews = previous.filter((row) => (row.event || 'page_view') === 'page_view');
  const visitors = buildVisitors(source, rows);
  const previousVisitors = new Set(previous.map((row) => row.visitor_id)).size;
  const live = new Set(human.filter((row) => Date.now() - new Date(row.created_at).getTime() < 5 * 60_000).map((row) => row.visitor_id)).size;
  const sessions = new Map<string, { views: number; actions: number }>();
  rows.forEach((row) => {
    const session = sessions.get(row.session_id) ?? { views: 0, actions: 0 };
    const event = row.event || 'page_view';
    if (event === 'page_view') session.views += 1;
    else if (event !== 'time_spent' && !event.startsWith('lead_popup')) session.actions += 1;
    sessions.set(row.session_id, session);
  });
  const sessionList = [...sessions.values()];
  const bounced = sessionList.filter((session) => session.views <= 1 && !session.actions).length;
  const timed = visitors.filter((visitor) => visitor.seconds > 0);
  const average = timed.length ? timed.reduce((sum, visitor) => sum + visitor.seconds, 0) / timed.length : 0;
  const withPhone = visitors.filter((visitor) => visitor.phones.length).length;
  const emailOnly = visitors.filter((visitor) => visitor.contact === 'email').length;
  const ordered = visitors.filter((visitor) => visitor.converted).length;
  const returning = visitors.filter((visitor) => visitor.returning).length;
  const shown = rows.filter((row) => row.event === 'lead_popup_shown').length;
  const captured = rows.filter((row) => row.event === 'lead_captured').length;
  const botCount = source.views.filter((row) => isBot(row) && inRange(row, from, Infinity) && (row.event || 'page_view') === 'page_view').length;
  const rangeLabel = days === 1 ? 'today' : `${days}d`;

  const buckets: Bucket[] = [];
  const chartRows = human.filter((row) => (row.event || 'page_view') === 'page_view');
  if (days === 1) {
    const midnight = startOfDay(new Date());
    for (let hour = 0; hour < 24; hour += 1) {
      const start = midnight.getTime() + hour * 36e5;
      buckets.push({
        label: hour % 3 === 0 ? `${hour}h` : '',
        views: chartRows.filter((row) => inRange(row, new Date(start), start + 36e5)).length,
      });
    }
  } else {
    for (let index = days - 1; index >= 0; index -= 1) {
      const day = startOfDay(new Date(Date.now() - index * 864e5));
      buckets.push({
        label: `${day.getDate()}/${day.getMonth() + 1}`,
        views: chartRows.filter((row) => inRange(row, day, day.getTime() + 864e5)).length,
      });
    }
  }
  const hours = Array.from({ length: 24 }, (_, hour) => ({ label: hour % 3 === 0 ? `${hour}h` : '', views: 0 }));
  views.forEach((row) => { hours[new Date(row.created_at).getHours()].views += 1; });

  const states = countGeo(visitors, (visitor) => visitor.geo?.region || (visitor.noGeo === 'before' ? 'Before location tracking' : 'Unknown'));
  const cities = countGeo(visitors, (visitor) => {
    if (visitor.geo?.city) return `${visitor.geo.city}${visitor.geo.region ? `, ${visitor.geo.region}` : ''}`;
    if (visitor.geo?.region) return `${visitor.geo.region} (city unknown)`;
    return visitor.noGeo === 'before' ? 'Before location tracking' : 'Unknown';
  });

  return {
    cards: [
      [
        { value: String(views.length), label: `Page views (${rangeLabel})`, delta: delta(views.length, previousViews.length) },
        { value: String(visitors.length), label: 'Unique visitors', delta: delta(visitors.length, previousVisitors) },
        { value: String(sessionList.length), label: 'Sessions' },
        { value: String(live), label: 'Online now', live: true },
      ],
      [
        { value: String(withPhone), label: 'Visitors with phone no.' },
        { value: String(emailOnly), label: 'Email only (no phone)' },
        { value: String(visitors.filter((visitor) => visitor.optin).length), label: shown ? `WhatsApp opt-ins · ${Math.round((captured / shown) * 100)}% of popups` : 'WhatsApp opt-ins' },
        { value: String(visitors.length - withPhone - emailOnly), label: 'Anonymous visitors' },
      ],
      [
        { value: String(rows.filter((row) => row.event === 'add_to_cart').length), label: 'Add-to-bag clicks' },
        { value: String(ordered), label: 'Visitors who ordered' },
        { value: sessionList.length ? `${Math.round((bounced / sessionList.length) * 100)}%` : '—', label: 'Bounce rate' },
        { value: formatDuration(average), label: 'Avg time on site' },
      ],
    ],
    footnote: `${visitors.length - returning} new · ${returning} returning visitors`,
    botCount,
    chartTitle: days === 1 ? 'Views by hour (today)' : 'Daily views',
    buckets,
    funnel: [
      { label: 'Visitors', count: visitors.length },
      { label: 'Viewed a product', count: visitors.filter((visitor) => visitor.prodViews > 0).length },
      { label: 'Added to bag / Buy now', count: visitors.filter((visitor) => visitor.counts.add_to_cart || visitor.counts.buy_now).length },
      { label: 'Reached checkout', count: visitors.filter((visitor) => visitor.pages.checkout || visitor.counts.checkout_click).length },
      { label: 'Order confirmed', count: ordered },
    ],
    hot: visitors.filter((visitor) => !visitor.converted && visitor.score >= 30).sort((left, right) => right.score - left.score).slice(0, 10),
    states: states.slice(0, 10),
    cities: cities.slice(0, 10),
    products: productStats(source, rows, views),
    searches: count(rows.filter((row) => row.event === 'search'), (row) => String(row.detail?.term ?? '').toLowerCase()).slice(0, 10),
    hours,
    sources: sourceStats(visitors),
    pages: count(views, (row) => PAGE_TITLES[row.page ?? ''] || row.page || '—').slice(0, 10),
    devices: count(views, (row) => `${row.device || '—'} · ${row.browser || '—'}`).slice(0, 8),
    visitors,
    popupShown: shown,
    popupCaptured: captured,
  };
}

function buildVisitors(source: DashboardSource, rows: ViewRow[]): Visitor[] {
  const byVisitor = new Map<string, IdentityRow[]>();
  const byUser = new Map<string, IdentityRow[]>();
  source.identities.forEach((identity) => {
    byVisitor.set(identity.visitor_id, [...(byVisitor.get(identity.visitor_id) ?? []), identity]);
    if (identity.user_id) byUser.set(identity.user_id, [...(byUser.get(identity.user_id) ?? []), identity]);
  });
  const profiles = new Map(source.profiles.map((profile) => [profile.id, profile]));
  const addresses = new Map<string, DashboardSource['addresses'][number]>();
  source.addresses.forEach((address) => {
    if (address.user_id && (!addresses.has(address.user_id) || address.is_default)) addresses.set(address.user_id, address);
  });
  let geoStart: string | null = null;
  source.views.forEach((row) => {
    if ((row.city || row.region) && (!geoStart || row.created_at < geoStart)) geoStart = row.created_at;
  });

  const map = new Map<string, Visitor>();
  rows.forEach((row) => {
    let visitor = map.get(row.visitor_id);
    if (!visitor) {
      visitor = {
        id: row.visitor_id, rows: [], firstRow: row, last: row.created_at, views: 0, prodViews: 0, seconds: 0,
        sessionCount: 0, returning: true, converted: false, userId: null, name: null, phones: [], phoneSrc: {},
        emails: [], optin: false, notes: [], pin: null, score: 0, temp: 'Cold', contact: 'none', counts: {},
        products: {}, pages: {}, geo: null, noGeo: null, device: '', os: '', browser: '', source: 'Direct',
      };
      map.set(row.visitor_id, visitor);
    }
    visitor.rows.push(row);
    visitor.firstRow = row;
    if (!visitor.geo && (row.city || row.region || row.country)) {
      visitor.geo = row;
    }
    if (!visitor.device && row.device) {
      visitor.device = row.device;
      visitor.os = row.os ?? '';
      visitor.browser = row.browser ?? '';
    }
    if (!visitor.pin && row.entered_pincode) visitor.pin = row.entered_pincode;
    if (row.user_id && !visitor.userId) visitor.userId = row.user_id;
    if (row.is_new_visitor) visitor.returning = false;
    const event = row.event || 'page_view';
    visitor.counts[event] = (visitor.counts[event] ?? 0) + 1;
    if (event === 'page_view') {
      visitor.views += 1;
      if (row.page) visitor.pages[row.page] = 1;
      if (row.page === 'order-confirm') visitor.converted = true;
      if (row.product_slug) {
        visitor.prodViews += 1;
        visitor.products[row.product_slug] = (visitor.products[row.product_slug] ?? 0) + 1;
      }
    }
    if (event === 'time_spent') visitor.seconds += Number(row.detail?.seconds ?? 0);
  });

  return [...map.values()].map((visitor) => {
    visitor.sessionCount = new Set(visitor.rows.map((row) => row.session_id)).size;
    if (visitor.sessionCount >= 2) visitor.returning = true;
    const profile = visitor.userId ? profiles.get(visitor.userId) : undefined;
    const identities = [...(byVisitor.get(visitor.id) ?? []), ...(visitor.userId ? byUser.get(visitor.userId) ?? [] : [])];
    const seen = new Set<string>();
    const add = (value: unknown, src: string) => {
      const normalised = phone(value);
      if (normalised && !seen.has(normalised)) {
        seen.add(normalised);
        visitor.phones.push(normalised);
        visitor.phoneSrc[normalised] = src;
      }
    };
    if (profile?.phone) add(profile.phone, 'account');
    identities.forEach((identity) => add(identity.phone, identity.source || ''));
    visitor.optin = identities.some((identity) => identity.consent);
    visitor.name = profile?.full_name || identities.find((identity) => identity.name)?.name || null;
    if (visitor.userId && source.emails[visitor.userId]) visitor.emails.push(source.emails[visitor.userId]);
    identities.forEach((identity) => {
      if (identity.email && !visitor.emails.includes(identity.email)) visitor.emails.push(identity.email);
    });
    visitor.notes = identities.map((identity) => identity.note).filter((note): note is string => Boolean(note));
    let score = Math.min(visitor.prodViews, 6) * 4;
    if (visitor.counts.add_to_cart) score += 25;
    if (visitor.counts.buy_now) score += 30;
    if (visitor.counts.checkout_click) score += 35;
    if (visitor.counts.wishlist_toggle) score += 10;
    if (visitor.counts.search) score += 4;
    if (visitor.counts.coupon_try) score += 8;
    if (visitor.seconds >= 120) score += 8;
    if (visitor.sessionCount >= 2) score += 10;
    if (visitor.sessionCount >= 4) score += 5;
    visitor.score = Math.min(100, score);
    visitor.temp = visitor.converted ? 'Customer' : visitor.score >= 60 ? 'Hot' : visitor.score >= 30 ? 'Warm' : 'Cold';
    visitor.contact = visitor.phones.length ? 'phone' : visitor.emails.length ? 'email' : 'none';
    if (!visitor.geo) {
      const address = visitor.userId ? addresses.get(visitor.userId) : undefined;
      const fromPin = pinState(visitor.pin);
      if (address && (address.city || address.state)) visitor.geo = { city: address.city, region: address.state, country: 'India', _src: 'saved address' };
      else if (fromPin) visitor.geo = { region: fromPin, country: 'India', _src: `delivery PIN ${visitor.pin}` };
      else if (geoStart && visitor.last < geoStart) visitor.noGeo = 'before';
    }
    visitor.source = visitor.firstRow.referrer_host || (visitor.firstRow.utm_source ? `utm: ${visitor.firstRow.utm_source}` : '') || 'Direct';
    return visitor;
  });
}

function countGeo(visitors: Visitor[], key: (visitor: Visitor) => string) {
  const map = new Map<string, GeoItem>();
  visitors.forEach((visitor) => {
    const name = key(visitor);
    const item = map.get(name) ?? { name, visitors: 0, views: 0, phones: 0 };
    item.visitors += 1;
    item.views += visitor.views;
    if (visitor.phones.length) item.phones += 1;
    map.set(name, item);
  });
  return [...map.values()].sort((left, right) => right.visitors - left.visitors);
}

function count(rows: ViewRow[], key: (row: ViewRow) => string | null) {
  const map = new Map<string, number>();
  rows.forEach((row) => {
    const name = key(row);
    if (!name) return;
    map.set(name, (map.get(name) ?? 0) + 1);
  });
  return [...map.entries()].sort((left, right) => right[1] - left[1]).map(([name, amount]) => ({ name, count: amount }));
}

function productStats(source: DashboardSource, rows: ViewRow[], views: ViewRow[]): ProductItem[] {
  const map = new Map<string, ProductItem & { visitors: Set<string> }>();
  const entry = (ref: string | null | undefined) => {
    if (!ref) return null;
    const match = source.products.find((item) => item.slug === ref || item.id === ref);
    const key = match?.id ?? ref;
    const current = map.get(key) ?? { name: productName(source, ref), views: 0, visitors: new Set<string>(), bag: 0, wish: 0 };
    map.set(key, current);
    return current;
  };
  views.forEach((row) => {
    const item = entry(row.product_slug);
    if (!item) return;
    item.views += 1;
    item.visitors.add(row.visitor_id);
  });
  rows.forEach((row) => {
    if (row.event !== 'add_to_cart' && row.event !== 'wishlist_toggle') return;
    const item = entry(String(row.detail?.product_id ?? ''));
    if (!item) return;
    if (row.event === 'add_to_cart') item.bag += 1;
    else item.wish += 1;
  });
  return [...map.values()]
    .sort((left, right) => (right.views + right.bag * 3) - (left.views + left.bag * 3))
    .slice(0, 10)
    .map((item) => ({ name: item.name, views: item.views, visitors: item.visitors.size, bag: item.bag, wish: item.wish }));
}

function sourceStats(visitors: Visitor[]): SourceItem[] {
  const map = new Map<string, SourceItem>();
  visitors.forEach((visitor) => {
    const item = map.get(visitor.source) ?? { name: visitor.source, visitors: 0, bag: 0, ordered: 0 };
    item.visitors += 1;
    if (visitor.counts.add_to_cart) item.bag += 1;
    if (visitor.converted) item.ordered += 1;
    map.set(visitor.source, item);
  });
  return [...map.values()].sort((left, right) => right.visitors - left.visitors).slice(0, 8);
}

export function formatDuration(seconds: number) {
  const value = Math.round(seconds || 0);
  if (!value) return '—';
  if (value < 60) return `${value}s`;
  if (value < 3600) return `${Math.floor(value / 60)}m ${value % 60}s`;
  return `${Math.floor(value / 3600)}h ${Math.floor((value % 3600) / 60)}m`;
}

export function interest(source: DashboardSource, visitor: Visitor) {
  return Object.entries(visitor.products)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 2)
    .map(([ref]) => shortName(source, ref))
    .join(', ');
}

export function whatsAppLink(source: DashboardSource, visitor: Visitor, mobile: string) {
  const top = Object.entries(visitor.products).sort((left, right) => right[1] - left[1])[0]?.[0];
  const message = `Hi${visitor.name ? ` ${visitor.name.split(' ')[0]}` : ''}, this is Kanikara Jewellery. ${top ? `We noticed you were looking at "${shortName(source, top)}". ` : ''}Can we help you with size, price or availability?`;
  return `https://wa.me/91${mobile}?text=${encodeURIComponent(message)}`;
}

export function exportVisitors(source: DashboardSource, visitors: Visitor[]) {
  const header = ['Last seen', 'Name', 'Phone(s)', 'Email(s)', 'Lead type', 'Lead score', 'City', 'State', 'Came from', 'Visits', 'Page views', 'Products viewed', 'Bag clicks', 'Ordered', 'Time on site (sec)'];
  const lines = visitors.map((visitor) => [
    new Date(visitor.last).toLocaleString('en-IN'), visitor.name ?? '', visitor.phones.join(' / '), visitor.emails.join(' / '),
    visitor.temp, visitor.score, visitor.geo?.city ?? '', visitor.geo?.region ?? '', visitor.source, visitor.sessionCount,
    visitor.views, interest(source, visitor), visitor.counts.add_to_cart ?? 0, visitor.converted ? 'yes' : 'no', visitor.seconds,
  ]);
  return [header, ...lines].map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}
