import { z } from 'zod';

export const addressSchema = z.object({
  label: z.string().trim().min(1).default('Home'),
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(10),
  addressLine1: z.string().trim().min(3),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(2),
  state: z.string().trim().min(2),
  pincode: z.string().regex(/^\d{6}$/),
  isDefault: z.boolean().default(false),
});

export const cartItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(20).default(1),
  variantId: z.string().nullable().optional(),
  variantLabel: z.string().nullable().optional(),
});

export const checkoutSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(['cod', 'payu', 'upi', 'gift_card']),
  couponCode: z.string().trim().optional(),
  giftCardCode: z.string().trim().optional(),
  agreeToTerms: z.literal(true),
});

export const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  body: z.string().trim().min(3).max(2000),
});

export const customOrderSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(10),
  email: z.string().email().optional().or(z.literal('')),
  jewelleryType: z.string().trim().min(2),
  occasion: z.string().trim().optional(),
  budgetRange: z.string().trim().optional(),
  description: z.string().trim().optional(),
});

export const corporateEnquirySchema = z.object({
  companyName: z.string().trim().min(2),
  contactName: z.string().trim().min(2),
  phone: z.string().trim().min(10),
  email: z.string().email().optional().or(z.literal('')),
  estimatedQuantity: z.string().trim().optional(),
  requirement: z.string().trim().optional(),
});

export const newsletterSchema = z.object({
  email: z.string().email(),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(10),
});

export const analyticsEventSchema = z.object({
  visitorId: z.string().min(8).max(80),
  sessionId: z.string().min(8).max(80),
  page: z.string().min(1).max(80),
  path: z.string().max(300).optional(),
  productSlug: z.string().max(200).nullable().optional(),
  event: z.string().min(1).max(80),
  detail: z.record(z.unknown()).nullable().optional(),
  referrer: z.string().max(500).nullable().optional(),
  referrerHost: z.string().max(200).nullable().optional(),
  utmSource: z.string().max(120).nullable().optional(),
  utmMedium: z.string().max(120).nullable().optional(),
  utmCampaign: z.string().max(120).nullable().optional(),
  device: z.string().max(40).optional(),
  browser: z.string().max(40).optional(),
  os: z.string().max(40).optional(),
  screenW: z.number().int().nullable().optional(),
  screenH: z.number().int().nullable().optional(),
  lang: z.string().max(40).nullable().optional(),
  isNewVisitor: z.boolean().optional(),
  isBot: z.boolean().optional(),
  enteredPincode: z.string().max(12).nullable().optional(),
  country: z.string().max(80).nullable().optional(),
  region: z.string().max(80).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
  postalCode: z.string().max(20).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  timezone: z.string().max(80).nullable().optional(),
  isp: z.string().max(160).nullable().optional(),
});

export const visitorIdentitySchema = z.object({
  visitorId: z.string().min(8).max(80),
  phone: z.string().min(10).max(20),
  name: z.string().max(120).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  source: z.string().max(40).nullable().optional(),
  consent: z.boolean().optional(),
  note: z.string().max(300).nullable().optional(),
});
