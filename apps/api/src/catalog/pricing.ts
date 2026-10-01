import type { FlashSale } from '@kanikara/contracts';

export function effectivePrice(
  price: number,
  mrp: number | null,
  tags: string[],
  flash: FlashSale,
  now = Date.now(),
) {
  const endsAt = flash.endsAt ? new Date(flash.endsAt).getTime() : Number.NaN;
  const live =
    flash.active &&
    Number.isFinite(endsAt) &&
    endsAt > now &&
    flash.discountPercent > 0 &&
    flash.tag.length > 0 &&
    tags.includes(flash.tag);

  if (!live) return { price, mrp, isFlash: false };
  return {
    price: Math.max(0, Math.round(price * (1 - flash.discountPercent / 100))),
    mrp: price,
    isFlash: true,
  };
}
