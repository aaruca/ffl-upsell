"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gamepad2, Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function handleGoogleLogin() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) toast.error(error.message);
  }

  return (
    <div className="min-h-screen bg-background dark:bg-[#121214] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-secondary dark:bg-[#2C2C30]">
              <Gamepad2 className="h-6 w-6 text-foreground dark:text-slate-300" />
            </div>
            <span className="text-2xl font-semibold">GameStore</span>
          </div>

          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Bienvenido</h1>
            <p className="text-muted-foreground">
              Inicia sesión para acceder a tu dashboard
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-12 rounded-xl border-border/50 dark:border-white/10 bg-card dark:bg-[#1E1E22] focus-visible:ring-primary"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 pl-12 rounded-xl border-border/50 dark:border-white/10 bg-card dark:bg-[#1E1E22] focus-visible:ring-primary"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-design-gold text-slate-900 hover:bg-[#b89a6b] font-medium text-base transition-all hover:scale-[1.02]"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  Iniciar Sesión
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border/50 dark:border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background dark:bg-[#121214] px-3 text-muted-foreground">o continúa con</span>
            </div>
          </div>

          {/* Google Login */}
          <Button
            variant="outline"
            className="w-full h-12 rounded-xl border-border/50 dark:border-white/10 bg-card dark:bg-[#1E1E22] hover:bg-secondary dark:hover:bg-[#2C2C30] transition-all"
            onClick={handleGoogleLogin}
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar con Google
          </Button>

          {/* Register Link */}
          <p className="text-center text-sm text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href="/register" className="font-medium text-foreground hover:underline">
              Crea tu tienda gratis
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Visual (hidden on mobile) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-secondary dark:bg-[#1E1E22] p-12">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-24 h-24 rounded-[2rem] bg-design-gold flex items-center justify-center">
            <Gamepad2 className="h-12 w-12 text-slate-900" />
          </div>
          <h2 className="text-3xl font-bold">Tu tienda gaming profesional</h2>
          <p className="text-muted-foreground text-lg">
            Gestiona productos, pedidos y clientes desde un solo lugar. Dashboard diseñado para vendedores gaming.
          </p>
          <div className="grid grid-cols-3 gap-4 pt-6">
            <div className="card-surface p-4 text-center">
              <div className="text-2xl font-bold">2,500+</div>
              <div className="text-xs text-muted-foreground">Tiendas</div>
            </div>
            <div className="card-surface p-4 text-center">
              <div className="text-2xl font-bold">150K</div>
              <div className="text-xs text-muted-foreground">Productos</div>
            </div>
            <div className="card-surface p-4 text-center">
              <div className="text-2xl font-bold">4.9★</div>
              <div className="text-xs text-muted-foreground">Rating</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
