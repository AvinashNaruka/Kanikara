'use client';

import { useEffect } from 'react';
import { trackEvent } from '@/lib/site-analytics';

export function ShopSignals({
  search,
  category,
  tags,
  minPrice,
  maxPrice,
}: {
  search?: string;
  category?: string;
  tags?: string;
  minPrice?: string;
  maxPrice?: string;
}) {
  useEffect(() => {
    if (search) trackEvent('search', { term: search });
    if (category) trackEvent('category_filter', { category });
    if (tags) trackEvent('tag_filter', { tag: tags });
    if (minPrice || maxPrice) trackEvent('price_filter', { min: minPrice ? Number(minPrice) : null, max: maxPrice ? Number(maxPrice) : null });
  }, [search, category, tags, minPrice, maxPrice]);

  return null;
}
