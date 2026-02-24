export interface Store {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  whatsapp: string | null;
  instagram: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  currency: string;
  country: string | null;
  theme_config?: {
    template: string;
    colors: {
      primary: string;
      accent: string;
      background: string;
    };
  } | null;
  payment_config?: {
    stripe_enabled: boolean;
    stripe_public_key?: string;
    paypal_enabled: boolean;
    paypal_client_id?: string;
    manual_enabled: boolean;
    manual_instructions?: string;
  } | null;
  created_at: string;
}

export interface Category {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  position: number;
  parent_id: string | null;
  created_at: string;
}

export type ProductCondition = "new" | "used" | "refurbished" | "cib" | "loose" | "sealed";
export type ProductPlatform = "switch" | "ps5" | "ps4" | "xbox-series" | "xbox-one" | "pc" | "retro" | "3ds" | "wii-u" | "other";
export type ProductRegion = "ntsc" | "pal" | "ntsc-j" | "region-free";
export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";
export type OrderSource = "web" | "whatsapp" | "pos" | "instagram";

export interface Product {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_price: number | null;
  cost: number | null;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  low_stock_alert: number;
  condition: ProductCondition;
  platform: ProductPlatform;
  region: ProductRegion;
  is_active: boolean;
  is_featured: boolean;
  position: number;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  images?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  category?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variants?: any[];
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  position: number;
  is_primary: boolean;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  name: string;
  value: string;
  price_adjustment: number;
  stock_quantity: number;
}

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  notes: string | null;
  total_orders: number;
  total_spent: number;
  created_at: string;
}

export interface Order {
  id: string;
  store_id: string;
  customer_id: string | null;
  order_number: number;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  total: number;
  payment_method: string | null;
  payment_status: PaymentStatus;
  shipping_method: string | null;
  tracking_number: string | null;
  notes: string | null;
  source: OrderSource;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  customer_address: string | null;
  created_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items?: any[];
  customer?: Customer;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  variant_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product?: Product;
}

export interface CartItem {
  product: Product;
  quantity: number;
  variant?: ProductVariant;
}

export const PLATFORM_LABELS: Record<ProductPlatform, string> = {
  switch: "Nintendo Switch", ps5: "PS5", ps4: "PS4",
  "xbox-series": "Xbox Series", "xbox-one": "Xbox One",
  pc: "PC", retro: "Retro", "3ds": "3DS", "wii-u": "Wii U", other: "Other",
};

export const PLATFORM_COLORS: Record<ProductPlatform, string> = {
  switch: "bg-red-500/20 text-red-400", ps5: "bg-blue-500/20 text-blue-400",
  ps4: "bg-blue-700/20 text-blue-300", "xbox-series": "bg-green-500/20 text-green-400",
  "xbox-one": "bg-green-700/20 text-green-300", pc: "bg-gray-500/20 text-gray-400",
  retro: "bg-amber-500/20 text-amber-400", "3ds": "bg-orange-500/20 text-orange-400",
  "wii-u": "bg-cyan-500/20 text-cyan-400", other: "bg-gray-500/20 text-gray-400",
};

export const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: "New", used: "Used", refurbished: "Refurbished",
  cib: "CIB", loose: "Loose", sealed: "Sealed",
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/20 text-yellow-400", confirmed: "bg-blue-500/20 text-blue-400",
  shipped: "bg-purple-500/20 text-purple-400", delivered: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
};
