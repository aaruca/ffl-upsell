"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  Pencil,
  Trash2,
  Package,
  Image as ImageIcon,
} from "lucide-react";
import {
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  CONDITION_LABELS,
} from "@/lib/types";
import type { Product, ProductPlatform, ProductCondition } from "@/lib/types";
import { toast } from "sonner";

export default function ProductsPage() {
  const { store, loading: storeLoading } = useStore();
  const supabase = createClient();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [platformFilter, setPlatformFilter] = useState("all");

  useEffect(() => {
    if (!store) return;
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function fetchProducts() {
    if (!store) return;
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*, images:product_images(*)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });
    setProducts((data as unknown as Product[]) || []);
    setLoading(false);
  }

  async function handleDelete(product: Product) {
    if (
      !confirm(`Estas seguro de eliminar "${product.name}"? Esta accion no se puede deshacer.`)
    ) {
      return;
    }

    // Delete images from storage first
    if (product.images && product.images.length > 0) {
      const paths = product.images.map((img) => {
        const url = new URL(img.url);
        const pathParts = url.pathname.split("/product-images/");
        return pathParts[1] || "";
      }).filter(Boolean);

      if (paths.length > 0) {
        await supabase.storage.from("product-images").remove(paths);
      }
    }

    // Delete product image records
    await supabase
      .from("product_images")
      .delete()
      .eq("product_id", product.id);

    // Delete the product
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id)
      .eq("store_id", store!.id);

    if (error) {
      toast.error("Error eliminando producto: " + error.message);
      return;
    }

    toast.success(`"${product.name}" eliminado correctamente`);
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
  }

  const filtered = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku?.toLowerCase().includes(search.toLowerCase()) ||
      "";
    const matchesPlatform =
      platformFilter === "all" || p.platform === platformFilter;
    return matchesSearch && matchesPlatform;
  });

  if (storeLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Productos</h1>
          <p className="text-muted-foreground">
            Gestiona el catalogo de tu tienda
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Nuevo producto
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Plataforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las plataformas</SelectItem>
            {Object.entries(PLATFORM_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/50">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground">
            {products.length === 0
              ? "No tienes productos aun"
              : "No se encontraron productos"}
          </p>
          {products.length === 0 && (
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/products/new">
                <Plus className="mr-2 h-4 w-4" />
                Crear primer producto
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12" />
                <TableHead>Nombre</TableHead>
                <TableHead>Plataforma</TableHead>
                <TableHead>Condicion</TableHead>
                <TableHead className="text-right">Precio</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => {
                const primaryImg =
                  product.images?.find((i) => i.is_primary) ||
                  product.images?.[0];
                const isLowStock =
                  product.stock_quantity <= product.low_stock_alert;

                return (
                  <TableRow key={product.id}>
                    {/* Thumbnail */}
                    <TableCell>
                      {primaryImg ? (
                        <Image
                          src={primaryImg.url}
                          alt={product.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-secondary">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>

                    {/* Name */}
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.sku && (
                          <p className="text-xs text-muted-foreground">
                            SKU: {product.sku}
                          </p>
                        )}
                      </div>
                    </TableCell>

                    {/* Platform Badge */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          PLATFORM_COLORS[
                          product.platform as ProductPlatform
                          ] || ""
                        }
                      >
                        {PLATFORM_LABELS[
                          product.platform as ProductPlatform
                        ] || product.platform}
                      </Badge>
                    </TableCell>

                    {/* Condition */}
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {CONDITION_LABELS[
                          product.condition as ProductCondition
                        ] || product.condition}
                      </span>
                    </TableCell>

                    {/* Price */}
                    <TableCell className="text-right">
                      <div>
                        <span className="font-medium">
                          ${Number(product.price).toFixed(2)}
                        </span>
                        {product.compare_price &&
                          Number(product.compare_price) > Number(product.price) && (
                            <span className="ml-1 text-xs text-muted-foreground line-through">
                              ${Number(product.compare_price).toFixed(2)}
                            </span>
                          )}
                      </div>
                    </TableCell>

                    {/* Stock */}
                    <TableCell className="text-right">
                      <span
                        className={`font-medium ${isLowStock ? "text-red-400" : ""
                          }`}
                      >
                        {product.stock_quantity}
                      </span>
                    </TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" asChild>
                          <Link
                            href={`/dashboard/products/${product.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
