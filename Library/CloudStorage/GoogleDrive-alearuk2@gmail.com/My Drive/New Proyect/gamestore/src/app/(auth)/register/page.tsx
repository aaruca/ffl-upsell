"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Gamepad2, Mail, Lock, User, Store, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function generateSlug(text: string) {
    return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } },
    });
    if (authError) { toast.error(authError.message); setLoading(false); return; }

    if (authData.user) {
      const slug = generateSlug(storeName) + "-" + Date.now().toString(36);
      const { error: storeError } = await supabase.from("stores").insert({
        owner_id: authData.user.id, name: storeName, slug, currency: "USD",
      });
      if (storeError) { toast.error("Error creando tienda: " + storeError.message); setLoading(false); return; }

      const { data: store } = await supabase.from("stores").select("id").eq("owner_id", authData.user.id).single();
      if (store) {
        await supabase.from("store_users").insert({ store_id: store.id, user_id: authData.user.id, role: "owner" });
      }
      toast.success("Cuenta creada!");
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grid p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-gaming-purple/5 via-transparent to-gaming-cyan/5" />
      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl gradient-gaming">
            <Gamepad2 className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Crea tu tienda</CardTitle>
          <CardDescription>Empieza a vender en minutos, gratis</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label>Tu nombre</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nombre de tu tienda</Label>
              <div className="relative">
                <Store className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Mi Tienda Gaming" value={storeName} onChange={(e) => setStoreName(e.target.value)} className="pl-10" required />
              </div>
              {storeName && <p className="text-xs text-muted-foreground">Tu tienda: <span className="text-primary">/store/{generateSlug(storeName)}</span></p>}
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contrasena</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input type="password" placeholder="Min 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" minLength={6} required />
              </div>
            </div>
            <Button type="submit" className="w-full gradient-gaming text-white hover:opacity-90" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear mi tienda gratis
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Ya tienes cuenta? <Link href="/login" className="text-primary hover:underline">Inicia sesion</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
