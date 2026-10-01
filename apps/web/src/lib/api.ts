import type {
  Banner,
  Category,
  ProductDetail,
  ProductQuery,
  ProductSummary,
  SiteSettings,
} from '@kanikara/contracts';

const API_URL =
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000/api';

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Kanikara API request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export function getCategories() {
  return request<Category[]>('/catalog/categories');
}

export function getProducts(filters: ProductQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value == null || value === '' || value === false) return;
    params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  });
  const query = params.size ? `?${params.toString()}` : '';
  return request<ProductSummary[]>(`/catalog/products${query}`);
}

export function getProduct(slug: string) {
  return request<ProductDetail>(`/catalog/products/${encodeURIComponent(slug)}`);
}

export function getPublicSettings() {
  return request<SiteSettings>('/settings/public');
}

export function getBanners() {
  return request<Banner[]>('/catalog/banners');
}

export function getHomeReviews() {
  return request<Array<{
    id: string;
    rating: number;
    body: string | null;
    author: string;
    productName: string | null;
  }>>('/catalog/reviews');
}

export function getTags() {
  return request<Record<string, string[]>>('/catalog/tags');
}
