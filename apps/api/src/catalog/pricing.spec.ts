import { describe, expect, it } from 'vitest';
import { effectivePrice } from './pricing.js';

const flash = {
  active: true,
  title: 'Festive Flash Sale',
  discountPercent: 20,
  tag: 'collection:flash-sale',
  endsAt: '2099-01-01T00:00:00.000Z',
};

describe('effectivePrice', () => {
  it('discounts only products carrying the active flash-sale tag', () => {
    expect(effectivePrice(1000, 1200, ['collection:flash-sale'], flash)).toEqual({
      price: 800,
      mrp: 1000,
      isFlash: true,
    });
    expect(effectivePrice(1000, 1200, ['bridal'], flash)).toEqual({
      price: 1000,
      mrp: 1200,
      isFlash: false,
    });
  });

  it('stops discounting after the sale ends', () => {
    expect(
      effectivePrice(1000, null, ['collection:flash-sale'], flash, Date.parse('2100-01-01')),
    ).toMatchObject({ isFlash: false, price: 1000 });
  });
});
