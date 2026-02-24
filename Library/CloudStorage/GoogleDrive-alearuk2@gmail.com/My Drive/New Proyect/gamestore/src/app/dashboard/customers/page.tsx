"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useStore } from "@/lib/hooks/use-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  MessageCircle,
  Users,
  Loader2,
} from "lucide-react";
import type { Customer } from "@/lib/types";
import { toast } from "sonner";

export default function CustomersPage() {
  const { store, loading: storeLoading } = useStore();
  const supabase = createClient();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!store) return;
    fetchCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store]);

  async function fetchCustomers() {
    if (!store) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Error cargando clientes");
    } else {
      setCustomers(data || []);
    }
    setLoading(false);
  }

  function getWhatsAppLink(phone: string | null, customerName: string) {
    if (!phone) return null;
    const cleanPhone = phone.replace(/\D/g, "");
    const message = encodeURIComponent(
      `Hola ${customerName}! Te escribimos de ${store?.name || "nuestra tienda"}. `
    );
    return `https://wa.me/${cleanPhone}?text=${message}`;
  }

  const filtered = customers.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.phone?.includes(search) ||
      c.whatsapp?.includes(search)
    );
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
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {customers.length} cliente{customers.length !== 1 ? "s" : ""} registrados
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre, email o telefono..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Customers Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/50">
          <Users className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {customers.length === 0
              ? "Aun no tienes clientes"
              : "No se encontraron clientes con esa busqueda"}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefono</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Total gastado</TableHead>
                <TableHead>Registro</TableHead>
                <TableHead className="w-16 text-right">WhatsApp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((customer) => {
                const whatsappPhone = customer.whatsapp || customer.phone;
                const waLink = getWhatsAppLink(whatsappPhone, customer.name);

                return (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {customer.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.email || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {customer.phone || "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {customer.total_orders}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      ${Number(customer.total_spent).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(customer.created_at).toLocaleDateString("es", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        {waLink ? (
                          <a
                            href={waLink}
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
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            disabled
                          >
                            <MessageCircle className="h-4 w-4 text-muted-foreground/30" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
