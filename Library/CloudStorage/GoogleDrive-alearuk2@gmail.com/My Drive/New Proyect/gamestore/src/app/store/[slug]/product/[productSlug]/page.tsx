import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductPageClient } from "./product-client";
import type { Product } from "@/lib/types";

interface Props {
  params: Promise<{ slug: string; productSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, productSlug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("name")
    .eq("slug", slug)
    .single();

  const { data: product } = await supabase
    .from("products")
    .select("name, description, price, images:product_images(url, is_primary)")
    .eq("slug", productSlug)
    .single();

  if (!product || !store) return { title: "Producto no encontrado" };

  const img = product.images?.find((i: { is_primary: boolean }) => i.is_primary) || product.images?.[0];

  return {
    title: `${product.name} - ${store.name}`,
    description: product.description || `${product.name} - $${product.price}`,
    openGraph: {
      title: product.name,
      description: `$${product.price} - ${store.name}`,
      images: img ? [{ url: img.url }] : [],
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug, productSlug } = await params;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!store) notFound();

  const { data: product } = await supabase
    .from("products")
    .select(
      "*, images:product_images(*), category:categories(name, slug), variants:product_variants(*)"
    )
    .eq("slug", productSlug)
    .eq("store_id", store.id)
    .eq("is_active", true)
    .single();

  if (!product) notFound();

  // Related products
  const { data: related } = await supabase
    .from("products")
    .select("*, images:product_images(*)")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .eq("platform", product.platform)
    .neq("id", product.id)
    .limit(4);

  return (
    <ProductPageClient
      store={store}
      product={product as unknown as Product}
      relatedProducts={(related || []) as unknown as Product[]}
    />
  );
}
