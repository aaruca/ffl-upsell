"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/hooks/use-store";
import { Sidebar } from "@/components/dashboard/sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2, Menu, Search, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { store, loading } = useStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <div
        className={cn(
          "hidden lg:block fixed left-0 top-0 h-full z-40 transition-all duration-300 ease-in-out border-r border-border bg-card",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <Sidebar
          store={store}
          collapsed={collapsed}
          onToggle={() => setCollapsed(!collapsed)}
        />
      </div>

      {/* Main Content Wrapper */}
      <div
        className={cn(
          "flex-1 flex flex-col min-h-screen transition-all duration-300 ease-in-out",
          collapsed ? "lg:ml-20" : "lg:ml-64"
        )}
      >
        {/* Header - Sticky & Blurred */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-4 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64 border-r border-border bg-card">
                <Sidebar
                  store={store}
                  collapsed={false}
                  onToggle={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>

            {/* Page Title / Breadcrumbs */}
            <h1 className="text-lg font-semibold capitalize tracking-tight">
              {getPageTitle(pathname)}
            </h1>
          </div>

          <div className="flex items-center gap-3 lg:gap-4">
            {/* Search - Desktop */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="h-9 w-64 rounded-lg bg-secondary/50 pl-9 pr-4 text-sm outline-none ring-offset-background transition-all focus:bg-background focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="h-6 w-px bg-border hidden md:block" />

            <ModeToggle />

            <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
              <Bell className="h-5 w-5" />
            </Button>

            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 p-[1px]">
              <div className="h-full w-full rounded-full bg-background flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          <div className="mx-auto max-w-7xl animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/dashboard': 'Dashboard',
    '/dashboard/products': 'Productos',
    '/dashboard/categories': 'Categorías',
    '/dashboard/orders': 'Pedidos',
    '/dashboard/customers': 'Clientes',
    '/dashboard/pos': 'Punto de Venta',
    '/dashboard/analytics': 'Analíticas',
    '/dashboard/settings': 'Configuración',
  };

  // Check exact matches first
  if (titles[pathname]) return titles[pathname];

  // Check startsWith
  for (const [path, title] of Object.entries(titles)) {
    if (pathname.startsWith(path)) {
      // Sub-pages like /products/new
      if (pathname.includes('/new')) return `Nuevo ${title.slice(0, -1)}`;
      if (pathname.includes('/import-export')) return 'Importar / Exportar';
      return title;
    }
  }

  return 'Dashboard';
}
