import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StorePageClient } from "./store-client";
import type { Product, Category } from "@/lib/types";

interface Props {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ category?: string; search?: string; platform?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("name, description")
    .eq("slug", slug)
    .single();

  if (!store) return { title: "Tienda no encontrada" };

  return {
    title: `${store.name} - GameStore`,
    description: store.description || `Tienda gaming ${store.name}`,
    openGraph: {
      title: store.name,
      description: store.description || `Visita ${store.name} en GameStore`,
    },
  };
}

export default async function StorePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const filters = await searchParams;
  const supabase = await createClient();

  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!store) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("store_id", store.id)
    .order("position");

  let productsQuery = supabase
    .from("products")
    .select("*, images:product_images(*), category:categories(name, slug)")
    .eq("store_id", store.id)
    .eq("is_active", true)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  if (filters.category) {
    const cat = (categories || []).find((c) => c.slug === filters.category);
    if (cat) productsQuery = productsQuery.eq("category_id", cat.id);
  }

  if (filters.platform && filters.platform !== "all") {
    productsQuery = productsQuery.eq("platform", filters.platform);
  }

  if (filters.search) {
    productsQuery = productsQuery.ilike("name", `%${filters.search}%`);
  }

  const { data: products } = await productsQuery;

  return (
    <StorePageClient
      store={store}
      categories={(categories || []) as Category[]}
      products={(products || []) as unknown as Product[]}
      currentFilters={filters}
    />
  );
}
