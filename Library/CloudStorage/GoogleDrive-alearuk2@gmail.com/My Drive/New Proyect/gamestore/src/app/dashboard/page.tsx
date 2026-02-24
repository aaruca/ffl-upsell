"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/hooks/use-store";
import { Button } from "@/components/ui/button";
import {
  ArrowUpRight,
  ChevronDown,
  TrendingUp,
  Package,
  ShoppingCart,
  Users,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardData {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  icon: any;
  color: "blue" | "green" | "orange" | "purple";
}

function StatCard({ data }: { data: StatCardData }) {
  const colorMap = {
    blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    green: "bg-green-500/10 text-green-600 dark:text-green-400",
    orange: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
    purple: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 transition-all hover:shadow-lg hover:border-primary/20">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("rounded-xl p-3", colorMap[data.color])}>
          <data.icon className="h-6 w-6" />
        </div>
        {data.trend && (
          <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-xs font-medium text-green-600 dark:text-green-400">
            <ArrowUpRight className="h-3 w-3" />
            {data.trend}
          </div>
        )}
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">{data.label}</h3>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-foreground">
            {data.value}
          </span>
          {data.unit && (
            <span className="text-sm font-medium text-muted-foreground">
              {data.unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function OrdersChart() {
  // Mock data - would be replaced by real data
  const data = [40, 25, 60, 45, 80, 55, 70];
  const max = Math.max(...data);

  return (
    <div className="rounded-2xl border border-border bg-card p-6 h-[400px] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-semibold">Resumen de Ventas</h3>
          <p className="text-sm text-muted-foreground">Rendimiento semanal</p>
        </div>
        <Button variant="outline" size="sm" className="rounded-lg h-9">
          Esta semana <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex items-end justify-between gap-4 px-2">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
            <div className="relative w-full flex justify-center items-end h-[240px]">
              <div
                className="w-full max-w-[40px] rounded-t-lg bg-primary/10 transition-all duration-500 group-hover:bg-primary/20 relative overflow-hidden"
                style={{ height: `${(value / max) * 100}%` }}
              >
                <div
                  className="absolute bottom-0 left-0 w-full bg-primary/80 transition-all duration-700"
                  style={{ height: '0%', animation: `grow-up 1s ease-out forwards ${i * 0.1}s` }}
                />
                <style jsx>{`
                    @keyframes grow-up {
                      to { height: 100%; }
                    }
                  `}</style>
              </div>
            </div>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { store } = useStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    sales: 0,
    orders: 0,
    customers: 0,
    lowStock: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      if (!store) return;
      const supabase = createClient();

      // Get orders count
      const { count: ordersCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id);

      // Get customers count (distinct)
      const { count: customersCount } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id);

      // Get low stock products
      const { count: lowStockCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("store_id", store.id)
        .lt("stock_quantity", 5);

      setStats({
        sales: 12500, // Mock for now until we have real sales agg
        orders: ordersCount || 0,
        customers: customersCount || 0,
        lowStock: lowStockCount || 0,
      });
      setLoading(false);
    }

    fetchStats();
  }, [store]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          data={{
            label: "Ventas Totales",
            value: `$${stats.sales.toLocaleString()}`,
            trend: "+12.5%",
            icon: TrendingUp,
            color: "blue",
          }}
        />
        <StatCard
          data={{
            label: "Pedidos Activos",
            value: stats.orders.toString(),
            trend: "+4.3%",
            icon: ShoppingCart,
            color: "purple",
          }}
        />
        <StatCard
          data={{
            label: "Clientes Nuevos",
            value: stats.customers.toString(),
            trend: "+2.1%",
            icon: Users,
            color: "green",
          }}
        />
        <StatCard
          data={{
            label: "Stock Bajo",
            value: stats.lowStock.toString(),
            unit: "items",
            icon: AlertTriangle,
            color: "orange",
            trend: stats.lowStock > 0 ? "Atención" : undefined,
          }}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-7">
        <div className="lg:col-span-4">
          <OrdersChart />
        </div>
        <div className="lg:col-span-3">
          <div className="rounded-2xl border border-border bg-card p-6 h-[400px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Actividad Reciente</h3>
              <Button variant="ghost" size="sm" className="text-xs">Ver todo</Button>
            </div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4 py-2 border-b border-border/50 last:border-0">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                    <Package className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">Nuevo pedido #102{i}</p>
                    <p className="text-xs text-muted-foreground">Hace {i * 15} minutos</p>
                  </div>
                  <span className="text-sm font-semibold">+$129.00</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
