export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "14.1"
    }
    public: {
        Tables: {
            categories: {
                Row: {
                    created_at: string
                    icon_url: string | null
                    id: string
                    name: string
                    parent_id: string | null
                    position: number
                    slug: string
                    store_id: string
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string
                    icon_url?: string | null
                    id?: string
                    name: string
                    parent_id?: string | null
                    position?: number
                    slug: string
                    store_id: string
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string
                    icon_url?: string | null
                    id?: string
                    name?: string
                    parent_id?: string | null
                    position?: number
                    slug?: string
                    store_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "categories_parent_id_fkey"
                        columns: ["parent_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "categories_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                ]
            }
            customers: {
                Row: {
                    address: string | null
                    created_at: string
                    email: string | null
                    id: string
                    name: string
                    notes: string | null
                    phone: string | null
                    store_id: string
                    total_orders: number
                    total_spent: number
                    updated_at: string | null
                    whatsapp: string | null
                }
                Insert: {
                    address?: string | null
                    created_at?: string
                    email?: string | null
                    id?: string
                    name: string
                    notes?: string | null
                    phone?: string | null
                    store_id: string
                    total_orders?: number
                    total_spent?: number
                    updated_at?: string | null
                    whatsapp?: string | null
                }
                Update: {
                    address?: string | null
                    created_at?: string
                    email?: string | null
                    id?: string
                    name?: string
                    notes?: string | null
                    phone?: string | null
                    store_id?: string
                    total_orders?: number
                    total_spent?: number
                    updated_at?: string | null
                    whatsapp?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "customers_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                ]
            }
            order_items: {
                Row: {
                    id: string
                    order_id: string
                    product_id: string | null
                    product_name: string
                    quantity: number
                    total_price: number
                    unit_price: number
                    variant_id: string | null
                }
                Insert: {
                    id?: string
                    order_id: string
                    product_id?: string | null
                    product_name: string
                    quantity?: number
                    total_price: number
                    unit_price: number
                    variant_id?: string | null
                }
                Update: {
                    id?: string
                    order_id?: string
                    product_id?: string | null
                    product_name?: string
                    quantity?: number
                    total_price?: number
                    unit_price?: number
                    variant_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "order_items_order_id_fkey"
                        columns: ["order_id"]
                        isOneToOne: false
                        referencedRelation: "orders"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "order_items_variant_id_fkey"
                        columns: ["variant_id"]
                        isOneToOne: false
                        referencedRelation: "product_variants"
                        referencedColumns: ["id"]
                    },
                ]
            }
            orders: {
                Row: {
                    created_at: string
                    customer_address: string | null
                    customer_email: string | null
                    customer_id: string | null
                    customer_name: string | null
                    customer_phone: string | null
                    discount: number
                    id: string
                    notes: string | null
                    order_number: number
                    payment_method: string | null
                    payment_status: string
                    shipping_cost: number
                    shipping_method: string | null
                    source: string
                    status: string
                    store_id: string
                    subtotal: number
                    total: number
                    tracking_number: string | null
                    updated_at: string | null
                }
                Insert: {
                    created_at?: string
                    customer_address?: string | null
                    customer_email?: string | null
                    customer_id?: string | null
                    customer_name?: string | null
                    customer_phone?: string | null
                    discount?: number
                    id?: string
                    notes?: string | null
                    order_number?: number
                    payment_method?: string | null
                    payment_status?: string
                    shipping_cost?: number
                    shipping_method?: string | null
                    source?: string
                    status?: string
                    store_id: string
                    subtotal?: number
                    total?: number
                    tracking_number?: string | null
                    updated_at?: string | null
                }
                Update: {
                    created_at?: string
                    customer_address?: string | null
                    customer_email?: string | null
                    customer_id?: string | null
                    customer_name?: string | null
                    customer_phone?: string | null
                    discount?: number
                    id?: string
                    notes?: string | null
                    order_number?: number
                    payment_method?: string | null
                    payment_status?: string
                    shipping_cost?: number
                    shipping_method?: string | null
                    source?: string
                    status?: string
                    store_id?: string
                    subtotal?: number
                    total?: number
                    tracking_number?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "orders_customer_id_fkey"
                        columns: ["customer_id"]
                        isOneToOne: false
                        referencedRelation: "customers"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "orders_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                ]
            }
            product_images: {
                Row: {
                    id: string
                    is_primary: boolean
                    position: number
                    product_id: string
                    url: string
                }
                Insert: {
                    id?: string
                    is_primary?: boolean
                    position?: number
                    product_id: string
                    url: string
                }
                Update: {
                    id?: string
                    is_primary?: boolean
                    position?: number
                    product_id?: string
                    url?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "product_images_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            product_variants: {
                Row: {
                    id: string
                    name: string
                    price_adjustment: number
                    product_id: string
                    stock_quantity: number
                    value: string
                }
                Insert: {
                    id?: string
                    name: string
                    price_adjustment?: number
                    product_id: string
                    stock_quantity?: number
                    value: string
                }
                Update: {
                    id?: string
                    name?: string
                    price_adjustment?: number
                    product_id?: string
                    stock_quantity?: number
                    value?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "product_variants_product_id_fkey"
                        columns: ["product_id"]
                        isOneToOne: false
                        referencedRelation: "products"
                        referencedColumns: ["id"]
                    },
                ]
            }
            products: {
                Row: {
                    barcode: string | null
                    category_id: string | null
                    compare_price: number | null
                    condition: string
                    cost: number | null
                    created_at: string
                    description: string | null
                    id: string
                    is_active: boolean
                    is_featured: boolean
                    low_stock_alert: number
                    name: string
                    platform: string
                    position: number
                    price: number
                    region: string
                    sku: string | null
                    slug: string
                    stock_quantity: number
                    store_id: string
                    updated_at: string | null
                }
                Insert: {
                    barcode?: string | null
                    category_id?: string | null
                    compare_price?: number | null
                    condition?: string
                    cost?: number | null
                    created_at?: string
                    description?: string | null
                    id?: string
                    is_active?: boolean
                    is_featured?: boolean
                    low_stock_alert?: number
                    name: string
                    platform?: string
                    position?: number
                    price?: number
                    region?: string
                    sku?: string | null
                    slug: string
                    stock_quantity?: number
                    store_id: string
                    updated_at?: string | null
                }
                Update: {
                    barcode?: string | null
                    category_id?: string | null
                    compare_price?: number | null
                    condition?: string
                    cost?: number | null
                    created_at?: string
                    description?: string | null
                    id?: string
                    is_active?: boolean
                    is_featured?: boolean
                    low_stock_alert?: number
                    name?: string
                    platform?: string
                    position?: number
                    price?: number
                    region?: string
                    sku?: string | null
                    slug?: string
                    stock_quantity?: number
                    store_id?: string
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "products_category_id_fkey"
                        columns: ["category_id"]
                        isOneToOne: false
                        referencedRelation: "categories"
                        referencedColumns: ["id"]
                    },
                    {
                        foreignKeyName: "products_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                ]
            }
            store_users: {
                Row: {
                    created_at: string
                    id: string
                    role: string
                    store_id: string
                    user_id: string
                }
                Insert: {
                    created_at?: string
                    id?: string
                    role?: string
                    store_id: string
                    user_id: string
                }
                Update: {
                    created_at?: string
                    id?: string
                    role?: string
                    store_id?: string
                    user_id?: string
                }
                Relationships: [
                    {
                        foreignKeyName: "store_users_store_id_fkey"
                        columns: ["store_id"]
                        isOneToOne: false
                        referencedRelation: "stores"
                        referencedColumns: ["id"]
                    },
                ]
            }
            stores: {
                Row: {
                    address: string | null
                    banner_url: string | null
                    country: string | null
                    created_at: string
                    currency: string
                    description: string | null
                    email: string | null
                    id: string
                    instagram: string | null
                    logo_url: string | null
                    name: string
                    owner_id: string
                    phone: string | null
                    slug: string
                    updated_at: string | null
                    whatsapp: string | null
                }
                Insert: {
                    address?: string | null
                    banner_url?: string | null
                    country?: string | null
                    created_at?: string
                    currency?: string
                    description?: string | null
                    email?: string | null
                    id?: string
                    instagram?: string | null
                    logo_url?: string | null
                    name: string
                    owner_id: string
                    phone?: string | null
                    slug: string
                    updated_at?: string | null
                    whatsapp?: string | null
                }
                Update: {
                    address?: string | null
                    banner_url?: string | null
                    country?: string | null
                    created_at?: string
                    currency?: string
                    description?: string | null
                    email?: string | null
                    id?: string
                    instagram?: string | null
                    logo_url?: string | null
                    name?: string
                    owner_id?: string
                    phone?: string | null
                    slug?: string
                    updated_at?: string | null
                    whatsapp?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            is_store_member: { Args: { input_store_id: string }; Returns: boolean }
            slugify: { Args: { "": string }; Returns: string }
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
    DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Insert: infer I
    }
    ? I
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
    }
    ? I
    : never
    : never

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
        Update: infer U
    }
    ? U
    : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
    }
    ? U
    : never
    : never

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals
    }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
    public: {
        Enums: {},
    },
} as const
