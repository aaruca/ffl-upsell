"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/hooks/use-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Users, TrendingUp, Loader2 } from "lucide-react";

interface AnalyticsData {
    totalSales: number;
    totalOrders: number;
    totalCustomers: number;
    conversionRate: number;
    monthlySales: number[];
}

export default function AnalyticsPage() {
    const { store, loading: storeLoading } = useStore();
    const supabase = createClient();
    const [data, setData] = useState<AnalyticsData>({
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        conversionRate: 0,
        monthlySales: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!store) return;
        fetchAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [store]);

    async function fetchAnalytics() {
        if (!store) return;
        setLoading(true);

        const currentYear = new Date().getFullYear();

        // Fetch orders for analytics
        const { data: orders } = await supabase
            .from("orders")
            .select("total, created_at, customer_email, payment_status")
            .eq("store_id", store.id);

        if (orders) {
            const paidOrders = orders.filter(o => o.payment_status === "paid");
            const totalSales = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);
            const uniqueCustomers = new Set(orders.map(o => o.customer_email).filter(Boolean)).size;

            // Calculate monthly sales
            const monthlySales = Array(12).fill(0);
            paidOrders.forEach(order => {
                const date = new Date(order.created_at);
                if (date.getFullYear() === currentYear) {
                    const month = date.getMonth();
                    monthlySales[month] += Number(order.total);
                }
            });

            setData({
                totalSales,
                totalOrders: paidOrders.length,
                totalCustomers: uniqueCustomers,
                conversionRate: orders.length > 0 ? (paidOrders.length / orders.length) * 100 : 0,
                monthlySales,
            });
        }
        setLoading(false);
    }

    if (storeLoading || loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-design-gold" />
            </div>
        );
    }

    const maxSale = Math.max(...data.monthlySales, 1);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Analíticas</h1>
                <p className="text-sm text-muted-foreground">
                    Resumen del rendimiento de tu tienda
                </p>
            </div>

            {/* KPI Cards - Logiflow Style */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/30 dark:border-white/5 bg-design-gold text-slate-900 rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-800">Ventas Totales</CardTitle>
                        <DollarSign className="h-4 w-4 text-slate-700" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">${data.totalSales.toFixed(2)}</div>
                        <p className="text-xs text-slate-700">este año</p>
                    </CardContent>
                </Card>
                <Card className="border-border/30 dark:border-white/5 bg-card dark:bg-[#1E1E22] rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalOrders}</div>
                        <p className="text-xs text-muted-foreground">completados</p>
                    </CardContent>
                </Card>
                <Card className="border-border/30 dark:border-white/5 bg-card dark:bg-[#1E1E22] rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Clientes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalCustomers}</div>
                        <p className="text-xs text-muted-foreground">únicos</p>
                    </CardContent>
                </Card>
                <Card className="border-border/30 dark:border-white/5 bg-card dark:bg-[#1E1E22] rounded-2xl">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversión</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground">tasa de pago</p>
                    </CardContent>
                </Card>
            </div>

            {/* Chart - Logiflow Style */}
            <div className="rounded-2xl border border-border/30 dark:border-white/5 bg-card dark:bg-[#1E1E22] p-6">
                <h3 className="mb-6 text-lg font-semibold">Ventas mensuales</h3>
                <div className="flex h-[250px] items-end justify-between gap-2 px-2">
                    {data.monthlySales.map((value, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                            <div className="w-full flex items-end justify-center h-[200px]">
                                <div
                                    className="w-full max-w-8 rounded-t-lg bg-design-gold/80 hover:bg-design-gold transition-colors"
                                    style={{ height: `${(value / maxSale) * 100}%`, minHeight: value > 0 ? '8px' : '0' }}
                                />
                            </div>
                            <span className="text-xs text-muted-foreground">
                                {["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"][i]}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
