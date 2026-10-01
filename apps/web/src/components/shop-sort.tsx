'use client';

import { useRouter } from 'next/navigation';

export function ShopSort({
  sort,
  query,
}: {
  sort?: string;
  query: {
    category?: string;
    search?: string;
    minPrice?: string;
    maxPrice?: string;
    tags?: string;
  };
}) {
  const router = useRouter();

  return (
    <select
      aria-label="Sort"
      onChange={(event) => {
        const params = new URLSearchParams();
        Object.entries({ ...query, sort: event.target.value }).forEach(([key, value]) => {
          if (value) params.set(key, value);
        });
        router.push(`/shop?${params.toString()}`);
      }}
      value={sort || 'newest'}
    >
      <option value="newest">Newest</option>
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
      <option value="popular">Most Popular</option>
    </select>
  );
}
