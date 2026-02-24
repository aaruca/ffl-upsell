"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Gamepad2,
  LayoutDashboard,
  Package,
  FolderOpen,
  ShoppingCart,
  Users,
  MonitorSmartphone,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Store,
  FileSpreadsheet,
} from "lucide-react";
import type { Store as StoreType } from "@/lib/types";

interface SidebarProps {
  store: StoreType | null;
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Productos", href: "/dashboard/products", icon: Package },
  { label: "Import/Export", href: "/dashboard/products/import-export", icon: FileSpreadsheet },
  { label: "Categorías", href: "/dashboard/categories", icon: FolderOpen },
  { label: "Pedidos", href: "/dashboard/orders", icon: ShoppingCart },
  { label: "Clientes", href: "/dashboard/customers", icon: Users },
  { label: "POS", href: "/dashboard/pos", icon: MonitorSmartphone },
  { label: "Analíticas", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Config", href: "/dashboard/settings", icon: Settings },
];

export function Sidebar({ store, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <aside className="flex h-full flex-col bg-card text-card-foreground">
      {/* Brand / Logo */}
      <div className={cn(
        "flex h-16 items-center border-b border-border/50",
        collapsed ? "justify-center" : "px-6"
      )}>
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform group-hover:scale-105">
            <Gamepad2 className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">
                GameStore
              </span>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Pro Admin
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Store Context Card */}
      {!collapsed && store && (
        <div className="px-4 py-4">
          <div className="rounded-xl border border-border bg-secondary/30 p-3 transition-colors hover:bg-secondary/50">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border shadow-sm">
                <Store className="h-4 w-4 text-primary" />
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{store.name}</p>
                <p className="truncate text-xs text-muted-foreground">Plan Gratuito</p>
              </div>
            </div>
            <Link
              href={`/store/${store.slug}`}
              target="_blank"
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-background border border-border py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all shadow-sm"
            >
              Ver tienda <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className={cn(
        "flex-1 flex flex-col overflow-y-auto py-2",
        collapsed ? "px-2 gap-2" : "px-3 gap-1"
      )}>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex items-center rounded-lg transition-all duration-200",
                collapsed
                  ? "justify-center w-full aspect-square"
                  : "gap-3 px-3 py-2",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon
                className={cn(
                  "shrink-0 transition-transform group-hover:scale-105",
                  collapsed ? "h-5 w-5" : "h-4 w-4",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="border-t border-border/50 p-3 space-y-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-lg h-9",
            collapsed ? "justify-center px-0" : "justify-start gap-3 px-3"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Colapsar menú</span>
            </>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            "w-full text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg h-9",
            collapsed ? "justify-center px-0" : "justify-start gap-3 px-3"
          )}
          title="Cerrar sesión"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="text-sm font-medium">Salir</span>}
        </Button>
      </div>
    </aside>
  );
}
