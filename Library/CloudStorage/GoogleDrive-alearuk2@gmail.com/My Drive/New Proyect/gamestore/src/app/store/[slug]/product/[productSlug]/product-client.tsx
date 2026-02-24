"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ShoppingCart,
  MessageCircle,
  Share2,
  Minus,
  Plus,
  Gamepad2,
  Image as ImageIcon,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  CONDITION_LABELS,
} from "@/lib/types";
import type {
  Store,
  Product,
  ProductPlatform,
  ProductCondition,
} from "@/lib/types";
import { toast } from "sonner";

interface ProductPageClientProps {
  store: Store;
  product: Product;
  relatedProducts: Product[];
}

export function ProductPageClient({
  store,
  product,
  relatedProducts,
}: ProductPageClientProps) {
  const cart = useCartStore();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const images = product.images?.sort((a, b) => a.position - b.position) || [];
  const currentImage = images[selectedImage];
  const hasDiscount =
    product.compare_price &&
    Number(product.compare_price) > Number(product.price);
  const discountPercent = hasDiscount
    ? Math.round(
        (1 - Number(product.price) / Number(product.compare_price!)) * 100
      )
    : 0;

  const whatsappLink = store.whatsapp
    ? `https://wa.me/${store.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
        `Hola! Me interesa: ${product.name} - $${Number(product.price).toFixed(2)}\n${typeof window !== "undefined" ? window.location.href : ""}`
      )}`
    : null;

  function handleAddToCart() {
    cart.addItem(product, quantity);
    toast.success("Agregado al carrito!");
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({
        title: product.name,
        text: `${product.name} - $${Number(product.price).toFixed(2)}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copiado!");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link href={`/store/${store.slug}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Link
            href={`/store/${store.slug}`}
            className="flex items-center gap-2"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg gradient-gaming">
              <Gamepad2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold">{store.name}</span>
          </Link>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
            <Link href={`/store/${store.slug}`}>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cart.itemCount() > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full gradient-gaming text-[10px] font-bold text-white">
                    {cart.itemCount()}
                  </span>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Images */}
          <div className="space-y-3">
            <div className="aspect-square overflow-hidden rounded-xl border border-border/50 bg-secondary">
              {currentImage ? (
                <img
                  src={currentImage.url}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                      i === selectedImage
                        ? "border-primary"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                  >
                    <img
                      src={img.url}
                      alt={`${product.name} ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge
                className={
                  PLATFORM_COLORS[product.platform as ProductPlatform] || ""
                }
              >
                {PLATFORM_LABELS[product.platform as ProductPlatform]}
              </Badge>
              <Badge variant="secondary">
                {CONDITION_LABELS[product.condition as ProductCondition]}
              </Badge>
              {product.region !== "region-free" && (
                <Badge variant="secondary">
                  {product.region.toUpperCase()}
                </Badge>
              )}
              {product.stock_quantity <= 0 && (
                <Badge variant="destructive">Agotado</Badge>
              )}
            </div>

            <h1 className="text-2xl font-bold lg:text-3xl">{product.name}</h1>

            {product.category && (
              <Link
                href={`/store/${store.slug}?category=${product.category.slug}`}
                className="text-sm text-muted-foreground hover:text-primary"
              >
                {product.category.name}
              </Link>
            )}

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary">
                ${Number(product.price).toFixed(2)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-muted-foreground line-through">
                    ${Number(product.compare_price).toFixed(2)}
                  </span>
                  <Badge className="bg-destructive text-white">
                    -{discountPercent}%
                  </Badge>
                </>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              {product.stock_quantity > 0
                ? `${product.stock_quantity} disponible${product.stock_quantity !== 1 ? "s" : ""}`
                : "Sin stock"}
            </p>

            <Separator />

            {product.description && (
              <div className="prose prose-sm prose-invert max-w-none">
                <p className="whitespace-pre-line text-muted-foreground">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Cantidad:</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-8 text-center font-medium">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() =>
                    setQuantity(
                      Math.min(product.stock_quantity, quantity + 1)
                    )
                  }
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="flex-1 gradient-gaming text-white"
                disabled={product.stock_quantity <= 0}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                Agregar al carrito
              </Button>
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    className="w-full border-gaming-green/30 text-gaming-green hover:bg-gaming-green/10"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    WhatsApp
                  </Button>
                </a>
              )}
            </div>

            {product.sku && (
              <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
            )}
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-4 text-xl font-bold">Productos relacionados</h2>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              {relatedProducts.map((rp) => {
                const img =
                  rp.images?.find((i) => i.is_primary) || rp.images?.[0];
                return (
                  <Link
                    key={rp.id}
                    href={`/store/${store.slug}/product/${rp.slug}`}
                    className="group overflow-hidden rounded-xl border border-border/50 bg-card transition-all hover:border-primary/30"
                  >
                    <div className="aspect-square overflow-hidden bg-secondary">
                      {img ? (
                        <img
                          src={img.url}
                          alt={rp.name}
                          className="h-full w-full object-cover transition-transform group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <h3 className="line-clamp-2 text-sm font-medium">
                        {rp.name}
                      </h3>
                      <p className="mt-1 text-sm font-bold text-primary">
                        ${Number(rp.price).toFixed(2)}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
