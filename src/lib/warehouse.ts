import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type Category = Database["public"]["Tables"]["equipment_categories"]["Row"];
export type Equipment = Database["public"]["Tables"]["equipment"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];

export type LiveStatus = "disponibile" | "noleggiato" | "in_manutenzione" | "fuori_servizio";

export const STATUS_LABEL: Record<LiveStatus, string> = {
  disponibile: "Disponibile",
  noleggiato: "Noleggiato",
  in_manutenzione: "In manutenzione",
  fuori_servizio: "Fuori servizio",
};

// Colors for WebGL materials (mirror the --status-* CSS tokens)
export const STATUS_HEX: Record<LiveStatus, string> = {
  disponibile: "#22e584",
  noleggiato: "#ff4d5e",
  in_manutenzione: "#ffd23f",
  fuori_servizio: "#6b7080",
};

export const STATUS_CLASS: Record<LiveStatus, string> = {
  disponibile: "bg-status-ok/15 text-status-ok border-status-ok/40",
  noleggiato: "bg-status-rented/15 text-status-rented border-status-rented/40",
  in_manutenzione: "bg-status-maint/15 text-status-maint border-status-maint/40",
  fuori_servizio: "bg-status-off/15 text-status-off border-status-off/40",
};

export const ZONES = [
  { nome: "Zona Audio", x: -16 },
  { nome: "Zona DJ", x: -8 },
  { nome: "Zona Luci", x: 0 },
  { nome: "Zona Effetti", x: 8 },
  { nome: "Zona Accessori", x: 16 },
] as const;

export type Booking = { order: Order; equipment_id: string };

export const warehouseQuery = queryOptions({
  queryKey: ["warehouse"],
  queryFn: async () => {
    const [cats, eq, items] = await Promise.all([
      supabase.from("equipment_categories").select("*").order("nome"),
      supabase.from("equipment").select("*").order("nome"),
      supabase
        .from("order_items")
        .select("equipment_id, orders!inner(*)")
        .in("orders.stato", ["confermato", "in_corso"]),
    ]);
    if (cats.error) throw cats.error;
    if (eq.error) throw eq.error;
    if (items.error) throw items.error;
    const bookings: Booking[] = (items.data ?? []).map((r) => ({
      equipment_id: r.equipment_id,
      order: r.orders as unknown as Order,
    }));
    return { categories: cats.data, equipment: eq.data, bookings };
  },
});

export function overlaps(order: Order, from: string, to: string) {
  return order.data_inizio <= to && order.data_fine >= from;
}

export function computeStatus(
  e: Equipment,
  bookings: Booking[],
  from: string,
  to: string,
): { status: LiveStatus; conflict?: Order } {
  if (e.stato === "in_manutenzione") return { status: "in_manutenzione" };
  if (e.stato === "fuori_servizio") return { status: "fuori_servizio" };
  const b = bookings.find((b) => b.equipment_id === e.id && overlaps(b.order, from, to));
  if (b) return { status: "noleggiato", conflict: b.order };
  return { status: "disponibile" };
}

export function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}

export function isoToday(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
