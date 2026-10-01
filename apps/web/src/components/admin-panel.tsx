'use client';

import type { Profile } from '@kanikara/contracts';
import Link from 'next/link';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth, useAuthedQuery } from '@/components/auth-provider';
import { AdminAnalytics } from '@/components/admin-analytics';
import { clientRequest } from '@/lib/client-api';
import type { DashboardSource } from '@/lib/analytics-dashboard';
import { money } from '@/lib/money';

type Row = Record<string, unknown> & {
  id?: string;
  categories?: { name?: string } | null;
  profiles?: { full_name?: string; phone?: string } | null;
  products?: { name?: string } | null;
  savings_plans?: { name?: string } | null;
};

const TABS = [
  ['stats', 'Dashboard'],
  ['products', 'Products'],
  ['categories', 'Categories'],
  ['banners', 'Banners'],
  ['materials', 'Materials'],
  ['orders', 'Orders'],
  ['coupons', 'Coupons'],
  ['custom-orders', 'Custom Requests'],
  ['reviews', 'Reviews'],
  ['customers', 'Customers'],
  ['gift-cards', 'Gift Cards'],
  ['corporate', 'Corporate Gifting'],
  ['savings/plans', 'Smart Plans'],
  ['stores', 'Store Locator'],
  ['press', 'Press Mentions'],
  ['analytics', 'Analytics'],
  ['settings', 'Settings'],
] as const;

type TabId = (typeof TABS)[number][0];

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'returned', 'refunded'];
const CUSTOM_STATUSES = ['new', 'reviewing', 'quoted', 'accepted', 'in_production', 'completed', 'cancelled'];
const CORPORATE_STATUSES = ['new', 'contacted', 'quoted', 'closed'];

function text(value: unknown) {
  return value == null ? '' : String(value);
}

function dateLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('en-IN');
}

function localDateTime(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function Status({ value, on = 'Active', off = 'Hidden' }: { value: unknown; on?: string; off?: string }) {
  const active = value !== false && value !== 'false' && value != null;
  return <span className={active ? 'status-badge status-delivered' : 'status-badge status-cancelled'}>{active ? on : off}</span>;
}

function categoryPrefix(name: string) {
  const letter = name.trim().charAt(0).toUpperCase() || 'X';
  return `K${letter}`;
}

export default function AdminPage() {
  const { ready, token } = useAuth();
  const profile = useAuthedQuery<Profile>(['me'], '/account/me');
  const [tab, setTab] = useState<TabId>('stats');
  const [rows, setRows] = useState<Record<string, Row[]>>({});
  const [stats, setStats] = useState<{ orders: number; products: number; customers: number; revenue: number } | null>(null);
  const [analytics, setAnalytics] = useState<DashboardSource | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [productMode, setProductMode] = useState<'folders' | 'all' | 'category'>('folders');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [modal, setModal] = useState<string | null>(null);
  const [draft, setDraft] = useState<Row>({});
  const [note, setNote] = useState('');
  const isAdmin = Boolean(profile.data && ['admin', 'superadmin'].includes(profile.data.role));

  async function load(next: TabId = tab) {
    if (!token) return;
    if (next === 'stats') {
      const [summary, orders] = await Promise.all([
        clientRequest<{ orders: number; products: number; customers: number; revenue: number }>('/admin/stats', token),
        clientRequest<Row[]>('/admin/orders', token),
      ]);
      setStats(summary);
      setRows((current) => ({ ...current, orders }));
      return;
    }
    if (next === 'analytics') {
      setAnalytics(await clientRequest<DashboardSource>('/analytics/dashboard', token));
      return;
    }
    if (next === 'settings') {
      const list = await clientRequest<Array<{ key: string; value: string }>>('/admin/settings', token);
      setSettings(Object.fromEntries(list.map((item) => [item.key, item.value ?? ''])));
      return;
    }
    if (next === 'savings/plans') {
      const [plans, subscriptions] = await Promise.all([
        clientRequest<Row[]>('/admin/savings/plans', token),
        clientRequest<Row[]>('/admin/savings/subscriptions', token),
      ]);
      setRows((current) => ({ ...current, 'savings/plans': plans, subscriptions }));
      return;
    }
    if (next === 'products') {
      const [products, categories, materials] = await Promise.all([
        clientRequest<Row[]>('/admin/products', token),
        clientRequest<Row[]>('/admin/categories', token),
        clientRequest<Row[]>('/admin/materials', token),
      ]);
      setRows((current) => ({ ...current, products, categories, materials }));
      return;
    }
    const data = await clientRequest<Row[]>(`/admin/${next}`, token);
    setRows((current) => ({ ...current, [next]: data }));
    if (next === 'customers') {
      const ids = data.map((customer) => String(customer.id));
      const result = await clientRequest<{ emails?: Record<string, string> }>('/admin/customers/action', token, {
        method: 'POST',
        body: JSON.stringify({ action: 'list_emails', ids }),
      }).catch(() => ({ emails: {} }));
      setEmails(result.emails ?? {});
    }
  }

  useEffect(() => {
    if (!token || !isAdmin) return;
    load('stats').catch((error) => setNote(error instanceof Error ? error.message : 'Could not load admin'));
    // Dashboard loads once the signed-in profile is confirmed as admin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  function openTab(next: TabId) {
    setTab(next);
    load(next).catch((error) => setNote(error instanceof Error ? error.message : 'Could not load this section'));
  }

  function openModal(name: string, record: Row = {}) {
    setDraft(record);
    setModal(name);
    setNote('');
  }

  function closeModal() {
    setModal(null);
  }

  async function save(path: string, payload: Row, refresh: TabId) {
    await clientRequest(path, token, { method: 'POST', body: JSON.stringify(payload) });
    closeModal();
    setNote('Saved');
    await load(refresh);
  }

  async function remove(path: string, refresh: TabId) {
    await clientRequest(path, token, { method: 'DELETE' });
    setNote('Deleted');
    await load(refresh);
  }

  const products = rows.products ?? [];
  const categories = rows.categories ?? [];
  const nextSerial = useMemo(() => {
    const category = categories.find((item) => item.id === draft.category_id);
    const prefix = categoryPrefix(text(category?.name));
    const numbers = products
      .map((product) => text(product.serial_no))
      .filter((serial) => serial.toUpperCase().startsWith(prefix))
      .map((serial) => Number.parseInt(serial.slice(prefix.length), 10))
      .filter((value) => !Number.isNaN(value));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `${prefix}${String(next).padStart(3, '0')}`;
  }, [categories, draft.category_id, products]);

  if (!ready) return <div className="page-head"><h1 className="h-section">Admin</h1></div>;
  if (!token) {
    return (
      <div className="page-head">
        <h1 className="h-section">Admin</h1>
        <p><Link href="/login?next=/admin">Sign in</Link> to open admin.</p>
      </div>
    );
  }
  if (profile.data && !isAdmin) return <p className="page-head">This account does not have admin access.</p>;

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <div className="brand"><span className="name" style={{ fontSize: 20 }}>Kanikara</span><span className="tag">Admin</span></div>
        {TABS.map(([id, label]) => (
          <a className={tab === id ? 'active' : ''} href={`#${id}`} key={id} onClick={(event) => { event.preventDefault(); openTab(id); }}>
            {label}
          </a>
        ))}
        <Link href="/" style={{ marginTop: 20, borderTop: '1px solid var(--line-dark)', paddingTop: 16 }}>← Back to Site</Link>
      </aside>
      <main className="admin-main">
        {note ? <p className="form-note">{note}</p> : null}
        {tab === 'stats' ? <Dashboard orders={rows.orders ?? []} stats={stats} /> : null}
        {tab === 'products' ? (
          <ProductsPane
            categories={categories}
            folderId={folderId}
            mode={productMode}
            onAdd={() => openModal('product', { stock_quantity: 0, is_active: true, imagesText: '', tagsText: '', variants: [] })}
            onDelete={(id) => {
              if (window.confirm('Delete this product?')) remove(`/admin/products/${id}`, 'products').catch((error) => setNote(error.message));
            }}
            onEdit={(product) => openModal('product', {
              ...product,
              imagesText: Array.isArray(product.images) ? (product.images as string[]).join(', ') : '',
              tagsText: Array.isArray(product.tags) ? (product.tags as string[]).join(', ') : '',
              variants: Array.isArray(product.variants) ? product.variants : [],
            })}
            onMode={setProductMode}
            onOpenFolder={(id) => { setFolderId(id); setProductMode('category'); }}
            onNumber={() => numberProducts(products, categories, token, () => load('products'), setNote)}
            products={products}
          />
        ) : null}
        {tab === 'categories' ? (
          <CategoriesPane
            categories={categories}
            onAdd={() => openModal('category', { sort_order: 0, is_active: true })}
            onDelete={(id) => {
              if (window.confirm('Delete this category? Products in it stay, but become uncategorised.')) {
                remove(`/admin/categories/${id}`, 'categories').catch((error) => setNote(error.message));
              }
            }}
            onEdit={(category) => openModal('category', category)}
          />
        ) : null}
        {tab === 'banners' ? (
          <SimpleTable
            action={<button className="btn btn-gold btn-sm" onClick={() => openModal('banner', { sort_order: 0, is_active: true, position: 'hero' })} type="button">+ Add Banner</button>}
            columns={['Img', 'Title', 'Order', 'Status', 'Actions']}
            intro="Best size: 1920×720px (wide) or 1080×1350 (mobile-friendly)."
            rows={rows.banners ?? []}
            title="Hero Banners"
            render={(banner) => (
              <tr key={text(banner.id)}>
                <td>{banner.image_url ? <img alt="" src={text(banner.image_url)} style={{ width: 70, height: 40, objectFit: 'cover' }} /> : null}</td>
                <td>{text(banner.title) || '—'}</td>
                <td>{text(banner.sort_order)}</td>
                <td><Status value={banner.is_active} /></td>
                <td>
                  <button className="action-btn" onClick={() => openModal('banner', banner)} type="button">Edit</button>{' '}
                  <button className="action-btn" onClick={() => window.confirm('Delete this banner?') && remove(`/admin/banners/${banner.id}`, 'banners').catch((error) => setNote(error.message))} style={{ color: 'var(--danger)' }} type="button">Delete</button>
                </td>
              </tr>
            )}
          />
        ) : null}
        {tab === 'materials' ? (
          <MaterialsPane
            materials={rows.materials ?? []}
            onAdd={async (name) => {
              await clientRequest('/admin/materials', token, { method: 'POST', body: JSON.stringify({ name }) });
              setNote('Material added');
              await load('materials');
            }}
            onDelete={(id, name) => {
              if (window.confirm(`Delete "${name}"?`)) remove(`/admin/materials/${id}`, 'materials').catch((error) => setNote(error.message));
            }}
          />
        ) : null}
        {tab === 'orders' ? (
          <OrdersPane
            onDelivery={(order) => openModal('delivery', order)}
            onStatus={(id, status) => clientRequest(`/admin/orders/${id}`, token, { method: 'PATCH', body: JSON.stringify({ status }) }).then(() => setNote('Order status updated')).catch((error) => setNote(error.message))}
            orders={rows.orders ?? []}
          />
        ) : null}
        {tab === 'coupons' ? (
          <SimpleTable
            action={<button className="btn btn-gold btn-sm" onClick={() => openModal('coupon', { discount_type: 'percent', min_order_amount: 0, per_user_limit: 1, is_active: true })} type="button">+ Add Coupon</button>}
            columns={['Code', 'Description', 'Discount', 'Used', 'Status', 'Actions']}
            rows={rows.coupons ?? []}
            title="Coupons"
            render={(coupon) => (
              <tr key={text(coupon.id)}>
                <td><b>{text(coupon.code)}</b></td>
                <td>{text(coupon.description)}</td>
                <td>{coupon.discount_type === 'percent' ? `${text(coupon.discount_value)}%` : money.format(Number(coupon.discount_value ?? 0))}</td>
                <td>{text(coupon.used_count)}{coupon.usage_limit ? `/${text(coupon.usage_limit)}` : ''}</td>
                <td><Status off="Off" value={coupon.is_active} /></td>
                <td><button className="action-btn" onClick={() => openModal('coupon', coupon)} type="button">Edit</button></td>
              </tr>
            )}
          />
        ) : null}
        {tab === 'custom-orders' ? (
          <SimpleTable
            columns={['Customer', 'Type', 'Budget', 'Status', 'Date']}
            rows={rows['custom-orders'] ?? []}
            title="Custom Requests"
            render={(request) => (
              <tr key={text(request.id)}>
                <td>{text(request.full_name)}<br /><span style={{ fontSize: 11, color: 'rgba(34,31,28,.5)' }}>{text(request.phone)}</span></td>
                <td>{text(request.jewellery_type) || '—'}</td>
                <td>{text(request.budget_range) || '—'}</td>
                <td>
                  <select defaultValue={text(request.status)} onChange={(event) => clientRequest(`/admin/custom-orders/${request.id}`, token, { method: 'PATCH', body: JSON.stringify({ status: event.target.value }) }).then(() => setNote('Request updated'))}>
                    {CUSTOM_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </td>
                <td>{dateLabel(request.created_at)}</td>
              </tr>
            )}
          />
        ) : null}
        {tab === 'reviews' ? (
          <SimpleTable
            columns={['Product', 'Customer', 'Rating', 'Review', 'Status', 'Action']}
            rows={rows.reviews ?? []}
            title="Reviews"
            render={(review) => (
              <tr key={text(review.id)}>
                <td>{text(review.products?.name) || '—'}</td>
                <td>{text(review.profiles?.full_name) || '—'}</td>
                <td style={{ color: 'var(--gold)' }}>{'★'.repeat(Number(review.rating ?? 0))}</td>
                <td style={{ maxWidth: 260 }}>{text(review.body)}</td>
                <td>{review.is_approved ? <span className="status-badge status-delivered">Approved</span> : <span className="status-badge status-pending">Pending</span>}</td>
                <td>{review.is_approved ? null : <button className="action-btn" onClick={() => clientRequest(`/admin/reviews/${review.id}`, token, { method: 'PATCH', body: JSON.stringify({ approve: true }) }).then(() => load('reviews'))} type="button">Approve</button>}</td>
              </tr>
            )}
          />
        ) : null}
        {tab === 'customers' ? (
          <CustomersPane
            customers={rows.customers ?? []}
            emails={emails}
            onDelete={(id, name) => {
              if (!window.confirm(`Delete ${name}? This removes their login. Past orders stay in Orders.`)) return;
              clientRequest('/admin/customers/action', token, { method: 'POST', body: JSON.stringify({ action: 'delete', target_user_id: id }) })
                .then(() => load('customers'))
                .catch((error) => setNote(error.message));
            }}
            onEmail={(id) => {
              const next = window.prompt('Enter the new email for this customer', emails[id] ?? '');
              if (!next || next === emails[id]) return;
              clientRequest('/admin/customers/action', token, { method: 'POST', body: JSON.stringify({ action: 'update_email', target_user_id: id, new_email: next }) })
                .then(() => load('customers'))
                .catch((error) => setNote(error.message));
            }}
          />
        ) : null}
        {tab === 'gift-cards' ? (
          <SimpleTable
            columns={['Code', 'Purchased By', 'Recipient', 'Initial', 'Balance', 'Status']}
            rows={rows['gift-cards'] ?? []}
            title="Gift Cards"
            render={(card) => (
              <tr key={text(card.id)}>
                <td><b>{text(card.code)}</b></td>
                <td>{text(card.profiles?.full_name) || '—'}</td>
                <td>{text(card.recipient_name) || '—'}</td>
                <td>{money.format(Number(card.initial_amount ?? 0))}</td>
                <td>{money.format(Number(card.balance ?? 0))}</td>
                <td><span className={card.status === 'active' ? 'status-badge status-delivered' : 'status-badge status-cancelled'}>{text(card.status)}</span></td>
              </tr>
            )}
          />
        ) : null}
        {tab === 'corporate' ? (
          <SimpleTable
            columns={['Company', 'Est. Quantity', 'Requirement', 'Status', 'Date']}
            rows={rows.corporate ?? []}
            title="Corporate Gifting Enquiries"
            render={(enquiry) => (
              <tr key={text(enquiry.id)}>
                <td>{text(enquiry.company_name)}<br /><span style={{ fontSize: 11, color: 'rgba(34,31,28,.5)' }}>{text(enquiry.contact_name)} · {text(enquiry.phone)}</span></td>
                <td>{text(enquiry.estimated_quantity) || '—'}</td>
                <td style={{ maxWidth: 240 }}>{text(enquiry.requirement)}</td>
                <td>
                  <select defaultValue={text(enquiry.status)} onChange={(event) => clientRequest(`/admin/corporate/${enquiry.id}`, token, { method: 'PATCH', body: JSON.stringify({ status: event.target.value }) }).then(() => setNote('Enquiry updated'))}>
                    {CORPORATE_STATUSES.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </td>
                <td>{dateLabel(enquiry.created_at)}</td>
              </tr>
            )}
          />
        ) : null}
        {tab === 'savings/plans' ? (
          <PlansPane
            onAdd={() => openModal('plan', { duration_months: 11, bonus_percent: 5, is_active: true })}
            onAssign={async () => {
              const customers = rows.customers ?? await clientRequest<Row[]>('/admin/customers', token);
              setRows((current) => ({ ...current, customers }));
              openModal('assign', {});
            }}
            onEdit={(plan) => openModal('plan', plan)}
            plans={rows['savings/plans'] ?? []}
            subscriptions={rows.subscriptions ?? []}
          />
        ) : null}
        {tab === 'stores' ? (
          <SimpleTable
            action={<button className="btn btn-gold btn-sm" onClick={() => openModal('store', { is_active: true })} type="button">+ Add Store</button>}
            columns={['Name', 'City', 'Phone', 'Status', 'Actions']}
            rows={rows.stores ?? []}
            title="Store Locator"
            render={(store) => (
              <tr key={text(store.id)}>
                <td>{text(store.name)}</td>
                <td>{text(store.city) || '—'}</td>
                <td>{text(store.phone) || '—'}</td>
                <td><Status value={store.is_active} /></td>
                <td>
                  <button className="action-btn" onClick={() => openModal('store', store)} type="button">Edit</button>{' '}
                  <button className="action-btn" onClick={() => window.confirm('Delete this store location?') && remove(`/admin/stores/${store.id}`, 'stores')} type="button">Delete</button>
                </td>
              </tr>
            )}
          />
        ) : null}
        {tab === 'press' ? (
          <SimpleTable
            action={<button className="btn btn-gold btn-sm" onClick={() => openModal('press', { is_active: true })} type="button">+ Add Mention</button>}
            columns={['Publication', 'Quote', 'Status', 'Actions']}
            rows={rows.press ?? []}
            title="Press Mentions"
            render={(mention) => (
              <tr key={text(mention.id)}>
                <td>{text(mention.publication_name)}</td>
                <td style={{ maxWidth: 260 }}>{text(mention.quote)}</td>
                <td><Status value={mention.is_active} /></td>
                <td>
                  <button className="action-btn" onClick={() => openModal('press', mention)} type="button">Edit</button>{' '}
                  <button className="action-btn" onClick={() => window.confirm('Delete this press mention?') && remove(`/admin/press/${mention.id}`, 'press')} type="button">Delete</button>
                </td>
              </tr>
            )}
          />
        ) : null}
        {tab === 'analytics' && analytics ? <AdminAnalytics onRefresh={() => load('analytics')} source={analytics} /> : null}
        {tab === 'settings' ? (
          <SettingsPane
            onChange={(key, value) => setSettings((current) => ({ ...current, [key]: value }))}
            onSave={() => saveSettings(settings, token, setNote)}
            settings={settings}
          />
        ) : null}
      </main>
      {modal ? (
        <>
          <div className="overlay open" onClick={closeModal} />
          <AdminModal
            categories={categories}
            customers={rows.customers ?? []}
            draft={draft}
            materials={rows.materials ?? []}
            name={modal}
            nextSerial={draft.id ? '' : nextSerial}
            onChange={setDraft}
            onClose={closeModal}
            onSave={() => submitModal(modal, draft, token, save, setNote, closeModal)}
            plans={rows['savings/plans'] ?? []}
            token={token}
          />
        </>
      ) : null}
    </div>
  );
}

function Dashboard({ stats, orders }: { stats: { orders: number; products: number; customers: number; revenue: number } | null; orders: Row[] }) {
  return (
    <>
      <div className="admin-topbar"><h1>Dashboard</h1></div>
      <div className="stat-row">
        <div className="stat"><div className="num">{money.format(stats?.revenue ?? 0)}</div><div className="lbl">Revenue (paid)</div></div>
        <div className="stat"><div className="num">{stats?.orders ?? 0}</div><div className="lbl">Orders</div></div>
        <div className="stat"><div className="num">{stats?.products ?? 0}</div><div className="lbl">Products</div></div>
        <div className="stat"><div className="num">{stats?.customers ?? 0}</div><div className="lbl">Customers</div></div>
      </div>
      <div className="dash-card">
        <h3 style={{ fontFamily: 'var(--serif)', marginBottom: 14 }}>Recent Orders</h3>
        <table className="data">
          <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            {orders.slice(0, 6).map((order) => (
              <tr key={text(order.id)}>
                <td>{text(order.order_number)}</td>
                <td>{text(order.profiles?.full_name) || '—'}</td>
                <td>{money.format(Number(order.total_amount ?? 0))}</td>
                <td><span className={`status-badge status-${text(order.status)}`}>{text(order.status)}</span></td>
              </tr>
            ))}
            {!orders.length ? <tr><td colSpan={4}>No orders yet</td></tr> : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

function ProductsPane({
  products, categories, mode, folderId, onMode, onOpenFolder, onAdd, onEdit, onDelete, onNumber,
}: {
  products: Row[];
  categories: Row[];
  mode: 'folders' | 'all' | 'category';
  folderId: string | null;
  onMode: (mode: 'folders' | 'all') => void;
  onOpenFolder: (id: string) => void;
  onAdd: () => void;
  onEdit: (product: Row) => void;
  onDelete: (id: string) => void;
  onNumber: () => void;
}) {
  const countFor = (id: string) => products.filter((product) => product.category_id === id).length;
  const visible = mode === 'category'
    ? products.filter((product) => folderId === 'uncategorized' ? !product.category_id : product.category_id === folderId)
    : products;
  const folder = categories.find((category) => category.id === folderId);

  return (
    <>
      <div className="admin-topbar">
        <h1>Products</h1>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-line-dark btn-sm" onClick={() => onMode(mode === 'all' ? 'folders' : 'all')} type="button">{mode === 'all' ? 'Group by Category' : 'View All'}</button>
          <button className="btn btn-line-dark btn-sm" onClick={onNumber} type="button">🔢 Number Old Products</button>
          <button className="btn btn-gold btn-sm" onClick={onAdd} type="button">+ Add Product</button>
        </div>
      </div>
      {mode === 'folders' ? (
        <div className="cat-scroll" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
          {categories.filter((category) => !category.parent_id).map((category) => (
            <button className="cat-tile" key={text(category.id)} onClick={() => onOpenFolder(text(category.id))} type="button">
              <div className="arch-frame" style={{ aspectRatio: '1/1' }}>
                {category.image_url ? <img alt="" src={text(category.image_url)} /> : null}
              </div>
              <span>{text(category.icon)} {text(category.name)}</span>
              <div style={{ fontSize: 11.5, color: 'rgba(34,31,28,.5)', marginTop: 4 }}>{countFor(text(category.id))} pieces</div>
            </button>
          ))}
        </div>
      ) : null}
      {mode === 'category' ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <button className="btn-ghost" onClick={() => onMode('folders')} type="button">← All Categories</button>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 24 }}>{folder ? `${text(folder.icon)} ${text(folder.name)}` : 'Uncategorised'} <span style={{ fontSize: 14, color: 'rgba(34,31,28,.5)' }}>({visible.length})</span></h2>
          </div>
          <div className="p-grid">
            {visible.map((product) => (
              <article className="p-card" key={text(product.id)}>
                <div className="thumb"><img alt="" src={Array.isArray(product.images) ? text(product.images[0]) : ''} /></div>
                <div className="info">
                  <div className="cat">{text(product.serial_no) || '—'}</div>
                  <h3>{text(product.name)}</h3>
                  <div className="price-row"><span className="price">{money.format(Number(product.price ?? 0))}</span></div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button className="action-btn" onClick={() => onEdit(product)} style={{ flex: 1 }} type="button">Edit</button>
                    <button className="action-btn" onClick={() => onDelete(text(product.id))} style={{ flex: 1, color: 'var(--danger)' }} type="button">Delete</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}
      {mode === 'all' ? (
        <table className="data">
          <thead><tr><th>Sr.No</th><th>Img</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {products.map((product) => (
              <tr key={text(product.id)}>
                <td>{text(product.serial_no) || '—'}</td>
                <td>{Array.isArray(product.images) && product.images[0] ? <img alt="" src={text(product.images[0])} style={{ width: 42, height: 42, objectFit: 'cover' }} /> : null}</td>
                <td>{text(product.name)}</td>
                <td>{text(product.categories?.name) || '—'}</td>
                <td>{money.format(Number(product.price ?? 0))}</td>
                <td>{text(product.stock_quantity)}</td>
                <td><Status value={product.is_active} /></td>
                <td>
                  <button className="action-btn" onClick={() => onEdit(product)} type="button">Edit</button>{' '}
                  <button className="action-btn" onClick={() => onDelete(text(product.id))} type="button">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </>
  );
}

function CategoriesPane({ categories, onAdd, onEdit, onDelete }: { categories: Row[]; onAdd: () => void; onEdit: (category: Row) => void; onDelete: (id: string) => void }) {
  const ordered = categories.filter((category) => !category.parent_id);
  return (
    <>
      <div className="admin-topbar"><h1>Categories</h1><button className="btn btn-gold btn-sm" onClick={onAdd} type="button">+ Add Category</button></div>
      <table className="data">
        <thead><tr><th>Icon</th><th>Name</th><th>Slug</th><th>Order</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {ordered.flatMap((parent) => [parent, ...categories.filter((category) => category.parent_id === parent.id)]).map((category) => (
            <tr key={text(category.id)}>
              <td>{text(category.icon)}</td>
              <td>{category.parent_id ? '↳ ' : ''}{text(category.name)}</td>
              <td>{text(category.slug)}</td>
              <td>{text(category.sort_order)}</td>
              <td><Status value={category.is_active} /></td>
              <td>
                <button className="action-btn" onClick={() => onEdit(category)} type="button">Edit</button>{' '}
                <button className="action-btn" onClick={() => onDelete(text(category.id))} type="button">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function MaterialsPane({ materials, onAdd, onDelete }: { materials: Row[]; onAdd: (name: string) => Promise<void>; onDelete: (id: string, name: string) => void }) {
  const [name, setName] = useState('');
  return (
    <>
      <div className="admin-topbar"><h1>Materials</h1></div>
      <form onSubmit={(event) => { event.preventDefault(); onAdd(name).then(() => setName('')); }} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <input onChange={(event) => setName(event.target.value)} placeholder="e.g. Rose Gold" style={{ flex: 1, border: '1px solid var(--line-light)', padding: 10 }} value={name} />
        <button className="btn btn-gold btn-sm" type="submit">+ Add</button>
      </form>
      <table className="data">
        <thead><tr><th>Name</th><th>Actions</th></tr></thead>
        <tbody>
          {materials.map((material) => (
            <tr key={text(material.id)}>
              <td>{text(material.name)}</td>
              <td><button className="action-btn" onClick={() => onDelete(text(material.id), text(material.name))} style={{ color: 'var(--danger)' }} type="button">Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function OrdersPane({ orders, onStatus, onDelivery }: { orders: Row[]; onStatus: (id: string, status: string) => void; onDelivery: (order: Row) => void }) {
  return (
    <>
      <div className="admin-topbar"><h1>Orders</h1></div>
      <div style={{ overflowX: 'auto' }}>
        <table className="data">
          <thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Payment</th><th>Status</th><th>Invoice</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={text(order.id)}>
                <td>{text(order.order_number)}</td>
                <td>{text(order.profiles?.full_name) || '—'}<br /><span style={{ fontSize: 11, color: 'rgba(34,31,28,.5)' }}>{text(order.profiles?.phone)}</span></td>
                <td>{dateLabel(order.created_at)}</td>
                <td>{money.format(Number(order.total_amount ?? 0))}</td>
                <td>{text(order.payment_method) || '—'} / {text(order.payment_status)}</td>
                <td>
                  <select defaultValue={text(order.status)} onChange={(event) => onStatus(text(order.id), event.target.value)}>
                    {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td>
                  <button className="action-btn" onClick={() => downloadInvoice(order)} type="button">📄 Download</button>
                  <button className="action-btn" onClick={() => onDelivery(order)} style={{ marginTop: 6 }} type="button">🚚 Delivery Details</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CustomersPane({ customers, emails, onEmail, onDelete }: { customers: Row[]; emails: Record<string, string>; onEmail: (id: string) => void; onDelete: (id: string, name: string) => void }) {
  return (
    <>
      <div className="admin-topbar"><h1>Customers</h1></div>
      <table className="data">
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Orders</th><th>Spent</th><th>Loyalty</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={text(customer.id)}>
              <td>{text(customer.full_name) || '—'}</td>
              <td>{text(customer.phone) || '—'}</td>
              <td>{emails[text(customer.id)] || '—'}</td>
              <td>{text(customer.total_orders || 0)}</td>
              <td>{money.format(Number(customer.total_spent ?? 0))}</td>
              <td>{text(customer.loyalty_points || 0)} pts</td>
              <td><span className={customer.role === 'customer' ? 'status-badge status-pending' : 'status-badge status-delivered'}>{text(customer.role)}</span></td>
              <td>
                {customer.role === 'customer' ? (
                  <>
                    <button className="action-btn" onClick={() => onEmail(text(customer.id))} type="button">Email</button>{' '}
                    <button className="action-btn" onClick={() => onDelete(text(customer.id), text(customer.full_name) || 'this customer')} style={{ color: 'var(--danger)' }} type="button">Delete</button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function PlansPane({ plans, subscriptions, onAdd, onEdit, onAssign }: { plans: Row[]; subscriptions: Row[]; onAdd: () => void; onEdit: (plan: Row) => void; onAssign: () => void }) {
  return (
    <>
      <div className="admin-topbar">
        <h1>Smart Purchase Plans</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-gold btn-sm" onClick={onAdd} type="button">+ Add Plan</button>
          <button className="btn btn-line-dark btn-sm" onClick={onAssign} type="button">+ Assign to Customer</button>
        </div>
      </div>
      <table className="data">
        <thead><tr><th>Name</th><th>Monthly</th><th>Duration</th><th>Bonus</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {plans.map((plan) => (
            <tr key={text(plan.id)}>
              <td>{text(plan.name)}</td>
              <td>{money.format(Number(plan.monthly_amount ?? 0))}</td>
              <td>{text(plan.duration_months)} mo</td>
              <td>{text(plan.bonus_percent)}%</td>
              <td><Status off="Off" value={plan.is_active} /></td>
              <td><button className="action-btn" onClick={() => onEdit(plan)} type="button">Edit</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 style={{ fontFamily: 'var(--serif)', margin: '28px 0 14px' }}>Active Subscriptions</h3>
      <table className="data">
        <thead><tr><th>Customer</th><th>Plan</th><th>Months Paid</th><th>Total Paid</th><th>Status</th></tr></thead>
        <tbody>
          {subscriptions.map((subscription) => (
            <tr key={text(subscription.id)}>
              <td>{text(subscription.profiles?.full_name) || '—'}</td>
              <td>{text(subscription.savings_plans?.name) || '—'}</td>
              <td>{text(subscription.months_paid)}</td>
              <td>{money.format(Number(subscription.total_paid ?? 0))}</td>
              <td><span className={`status-badge status-${text(subscription.status) === 'matured' ? 'delivered' : text(subscription.status) === 'cancelled' ? 'cancelled' : 'pending'}`}>{text(subscription.status)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function ColourVariants({ variants, token, onChange }: { variants: Row[]; token: string | null; onChange: (variants: Row[]) => void }) {
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#C9A24B');
  const list = variants.map((variant) => ({
    id: text(variant.id),
    color_name: text(variant.color_name),
    color_hex: text(variant.color_hex) || '#C9A24B',
    images: Array.isArray(variant.images) ? variant.images.map((image) => String(image)) : [],
  }));

  function update(next: typeof list) {
    onChange(next);
  }

  return (
    <div className="field">
      <label>Colours</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <input onChange={(event) => setName(event.target.value)} placeholder="Colour name" value={name} />
        <input onChange={(event) => setHex(event.target.value)} type="color" value={hex} />
        <button
          className="btn btn-line-dark btn-sm"
          onClick={() => {
            if (!name.trim()) return;
            update([...list, { id: `v_${Date.now().toString(36)}`, color_name: name.trim(), color_hex: hex, images: [] }]);
            setName('');
          }}
          type="button"
        >
          Add colour
        </button>
      </div>
      {list.map((variant) => (
        <div key={variant.id} style={{ border: '1px solid var(--line-light)', display: 'grid', gap: 8, gridTemplateColumns: '28px 1fr auto', marginBottom: 8, padding: 8 }}>
          <span style={{ background: variant.color_hex, height: 28, width: 28 }} />
          <div>
            <input onChange={(event) => update(list.map((item) => item.id === variant.id ? { ...item, color_name: event.target.value } : item))} value={variant.color_name} />
            <input
              accept="image/*"
              multiple
              onChange={(event) => {
                uploadImages(event.target.files, token, variant.images.join(', '), (value) => {
                  update(list.map((item) => item.id === variant.id ? { ...item, images: value.split(',').map((image) => image.trim()).filter(Boolean) } : item));
                }).catch(() => window.alert('Photo upload needs the service role key in the API environment.'));
              }}
              style={{ marginTop: 8 }}
              type="file"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {variant.images.map((image, index) => (
                <span key={image}>
                  <img alt="" src={image} style={{ height: 42, objectFit: 'cover', width: 42 }} />
                  <button onClick={() => update(list.map((item) => item.id === variant.id ? { ...item, images: item.images.filter((_, imageIndex) => imageIndex !== index) } : item))} type="button">✕</button>
                </span>
              ))}
            </div>
          </div>
          <button className="action-btn" onClick={() => update(list.filter((item) => item.id !== variant.id))} type="button">Remove</button>
        </div>
      ))}
    </div>
  );
}

function SettingsPane({ settings, onChange, onSave }: { settings: Record<string, string>; onChange: (key: string, value: string) => void; onSave: () => void }) {
  const fields = ['cod_fee', 'announcement_text', 'whatsapp_number', 'store_phone', 'store_email', 'store_address'];
  return (
    <>
      <div className="admin-topbar"><h1>Site Settings</h1><button className="btn btn-gold btn-sm" onClick={onSave} type="button">Save All</button></div>
      <div className="dash-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {fields.map((key) => (
          <div className="field" key={key}>
            <label>{key.replace(/_/g, ' ')}</label>
            <input onChange={(event) => onChange(key, event.target.value)} value={settings[key] ?? ''} />
          </div>
        ))}
        <div className="field" style={{ gridColumn: '1 / -1' }}><label>Flash Sale</label></div>
        <label className="filter-opt"><input checked={settings.flash_sale_active === 'true'} onChange={(event) => onChange('flash_sale_active', event.target.checked ? 'true' : 'false')} type="checkbox" /> Flash sale active</label>
        <div className="field"><label>Banner Title</label><input onChange={(event) => onChange('flash_sale_title', event.target.value)} value={settings.flash_sale_title ?? ''} /></div>
        <div className="field"><label>Discount %</label><input onChange={(event) => onChange('flash_sale_discount_percent', event.target.value)} type="number" value={settings.flash_sale_discount_percent ?? ''} /></div>
        <div className="field"><label>Ends At</label><input onChange={(event) => onChange('flash_sale_end', event.target.value ? new Date(event.target.value).toISOString() : '')} type="datetime-local" value={localDateTime(settings.flash_sale_end)} /></div>
        <div className="field"><label>Applies to Tag</label><input onChange={(event) => onChange('flash_sale_tag', event.target.value)} value={settings.flash_sale_tag ?? 'collection:flash-sale'} /></div>
        <div className="field"><label>Referral discount (₹)</label><input onChange={(event) => onChange('referral_discount_amount', event.target.value)} type="number" value={settings.referral_discount_amount ?? ''} /></div>
        <div className="field"><label>Referral minimum order (₹)</label><input onChange={(event) => onChange('referral_min_order', event.target.value)} type="number" value={settings.referral_min_order ?? ''} /></div>
      </div>
    </>
  );
}

function SimpleTable({ title, intro, action, columns, rows, render }: { title: string; intro?: string; action?: ReactNode; columns: string[]; rows: Row[]; render: (row: Row) => ReactNode }) {
  return (
    <>
      <div className="admin-topbar"><h1>{title}</h1>{action}</div>
      {intro ? <p className="lede-light" style={{ marginBottom: 18 }}>{intro}</p> : null}
      <div style={{ overflowX: 'auto' }}>
        <table className="data">
          <thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>{rows.length ? rows.map(render) : <tr><td colSpan={columns.length}>Nothing here yet.</td></tr>}</tbody>
        </table>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}

function AdminModal({
  name, draft, categories, materials, customers, plans, nextSerial, token, onChange, onClose, onSave,
}: {
  name: string;
  draft: Row;
  categories: Row[];
  materials: Row[];
  customers: Row[];
  plans: Row[];
  nextSerial: string;
  token: string | null;
  onChange: (draft: Row) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = (key: string, value: unknown) => onChange({ ...draft, [key]: value });
  const titles: Record<string, string> = {
    product: draft.id ? 'Edit Product' : 'Add Product',
    category: 'Category',
    coupon: 'Coupon',
    banner: 'Hero Banner',
    plan: 'Smart Purchase Plan',
    assign: 'Assign Plan to Customer',
    store: 'Store Location',
    press: 'Press Mention',
    delivery: 'Delivery Details',
  };
  return (
    <div className="modal open">
      <div className={`modal-card${name === 'product' || name === 'banner' ? ' wide' : ''}`}>
        <button className="modal-close" onClick={onClose} type="button">✕</button>
        <h2>{titles[name]}</h2>
        <form onSubmit={(event) => { event.preventDefault(); onSave(); }} style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {name === 'product' ? (
            <>
              <Field label="Name"><input onChange={(event) => set('name', event.target.value)} required value={text(draft.name)} /></Field>
              <Field label="Category">
                <select onChange={(event) => set('category_id', event.target.value)} value={text(draft.category_id)}>
                  <option value="">— None —</option>
                  {categories.map((category) => <option key={text(category.id)} value={text(category.id)}>{text(category.name)}</option>)}
                </select>
                {nextSerial ? <div style={{ fontSize: 11.5, marginTop: 5 }}>This product will be numbered: {nextSerial}</div> : null}
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Price (₹)"><input onChange={(event) => set('price', Number(event.target.value))} required type="number" value={text(draft.price)} /></Field>
                <Field label="MRP (₹)"><input onChange={(event) => set('mrp', event.target.value)} type="number" value={text(draft.mrp)} /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="Stock"><input onChange={(event) => set('stock_quantity', Number(event.target.value))} type="number" value={text(draft.stock_quantity)} /></Field>
                <Field label="Purity"><input onChange={(event) => set('purity', event.target.value)} placeholder="22K" value={text(draft.purity)} /></Field>
                <Field label="Weight (g)"><input onChange={(event) => set('weight_grams', event.target.value)} step="0.01" type="number" value={text(draft.weight_grams)} /></Field>
              </div>
              <Field label="Material">
                <select onChange={(event) => set('material', event.target.value)} value={text(draft.material)}>
                  <option value="">—</option>
                  {materials.map((material) => <option key={text(material.id)}>{text(material.name)}</option>)}
                </select>
              </Field>
              <Field label="Description"><textarea onChange={(event) => set('description', event.target.value)} rows={3} value={text(draft.description)} /></Field>
              <Field label="Tags (comma separated)"><input onChange={(event) => set('tagsText', event.target.value)} placeholder="bestseller, bridal, audience:her" value={text(draft.tagsText)} /></Field>
              <Field label="Product Photos">
                <input onChange={(event) => uploadImages(event.target.files, token, text(draft.imagesText), (imagesText) => set('imagesText', imagesText))} type="file" accept="image/*" multiple />
              </Field>
              <Field label="Image URLs"><input onChange={(event) => set('imagesText', event.target.value)} value={text(draft.imagesText)} /></Field>
              <Field label="Product Video URL"><input onChange={(event) => set('video_url', event.target.value)} value={text(draft.video_url)} /></Field>
              <ColourVariants onChange={(variants) => set('variants', variants)} token={token} variants={Array.isArray(draft.variants) ? draft.variants : []} />
              <label className="filter-opt"><input checked={Boolean(draft.is_featured)} onChange={(event) => set('is_featured', event.target.checked)} type="checkbox" /> Featured on homepage</label>
              <label className="filter-opt"><input checked={Boolean(draft.is_bestseller)} onChange={(event) => set('is_bestseller', event.target.checked)} type="checkbox" /> Mark as bestseller</label>
              <label className="filter-opt"><input checked={draft.is_active !== false} onChange={(event) => set('is_active', event.target.checked)} type="checkbox" /> Active / visible</label>
            </>
          ) : null}
          {name === 'category' ? (
            <>
              <Field label="Name"><input onChange={(event) => set('name', event.target.value)} required value={text(draft.name)} /></Field>
              <Field label="Icon (emoji)"><input onChange={(event) => set('icon', event.target.value)} value={text(draft.icon)} /></Field>
              <Field label="Category Image URL"><input onChange={(event) => set('image_url', event.target.value)} value={text(draft.image_url)} /></Field>
              <Field label="Sort Order"><input onChange={(event) => set('sort_order', Number(event.target.value))} type="number" value={text(draft.sort_order)} /></Field>
              <Field label="Parent Category">
                <select onChange={(event) => set('parent_id', event.target.value)} value={text(draft.parent_id)}>
                  <option value="">— None —</option>
                  {categories.filter((category) => category.id !== draft.id).map((category) => <option key={text(category.id)} value={text(category.id)}>{text(category.name)}</option>)}
                </select>
              </Field>
              <label className="filter-opt"><input checked={draft.is_active !== false} onChange={(event) => set('is_active', event.target.checked)} type="checkbox" /> Active</label>
            </>
          ) : null}
          {name === 'coupon' ? (
            <>
              <Field label="Code"><input onChange={(event) => set('code', event.target.value.toUpperCase())} required value={text(draft.code)} /></Field>
              <Field label="Description"><input onChange={(event) => set('description', event.target.value)} value={text(draft.description)} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Type"><select onChange={(event) => set('discount_type', event.target.value)} value={text(draft.discount_type)}><option value="percent">Percent</option><option value="fixed">Fixed ₹</option></select></Field>
                <Field label="Value"><input onChange={(event) => set('discount_value', Number(event.target.value))} required type="number" value={text(draft.discount_value)} /></Field>
              </div>
              <Field label="Min Order Amount (₹)"><input onChange={(event) => set('min_order_amount', Number(event.target.value))} type="number" value={text(draft.min_order_amount)} /></Field>
              <Field label="Max Discount Cap (₹, optional)"><input onChange={(event) => set('max_discount', event.target.value)} type="number" value={text(draft.max_discount)} /></Field>
              <Field label="Uses allowed per customer"><input onChange={(event) => set('per_user_limit', Number(event.target.value))} type="number" value={text(draft.per_user_limit)} /></Field>
              <label className="filter-opt"><input checked={draft.is_active !== false} onChange={(event) => set('is_active', event.target.checked)} type="checkbox" /> Active</label>
            </>
          ) : null}
          {name === 'banner' ? (
            <>
              <Field label="Banner Image">
                <input onChange={(event) => uploadImages(event.target.files, token, '', (url) => set('image_url', url.split(',')[0]))} type="file" accept="image/*" />
                <input onChange={(event) => set('image_url', event.target.value)} placeholder="https://…" style={{ marginTop: 8 }} value={text(draft.image_url)} />
              </Field>
              <Field label="Title (optional)"><input onChange={(event) => set('title', event.target.value)} value={text(draft.title)} /></Field>
              <Field label="Subtitle (optional)"><input onChange={(event) => set('subtitle', event.target.value)} value={text(draft.subtitle)} /></Field>
              <Field label="Button Text"><input onChange={(event) => set('cta_text', event.target.value)} value={text(draft.cta_text)} /></Field>
              <Field label="Link"><input onChange={(event) => set('link_url', event.target.value)} value={text(draft.link_url)} /></Field>
              <Field label="Sort Order"><input onChange={(event) => set('sort_order', Number(event.target.value))} type="number" value={text(draft.sort_order)} /></Field>
              <label className="filter-opt"><input checked={draft.is_active !== false} onChange={(event) => set('is_active', event.target.checked)} type="checkbox" /> Active / visible</label>
            </>
          ) : null}
          {name === 'plan' ? (
            <>
              <Field label="Plan Name"><input onChange={(event) => set('name', event.target.value)} required value={text(draft.name)} /></Field>
              <Field label="Monthly Amount (₹)"><input onChange={(event) => set('monthly_amount', Number(event.target.value))} required type="number" value={text(draft.monthly_amount)} /></Field>
              <Field label="Duration (months)"><input onChange={(event) => set('duration_months', Number(event.target.value))} required type="number" value={text(draft.duration_months)} /></Field>
              <Field label="Bonus % on Maturity"><input onChange={(event) => set('bonus_percent', Number(event.target.value))} step="0.1" type="number" value={text(draft.bonus_percent)} /></Field>
              <Field label="Description"><textarea onChange={(event) => set('description', event.target.value)} rows={3} value={text(draft.description)} /></Field>
              <label className="filter-opt"><input checked={draft.is_active !== false} onChange={(event) => set('is_active', event.target.checked)} type="checkbox" /> Active / visible to customers</label>
            </>
          ) : null}
          {name === 'assign' ? (
            <>
              <Field label="Customer">
                <select onChange={(event) => set('userId', event.target.value)} required value={text(draft.userId)}>
                  <option value="">Select</option>
                  {customers.filter((customer) => customer.role === 'customer').map((customer) => <option key={text(customer.id)} value={text(customer.id)}>{text(customer.full_name) || '—'} ({text(customer.phone) || 'no phone'})</option>)}
                </select>
              </Field>
              <Field label="Plan">
                <select onChange={(event) => set('planId', event.target.value)} required value={text(draft.planId)}>
                  <option value="">Select</option>
                  {plans.map((plan) => <option key={text(plan.id)} value={text(plan.id)}>{text(plan.name)}</option>)}
                </select>
              </Field>
            </>
          ) : null}
          {name === 'store' ? (
            <>
              <Field label="Store Name"><input onChange={(event) => set('name', event.target.value)} required value={text(draft.name)} /></Field>
              <Field label="Address"><textarea onChange={(event) => set('address', event.target.value)} required rows={2} value={text(draft.address)} /></Field>
              <Field label="City"><input onChange={(event) => set('city', event.target.value)} value={text(draft.city)} /></Field>
              <Field label="State"><input onChange={(event) => set('state', event.target.value)} value={text(draft.state)} /></Field>
              <Field label="Pincode"><input onChange={(event) => set('pincode', event.target.value)} value={text(draft.pincode)} /></Field>
              <Field label="Phone"><input onChange={(event) => set('phone', event.target.value)} value={text(draft.phone)} /></Field>
              <Field label="Hours"><input onChange={(event) => set('hours', event.target.value)} value={text(draft.hours)} /></Field>
              <label className="filter-opt"><input checked={draft.is_active !== false} onChange={(event) => set('is_active', event.target.checked)} type="checkbox" /> Active / visible</label>
            </>
          ) : null}
          {name === 'press' ? (
            <>
              <Field label="Publication Name"><input onChange={(event) => set('publication_name', event.target.value)} required value={text(draft.publication_name)} /></Field>
              <Field label="Logo URL"><input onChange={(event) => set('logo_url', event.target.value)} value={text(draft.logo_url)} /></Field>
              <Field label="Article URL"><input onChange={(event) => set('article_url', event.target.value)} value={text(draft.article_url)} /></Field>
              <Field label="Quote"><textarea onChange={(event) => set('quote', event.target.value)} rows={2} value={text(draft.quote)} /></Field>
              <label className="filter-opt"><input checked={draft.is_active !== false} onChange={(event) => set('is_active', event.target.checked)} type="checkbox" /> Active / visible</label>
            </>
          ) : null}
          {name === 'delivery' ? (
            <>
              <Field label="Courier"><input onChange={(event) => set('courier_name', event.target.value)} value={text(draft.courier_name)} /></Field>
              <Field label="Tracking number"><input onChange={(event) => set('tracking_number', event.target.value)} value={text(draft.tracking_number)} /></Field>
              <Field label="Tracking link"><input onChange={(event) => set('tracking_url', event.target.value)} value={text(draft.tracking_url)} /></Field>
            </>
          ) : null}
          <button className="btn btn-gold btn-block" style={{ marginTop: 16 }} type="submit">{name === 'assign' ? 'Assign' : name === 'delivery' ? 'Save Details' : 'Save'}</button>
        </form>
      </div>
    </div>
  );
}

async function submitModal(
  name: string,
  draft: Row,
  token: string | null,
  save: (path: string, payload: Row, refresh: TabId) => Promise<void>,
  setNote: (note: string) => void,
  closeModal: () => void,
) {
  try {
    if (name === 'product') {
      const nameValue = text(draft.name).trim();
      const payload: Row = {
        id: draft.id,
        name: nameValue,
        category_id: draft.category_id || null,
        price: Number(draft.price ?? 0),
        mrp: draft.mrp ? Number(draft.mrp) : null,
        stock_quantity: Number(draft.stock_quantity ?? 0),
        material: draft.material || null,
        purity: draft.purity || null,
        weight_grams: draft.weight_grams ? Number(draft.weight_grams) : null,
        images: text(draft.imagesText).split(',').map((item) => item.trim()).filter(Boolean),
        video_url: text(draft.video_url) || null,
        description: draft.description || '',
        tags: text(draft.tagsText).split(',').map((item) => item.trim()).filter(Boolean),
        is_featured: Boolean(draft.is_featured),
        is_bestseller: Boolean(draft.is_bestseller),
        is_active: draft.is_active !== false,
        variants: Array.isArray(draft.variants) ? draft.variants : [],
      };
      if (!draft.id) {
        payload.slug = `${nameValue.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
      }
      await save('/admin/products', payload, 'products');
      return;
    }
    if (name === 'category') {
      const categoryName = text(draft.name).trim();
      const payload: Row = {
        id: draft.id,
        name: categoryName,
        icon: draft.icon || '',
        image_url: text(draft.image_url) || null,
        sort_order: Number(draft.sort_order ?? 0),
        parent_id: draft.parent_id || null,
        is_active: draft.is_active !== false,
      };
      if (!draft.id) payload.slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      await save('/admin/categories', payload, 'categories');
      return;
    }
    if (name === 'coupon') {
      await save('/admin/coupons', {
        id: draft.id,
        code: text(draft.code).trim().toUpperCase(),
        description: draft.description || '',
        discount_type: draft.discount_type,
        discount_value: Number(draft.discount_value ?? 0),
        min_order_amount: Number(draft.min_order_amount ?? 0),
        max_discount: draft.max_discount ? Number(draft.max_discount) : null,
        per_user_limit: Number(draft.per_user_limit ?? 1),
        is_active: draft.is_active !== false,
      }, 'coupons');
      return;
    }
    if (name === 'banner') {
      await save('/admin/banners', {
        id: draft.id,
        image_url: draft.image_url,
        title: draft.title || '',
        subtitle: draft.subtitle || '',
        cta_text: draft.cta_text || '',
        link_url: draft.link_url || '',
        position: 'hero',
        sort_order: Number(draft.sort_order ?? 0),
        is_active: draft.is_active !== false,
      }, 'banners');
      return;
    }
    if (name === 'plan') {
      await save('/admin/savings/plans', {
        id: draft.id,
        name: draft.name,
        monthly_amount: Number(draft.monthly_amount ?? 0),
        duration_months: Number(draft.duration_months ?? 0),
        bonus_percent: Number(draft.bonus_percent ?? 0),
        description: draft.description || '',
        is_active: draft.is_active !== false,
      }, 'savings/plans');
      return;
    }
    if (name === 'store') {
      await save('/admin/stores', {
        id: draft.id,
        name: draft.name,
        address: draft.address,
        city: draft.city || '',
        state: draft.state || '',
        pincode: draft.pincode || '',
        phone: draft.phone || '',
        hours: draft.hours || '',
        is_active: draft.is_active !== false,
      }, 'stores');
      return;
    }
    if (name === 'press') {
      await save('/admin/press', {
        id: draft.id,
        publication_name: draft.publication_name,
        logo_url: draft.logo_url || '',
        article_url: draft.article_url || '',
        quote: draft.quote || '',
        is_active: draft.is_active !== false,
      }, 'press');
      return;
    }
    if (name === 'assign') {
      await clientRequest('/admin/savings/assign', token, { method: 'POST', body: JSON.stringify({ userId: draft.userId, planId: draft.planId }) });
      setNote('Plan assigned');
      closeModal();
    }
    if (name === 'delivery') {
      await clientRequest(`/admin/orders/${draft.id}`, token, {
        method: 'PATCH',
        body: JSON.stringify({
          status: draft.status,
          courier_name: text(draft.courier_name) || null,
          tracking_number: text(draft.tracking_number) || null,
          tracking_url: text(draft.tracking_url) || null,
        }),
      });
      setNote('Delivery details saved');
      closeModal();
    }
  } catch (error) {
    setNote(error instanceof Error ? error.message : 'Could not save');
  }
}

async function uploadImages(files: FileList | null, token: string | null, existing: string, apply: (value: string) => void) {
  if (!files?.length) return;
  const uploaded: string[] = [];
  for (const file of Array.from(files)) {
    const signed = await clientRequest<{ signedUrl: string; publicUrl: string; token: string }>('/admin/uploads/sign', token, {
      method: 'POST',
      body: JSON.stringify({ filename: file.name }),
    });
    await fetch(signed.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type, Authorization: `Bearer ${signed.token}` },
      body: file,
    });
    uploaded.push(signed.publicUrl);
  }
  const prior = existing.split(',').map((item) => item.trim()).filter(Boolean);
  apply([...prior, ...uploaded].join(', '));
}

async function numberProducts(products: Row[], categories: Row[], token: string | null, refresh: () => Promise<void>, setNote: (note: string) => void) {
  if (!window.confirm('This assigns a fresh serial number, like KP001, to every product from its category. Existing numbers are overwritten. Continue?')) return;
  const groups = new Map<string, Row[]>();
  products.forEach((product) => {
    const key = text(product.category_id || 'uncategorized');
    groups.set(key, [...(groups.get(key) ?? []), product]);
  });
  const updates: Array<{ id: string; serial_no: string }> = [];
  groups.forEach((list, key) => {
    const category = categories.find((item) => item.id === key);
    const prefix = categoryPrefix(text(category?.name));
    list
      .slice()
      .sort((left, right) => new Date(text(left.created_at)).getTime() - new Date(text(right.created_at)).getTime())
      .forEach((product, index) => {
        updates.push({ id: text(product.id), serial_no: `${prefix}${String(index + 1).padStart(3, '0')}` });
      });
  });
  await Promise.all(updates.map((update) => clientRequest('/admin/products', token, { method: 'POST', body: JSON.stringify(update) })));
  setNote(`Serial numbers assigned to ${updates.length} products`);
  await refresh();
}

function downloadInvoice(order: Row) {
  const start = async () => {
    const jsPDF = (window as unknown as { jspdf?: { jsPDF: new () => InvoiceDoc } }).jspdf?.jsPDF;
    if (!jsPDF) return;
    const doc = new jsPDF();
    try {
      const blob = await fetch('/logo.jpeg').then((response) => response.blob());
      const logo = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
      doc.addImage?.(logo, 'JPEG', 14, 10, 20, 20);
    } catch { /* invoice still downloads without the mark */ }
    const address = (order.shipping_address ?? {}) as Record<string, string>;
    const invoiceNo = text(order.invoice_number) || `INV-${text(order.order_number)}`;
    const orderDate = new Date(String(order.created_at)).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('KANIKARA', 14, 19);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(15);
    doc.text('TAX INVOICE', 196, 15, { align: 'right' });
    doc.setFontSize(9);
    doc.text(`Invoice No: ${invoiceNo}`, 196, 21, { align: 'right' });
    doc.text(`Order No: ${text(order.order_number)}`, 196, 26, { align: 'right' });
    doc.text(`Date: ${orderDate}`, 196, 31, { align: 'right' });
    const bill = [address.full_name, address.address_line1, address.address_line2, [address.city, address.state, address.pincode].filter(Boolean).join(', '), address.phone ? `Phone: ${address.phone}` : ''].filter(Boolean);
    doc.setFontSize(10);
    doc.text('Bill To', 14, 46);
    doc.setFontSize(9.5);
    doc.text(bill, 14, 52);
    doc.text('Payment', 130, 46);
    doc.text([`Method: ${(text(order.payment_method) || '—').toUpperCase()}`, `Status: ${(text(order.payment_status) || '—').toUpperCase()}`], 130, 52);
    const items = Array.isArray(order.order_items) ? order.order_items as Row[] : [];
    doc.autoTable?.({
      startY: 74,
      head: [['Sr.No', 'Item', 'Qty', 'Unit Price', 'Total']],
      body: items.map((item) => [
        text((item.products as { serial_no?: string } | null)?.serial_no) ? `#${text((item.products as { serial_no?: string } | null)?.serial_no)}` : '—',
        text(item.product_name),
        text(item.quantity),
        money.format(Number(item.unit_price ?? 0)),
        money.format(Number(item.total_price ?? 0)),
      ]),
      theme: 'plain',
      headStyles: { fillColor: [14, 22, 48], textColor: [247, 242, 231], fontStyle: 'bold' },
    });
    let y = (doc.lastAutoTable?.finalY ?? 90) + 10;
    const line = (label: string, value: string) => {
      doc.text(label, 150, y);
      doc.text(value, 196, y, { align: 'right' });
      y += 7;
    };
    line('Subtotal', money.format(Number(order.subtotal ?? 0)));
    if (Number(order.discount_amount ?? 0)) line('Discount', money.format(Number(order.discount_amount)));
    line('Shipping', Number(order.shipping_amount ?? 0) === 0 ? 'Free' : money.format(Number(order.shipping_amount)));
    const reconstructed = Number(order.subtotal ?? 0) - Number(order.discount_amount ?? 0) + Number(order.shipping_amount ?? 0);
    const codFee = text(order.payment_method) === 'cod' ? Math.max(0, Math.round(Number(order.total_amount ?? 0) - reconstructed)) : 0;
    if (codFee) line('COD Charge', money.format(codFee));
    line('Total', money.format(Number(order.total_amount ?? 0)));
    doc.save(`Kanikara-Invoice-${text(order.order_number)}.pdf`);
  };
  const win = window as unknown as { jspdf?: unknown };
  if (win.jspdf) {
    start();
    return;
  }
  const library = document.createElement('script');
  library.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
  library.onload = () => {
    const table = document.createElement('script');
    table.src = 'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js';
    table.onload = start;
    document.body.appendChild(table);
  };
  document.body.appendChild(library);
}

interface InvoiceDoc {
  autoTable?: (options: Record<string, unknown>) => void;
  lastAutoTable?: { finalY: number };
  addImage?: (data: string, format: string, x: number, y: number, width: number, height: number) => void;
  save: (name: string) => void;
  setFont: (family: string, style: string) => void;
  setFontSize: (size: number) => void;
  text: (value: string | string[], x: number, y: number, options?: { align?: string }) => void;
}

async function saveSettings(settings: Record<string, string>, token: string | null, setNote: (note: string) => void) {
  const keys = ['cod_fee', 'announcement_text', 'whatsapp_number', 'store_phone', 'store_email', 'store_address', 'flash_sale_title', 'flash_sale_tag', 'flash_sale_discount_percent', 'flash_sale_active', 'flash_sale_end', 'referral_discount_amount', 'referral_min_order'];
  try {
    await Promise.all(keys.map((key) => clientRequest(`/admin/settings/${key}`, token, {
      method: 'PATCH',
      body: JSON.stringify({ value: settings[key] ?? '' }),
    })));
    setNote('Settings saved');
  } catch (error) {
    setNote(error instanceof Error ? error.message : 'Could not save settings');
  }
}

