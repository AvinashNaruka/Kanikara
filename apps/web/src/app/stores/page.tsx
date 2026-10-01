import { clientRequest } from '@/lib/client-api';

interface StoreLocation {
  id: string;
  name: string;
  city: string;
  address?: string;
  phone?: string;
  hours?: string;
}

interface PressMention {
  id: string;
  publication: string;
  quote?: string;
  link_url?: string;
}

async function load<T>(path: string) {
  return clientRequest<T>(path, null).catch(() => [] as T);
}

export const dynamic = 'force-dynamic';

export default async function StoresPage() {
  const [stores, press] = await Promise.all([
    load<StoreLocation[]>('/programs/stores'),
    load<PressMention[]>('/programs/press'),
  ]);

  return (
    <>
      <div className="page-head">
        <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Visit Us</span>
        <h1 className="h-section" style={{ marginTop: 8 }}>Store Locator</h1>
      </div>
      <div className="wrap" style={{ padding: '48px var(--pad) 90px', maxWidth: 720 }}>
        {stores.map((store) => (
          <article className="dash-card" key={store.id} style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 22 }}>{store.name}</h3>
            <p className="lede-light" style={{ marginTop: 8, maxWidth: 'none' }}>{store.address} {store.city}</p>
            {store.phone ? <p className="lede-light">{store.phone}</p> : null}
            {store.hours ? <p className="lede-light">{store.hours}</p> : null}
          </article>
        ))}
        {!stores.length ? <p className="lede-light">Store visits are arranged from Rajasthan.</p> : null}
        {press.length ? <h2 className="h-section" style={{ fontSize: 28, margin: '36px 0 16px' }}>Press Mentions</h2> : null}
        {press.map((item) => (
          <article className="dash-card" key={item.id} style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--serif)', fontSize: 20 }}>{item.publication}</h3>
            <p className="lede-light" style={{ marginTop: 8 }}>{item.quote}</p>
          </article>
        ))}
      </div>
    </>
  );
}
