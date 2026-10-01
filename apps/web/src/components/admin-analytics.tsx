'use client';

import { Fragment, useMemo, useState } from 'react';
import {
  buildReport,
  exportVisitors,
  formatDuration,
  interest,
  whatsAppLink,
  type DashboardSource,
  type Visitor,
} from '@/lib/analytics-dashboard';

const RANGES = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const;

export function AdminAnalytics({ source, onRefresh }: { source: DashboardSource; onRefresh: () => void }) {
  const [days, setDays] = useState(7);
  const [bots, setBots] = useState(false);
  const [state, setState] = useState('');
  const [temp, setTemp] = useState('');
  const [contact, setContact] = useState('');
  const [sort, setSort] = useState<'recent' | 'score'>('recent');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const report = useMemo(() => buildReport(source, days, bots), [source, days, bots]);
  const needle = query.trim().toLowerCase();
  const filtered = report.visitors.filter((visitor) => {
    if (state && stateOf(visitor) !== state) return false;
    if (temp && visitor.temp !== temp) return false;
    if (contact && visitor.contact !== contact) return false;
    if (!needle) return true;
    const hay = [visitor.name, visitor.phones.join(' '), visitor.emails.join(' '), visitor.geo?.city, visitor.geo?.region, visitor.pin, visitor.geo?.postal_code, interest(source, visitor)]
      .join(' ')
      .toLowerCase();
    return hay.includes(needle);
  });
  const shown = (sort === 'score' ? [...filtered].sort((left, right) => right.score - left.score) : filtered).slice(0, 200);
  const stateOptions = useMemo(() => {
    const counts = new Map<string, number>();
    report.visitors.forEach((visitor) => {
      const name = stateOf(visitor);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    });
    return [...counts.entries()].sort((left, right) => right[1] - left[1]);
  }, [report]);
  const maxBar = Math.max(1, ...report.buckets.map((bucket) => bucket.views));
  const maxHour = Math.max(1, ...report.hours.map((bucket) => bucket.views));
  const funnelTop = report.funnel[0]?.count || 1;

  function download() {
    const csv = `\uFEFF${exportVisitors(source, sort === 'score' ? [...filtered].sort((left, right) => right.score - left.score) : filtered)}`;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `kanikara-visitors-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }

  return (
    <>
      <div className="admin-topbar">
        <h1>Analytics</h1>
        <div className="kk-seg">
          {RANGES.map((range) => (
            <button className={days === range.days ? 'on' : ''} key={range.days} onClick={() => setDays(range.days)} type="button">{range.label}</button>
          ))}
          <button onClick={onRefresh} type="button">↻ Refresh</button>
        </div>
      </div>
      {report.cards.map((row) => (
        <div className="kk-an-grid" key={row[0]?.label}>
          {row.map((card) => (
            <div className="kk-an-card" key={card.label}>
              <div className="n">
                {card.value}
                {card.delta == null ? null : <span className={`kk-delta ${card.delta >= 0 ? 'kk-up' : 'kk-down'}`}>{card.delta >= 0 ? '▲' : '▼'} {Math.abs(card.delta)}%</span>}
              </div>
              <div className="l">{card.live ? <span className="kk-live"><i />Online now</span> : card.label}</div>
            </div>
          ))}
        </div>
      ))}
      <p className="kk-small" style={{ margin: '-6px 0 16px' }}>
        {report.footnote}
        {report.botCount
          ? ` · ${report.botCount} bot/crawler/data-centre page views ${bots ? 'included' : 'hidden'} — `
          : ' · no bot traffic detected'}
        {report.botCount ? <button className="action-btn" onClick={() => setBots((current) => !current)} type="button">{bots ? 'hide them' : 'show them'}</button> : null}
      </p>
      <div className="kk-an-two">
        <Bars max={maxBar} title={report.chartTitle} values={report.buckets} />
        <div className="kk-an-card">
          <h3>Conversion funnel</h3>
          {report.funnel.map((step, index) => {
            const share = Math.round((step.count / funnelTop) * 100);
            const previous = index && report.funnel[index - 1].count ? ` · ${Math.round((step.count / report.funnel[index - 1].count) * 100)}% of previous step` : '';
            return (
              <div key={step.label} style={{ margin: '11px 0' }}>
                <div style={{ display: 'flex', fontSize: 12.5, justifyContent: 'space-between' }}>
                  <span>{step.label}</span>
                  <b>{step.count} <span className="kk-small">({share}%{previous})</span></b>
                </div>
                <div className="kk-funnel-track"><div className="kk-funnel-fill" style={{ width: `${share}%` }} /></div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="kk-an-card" style={{ marginBottom: 18 }}>
        <h3>🔥 Hot leads — not ordered yet</h3>
        <table className="data">
          <thead><tr><th>Lead</th><th>Who</th><th>Interested in</th><th>Reach out</th></tr></thead>
          <tbody>
            {report.hot.length ? report.hot.map((visitor) => (
              <tr key={visitor.id}>
                <td><Temp visitor={visitor} /></td>
                <td>{visitor.name ? <b>{visitor.name}</b> : <span style={{ opacity: 0.6 }}>Guest</span>}<div className="kk-small">{place(visitor)}</div></td>
                <td>{interest(source, visitor) || '—'}<div className="kk-small">{activity(visitor)}</div></td>
                <td><Contact source={source} visitor={visitor} /></td>
              </tr>
            )) : <tr><td colSpan={4}>No warm/hot leads in this range yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="kk-an-two">
        <TableCard heads={['State', 'Visitors', 'Views', 'With phone']} rows={report.states.map((item) => [item.name, item.visitors, item.views, item.phones])} title="Visitors by state" />
        <TableCard heads={['City', 'Visitors', 'Views', 'With phone']} rows={report.cities.map((item) => [item.name, item.visitors, item.views, item.phones])} title="Visitors by city" />
      </div>
      <div className="kk-an-two">
        <TableCard heads={['Product', 'Views', 'Visitors', 'Bag', '♡']} rows={report.products.map((item) => [item.name, item.views, item.visitors, item.bag, item.wish])} title="Most viewed products" />
        <TableCard heads={['Search term', 'Times']} rows={report.searches.map((item) => [item.name, item.count])} title="What people searched" />
      </div>
      <div className="kk-an-two">
        <Bars max={maxHour} title="Peak hours (views by hour of day)" values={report.hours} />
        <TableCard heads={['Source', 'Visitors', 'Added to bag', 'Ordered']} rows={report.sources.map((item) => [item.name, item.visitors, item.bag, item.ordered])} title="Traffic sources → conversion" />
      </div>
      <div className="kk-an-two">
        <TableCard heads={['Page', 'Views']} rows={report.pages.map((item) => [item.name, item.count])} title="Pages" />
        <TableCard heads={['Device', 'Views']} rows={report.devices.map((item) => [item.name, item.count])} title="Devices" />
      </div>
      <div className="kk-an-card" style={{ marginBottom: 18 }}>
        <h3>Good to know</h3>
        <p className="kk-small" style={{ fontSize: 12.5, lineHeight: 1.7, opacity: 0.75 }}>
          Location comes from the IP address, so it is approximate to the city. The exact area is the PIN the visitor types.
          Phone numbers appear only if the visitor shared them. “opted-in” means they ticked the WhatsApp consent box.
          WhatsApp popup this period: shown {report.popupShown} · numbers captured {report.popupCaptured}.
        </p>
      </div>
      <div className="kk-an-card">
        <h3>Visitors <span className="kk-small">— showing {shown.length} of {filtered.length}</span></h3>
        <div className="kk-filters">
          <select onChange={(event) => setState(event.target.value)} value={state}>
            <option value="">All states</option>
            {stateOptions.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}
          </select>
          <select onChange={(event) => setTemp(event.target.value)} value={temp}>
            <option value="">All lead types</option>
            {['Hot', 'Warm', 'Cold', 'Customer'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <select onChange={(event) => setContact(event.target.value)} value={contact}>
            <option value="">Any contact status</option>
            <option value="phone">Has phone</option>
            <option value="email">Email only</option>
            <option value="none">Anonymous</option>
          </select>
          <select onChange={(event) => setSort(event.target.value as 'recent' | 'score')} value={sort}>
            <option value="recent">Sort: latest</option>
            <option value="score">Sort: lead score</option>
          </select>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search name / phone / city / PIN / product" style={{ minWidth: 260 }} type="text" value={query} />
          <button className="btn btn-line-dark btn-sm" onClick={download} type="button">⬇ Export CSV</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data">
            <thead><tr><th>Last seen</th><th>Who</th><th>Lead</th><th>Contact</th><th>Location</th><th>Device</th><th>Came from</th><th>Activity</th><th>Time</th><th /></tr></thead>
            <tbody>
              {shown.length ? shown.map((visitor) => (
                <Fragment key={visitor.id}>
                  <tr>
                    <td>{timeAgo(visitor.last)}</td>
                    <td>
                      {visitor.name ? <b>{visitor.name}</b> : <span style={{ opacity: 0.6 }}>Guest</span>}
                      {visitor.userId ? <span className="kk-tag">Member</span> : null}
                      <div className="kk-small">{visitor.id.slice(0, 8)} · {visitor.sessionCount} visit{visitor.sessionCount === 1 ? '' : 's'}</div>
                    </td>
                    <td><Temp visitor={visitor} /></td>
                    <td><Contact source={source} visitor={visitor} /></td>
                    <td>{place(visitor)}<div className="kk-small">{visitor.pin ? <>PIN entered: <b>{visitor.pin}</b></> : visitor.geo?.postal_code ? `IP area PIN ~${visitor.geo.postal_code}` : ''}</div></td>
                    <td>{[visitor.device, visitor.os].filter(Boolean).join(' · ') || '—'}</td>
                    <td>{visitor.source}</td>
                    <td>{visitor.views} page{visitor.views === 1 ? '' : 's'}{visitor.counts.add_to_cart ? ` · 🛍${visitor.counts.add_to_cart}` : ''}{visitor.counts.wishlist_toggle ? ` · ♡${visitor.counts.wishlist_toggle}` : ''}<div className="kk-small">{interest(source, visitor)}</div></td>
                    <td>{formatDuration(visitor.seconds)}</td>
                    <td><button className="action-btn" onClick={() => setOpen((current) => current === visitor.id ? null : visitor.id)} type="button">Journey ▾</button></td>
                  </tr>
                  {open === visitor.id ? (
                    <tr key={`${visitor.id}-journey`}>
                      <td colSpan={10} style={{ background: 'rgba(201,162,75,.05)' }}>
                        <div className="kk-tl">
                          {[...visitor.rows].reverse().slice(0, 40).map((row, index) => (
                            <div className="kk-tl-row" key={`${row.created_at}-${index}`}>
                              <span className="t">{new Date(row.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                              <span>{row.event || 'page_view'}{row.page ? ` · ${row.page}` : ''}{row.product_slug ? ` · ${row.product_slug}` : ''}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              )) : <tr><td colSpan={10}>No visitors match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Bars({ title, values, max }: { title: string; values: Array<{ label: string; views: number }>; max: number }) {
  return (
    <div className="kk-an-card">
      <h3>{title}</h3>
      <div className="kk-bars">
        {values.map((bucket, index) => (
          <div key={`${bucket.label}-${index}`}>
            <span style={{ fontSize: 10, opacity: 0.6 }}>{bucket.views || ''}</span>
            <div className="b" style={{ height: Math.round((bucket.views / max) * 110) }} />
            <span className="t">{bucket.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableCard({ title, heads, rows }: { title: string; heads: string[]; rows: Array<Array<string | number>> }) {
  return (
    <div className="kk-an-card">
      <h3>{title}</h3>
      <table className="data">
        <thead><tr>{heads.map((head) => <th key={head}>{head}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row) => <tr key={row.join('|')}>{row.map((cell, index) => <td key={heads[index]}>{cell}</td>)}</tr>) : <tr><td colSpan={heads.length}>No data yet</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Temp({ visitor }: { visitor: Visitor }) {
  const tone = { Hot: 'kk-t-hot', Warm: 'kk-t-warm', Cold: 'kk-t-cold', Customer: 'kk-t-cust' }[visitor.temp];
  return <span className={`kk-tag ${tone}`} style={{ marginLeft: 0 }}>{visitor.temp} · {visitor.score}</span>;
}

function Contact({ source, visitor }: { source: DashboardSource; visitor: Visitor }) {
  if (visitor.phones.length) {
    return visitor.phones.map((mobile) => (
      <span key={mobile}>
        <a href={`tel:+91${mobile}`}>{mobile}</a>
        {visitor.optin && visitor.phoneSrc[mobile] === 'lead_popup'
          ? <span className="kk-tag kk-t-opt">opted-in</span>
          : <span className="kk-tag kk-t-opt" style={{ background: '#eee', color: '#666' }}>{visitor.phoneSrc[mobile] || ''}</span>}
        <br />
        <a className="kk-btn kk-wa" href={whatsAppLink(source, visitor, mobile)} rel="noopener" target="_blank">WhatsApp</a>
        <a className="kk-btn" href={`tel:+91${mobile}`}>Call</a>
      </span>
    ));
  }
  if (visitor.emails.length) {
    return <a href={`mailto:${visitor.emails[0]}`}>{visitor.emails[0]}</a>;
  }
  return <span className="kk-small">Not shared — popup will ask</span>;
}

function stateOf(visitor: Visitor) {
  return visitor.geo?.region || (visitor.noGeo === 'before' ? 'Before location tracking' : 'Unknown');
}

function place(visitor: Visitor) {
  if (!visitor.geo) return visitor.noGeo === 'before' ? 'Before location tracking' : 'Unknown';
  const parts = [visitor.geo.city, visitor.geo.region].filter(Boolean).join(', ');
  const country = visitor.geo.country && visitor.geo.country !== 'India' ? visitor.geo.country : '';
  const text = [parts, country].filter(Boolean).join(', ');
  return text ? <>{text}{visitor.geo._src ? <span className="kk-small"> (from {visitor.geo._src})</span> : null}</> : 'Unknown';
}

function activity(visitor: Visitor) {
  return [
    visitor.counts.add_to_cart ? '🛍 bag' : '',
    visitor.counts.checkout_click ? '💳 checkout' : '',
    visitor.counts.wishlist_toggle ? '♡ wishlist' : '',
    visitor.sessionCount > 1 ? `↻ ${visitor.sessionCount} visits` : '',
  ].filter(Boolean).join(' · ');
}

function timeAgo(value: string) {
  const seconds = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}
