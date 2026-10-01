import Link from 'next/link';
import { ProductCard } from '@/components/product-card';
import { ShopSignals } from '@/components/shop-signals';
import { ShopSort } from '@/components/shop-sort';
import { getCategories, getProducts, getTags } from '@/lib/api';

export const dynamic = 'force-dynamic';

interface ShopPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
    minPrice?: string;
    maxPrice?: string;
    tags?: string;
  }>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const filters = await searchParams;
  const [categories, products, tags] = await Promise.all([
    getCategories().catch(() => []),
    getProducts({
      ...filters,
      minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
      maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
      tags: filters.tags ? filters.tags.split(',') : undefined,
    }).catch(() => []),
    getTags().catch(() => ({})),
  ]);

  return (
    <>
      <ShopSignals category={filters.category} maxPrice={filters.maxPrice} minPrice={filters.minPrice} search={filters.search} tags={filters.tags} />
      <header className="shop-head">
        <div className="shop-crumb"><Link href="/">Home</Link> / Shop</div>
        <h1 className="h-section" style={{ color: 'var(--ivory)', marginTop: 10 }}>The Full Collection</h1>
      </header>
      <div className="shop-body">
        <aside>
          <form action="/shop">
            <div className="filter-group">
            <h5>Search</h5>
            <input
              id="search"
              name="search"
              defaultValue={filters.search}
              placeholder="Search jewellery…"
            />
            </div>
            <div className="filter-group">
            <h5>Price Range</h5>
            <div className="price-inputs">
            <input id="minPrice" name="minPrice" defaultValue={filters.minPrice} placeholder="Min" />
            <span>–</span>
            <input id="maxPrice" name="maxPrice" defaultValue={filters.maxPrice} placeholder="Max" />
            </div>
            {filters.tags ? <input name="tags" type="hidden" value={filters.tags} /> : null}
            {filters.category ? <input name="category" type="hidden" value={filters.category} /> : null}
            <button className="btn btn-line-dark btn-sm" style={{ marginTop: 12, width: '100%' }} type="submit">Apply</button>
            </div>
          </form>
          <div className="filter-group">
          <h5>Category</h5>
          <Link className={!filters.category ? 'active' : ''} href="/shop">
            All categories
          </Link>
          {categories.map((category) => (
            <Link
              className={filters.category === category.slug ? 'active' : ''}
              href={`/shop?category=${category.slug}`}
              key={category.id}
            >
              {category.name}
            </Link>
          ))}
          </div>
          {Object.entries(tags).map(([group, values]) => (
            <div className="filter-group" key={group}>
              <h5>{group}</h5>
              {values.map((value) => {
                const tag = `${group}:${value}`;
                return (
                  <Link
                    className={filters.tags === tag ? 'active' : ''}
                    href={{ pathname: '/shop', query: { ...filters, tags: tag } }}
                    key={tag}
                  >
                    {value}
                  </Link>
                );
              })}
            </div>
          ))}
        </aside>
        <section>
          <div className="shop-toolbar">
            <span className="shop-count">{products.length} pieces</span>
            <ShopSort query={filters} sort={filters.sort} />
          </div>
          {products.length ? (
            <div className="p-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No pieces match yet</h2>
              <p>Try a different category or search.</p>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
