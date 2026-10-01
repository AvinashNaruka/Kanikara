import type { MetadataRoute } from 'next';
import { getCategories, getProducts } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const [products, categories] = await Promise.all([
    getProducts({ limit: 100 }).catch(() => []),
    getCategories().catch(() => []),
  ]);
  const staticPaths = ['', '/shop', '/gift-store', '/smart-plan', '/custom-order', '/corporate', '/stores', '/jewellery-care', '/policies'];

  return [
    ...staticPaths.map((path) => ({ url: `${site}${path || '/'}` })),
    ...categories.map((category) => ({ url: `${site}/shop?category=${category.slug}` })),
    ...products.map((product) => ({ url: `${site}/products/${product.slug}` })),
  ];
}
