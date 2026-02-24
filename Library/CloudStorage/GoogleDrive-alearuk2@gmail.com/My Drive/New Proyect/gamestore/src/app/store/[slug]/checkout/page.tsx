"use client";

import { useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCartStore } from "@/lib/store/cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ShoppingCart,
  Loader2,
  CheckCircle,
  MessageCircle,
  Gamepad2,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const supabase = createClient();
  const cart = useCartStore();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderNumber, setOrderNumber] = useState(0);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.items.length === 0) return;
    setLoading(true);

    // Get store
    const { data: store } = await supabase
      .from("stores")
      .select("id, whatsapp")
      .eq("slug", slug)
      .single();

    if (!store) {
      toast.error("Tienda no encontrada");
      setLoading(false);
      return;
    }

    // Create or find customer
    let customerId = null;
    if (form.email || form.phone) {
      const { data: customer } = await supabase
        .from("customers")
        .insert({
          store_id: store.id,
          name: form.name,
          email: form.email || null,
          phone: form.phone || null,
          whatsapp: form.phone || null,
          address: form.address || null,
        })
        .select("id")
        .single();

      customerId = customer?.id;
    }

    const subtotal = cart.total();

    // Create order
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        store_id: store.id,
        customer_id: customerId,
        status: "pending",
        subtotal,
        discount: 0,
        shipping_cost: 0,
        total: subtotal,
        payment_status: "pending",
        source: "web",
        customer_name: form.name,
        customer_email: form.email || null,
        customer_phone: form.phone || null,
        customer_address: form.address || null,
      })
      .select("id, order_number")
      .single();

    if (error) {
      toast.error("Error creando pedido: " + error.message);
      setLoading(false);
      return;
    }

    // Create order items
    await supabase.from("order_items").insert(
      cart.items.map((item) => ({
        order_id: order.id,
        product_id: item.product.id,
        variant_id: item.variant?.id || null,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: Number(item.product.price),
        total_price:
          Number(item.product.price) * item.quantity,
      }))
    );

    // Notify via WhatsApp
    if (store.whatsapp) {
      const waPhone = store.whatsapp.replace(/\D/g, "");
      const msg = `Nuevo pedido #${order.order_number}!\n\nCliente: ${form.name}\nTel: ${form.phone || "N/A"}\nEmail: ${form.email || "N/A"}\n\nProductos:\n${cart.items.map((i) => `- ${i.quantity}x ${i.product.name} ($${Number(i.product.price).toFixed(2)})`).join("\n")}\n\nTotal: $${subtotal.toFixed(2)}\nDireccion: ${form.address || "N/A"}`;

      window.open(
        `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`,
        "_blank"
      );
    }

    setOrderNumber(order.order_number);
    setOrderComplete(true);
    cart.clearCart();
    setLoading(false);
  }

  if (orderComplete) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grid p-4">
        <Card className="max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
          <CardContent className="py-12 text-center">
            <CheckCircle className="mx-auto mb-4 h-16 w-16 text-gaming-green" />
            <h2 className="text-2xl font-bold">Pedido confirmado!</h2>
            <p className="mt-2 text-3xl font-bold text-primary">
              #{orderNumber}
            </p>
            <p className="mt-3 text-muted-foreground">
              Tu pedido ha sido recibido. El vendedor se comunicara contigo pronto.
            </p>
            <Link href={`/store/${slug}`}>
              <Button className="mt-6 gradient-gaming text-white">
                Volver a la tienda
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-4 px-4">
          <Link href={`/store/${slug}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-gaming">
              <Gamepad2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold">Checkout</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        {cart.items.length === 0 ? (
          <div className="py-20 text-center">
            <ShoppingCart className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-medium">Tu carrito esta vacio</h3>
            <Link href={`/store/${slug}`}>
              <Button className="mt-4" variant="outline">
                Volver a la tienda
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-5">
            <div className="space-y-6 lg:col-span-3">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Tus datos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nombre completo *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) =>
                          setForm({ ...form, email: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Telefono / WhatsApp *</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) =>
                          setForm({ ...form, phone: e.target.value })
                        }
                        placeholder="+52 1234567890"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Direccion de envio</Label>
                    <Input
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                      placeholder="Calle, numero, colonia, ciudad"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="sticky top-20 border-border/50">
                <CardHeader>
                  <CardTitle>Resumen</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3"
                    >
                      {item.product.images?.[0] ? (
                        <img
                          src={item.product.images[0].url}
                          alt={item.product.name}
                          className="h-12 w-12 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-md bg-secondary">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.product.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          x{item.quantity}
                        </p>
                      </div>
                      <span className="text-sm font-bold">
                        $
                        {(
                          Number(item.product.price) * item.quantity
                        ).toFixed(2)}
                      </span>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                      ${cart.total().toFixed(2)}
                    </span>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gradient-gaming text-white"
                    disabled={loading}
                  >
                    {loading && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Confirmar pedido
                  </Button>

                  <p className="text-center text-xs text-muted-foreground">
                    El vendedor se comunicara contigo para coordinar el pago y envio
                  </p>
                </CardContent>
              </Card>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
