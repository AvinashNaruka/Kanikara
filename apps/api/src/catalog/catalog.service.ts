import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  Banner,
  Category,
  FlashSale,
  ProductDetail,
  ProductSummary,
  Review,
} from '@kanikara/contracts';
import { SettingsService } from '../settings/settings.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';
import type { CatalogQueryDto } from './catalog-query.dto.js';
import { effectivePrice } from './pricing.js';

type ProductRow = Record<string, unknown> & {
  categories?: { name?: string; slug?: string } | null;
};

@Injectable()
export class CatalogService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly settings: SettingsService,
  ) {}

  private get supabase() {
    return this.supabaseService.anon;
  }

  async categories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      icon: row.icon ?? null,
      imageUrl: row.image_url ?? null,
      parentId: row.parent_id ?? null,
      sortOrder: row.sort_order ?? 0,
    }));
  }

  async banners(): Promise<Banner[]> {
    const { data, error } = await this.supabase
      .from('banners')
      .select('*')
      .eq('is_active', true)
      .eq('position', 'hero')
      .order('sort_order');
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      imageUrl: row.image_url,
      title: row.title ?? null,
      subtitle: row.subtitle ?? null,
      ctaText: row.cta_text ?? null,
      linkUrl: row.link_url ?? null,
    }));
  }

  async tagGroups(): Promise<Record<string, string[]>> {
    const { data, error } = await this.supabase
      .from('products')
      .select('tags')
      .eq('is_active', true);
    if (error) throw error;
    const groups = new Map<string, Set<string>>();
    for (const row of data ?? []) {
      for (const tag of row.tags ?? []) {
        const [group, value] = String(tag).includes(':')
          ? String(tag).split(':')
          : ['other', String(tag)];
        const values = groups.get(group) ?? new Set<string>();
        values.add(value);
        groups.set(group, values);
      }
    }
    return Object.fromEntries(
      [...groups].map(([group, values]) => [group, [...values].sort()]),
    );
  }

  async products(filters: CatalogQueryDto): Promise<ProductSummary[]> {
    const flash = await this.settings.flashSale();
    let query = this.supabase
      .from('products')
      .select('*, categories(name, slug)')
      .eq('is_active', true);

    if (filters.featured) query = query.eq('is_featured', true);
    if (filters.bestseller) query = query.eq('is_bestseller', true);
    if (filters.search) query = query.ilike('name', `%${filters.search}%`);
    if (filters.minPrice != null) query = query.gte('price', filters.minPrice);
    if (filters.maxPrice != null) query = query.lte('price', filters.maxPrice);
    if (filters.tags?.length) query = query.contains('tags', filters.tags);

    if (filters.category) {
      const { data: category, error } = await this.supabase
        .from('categories')
        .select('id')
        .eq('slug', filters.category)
        .maybeSingle();
      if (error) throw error;
      if (!category) return [];
      query = query.eq('category_id', category.id);
    }

    if (filters.sort === 'price_asc') query = query.order('price', { ascending: true });
    else if (filters.sort === 'price_desc') query = query.order('price', { ascending: false });
    else if (filters.sort === 'popular') query = query.order('sold_count', { ascending: false });
    else query = query.order('created_at', { ascending: false });
    if (filters.limit) query = query.limit(filters.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => this.toSummary(row, flash));
  }

  async product(slug: string): Promise<ProductDetail> {
    const flash = await this.settings.flashSale();
    const { data, error } = await this.supabase
      .from('products')
      .select('*, categories(name, slug)')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException('Product not found');
    void this.supabase.rpc('increment_product_views', { p_id: data.id });

    const [reviews, relatedResult] = await Promise.all([
      this.reviews(data.id),
      data.category_id
        ? this.supabase
            .from('products')
            .select('*, categories(name, slug)')
            .eq('category_id', data.category_id)
            .eq('is_active', true)
            .neq('id', data.id)
            .limit(4)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (relatedResult.error) throw relatedResult.error;
    const related = (relatedResult.data ?? []).map((row) => this.toSummary(row, flash));

    return {
      ...this.toSummary(data, flash),
      description: data.description ?? null,
      material: data.material ?? null,
      purity: data.purity ?? null,
      weightGrams: data.weight_grams ?? null,
      videoUrl: data.video_url ?? null,
      tags: data.tags ?? [],
      variants: (data.variants ?? []).map((variant: Record<string, unknown>) => ({
        id: String(variant.id),
        colorName: String(variant.color_name ?? ''),
        colorHex: variant.color_hex ? String(variant.color_hex) : null,
        images: Array.isArray(variant.images) ? variant.images.map(String) : [],
      })),
      deliveryDays: data.delivery_days ?? 5,
      hallmark: data.hallmark ?? null,
      stoneDetails: data.stone_details ?? null,
      careInstructions: data.care_instructions ?? null,
      returnPolicy: data.return_policy ?? null,
      reviews,
      related,
    };
  }

  async latestReviews(limit = 6) {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*, profiles(full_name), products(name, slug)')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title ?? null,
      body: row.body ?? null,
      author: row.profiles?.full_name ?? 'Customer',
      createdAt: row.created_at,
      productName: row.products?.name ?? null,
      productSlug: row.products?.slug ?? null,
    }));
  }

  async reviews(productId: string): Promise<Review[]> {
    const { data, error } = await this.supabase
      .from('reviews')
      .select('*, profiles(full_name)')
      .eq('product_id', productId)
      .eq('is_approved', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      rating: row.rating,
      title: row.title ?? null,
      body: row.body ?? null,
      author: row.profiles?.full_name ?? 'Customer',
      createdAt: row.created_at,
    }));
  }

  async submitReview(
    accessToken: string,
    userId: string,
    productId: string,
    input: { rating: number; title?: string; body: string },
  ) {
    const { error } = await this.supabaseService.asUser(accessToken).from('reviews').insert({
      product_id: productId,
      user_id: userId,
      rating: input.rating,
      title: input.title ?? null,
      body: input.body,
    });
    if (error) throw error;
  }

  private toSummary(row: ProductRow, flash: FlashSale): ProductSummary {
    const tags = Array.isArray(row.tags) ? row.tags.map(String) : [];
    const price = effectivePrice(Number(row.price), row.mrp == null ? null : Number(row.mrp), tags, flash);
    return {
      id: String(row.id),
      name: String(row.name),
      slug: String(row.slug),
      price: price.price,
      mrp: price.mrp,
      images: Array.isArray(row.images) ? row.images.map(String) : [],
      badge: price.isFlash ? 'Flash Sale' : row.badge ? String(row.badge) : null,
      stockQuantity: Number(row.stock_quantity ?? 0),
      ratingAverage: row.rating_avg == null ? null : Number(row.rating_avg),
      ratingCount: Number(row.rating_count ?? 0),
      isFlash: price.isFlash,
      category: row.categories
        ? { name: String(row.categories.name ?? ''), slug: String(row.categories.slug ?? '') }
        : null,
    };
  }
}
