import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, CalendarDays, Truck, Users, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSIGN_CLASS, ASSIGN_LABEL, ORDER_STATO_LABEL, RUOLO_LABEL, eur, fmtDate } from "@/lib/assignments";

export const Route = createFileRoute("/_authenticated/ordini")({
  head: () => ({
    meta: [
      { title: "Ordini e assegnazioni — StageVault" },
      { name: "description", content: "Tutti gli ordini, con squadra, furgone e compensi assegnati." },
      { property: "og:title", content: "Ordini e assegnazioni — StageVault" },
      { property: "og:description", content: "Tutti gli ordini, con squadra, furgone e compensi assegnati." },
    ],
  }),
  component: OrdiniPage,
});

function useOrdiniData() {
  return useQuery({
    queryKey: ["ordini-full"],
    queryFn: async () => {
      const [o, a, e, v] = await Promise.all([
        supabase.from("orders").select("*").order("data_inizio"),
        supabase.from("order_assignments").select("*"),
        supabase.from("employees").select("*").order("nome"),
        supabase.from("vans").select("*").eq("attivo", true).order("nome"),
      ]);
      const err = o.error || a.error || e.error || v.error;
      if (err) throw err;
      return { orders: o.data!, assignments: a.data!, employees: e.data!, vans: v.data! };
    },
  });
}

function OrdiniPage() {
  const { isAdmin } = useRole();
  const { data, isLoading, error } = useOrdiniData();
  const [openId, setOpenId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"futuri" | "tutti">("futuri");

  if (isLoading) return <div className="p-8 text-muted-foreground">Caricamento ordini…</div>;
  if (error || !data) return <div className="p-8 text-destructive">Errore nel caricamento degli ordini.</div>;

  const today = new Date().toISOString().slice(0, 10);
  const orders = data.orders.filter((o) => filter === "tutti" || o.data_fine >= today);
  const open = data.orders.find((o) => o.id === openId) ?? null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Ordini</h1>
          <p className="text-sm text-muted-foreground">Apri un ordine per assegnare squadra, furgone e compenso.</p>
        </div>
        <div className="flex rounded-md border p-0.5">
          <Button size="sm" variant={filter === "futuri" ? "default" : "ghost"} onClick={() => setFilter("futuri")}>Prossimi</Button>
          <Button size="sm" variant={filter === "tutti" ? "default" : "ghost"} onClick={() => setFilter("tutti")}>Tutti</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {orders.map((o) => {
          const asg = data.assignments.filter((a) => a.order_id === o.id);
          const ok = asg.filter((a) => a.stato === "accettato").length;
          const full = ok >= o.persone_richieste;
          return (
            <button key={o.id} onClick={() => setOpenId(o.id)}
              className="rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/60">
              <div className="flex items-start justify-between gap-2">
                <p className="font-display font-semibold">{o.cliente_nome}</p>
                <Badge variant="outline">{ORDER_STATO_LABEL[o.stato]}</Badge>
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{o.luogo_evento || "Luogo da definire"}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{fmtDate(o.data_inizio)} → {fmtDate(o.data_fine)}</p>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={full ? "text-status-ok" : "text-status-maint"}>
                  <Users className="mr-1 inline h-3.5 w-3.5" />{ok}/{o.persone_richieste} confermati
                </span>
                {asg.some((a) => a.stato === "in_attesa") && <span className="text-muted-foreground">{asg.filter((a) => a.stato === "in_attesa").length} in attesa</span>}
              </div>
            </button>
          );
        })}
        {orders.length === 0 && <p className="text-muted-foreground">Nessun ordine.</p>}
      </div>

      <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {open && <OrderDetail key={open.id} order={open} data={data} isAdmin={isAdmin} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

type Data = NonNullable<ReturnType<typeof useOrdiniData>["data"]>;

function OrderDetail({ order, data, isAdmin }: { order: Data["orders"][number]; data: Data; isAdmin: boolean }) {
  const qc = useQueryClient();
  const [descr, setDescr] = useState(order.descrizione_evento ?? "");
  const [persone, setPersone] = useState(String(order.persone_richieste));
  const [emp, setEmp] = useState("");
  const [van, setVan] = useState("");
  const [compenso, setCompenso] = useState("");
  const [busy, setBusy] = useState(false);

  const asg = data.assignments.filter((a) => a.order_id === order.id);
  const assignedIds = new Set(asg.map((a) => a.employee_id));
  const empById = new Map(data.employees.map((e) => [e.id, e]));
  const vanById = new Map(data.vans.map((v) => [v.id, v]));

  // Vans busy on other overlapping orders (not refused)
  const busyVans = useMemo(() => {
    const overlapping = new Set(
      data.orders.filter((o) => o.id !== order.id && o.stato !== "annullato" && o.data_inizio <= order.data_fine && o.data_fine >= order.data_inizio).map((o) => o.id),
    );
    return new Set(data.assignments.filter((a) => overlapping.has(a.order_id) && a.stato !== "rifiutato" && a.van_id).map((a) => a.van_id!));
  }, [data, order]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["ordini-full"] });

  async function saveInfo() {
    const n = Math.max(1, Math.min(10, parseInt(persone) || 1));
    const { error } = await supabase.from("orders").update({ descrizione_evento: descr.trim() || null, persone_richieste: n }).eq("id", order.id);
    if (error) return toast.error("Salvataggio non riuscito");
    toast.success("Ordine aggiornato");
    refresh();
  }

  async function assign() {
    if (!emp) return toast.error("Scegli un dipendente");
    const e = empById.get(emp);
    if (!e?.user_id) toast.warning("Questo dipendente non ha un accesso: non riceverà la notifica.");
    setBusy(true);
    const { error } = await supabase.from("order_assignments").insert({
      order_id: order.id, employee_id: emp, van_id: van || null, compenso: Number(compenso) || 0,
    });
    setBusy(false);
    if (error) return toast.error(error.message.includes("duplicate") ? "Dipendente già assegnato" : "Assegnazione non riuscita");
    toast.success("Assegnazione inviata");
    setEmp(""); setVan(""); setCompenso("");
    refresh();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("order_assignments").delete().eq("id", id);
    if (error) return toast.error("Eliminazione non riuscita");
    refresh();
  }

  return (
    <>
      <SheetHeader><SheetTitle className="font-display">{order.cliente_nome}</SheetTitle></SheetHeader>
      <div className="mt-4 space-y-5 text-sm">
        <div className="space-y-1 text-muted-foreground">
          <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{order.luogo_evento || "Luogo da definire"}</p>
          <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />{fmtDate(order.data_inizio)} → {fmtDate(order.data_fine)}</p>
          {order.cliente_telefono && <p>Tel. {order.cliente_telefono}</p>}
        </div>

        <div className="space-y-2">
          <Label>Descrizione evento</Label>
          <Textarea value={descr} onChange={(e) => setDescr(e.target.value)} disabled={!isAdmin} maxLength={1000}
            placeholder="Es. Matrimonio, service audio + luci, montaggio dalle 14:00" />
          <div className="flex items-end gap-2">
            <div className="space-y-1">
              <Label>Persone necessarie</Label>
              <Input type="number" min={1} max={10} value={persone} onChange={(e) => setPersone(e.target.value)} className="w-24" disabled={!isAdmin} />
            </div>
            {isAdmin && <Button variant="secondary" onClick={saveInfo}>Salva</Button>}
          </div>
        </div>

        <div className="space-y-2">
          <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">Squadra</p>
          {asg.length === 0 && <p className="text-muted-foreground">Nessuno assegnato.</p>}
          {asg.map((a) => {
            const e = empById.get(a.employee_id);
            return (
              <div key={a.id} className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{e ? `${e.nome} ${e.cognome}` : "—"}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={ASSIGN_CLASS[a.stato]}>{ASSIGN_LABEL[a.stato]}</Badge>
                    {isAdmin && <button onClick={() => remove(a.id)} aria-label="Rimuovi" className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <Truck className="mr-1 inline h-3.5 w-3.5" />{a.van_id ? vanById.get(a.van_id)?.nome ?? "—" : "Nessun furgone"} · {eur(Number(a.compenso))}
                </p>
                {a.motivo_rifiuto && <p className="mt-1 text-xs text-destructive">Motivo: {a.motivo_rifiuto}</p>}
              </div>
            );
          })}
        </div>

        {isAdmin && (
          <div className="space-y-3 rounded-lg border border-primary/30 p-3">
            <p className="font-display text-xs uppercase tracking-widest text-primary">Assegna dipendente</p>
            <Select value={emp} onValueChange={setEmp}>
              <SelectTrigger><SelectValue placeholder="Dipendente" /></SelectTrigger>
              <SelectContent>
                {data.employees.filter((e) => e.attivo && !assignedIds.has(e.id)).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome} {e.cognome} · {RUOLO_LABEL[e.ruolo]}{!e.user_id ? " (senza accesso)" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={van} onValueChange={setVan}>
              <SelectTrigger><SelectValue placeholder="Furgone" /></SelectTrigger>
              <SelectContent>
                {data.vans.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.nome}{busyVans.has(v.id) ? " — occupato in quelle date" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <Label>Compenso (€)</Label>
              <Input type="number" min={0} step="10" value={compenso} onChange={(e) => setCompenso(e.target.value)} placeholder="Es. 150" />
            </div>
            <Button onClick={assign} disabled={busy} className="w-full"><Plus className="mr-1 h-4 w-4" />Invia assegnazione</Button>
          </div>
        )}
      </div>
    </>
  );
}
