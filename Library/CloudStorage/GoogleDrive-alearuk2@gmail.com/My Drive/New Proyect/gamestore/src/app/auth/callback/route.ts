import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: existingStore } = await supabase.from("stores").select("id").eq("owner_id", user.id).single();
        if (!existingStore) {
          const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Mi Tienda";
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") + "-" + Date.now().toString(36);
          const { data: store } = await supabase.from("stores").insert({ owner_id: user.id, name: name + "'s Store", slug, currency: "USD" }).select("id").single();
          if (store) await supabase.from("store_users").insert({ store_id: store.id, user_id: user.id, role: "owner" });
        }
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
