import Link from 'next/link';
import { getCategories, getPublicSettings } from '@/lib/api';

export async function SiteFooter() {
  const [categories, settings] = await Promise.all([
    getCategories().catch(() => []),
    getPublicSettings().catch(() => null),
  ]);

  return (
    <footer className="site">
      <div className="foot-grid">
        <div className="foot-brand">
          <div className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="" src="/logo.jpeg" />
            <span className="name" style={{ fontSize: 20 }}>Kanikara</span>
          </div>
          <p>Fine gold, diamond and bridal jewellery, hand-finished by karigars in Rajasthan since generations.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}><Link href={`/shop?category=${category.slug}`}>{category.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><Link href="/custom-order">Custom Orders</Link></li>
            <li><Link href="/gift-store">Gift Store</Link></li>
            <li><Link href="/smart-plan">Smart Plan</Link></li>
            <li><Link href="/corporate">Corporate Gifting</Link></li>
            <li><Link href="/stores">Store Locator</Link></li>
            <li><Link href="/jewellery-care">Jewellery Care</Link></li>
            <li><Link href="/account/orders">Track Order</Link></li>
            <li><Link href="/wishlist">Wishlist</Link></li>
          </ul>
        </div>
        <div>
          <h4>Contact</h4>
          <ul>
            <li>{settings?.storeAddress || 'Rajasthan, India'}</li>
            <li>{settings?.storeEmail || 'hello@kanikara.com'}</li>
            <li>{settings?.storePhone || ''}</li>
          </ul>
        </div>
      </div>
      <div className="foot-bottom">
        <span>© 2026 Kanikara. All rights reserved.</span>
        <span>BIS Hallmarked · Certified Stones</span>
      </div>
    </footer>
  );
}
