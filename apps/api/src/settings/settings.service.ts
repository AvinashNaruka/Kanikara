import { Inject, Injectable } from '@nestjs/common';
import type { SiteSettings } from '@kanikara/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from '../supabase/supabase.module.js';

const PUBLIC_KEYS = [
  'announcement_text',
  'whatsapp_number',
  'store_phone',
  'store_email',
  'store_address',
  'cod_fee',
  'referral_discount_amount',
  'referral_min_order',
  'flash_sale_active',
  'flash_sale_title',
  'flash_sale_discount_percent',
  'flash_sale_tag',
  'flash_sale_end',
] as const;

@Injectable()
export class SettingsService {
  constructor(@Inject(SUPABASE) private readonly supabase: SupabaseClient) {}

  async publicSettings(): Promise<SiteSettings> {
    const { data, error } = await this.supabase
      .from('site_settings')
      .select('key,value')
      .in('key', [...PUBLIC_KEYS]);

    if (error) throw error;
    const settings = Object.fromEntries(
      (data ?? []).map(({ key, value }) => [key, value]),
    );

    return {
      announcementText:
        settings.announcement_text ??
        'FREE SHIPPING ON ALL ORDERS · BIS HALLMARKED · 15-DAY RETURNS',
      whatsappNumber: settings.whatsapp_number ?? '',
      storePhone: settings.store_phone ?? '',
      storeEmail: settings.store_email ?? '',
      storeAddress: settings.store_address ?? 'Rajasthan, India',
      codFee: Number(settings.cod_fee ?? 250),
      referralDiscount: Number(settings.referral_discount_amount ?? 300),
      referralMinimumOrder: Number(settings.referral_min_order ?? 1000),
      flashSale: this.toFlashSale(settings),
    };
  }

  async flashSale() {
    return (await this.publicSettings()).flashSale;
  }

  private toFlashSale(settings: Record<string, string>): SiteSettings['flashSale'] {
    return {
      active: settings.flash_sale_active === 'true',
      title: settings.flash_sale_title || 'Flash Sale',
      discountPercent: Number(settings.flash_sale_discount_percent ?? 0),
      tag: settings.flash_sale_tag || 'collection:flash-sale',
      endsAt: settings.flash_sale_end || null,
    };
  }
}
