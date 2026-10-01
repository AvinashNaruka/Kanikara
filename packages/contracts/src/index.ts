export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  slug: string;
  price: number;
  mrp: number | null;
  images: string[];
  badge: string | null;
  stockQuantity: number;
  ratingAverage: number | null;
  ratingCount: number;
  isFlash: boolean;
  category: Pick<Category, 'name' | 'slug'> | null;
}

export interface ProductDetail extends ProductSummary {
  description: string | null;
  material: string | null;
  purity: string | null;
  weightGrams: number | null;
  videoUrl: string | null;
  tags: string[];
  variants: ProductVariant[];
  deliveryDays: number;
  hallmark: string | null;
  stoneDetails: string | null;
  careInstructions: string | null;
  returnPolicy: string | null;
  reviews: Review[];
  related: ProductSummary[];
}

export interface Review {
  id: string;
  rating: number;
  title: string | null;
  body: string | null;
  author: string;
  createdAt: string;
}

export interface Banner {
  id: string;
  imageUrl: string;
  title: string | null;
  subtitle: string | null;
  ctaText: string | null;
  linkUrl: string | null;
}

export interface FlashSale {
  active: boolean;
  title: string;
  discountPercent: number;
  tag: string;
  endsAt: string | null;
}

export interface ProductVariant {
  id: string;
  colorName: string;
  colorHex: string | null;
  images: string[];
}

export interface ProductQuery {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular';
  tags?: string[];
  featured?: boolean;
  bestseller?: boolean;
  limit?: number;
}

export interface SiteSettings {
  announcementText: string;
  whatsappNumber: string;
  storePhone: string;
  storeEmail: string;
  storeAddress: string;
  codFee: number;
  referralDiscount: number;
  referralMinimumOrder: number;
  flashSale: FlashSale;
}

export interface ApiResponse<T> {
  data: T;
}

export interface Profile {
  id: string;
  fullName: string | null;
  phone: string | null;
  role: string;
  loyaltyPoints: number;
  referralCode: string | null;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  variantId: string | null;
  variantLabel: string | null;
  product: ProductSummary;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface StoreOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string | null;
  paymentStatus: string | null;
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  totalAmount: number;
  createdAt: string;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null;
  shippingAddress: Address | null;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export * from './schemas.js';
