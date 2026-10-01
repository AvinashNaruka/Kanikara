import Link from 'next/link';
import { DeliveryPincode } from '@/components/delivery-pincode';
import { HeroCarousel } from '@/components/hero-carousel';
import { NewsletterForm } from '@/components/newsletter-form';
import { ProductCard } from '@/components/product-card';
import { getBanners, getCategories, getHomeReviews, getProducts } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [categories, featured, bestsellers, banners, reviews] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({ featured: true, limit: 4 }).catch(() => []),
    getProducts({ bestseller: true, limit: 4 }).catch(() => []),
    getBanners().catch(() => []),
    getHomeReviews().catch(() => []),
  ]);

  return (
    <>
      <div className="mobile-quickbar">
        <DeliveryPincode />
        <form action="/shop" className="mq-search">
          <input name="search" placeholder='Search "Gifts For Her"' />
        </form>
        <div className="mq-links">
          <Link href="/shop"><span className="mq-ic">🗂️</span><span>Categories</span></Link>
          <Link href="/gift-store"><span className="mq-ic">🎁</span><span>Gift Store</span></Link>
          <Link href="/custom-order"><span className="mq-ic">✧</span><span>Custom Order</span></Link>
          <Link href="/smart-plan"><span className="mq-ic">💰</span><span>Smart Plan</span></Link>
        </div>
      </div>
      <HeroCarousel banners={banners} />

      <section className="block tight">
        <div className="block-inner">
          <div className="block-head">
            <div><span className="eyebrow">Shop by Category</span><h2 className="h-section">Find your piece</h2></div>
          </div>
          <div className="cat-scroll">
            {categories.slice(0, 6).map((category) => (
              <Link className="cat-tile" href={`/shop?category=${category.slug}`} key={category.id}>
                <div className="arch-frame">
                  {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img alt="" src={category.imageUrl} />
                  ) : (
                    <span>{category.icon || category.name.charAt(0)}</span>
                  )}
                </div>
                <span>{category.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="block on-ink">
        <div className="block-inner">
          <div className="block-head">
            <div><span className="eyebrow">Featured</span><h2 className="h-section" style={{ color: 'var(--ivory)' }}>This season&apos;s selection</h2></div>
            <Link className="btn-ghost" href="/shop">View all</Link>
          </div>
          <div className="p-grid">
            {featured.map((product) => <ProductCard key={product.id} product={product} />)}
          </div>
        </div>
      </section>

      <section className="block">
        <div className="block-inner story">
          <div className="arch-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Kanikara craft" src="/logo.jpeg" />
          </div>
          <div className="story-copy">
            <span className="eyebrow">Our Craft</span>
            <h2 className="h-section" style={{ marginTop: 10 }}>Made the way jewellery used to be made</h2>
            <p className="lede-light" style={{ marginTop: 18 }}>
              Kanikara started as a family karigar workshop in Rajasthan. Three generations later, the hands have changed but the standard hasn&apos;t — every setting is checked by eye, every hallmark verified, every order small enough that someone still signs off on it personally.
            </p>
            <p className="signoff">— The Kanikara workshop, Jaipur</p>
          </div>
        </div>
      </section>

      <section className="block on-maroon">
        <div className="block-inner custom-cta">
          <div>
            <span className="eyebrow" style={{ color: 'var(--gold-soft)' }}>Bespoke</span>
            <h2 className="h-section" style={{ color: 'var(--ivory)', marginTop: 10 }}>Have something in mind that doesn&apos;t exist yet?</h2>
            <p className="lede" style={{ color: 'rgba(247,242,231,.75)', marginTop: 14 }}>
              Bring a sketch, an old family piece to redesign, or just a budget and an occasion — our design team will turn it into gold.
            </p>
            <ul>
              <li>Free design consultation, in-store or on video call</li>
              <li>3D preview before we melt a single gram</li>
              <li>Engraving, resizing and re-setting available</li>
            </ul>
            <Link className="btn btn-gold" href="/custom-order" style={{ marginTop: 28 }}>Start a Custom Order</Link>
          </div>
          <div className="arch-frame">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img alt="Custom jewellery design" src="/logo.jpeg" />
          </div>
        </div>
      </section>

      {bestsellers.length ? (
        <section className="block tight">
          <div className="block-inner">
            <div className="block-head">
              <div><span className="eyebrow">Loved by regulars</span><h2 className="h-section">Bestsellers</h2></div>
              <Link className="btn-ghost" href="/shop">View all</Link>
            </div>
            <div className="p-grid">
              {bestsellers.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>
          </div>
        </section>
      ) : null}

      {reviews.length ? (
        <section className="block">
          <div className="block-inner">
            <div className="block-head">
              <div><span className="eyebrow">Testimonials</span><h2 className="h-section">What customers say</h2></div>
            </div>
            <div className="rev-grid">
              {reviews.map((review) => (
                <article key={review.id}>
                  <strong>{review.author}</strong>
                  <p>{review.body}</p>
                  {review.productName ? <span>{review.productName}</span> : null}
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="block on-ink newsletter">
        <div className="block-inner">
          <span className="eyebrow">Stay in the loop</span>
          <h2 className="h-section" style={{ color: 'var(--ivory)', marginTop: 10 }}>New collections, first look</h2>
          <p className="lede" style={{ margin: '14px auto 0' }}>No spam — just new arrivals and the occasional festive offer.</p>
          <NewsletterForm />
        </div>
      </section>
    </>
  );
}
