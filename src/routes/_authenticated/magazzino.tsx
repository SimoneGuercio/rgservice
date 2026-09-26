import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import * as THREE from "three";
import { Box, List, Search, ShoppingCart, X, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useRole } from "@/hooks/use-role";
import {
  STATUS_CLASS, STATUS_LABEL, ZONES, computeStatus, fmtDate, isoToday, overlaps, warehouseQuery,
  type Equipment, type LiveStatus, type Order,
} from "@/lib/warehouse";
import type { SceneItem } from "@/components/warehouse/WarehouseScene";

const WarehouseScene = lazy(() => import("@/components/warehouse/WarehouseScene"));

export const Route = createFileRoute("/_authenticated/magazzino")({
  head: () => ({
    meta: [
      { title: "Magazzino 3D — StageVault" },
      { name: "description", content: "Disponibilità dell'attrezzatura per data in un magazzino 3D interattivo." },
      { property: "og:title", content: "Magazzino 3D — StageVault" },
      { property: "og:description", content: "Vedi cosa è disponibile e cosa è noleggiato nelle date scelte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Magazzino,
});

type Row = SceneItem & { conflict?: Order };

function StatusBadge({ s }: { s: LiveStatus }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[s]}`}>{STATUS_LABEL[s]}</span>;
}

function Magazzino() {
  const { data, isLoading, error } = useQuery(warehouseQuery);
  const { isAdmin } = useRole();
  const qc = useQueryClient();
  const [from, setFrom] = useState(isoToday(1));
  const [to, setTo] = useState(isoToday(2));
  const [cat, setCat] = useState("all");
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"3d" | "list">("3d");
  const [selected, setSelected] = useState<Row | null>(null);
  const [focus, setFocus] = useState<THREE.Vector3 | null>(null);
  const [cart, setCart] = useState<Row[]>([]);
  const [orderOpen, setOrderOpen] = useState(false);

  const validRange = from <= to;

  const rows: Row[] = useMemo(() => {
    if (!data) return [];
    const catName = new Map(data.categories.map((c) => [c.id, c.nome]));
    return data.equipment.map((e) => {
      const r = computeStatus(e, data.bookings, from, validRange ? to : from);
      return { e, category: catName.get(e.category_id) ?? "", status: r.status, conflict: r.conflict };
    });
  }, [data, from, to, validRange]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (cat === "all" || r.e.category_id === cat) &&
        (!q || [r.e.nome, r.e.marca, r.e.modello, r.e.numero_seriale].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [rows, cat, search]);

  const summary = useMemo(() => {
    const m = new Map<string, { ok: number; rented: number; other: number }>();
    for (const r of filtered) {
      const s = m.get(r.category) ?? { ok: 0, rented: 0, other: 0 };
      if (r.status === "disponibile") s.ok++;
      else if (r.status === "noleggiato") s.rented++;
      else s.other++;
      m.set(r.category, s);
    }
    return [...m.entries()];
  }, [filtered]);

  const current = selected ? rows.find((r) => r.e.id === selected.e.id) ?? null : null;

  function addToCart(r: Row) {
    if (r.status !== "disponibile") {
      toast.error(
        r.conflict
          ? `Non disponibile: già nell'ordine "${r.conflict.cliente_nome}" (${fmtDate(r.conflict.data_inizio)} → ${fmtDate(r.conflict.data_fine)})`
          : `Non disponibile: ${STATUS_LABEL[r.status].toLowerCase()}`,
      );
      return;
    }
    if (cart.some((c) => c.e.id === r.e.id)) return toast.info("Già nell'ordine");
    setCart((c) => [...c, r]);
    toast.success(`${r.e.nome} aggiunto all'ordine`);
  }

  // keep cart consistent when dates change
  const cartConflicts = cart.filter((c) => rows.find((r) => r.e.id === c.e.id)?.status !== "disponibile");

  if (error) return <div className="p-8 text-destructive">Errore nel caricamento: {(error as Error).message}</div>;

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="z-10 flex flex-wrap items-end gap-3 border-b bg-background/80 px-5 py-3 backdrop-blur">
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Dal</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 w-40" />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Al</Label>
          <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 w-40" />
        </div>
        <div>
          <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Categoria</Label>
          <Select value={cat} onValueChange={setCat}>
            <SelectTrigger className="h-9 w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tutte le categorie</SelectItem>
              {data?.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cerca nome, marca, seriale…" value={search} onChange={(e) => setSearch(e.target.value)} className="h-9 pl-9" />
        </div>
        <div className="flex rounded-md border p-0.5">
          <Button size="sm" variant={view === "3d" ? "default" : "ghost"} onClick={() => setView("3d")}><Box className="mr-1 h-4 w-4" />3D</Button>
          <Button size="sm" variant={view === "list" ? "default" : "ghost"} onClick={() => setView("list")}><List className="mr-1 h-4 w-4" />Lista</Button>
        </div>
        {!validRange && <p className="w-full text-xs text-destructive">La data di fine deve essere successiva alla data di inizio.</p>}
      </div>

      <div className="relative flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">Caricamento magazzino…</div>
        ) : view === "3d" ? (
          <>
            <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground">Avvio scena 3D…</div>}>
              <WarehouseScene
                items={filtered}
                selectedId={current?.e.id}
                onSelect={(i) => setSelected(i as Row)}
                focus={focus}
                onUserMove={() => setFocus(null)}
              />
            </Suspense>

            {/* Zone buttons */}
            <div className="absolute left-4 top-4 flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setFocus(new THREE.Vector3(0, 1, -3.01))}>Panoramica</Button>
              {ZONES.map((z) => (
                <Button key={z.nome} size="sm" variant="secondary" onClick={() => setFocus(new THREE.Vector3(z.x, 1.5, -3))}>
                  {z.nome.replace("Zona ", "")}
                </Button>
              ))}
            </div>

            {/* Summary */}
            <div className="absolute bottom-4 left-4 w-72 rounded-xl border bg-card/85 p-4 backdrop-blur">
              <p className="font-display text-xs uppercase tracking-widest text-muted-foreground">
                {fmtDate(from)} → {fmtDate(to)}
              </p>
              <div className="mt-2 space-y-1 text-sm">
                {summary.map(([name, s]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-mono text-xs">
                      <span className="text-status-ok">{s.ok}</span>
                      <span className="text-muted-foreground"> / </span>
                      <span className="text-status-rented">{s.rented}</span>
                      {s.other > 0 && <span className="text-status-maint"> · {s.other}</span>}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t pt-2 text-[11px] text-muted-foreground">
                <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-status-ok" />Disponibile</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-status-rented" />Noleggiato</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-status-maint" />Manutenzione</span>
                <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-status-off" />Fuori servizio</span>
              </div>
            </div>
          </>
        ) : (
          <div className="h-full overflow-auto p-5">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead><TableHead>Categoria</TableHead><TableHead>Marca / Modello</TableHead>
                  <TableHead>Seriale</TableHead><TableHead>Zona</TableHead><TableHead className="text-right">€/giorno</TableHead>
                  <TableHead>Stato</TableHead><TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.e.id} className="cursor-pointer" onClick={() => setSelected(r)}>
                    <TableCell className="font-medium">{r.e.nome}</TableCell>
                    <TableCell>{r.category}</TableCell>
                    <TableCell className="text-muted-foreground">{r.e.marca} {r.e.modello}</TableCell>
                    <TableCell className="font-mono text-xs">{r.e.numero_seriale}</TableCell>
                    <TableCell>{r.e.zona_magazzino}</TableCell>
                    <TableCell className="text-right">{Number(r.e.prezzo_giornaliero).toFixed(0)}</TableCell>
                    <TableCell><StatusBadge s={r.status} /></TableCell>
                    <TableCell>
                      {isAdmin && (
                        <Button size="sm" variant="ghost" onClick={(ev) => { ev.stopPropagation(); addToCart(r); }}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Detail panel */}
        {current && data && (
          <DetailPanel
            row={current}
            bookings={data.bookings.filter((b) => b.equipment_id === current.e.id && b.order.data_fine >= isoToday())}
            from={from}
            to={to}
            isAdmin={isAdmin}
            onClose={() => setSelected(null)}
            onAdd={() => addToCart(current)}
          />
        )}

        {/* Cart */}
        {isAdmin && cart.length > 0 && (
          <div className="neon-glow absolute bottom-4 right-4 flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span className="text-sm">{cart.length} pezzi selezionati</span>
            {cartConflicts.length > 0 && <span className="text-xs text-destructive">{cartConflicts.length} in conflitto</span>}
            <Button size="sm" onClick={() => setOrderOpen(true)} disabled={!validRange}>Crea ordine</Button>
            <Button size="icon" variant="ghost" onClick={() => setCart([])}><Trash2 className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      <CreateOrderDialog
        open={orderOpen}
        onOpenChange={setOrderOpen}
        cart={cart}
        conflicts={cartConflicts.map((c) => c.e.id)}
        onRemove={(id) => setCart((c) => c.filter((x) => x.e.id !== id))}
        from={from}
        to={to}
        onDone={() => { setCart([]); setOrderOpen(false); qc.invalidateQueries({ queryKey: ["warehouse"] }); }}
      />
    </div>
  );
}

function DetailPanel({
  row, bookings, from, to, isAdmin, onClose, onAdd,
}: {
  row: Row; bookings: { order: Order }[]; from: string; to: string; isAdmin: boolean; onClose: () => void; onAdd: () => void;
}) {
  const e: Equipment = row.e;
  const upcoming = [...bookings].sort((a, b) => a.order.data_inizio.localeCompare(b.order.data_inizio));
  return (
    <aside className="absolute right-0 top-0 z-20 flex h-full w-80 flex-col border-l bg-card/95 backdrop-blur">
      <div className="flex items-start justify-between border-b p-5">
        <div>
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{row.category}</p>
          <h2 className="mt-1 text-lg font-semibold">{e.nome}</h2>
          <div className="mt-2"><StatusBadge s={row.status} /></div>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="flex-1 space-y-5 overflow-auto p-5 text-sm">
        <dl className="grid grid-cols-2 gap-y-3">
          <dt className="text-muted-foreground">Marca</dt><dd>{e.marca}</dd>
          <dt className="text-muted-foreground">Modello</dt><dd>{e.modello}</dd>
          <dt className="text-muted-foreground">Seriale</dt><dd className="font-mono text-xs">{e.numero_seriale}</dd>
          <dt className="text-muted-foreground">Zona</dt><dd>{e.zona_magazzino}</dd>
          <dt className="text-muted-foreground">Prezzo</dt><dd>€ {Number(e.prezzo_giornaliero).toFixed(2)} / giorno</dd>
        </dl>
        {row.conflict && (
          <div className="rounded-lg border border-status-rented/40 bg-status-rented/10 p-3 text-xs">
            Occupato dal {fmtDate(from)} al {fmtDate(to)} per l'ordine <b>{row.conflict.cliente_nome}</b> ({fmtDate(row.conflict.data_inizio)} → {fmtDate(row.conflict.data_fine)}).
          </div>
        )}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prossimi noleggi</h3>
          {upcoming.length === 0 ? (
            <p className="text-muted-foreground">Nessun noleggio in programma.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((b) => (
                <li key={b.order.id} className={`rounded-md border p-2 ${overlaps(b.order, from, to) ? "border-status-rented/50" : ""}`}>
                  <p className="font-medium">{b.order.cliente_nome}</p>
                  <p className="text-xs text-muted-foreground">{fmtDate(b.order.data_inizio)} → {fmtDate(b.order.data_fine)} · {b.order.luogo_evento}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {e.note && <p className="text-muted-foreground">{e.note}</p>}
      </div>
      {isAdmin ? (
        <div className="border-t p-4">
          <Button className="w-full" disabled={row.status !== "disponibile"} onClick={onAdd}>
            <Plus className="mr-1 h-4 w-4" /> Aggiungi all'ordine
          </Button>
        </div>
      ) : (
        <p className="border-t p-4 text-center text-xs text-muted-foreground">Consultazione in sola lettura</p>
      )}
    </aside>
  );
}

function CreateOrderDialog({
  open, onOpenChange, cart, conflicts, onRemove, from, to, onDone,
}: {
  open: boolean; onOpenChange: (o: boolean) => void; cart: Row[]; conflicts: string[];
  onRemove: (id: string) => void; from: string; to: string; onDone: () => void;
}) {
  const [f, setF] = useState({ cliente_nome: "", cliente_telefono: "", cliente_email: "", luogo_evento: "", note: "" });
  const [busy, setBusy] = useState(false);
  const days = Math.max(1, Math.round((+new Date(to) - +new Date(from)) / 86400000) + 1);
  const total = cart.reduce((s, r) => s + Number(r.e.prezzo_giornaliero), 0) * days;

  async function save() {
    if (!f.cliente_nome.trim()) return toast.error("Inserisci il nome del cliente");
    if (conflicts.length) return toast.error("Rimuovi l'attrezzatura in conflitto prima di salvare");
    setBusy(true);
    const { data: order, error } = await supabase
      .from("orders")
      .insert({ ...f, data_inizio: from, data_fine: to, stato: "confermato" })
      .select()
      .single();
    if (error || !order) { setBusy(false); return toast.error(error?.message ?? "Errore"); }
    const { error: e2 } = await supabase.from("order_items").insert(cart.map((r) => ({ order_id: order.id, equipment_id: r.e.id })));
    if (e2) {
      await supabase.from("orders").delete().eq("id", order.id);
      setBusy(false);
      return toast.error(e2.message);
    }
    setBusy(false);
    toast.success(`Ordine per ${f.cliente_nome} creato`);
    setF({ cliente_nome: "", cliente_telefono: "", cliente_email: "", luogo_evento: "", note: "" });
    onDone();
  }

  const field = (k: keyof typeof f, label: string, type = "text") => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type={type} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nuovo ordine · {fmtDate(from)} → {fmtDate(to)}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {field("cliente_nome", "Cliente *")}
          {field("luogo_evento", "Luogo evento")}
          {field("cliente_telefono", "Telefono")}
          {field("cliente_email", "Email", "email")}
        </div>
        <div className="max-h-48 space-y-1 overflow-auto rounded-md border p-2">
          {cart.map((r) => (
            <div key={r.e.id} className={`flex items-center justify-between rounded px-2 py-1 text-sm ${conflicts.includes(r.e.id) ? "bg-destructive/15 text-destructive" : ""}`}>
              <span>{r.e.nome}{conflicts.includes(r.e.id) && " — occupato in queste date"}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onRemove(r.e.id)}><X className="h-3 w-3" /></Button>
            </div>
          ))}
        </div>
        <p className="text-right text-sm text-muted-foreground">{days} giorni · Totale stimato <b className="text-foreground">€ {total.toFixed(2)}</b></p>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Annulla</Button>
          <Button onClick={save} disabled={busy || cart.length === 0}>{busy ? "Salvataggio…" : "Conferma ordine"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
