import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/components/product-card';
import { ProductGallery } from '@/components/product-gallery';
import { PurchasePanel } from '@/components/purchase-panel';
import { ReviewForm } from '@/components/review-form';
import { getProduct } from '@/lib/api';
import { money } from '@/lib/money';

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) return { title: 'Product not found' };

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const description = product.description?.slice(0, 160) || 'Fine gold, diamond and bridal jewellery crafted in Rajasthan.';
  return {
    title: product.name,
    description,
    openGraph: {
      title: `${product.name} | Kanikara`,
      description,
      images: product.images[0] ? [product.images[0]] : [`${site}/logo.jpeg`],
      url: `${site}/products/${product.slug}`,
      type: 'website',
    },
    other: {
      'product:price:amount': String(product.price),
      'product:price:currency': 'INR',
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product) notFound();

  return (
    <div>
      <div className="pd">
        <ProductGallery images={product.images} name={product.name} videoUrl={product.videoUrl} />
        <section className="pd-info">
          <div className="cat">{product.category?.name ?? 'KANIKARA'}</div>
          <h1>{product.name}</h1>
          <div className="pd-price">
            <span className="price">{money.format(product.price)}</span>
            {product.mrp && product.mrp > product.price ? <span className="mrp">{money.format(product.mrp)}</span> : null}
            {product.isFlash ? <span className="off">Flash Sale</span> : null}
          </div>
          {product.ratingCount ? (
            <div className="rating-line">{product.ratingAverage?.toFixed(1)} from {product.ratingCount} reviews</div>
          ) : null}
          <div className="pd-specs">
            {product.material ? <div><span>Material</span><span>{product.material}</span></div> : null}
            {product.purity ? <div><span>Purity</span><span>{product.purity}</span></div> : null}
            {product.weightGrams ? <div><span>Weight</span><span>{product.weightGrams} g</span></div> : null}
            {product.hallmark ? <div><span>Hallmark</span><span>{product.hallmark}</span></div> : null}
            {product.stoneDetails ? <div><span>Stones</span><span>{product.stoneDetails}</span></div> : null}
            <div><span>Delivery</span><span>{product.deliveryDays} business days</span></div>
          </div>
          <PurchasePanel product={product} />
          <p className="pd-desc">{product.description}</p>
          {product.careInstructions ? <p className="product-description">{product.careInstructions}</p> : null}
          {product.returnPolicy ? <p className="product-description">{product.returnPolicy}</p> : null}
          <p className="product-description">
            Share this piece: <Link href={`/products/${product.slug}`}>/products/{product.slug}</Link>
          </p>
        </section>
      </div>

      <section className="wrap" style={{ padding: '0 var(--pad) 40px' }}>
        <h2 className="h-section" style={{ fontSize: 32, marginBottom: 18 }}>Reviews</h2>
        {product.reviews.length ? (
          product.reviews.map((review) => (
            <article className="dash-card" key={review.id} style={{ marginBottom: 14 }}>
              <strong>{review.author}</strong>
              <span style={{ color: 'var(--gold)', marginLeft: 8 }}>{'★'.repeat(review.rating)}</span>
              {review.title ? <h3 style={{ fontFamily: 'var(--serif)', marginTop: 6 }}>{review.title}</h3> : null}
              <p className="lede-light" style={{ marginTop: 8 }}>{review.body}</p>
            </article>
          ))
        ) : (
          <p className="lede-light">No reviews yet.</p>
        )}
        <div style={{ marginTop: 24, maxWidth: 520 }}>
          <ReviewForm productId={product.id} />
        </div>
      </section>

      {product.related.length ? (
        <section className="block tight">
          <div className="block-inner">
            <div className="block-head"><h2 className="h-section">You may also like</h2></div>
            <div className="p-grid">
              {product.related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
