"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Store } from "@/lib/types";

export function useStore() {
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    async function fetchStore() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const { data } = await supabase.from("stores").select("*").eq("owner_id", user.id).single();
      setStore(data);
      setLoading(false);
    }
    fetchStore();
  }, []);

  return { store, loading, setStore };
}
