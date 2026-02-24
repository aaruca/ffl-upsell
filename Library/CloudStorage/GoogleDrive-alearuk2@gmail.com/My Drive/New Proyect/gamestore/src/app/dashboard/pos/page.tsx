"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Minus,
  CreditCard,
  Banknote,
  Send,
  CheckCircle,
  Image as ImageIcon,
  User,
  Phone,
  Mail,
} from "lucide-react";
import { PLATFORM_LABELS, PLATFORM_COLORS } from "@/lib/types";
import type { Product, ProductPlatform, Category } from "@/lib/types";
import { toast } from "sonner";

interface POSItem {
  product: Product;
  quantity: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

export default function POSPage() {
  const { store } = useStore();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cart, setCart] = useState<POSItem[]>([]);
  const [discount, setDiscount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashReceived, setCashReceived] = useState("");
  const [showReceipt, setShowReceipt] = useState(false);
  const [customer, setCustomer] = useState<CustomerInfo>({ name: "", phone: "", email: "" });
  const [lastOrder, setLastOrder] = useState<{
    number: number;
    total: number;
    items: POSItem[];
    customer: CustomerInfo;
  } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!store) return;
    Promise.all([
      supabase
        .from("products")
        .select("*, images:product_images(*)")
        .eq("store_id", store.id)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("categories")
        .select("*")
        .eq("store_id", store.id)
        .order("position"),
    ]).then(([productsRes, categoriesRes]) => {
      setProducts((productsRes.data as unknown as Product[]) || []);
      setCategories((categoriesRes.data as unknown as Category[]) || []);
    });
  }, [store, supabase]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function updateQty(productId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: i.quantity + delta }
            : i
        )
        .filter((i) => i.quantity > 0)
    );
  }

  const subtotal = cart.reduce(
    (sum, i) => sum + Number(i.product.price) * i.quantity,
    0
  );
  const discountAmount = discount
    ? discount.includes("%")
      ? (subtotal * parseFloat(discount)) / 100
      : parseFloat(discount) || 0
    : 0;
  const total = Math.max(0, subtotal - discountAmount);
  const change =
    paymentMethod === "cash" && cashReceived
      ? parseFloat(cashReceived) - total
      : 0;

  async function handleCharge() {
    if (!store || cart.length === 0) return;

    // Create order
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        store_id: store.id,
        status: "delivered",
        subtotal,
        discount: discountAmount,
        shipping_cost: 0,
        total,
        payment_method: paymentMethod,
        payment_status: "paid",
        source: "pos",
        customer_name: customer.name || "Cliente en tienda",
        customer_phone: customer.phone || null,
        customer_email: customer.email || null,
      })
      .select("id, order_number")
      .single();

    if (error) {
      toast.error("Error creando venta: " + error.message);
      return;
    }

    // Create order items
    await supabase.from("order_items").insert(
      cart.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.product.price),
        total_price: Number(item.product.price) * item.quantity,
      }))
    );

    // Update stock
    for (const item of cart) {
      await supabase
        .from("products")
        .update({
          stock_quantity: Math.max(
            0,
            item.product.stock_quantity - item.quantity
          ),
        })
        .eq("id", item.product.id);
    }

    setLastOrder({
      number: order.order_number,
      total,
      items: [...cart],
      customer: { ...customer },
    });
    setShowReceipt(true);
    setCart([]);
    setDiscount("");
    setCashReceived("");
    setCustomer({ name: "", phone: "", email: "" });
    toast.success(`Venta #${order.order_number} registrada!`);
  }

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode?.includes(search);
    const matchesCat =
      categoryFilter === "all" || p.category_id === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="flex h-[calc(100vh-5rem)] gap-4 lg:h-[calc(100vh-3rem)]">
      {/* Product grid */}
      <div className="flex flex-1 flex-col gap-4 overflow-hidden">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Buscar o escanear código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl"
              autoFocus
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-36 h-11 rounded-xl">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 lg:grid-cols-4 pr-1">
          {filtered.map((product) => {
            const img = product.images?.find((i) => i.is_primary) ||
              product.images?.[0];
            return (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="flex flex-col items-start rounded-xl border border-border bg-card p-3 text-left transition-all hover:shadow-md hover:border-primary/30 active:scale-[0.98]"
              >
                {img ? (
                  <img
                    src={img.url}
                    alt={product.name}
                    className="mb-2 aspect-square w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="mb-2 flex aspect-square w-full items-center justify-center rounded-lg bg-secondary">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <p className="line-clamp-2 text-sm font-medium">
                  {product.name}
                </p>
                <div className="mt-auto flex w-full items-center justify-between pt-2">
                  <span className="text-base font-bold">
                    ${Number(product.price).toFixed(2)}
                  </span>
                  <Badge
                    variant="secondary"
                    className={`text-[10px] ${PLATFORM_COLORS[product.platform as ProductPlatform] || ""}`}
                  >
                    {PLATFORM_LABELS[product.platform as ProductPlatform]}
                  </Badge>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Cart / Register - Apple style */}
      <Card className="hidden w-96 flex-shrink-0 flex-col rounded-2xl border-border lg:flex">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-lg font-semibold">Venta actual</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4 overflow-hidden p-4">
          {/* Customer Info Section */}
          <div className="space-y-3 p-3 rounded-xl bg-secondary/50">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <User className="h-3 w-3" /> Información del cliente
            </p>
            <div className="space-y-2">
              <Input
                placeholder="Nombre del cliente"
                value={customer.name}
                onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                className="h-9 text-sm rounded-lg"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Teléfono"
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    className="h-9 text-sm pl-8 rounded-lg"
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Email"
                    type="email"
                    value={customer.email}
                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                    className="h-9 text-sm pl-8 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 space-y-2 overflow-y-auto">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Selecciona productos para vender
              </p>
            ) : (
              cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-2 rounded-xl border border-border p-3 bg-card"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ${Number(item.product.price).toFixed(2)} c/u
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-secondary rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => updateQty(item.product.id, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => updateQty(item.product.id, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <span className="w-16 text-right text-sm font-bold">
                    ${(Number(item.product.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>

          <Separator />

          {/* Discount */}
          <Input
            placeholder="Descuento (ej: 10 o 10%)"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            className="h-10 text-sm rounded-xl"
          />

          {/* Totals */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descuento</span>
                <span className="text-green-600 dark:text-green-400">
                  -${discountAmount.toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-1">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment method - Apple style segmented control */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-secondary rounded-xl">
            {[
              { value: "cash", icon: Banknote, label: "Efectivo" },
              { value: "card", icon: CreditCard, label: "Tarjeta" },
              { value: "transfer", icon: Send, label: "Transfer" },
            ].map((pm) => (
              <button
                key={pm.value}
                onClick={() => setPaymentMethod(pm.value)}
                className={`flex flex-col items-center gap-1 rounded-lg py-2 text-xs font-medium transition-all ${paymentMethod === pm.value
                    ? "bg-card shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                  }`}
              >
                <pm.icon className="h-4 w-4" />
                {pm.label}
              </button>
            ))}
          </div>

          {paymentMethod === "cash" && (
            <div className="space-y-1">
              <Input
                type="number"
                step="0.01"
                placeholder="Monto recibido"
                value={cashReceived}
                onChange={(e) => setCashReceived(e.target.value)}
                className="h-10 text-sm rounded-xl"
              />
              {change > 0 && (
                <p className="text-right text-sm font-bold text-green-600 dark:text-green-400">
                  Cambio: ${change.toFixed(2)}
                </p>
              )}
            </div>
          )}

          <Button
            onClick={handleCharge}
            disabled={cart.length === 0}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-base"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            Cobrar ${total.toFixed(2)}
          </Button>
        </CardContent>
      </Card>

      {/* Receipt dialog - Apple style */}
      <Dialog open={showReceipt} onOpenChange={setShowReceipt}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">
              <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              ¡Venta completada!
            </DialogTitle>
          </DialogHeader>
          {lastOrder && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-4 text-center bg-secondary/30">
                <p className="text-sm text-muted-foreground">
                  Pedido #{lastOrder.number}
                </p>
                <p className="text-3xl font-bold mt-1">
                  ${lastOrder.total.toFixed(2)}
                </p>
                {lastOrder.customer.name && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Cliente: {lastOrder.customer.name}
                  </p>
                )}
              </div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {lastOrder.items.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex justify-between text-sm py-1"
                  >
                    <span className="text-muted-foreground">
                      {item.quantity}x {item.product.name}
                    </span>
                    <span className="font-medium">
                      ${(Number(item.product.price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                className="w-full h-11 rounded-xl"
                onClick={() => setShowReceipt(false)}
              >
                Nueva venta
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
