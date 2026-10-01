import { SiteChrome } from '@/components/site-chrome';
import { getPublicSettings } from '@/lib/api';

export async function SiteHeader() {
  const settings = await getPublicSettings().catch(() => null);
  return (
    <SiteChrome
      announcement={
        settings?.announcementText ??
        'FREE SHIPPING ON ALL ORDERS · BIS HALLMARKED · 15-DAY RETURNS'
      }
      flash={settings?.flashSale?.active ? settings.flashSale : null}
      whatsapp={settings?.whatsappNumber ?? ''}
    />
  );
}
