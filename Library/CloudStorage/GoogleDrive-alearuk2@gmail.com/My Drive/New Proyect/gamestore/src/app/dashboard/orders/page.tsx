"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MessageCircle,
  Package,
  Eye,
  Loader2,
} from "lucide-react";
import { STATUS_COLORS } from "@/lib/types";
import type { Order, OrderItem, OrderStatus } from "@/lib/types";
import { toast } from "sonner";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const ALL_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "shipped",
  "delivered",
  "cancelled",
];

export default function OrdersPage() {
  const { store, loading: storeLoading } = useStore();
  const supabase = createClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!store) return;
    fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function fetchOrders() {
    if (!store) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select("*, customer:customers(*)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error cargando pedidos");
    } else {
      // Cast to Order[] since Supabase returns compatible structure
      setOrders((data as unknown as Order[]) || []);
    }
    setLoading(false);
  }

  async function openDetail(order: Order) {
    setSelectedOrder(order);
    setDetailOpen(true);

    const { data } = await supabase
      .from("order_items")
      .select("*, product:products(*)")
      .eq("order_id", order.id);

    setOrderItems((data as unknown as OrderItem[]) || []);
  }

  async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    setUpdatingStatus(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast.error("Error actualizando estado");
    } else {
      toast.success(`Estado actualizado a ${STATUS_LABELS[newStatus]}`);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) =>
          prev ? { ...prev, status: newStatus } : prev
        );
      }
    }
    setUpdatingStatus(false);
  }

  function getWhatsAppLink(phone: string | null, orderNumber: number) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hola! Te escribo por tu pedido #${orderNumber} en ${store?.name || "nuestra tienda"}. `
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  const filtered = orders.filter((o) => {
    const matchesSearch =
      String(o.order_number).includes(search) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (storeLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">
          Gestiona los pedidos de tu tienda
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por # de pedido, nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {ALL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Orders Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/50">
          <Package className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {orders.length === 0
              ? "Aun no tienes pedidos"
              : "No se encontraron pedidos con esos filtros"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">#</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fuente</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="w-24 text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono font-medium">
                    #{order.order_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">
                        {order.customer_name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.customer_email || order.customer_phone || "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={STATUS_COLORS[order.status]}
                    >
                      {STATUS_LABELS[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs capitalize text-muted-foreground">
                      {order.source}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    ${Number(order.total).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("es", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openDetail(order)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {order.customer_phone && (
                        <a
                          href={
                            getWhatsAppLink(
                              order.customer_phone,
                              order.order_number
                            ) || "#"
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-green-400 hover:text-green-300"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Order Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Pedido #{selectedOrder?.order_number}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              {/* Status + Change */}
              <div className="flex items-center justify-between">
                <Badge
                  variant="secondary"
                  className={STATUS_COLORS[selectedOrder.status]}
                >
                  {STATUS_LABELS[selectedOrder.status]}
                </Badge>
                <Select
                  value={selectedOrder.status}
                  onValueChange={(val) =>
                    updateOrderStatus(selectedOrder.id, val as OrderStatus)
                  }
                  disabled={updatingStatus}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer info */}
              <div className="rounded-lg border border-border/50 p-3 space-y-1">
                <p className="text-sm font-medium">
                  {selectedOrder.customer_name || "Cliente sin nombre"}
                </p>
                {selectedOrder.customer_email && (
                  <p className="text-xs text-muted-foreground">
                    {selectedOrder.customer_email}
                  </p>
                )}
                {selectedOrder.customer_phone && (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">
                      {selectedOrder.customer_phone}
                    </p>
                    <a
                      href={
                        getWhatsAppLink(
                          selectedOrder.customer_phone,
                          selectedOrder.order_number
                        ) || "#"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-green-400 hover:text-green-300"
                      >
                        <MessageCircle className="h-3 w-3" />
                      </Button>
                    </a>
                  </div>
                )}
                {selectedOrder.customer_address && (
                  <p className="text-xs text-muted-foreground">
                    {selectedOrder.customer_address}
                  </p>
                )}
              </div>

              {/* Order items */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Productos</p>
                {orderItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Cargando...</p>
                ) : (
                  orderItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border/50 p-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.product_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity}x ${Number(item.unit_price).toFixed(2)}
                        </p>
                      </div>
                      <span className="font-mono text-sm font-bold">
                        ${Number(item.total_price).toFixed(2)}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${Number(selectedOrder.subtotal).toFixed(2)}</span>
                </div>
                {Number(selectedOrder.discount) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Descuento</span>
                    <span className="text-green-400">
                      -${Number(selectedOrder.discount).toFixed(2)}
                    </span>
                  </div>
                )}
                {Number(selectedOrder.shipping_cost) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Envio</span>
                    <span>
                      ${Number(selectedOrder.shipping_cost).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-primary">
                    ${Number(selectedOrder.total).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>
                  Fuente: <span className="capitalize">{selectedOrder.source}</span>
                </span>
                <span>|</span>
                <span>
                  Pago: {selectedOrder.payment_method || "N/A"} ({selectedOrder.payment_status})
                </span>
                {selectedOrder.tracking_number && (
                  <>
                    <span>|</span>
                    <span>Tracking: {selectedOrder.tracking_number}</span>
                  </>
                )}
              </div>

              {selectedOrder.notes && (
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Notas:</span>{" "}
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
