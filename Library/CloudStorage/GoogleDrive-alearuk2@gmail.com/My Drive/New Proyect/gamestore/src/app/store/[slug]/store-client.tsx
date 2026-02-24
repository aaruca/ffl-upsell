"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "@/components/mode-toggle";
import {
  Search,
  ShoppingCart,
  MessageCircle,
  Instagram,
  Minus,
  Plus,
  Trash2,
  X,
  Gamepad2,
  Image as ImageIcon,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import { useCartStore } from "@/lib/store/cart";
import { cn } from "@/lib/utils";
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
} from "@/lib/types";
import type {
  Store,
  Category,
  Product,
  ProductPlatform,
} from "@/lib/types";

interface StorePageClientProps {
  store: Store;
  categories: Category[];
  products: Product[];
  currentFilters: { category?: string; search?: string; platform?: string };
}

export function StorePageClient({
  store,
  categories,
  products,
  currentFilters,
}: StorePageClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [searchInput, setSearchInput] = useState(currentFilters.search || "");
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCartStore();

  function navigate(params: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    Object.entries({ ...currentFilters, ...params }).forEach(([k, v]) => {
      if (v) sp.set(k, v);
    });
    router.push(`${pathname}?${sp.toString()}`);
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: searchInput || undefined });
  }

  const whatsappLink = store.whatsapp
    ? `https://wa.me/${store.whatsapp.replace(/\D/g, "")}`
    : null;

  const platforms: ProductPlatform[] = [
    "switch",
    "ps5",
    "ps4",
    "xbox-series",
    "xbox-one",
    "pc",
    "retro",
  ];

  const getProductImage = (product: Product) =>
    product.images?.find((i) => i.is_primary)?.url || product.images?.[0]?.url;

  return (
    <div className="min-h-screen bg-background dark:bg-[#121214] text-foreground transition-colors duration-300">

      {/* Header - Clean logiflow style */}
      <header className="sticky top-0 z-50 glass border-b border-border/30 dark:border-white/5">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Logo / Brand */}
          <Link href={`/store/${store.slug}`} className="flex items-center gap-3 shrink-0 group">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl bg-secondary dark:bg-[#2C2C30] transition-transform group-hover:scale-105">
              {store.logo_url ? (
                <img
                  src={store.logo_url}
                  alt={store.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Gamepad2 className="h-5 w-5 text-muted-foreground dark:text-slate-300" />
                </div>
              )}
            </div>
            <span className="hidden text-xl font-semibold tracking-tight sm:block">
              {store.name}
            </span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-auto">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar juegos, consolas..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-12 pr-4 py-3 h-11 rounded-[20px] border-border/30 dark:border-white/5 bg-card dark:bg-[#1E1E22] focus-visible:ring-primary/50 transition-all"
              />
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ModeToggle />
            <Sheet open={cartOpen} onOpenChange={setCartOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-secondary/50 dark:hover:bg-white/5">
                  <ShoppingCart className="h-5 w-5" />
                  {cart.itemCount() > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-design-gold text-[11px] font-bold text-slate-900 shadow-sm">
                      {cart.itemCount()}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="flex w-full flex-col sm:max-w-md border-l border-border/30 dark:border-white/5 bg-background dark:bg-[#121214]">
                <SheetTitle className="text-xl font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-design-gold" />
                  Tu Carrito <span className="text-muted-foreground text-sm font-normal">({cart.itemCount()} items)</span>
                </SheetTitle>
                <ScrollArea className="flex-1 -mx-6 px-6 py-4">
                  {cart.items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center space-y-4">
                      <div className="h-16 w-16 rounded-full bg-secondary/50 dark:bg-[#2C2C30] flex items-center justify-center">
                        <ShoppingCart className="h-8 w-8 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">Tu carrito está vacío</p>
                        <p className="text-sm text-muted-foreground mt-1">¡Explora el catálogo y encuentra tu próximo juego!</p>
                      </div>
                      <Button onClick={() => setCartOpen(false)} variant="outline" className="rounded-full">
                        Seguir comprando
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cart.items.map((item) => (
                        <div key={item.product.id + (item.variant?.id || "")} className="group relative flex gap-4 overflow-hidden rounded-2xl border border-border/30 dark:border-white/5 bg-card dark:bg-[#1E1E22] p-3 transition-all hover:scale-[1.01] duration-300">
                          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-secondary dark:bg-[#2C2C30]">
                            {getProductImage(item.product) ? (
                              <img src={getProductImage(item.product)} alt={item.product.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <div className="flex flex-1 flex-col justify-between">
                            <div>
                              <h4 className="font-medium line-clamp-1">{item.product.name}</h4>
                              <p className="text-sm font-bold text-design-gold">${Number(item.product.price).toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-secondary/50 dark:bg-[#2C2C30] w-fit rounded-full px-1 py-0.5 mt-2">
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => cart.updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)}><Minus className="h-3 w-3" /></Button>
                              <span className="text-xs font-medium w-4 text-center">{item.quantity}</span>
                              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => cart.updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)}><Plus className="h-3 w-3" /></Button>
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full opacity-0 group-hover:opacity-100 transition-all" onClick={() => cart.removeItem(item.product.id, item.variant?.id)}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                {cart.items.length > 0 && (
                  <div className="border-t border-border/30 dark:border-white/5 pt-4 space-y-4">
                    <div className="flex items-center justify-between text-lg font-bold">
                      <span>Total Estimado</span>
                      <span className="text-2xl text-design-gold tracking-tight">${cart.total().toFixed(2)}</span>
                    </div>
                    <div className="grid gap-3">
                      <Link href={`/store/${store.slug}/checkout`} onClick={() => setCartOpen(false)}>
                        <Button className="w-full h-12 text-base rounded-full bg-design-gold text-slate-900 hover:bg-[#b89a6b] shadow-lg">
                          Confirmar Pedido <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                      {whatsappLink && (
                        <a href={`${whatsappLink}?text=${encodeURIComponent(`Hola! Quiero comprar:\n${cart.items.map(i => `- ${i.quantity}x ${i.product.name} ($${Number(i.product.price).toFixed(2)})`).join("\n")}\n\nTotal: $${cart.total().toFixed(2)}`)}`} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" className="w-full h-11 rounded-full border-green-500/30 text-green-600 hover:text-green-700 hover:bg-green-500/10 dark:text-green-400 dark:hover:text-green-300">
                            <MessageCircle className="mr-2 h-4 w-4" /> Comprar por WhatsApp
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Platform / Category Filters */}
      <div className="sticky top-16 z-40 border-b border-border/30 dark:border-white/5 bg-background/80 dark:bg-[#121214]/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 py-3">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-2 pb-1">
              <Button
                variant={!currentFilters.category && !currentFilters.platform ? "default" : "secondary"}
                size="sm"
                className={cn(
                  "rounded-full",
                  !currentFilters.category && !currentFilters.platform
                    ? "bg-design-gold text-slate-900 hover:bg-[#b89a6b]"
                    : "bg-secondary/50 dark:bg-[#2C2C30] text-muted-foreground hover:text-foreground"
                )}
                onClick={() => navigate({ category: undefined, platform: undefined })}
              >
                Todo
              </Button>

              <Separator orientation="vertical" className="h-8 mx-2" />

              {platforms.map(p => (
                <Button
                  key={p}
                  variant={currentFilters.platform === p ? "default" : "secondary"}
                  size="sm"
                  className={cn(
                    "rounded-full border-0 transition-all",
                    currentFilters.platform === p
                      ? "bg-design-gold text-slate-900 hover:bg-[#b89a6b]"
                      : "bg-secondary/50 dark:bg-[#2C2C30] text-muted-foreground hover:text-foreground dark:hover:bg-[#36363a]"
                  )}
                  onClick={() => navigate({ platform: p, category: undefined })}
                >
                  {PLATFORM_LABELS[p]}
                </Button>
              ))}

              <Separator orientation="vertical" className="h-8 mx-2" />

              {categories.map(cat => (
                <Button
                  key={cat.id}
                  variant={currentFilters.category === cat.slug ? "default" : "outline"}
                  size="sm"
                  className={cn(
                    "rounded-full",
                    currentFilters.category === cat.slug
                      ? "bg-design-gold text-slate-900 border-0 hover:bg-[#b89a6b]"
                      : "border-border/30 dark:border-white/10"
                  )}
                  onClick={() => navigate({ category: cat.slug, platform: undefined })}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
            <ScrollBar orientation="horizontal" className="invisible" />
          </ScrollArea>
        </div>
      </div>

      {/* Products Grid */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">

        {/* Search results message */}
        {currentFilters.search && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-border/30 dark:border-white/5 bg-card dark:bg-[#1E1E22] p-4">
            <p className="text-muted-foreground">Resultados para <span className="font-bold text-foreground">"{currentFilters.search}"</span></p>
            <Button variant="ghost" size="sm" onClick={() => { setSearchInput(""); navigate({ search: undefined }); }} className="h-8 px-2 text-muted-foreground hover:text-foreground rounded-full"><X className="h-4 w-4 mr-1" /> Limpiar</Button>
          </div>
        )}

        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="h-20 w-20 rounded-full bg-secondary/50 dark:bg-[#2C2C30] flex items-center justify-center mb-6">
              <Gamepad2 className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">No se encontraron productos</h2>
            <p className="text-muted-foreground mt-2 max-w-sm">Intenta ajustar tus filtros o busca algo diferente.</p>
            <Button onClick={() => navigate({ category: undefined, platform: undefined, search: undefined })} variant="outline" className="mt-6 rounded-full">
              Ver todo el catálogo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 lg:gap-6">
            {products.map((product, idx) => {
              const isFeatured = product.is_featured && idx < 2;
              const img = getProductImage(product);
              const hasDiscount = product.compare_price && Number(product.compare_price) > Number(product.price);
              const discountPercent = hasDiscount ? Math.round((1 - Number(product.price) / Number(product.compare_price)) * 100) : 0;

              return (
                <Link
                  key={product.id}
                  href={`/store/${store.slug}/product/${product.slug}`}
                  className={cn(
                    "group relative overflow-hidden transition-all duration-300 hover:scale-[1.02]",
                    isFeatured
                      ? "col-span-2 row-span-2 rounded-[2rem] h-[400px] md:h-[500px]"
                      : "col-span-1 rounded-2xl h-[280px] sm:h-[320px]"
                  )}
                >
                  {/* Background Image */}
                  <div className="absolute inset-0 bg-secondary dark:bg-[#1E1E22]">
                    {img ? (
                      <img src={img} alt={product.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center"><ImageIcon className="h-10 w-10 text-muted-foreground/20" /></div>
                    )}
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                  </div>

                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <Badge className={cn("backdrop-blur-md shadow-sm border-0 rounded-full", PLATFORM_COLORS[product.platform as ProductPlatform])}>
                      {PLATFORM_LABELS[product.platform as ProductPlatform]}
                    </Badge>
                    {hasDiscount && <Badge className="bg-destructive text-destructive-foreground rounded-full">-{discountPercent}%</Badge>}
                  </div>

                  {/* Arrow button */}
                  <div className="absolute top-3 right-3">
                    <button className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-white/10 dark:bg-white/5 backdrop-blur-md flex items-center justify-center text-white transition-all group-hover:bg-design-gold group-hover:text-slate-900">
                      <ArrowUpRight size={16} strokeWidth={2.5} className="lg:w-5 lg:h-5" />
                    </button>
                  </div>

                  {/* Content (Bottom) */}
                  <div className="absolute bottom-0 left-0 w-full p-4 sm:p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    <h3 className={cn("font-bold text-white leading-tight mb-2 drop-shadow-md", isFeatured ? "text-2xl md:text-3xl" : "text-lg line-clamp-2")}>
                      {product.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="flex items-baseline gap-2">
                        <span className={cn("font-bold text-white", isFeatured ? "text-2xl" : "text-lg")}>
                          ${Number(product.price).toFixed(2)}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-gray-400 line-through">
                            ${Number(product.compare_price).toFixed(2)}
                          </span>
                        )}
                      </div>
                      <Button
                        size={isFeatured ? "default" : "icon"}
                        className={cn(
                          "rounded-full shadow-lg transition-colors",
                          isFeatured
                            ? "bg-design-gold text-slate-900 hover:bg-[#b89a6b]"
                            : "bg-white/10 backdrop-blur-md text-white hover:bg-design-gold hover:text-slate-900"
                        )}
                        onClick={(e) => { e.preventDefault(); cart.addItem(product); setCartOpen(true); }}
                      >
                        <ShoppingCart className={cn("h-5 w-5", isFeatured ? "mr-2" : "")} />
                        {isFeatured && "Agregar"}
                      </Button>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-20 border-t border-border/30 dark:border-white/5 bg-card/30 dark:bg-[#1E1E22]/30 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <h2 className="text-2xl font-semibold tracking-tight mb-4">{store.name}</h2>
          <div className="flex justify-center gap-4 mb-8">
            {store.instagram && (
              <a href={`https://instagram.com/${store.instagram.replace("@", "")}`} target="_blank" className="h-10 w-10 rounded-full bg-secondary/50 dark:bg-[#2C2C30] flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-secondary dark:hover:bg-[#36363a] transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
            )}
            {whatsappLink && (
              <a href={whatsappLink} target="_blank" className="h-10 w-10 rounded-full bg-secondary/50 dark:bg-[#2C2C30] flex items-center justify-center text-muted-foreground hover:text-foreground dark:hover:text-white hover:bg-secondary dark:hover:bg-[#36363a] transition-colors">
                <MessageCircle className="h-5 w-5" />
              </a>
            )}
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} {store.name} • Powered by GameStore</p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      {whatsappLink && (
        <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl hover:scale-110 active:scale-95 transition-all duration-300 hover:shadow-green-500/50">
          <MessageCircle className="h-7 w-7" />
        </a>
      )}
    </div>
  );
}
