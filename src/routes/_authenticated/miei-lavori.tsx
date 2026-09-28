import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, CalendarDays, Truck, Check, X, Package, FileText, StickyNote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ASSIGN_CLASS, ASSIGN_LABEL, eur, fmtDate } from "@/lib/assignments";

export const Route = createFileRoute("/_authenticated/miei-lavori")({
  head: () => ({
    meta: [
      { title: "I miei lavori — StageVault" },
      { name: "description", content: "Lavori assegnati: accetta o rifiuta." },
      { property: "og:title", content: "I miei lavori — StageVault" },
      { property: "og:description", content: "Lavori assegnati: accetta o rifiuta." },
    ],
  }),
  component: MieiLavori,
});

function MieiLavori() {
  const qc = useQueryClient();
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["my-assignments"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: emp } = await supabase.from("employees").select("id").eq("user_id", u.user!.id).maybeSingle();
      if (!emp) return null;
      const { data: assignments, error } = await supabase
        .from("order_assignments")
        .select("*, orders(cliente_nome, luogo_evento, data_inizio, data_fine, descrizione_evento, note), vans(nome, targa)")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const orderIds = [...new Set((assignments ?? []).map((a) => a.order_id))];
      const { data: items, error: itemsError } = orderIds.length
        ? await supabase
            .from("order_items")
            .select("order_id, equipment(nome, marca, modello, equipment_categories(nome))")
            .in("order_id", orderIds)
        : { data: [], error: null };
      if (itemsError) throw itemsError;
      return (assignments ?? []).map((assignment) => ({
        ...assignment,
        materiale: (items ?? []).filter((item) => item.order_id === assignment.order_id),
      }));
    },
  });

  async function respond(id: string, accetta: boolean) {
    const { error } = await supabase.rpc("respond_assignment", accetta || !motivo.trim() ? { _id: id, _accetta: accetta } : { _id: id, _accetta: accetta, _motivo: motivo.trim().slice(0, 300) });
    if (error) { toast.error(error.message); return; }
    toast.success(accetta ? "Lavoro accettato" : "Lavoro rifiutato");
    setRejecting(null); setMotivo("");
    qc.invalidateQueries({ queryKey: ["my-assignments"] });
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Caricamento…</div>;
  if (data === null) return <div className="p-8 text-muted-foreground">Il tuo account non è collegato a una scheda dipendente.</div>;

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="font-display text-2xl font-bold">I miei lavori</h1>
      <p className="mb-5 text-sm text-muted-foreground">Accetta o rifiuta i lavori che ti vengono assegnati.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {data?.length === 0 && <p className="text-muted-foreground">Nessun lavoro assegnato.</p>}
        {data?.map((a) => (
          <div key={a.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-display font-semibold">{a.orders?.cliente_nome}</p>
              <Badge variant="outline" className={ASSIGN_CLASS[a.stato]}>{ASSIGN_LABEL[a.stato]}</Badge>
            </div>
            <div className="mt-2 space-y-1 text-sm text-muted-foreground">
              <p><MapPin className="mr-1.5 inline h-3.5 w-3.5" />{a.orders?.luogo_evento || "Luogo da definire"}</p>
              {a.orders && <p><CalendarDays className="mr-1.5 inline h-3.5 w-3.5" />{fmtDate(a.orders.data_inizio)} → {fmtDate(a.orders.data_fine)}</p>}
              <p><Truck className="mr-1.5 inline h-3.5 w-3.5" />{a.vans ? `${a.vans.nome}${a.vans.targa ? ` (${a.vans.targa})` : ""}` : "Nessun furgone"}</p>
            </div>
            <div className="mt-4 space-y-3 border-t pt-3">
              <section>
                <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><FileText className="h-3.5 w-3.5" />Descrizione evento</p>
                <p className="whitespace-pre-line text-sm">{a.orders?.descrizione_evento || "Nessuna descrizione inserita."}</p>
              </section>
              {a.orders?.note && (
                <section>
                  <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><StickyNote className="h-3.5 w-3.5" />Note operative</p>
                  <p className="whitespace-pre-line text-sm">{a.orders.note}</p>
                </section>
              )}
              <section>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><Package className="h-3.5 w-3.5" />Materiale da utilizzare · {a.materiale.length}</p>
                {a.materiale.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun materiale associato.</p>
                ) : (
                  <ul className="divide-y rounded-md border bg-muted/20 px-3">
                    {a.materiale.map((item) => (
                      <li key={item.equipment?.nome} className="flex items-start justify-between gap-3 py-2 text-sm">
                        <span className="font-medium">{item.equipment?.nome ?? "Attrezzatura"}</span>
                        <span className="text-right text-xs text-muted-foreground">
                          {[item.equipment?.marca, item.equipment?.modello].filter(Boolean).join(" ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
            <p className="mt-3 font-display text-lg text-primary">{eur(Number(a.compenso))}</p>
            {a.stato === "in_attesa" && (rejecting === a.id ? (
              <div className="mt-3 space-y-2">
                <Textarea placeholder="Motivo (facoltativo)" value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={300} />
                <div className="flex gap-2">
                  <Button variant="destructive" onClick={() => respond(a.id, false)}>Conferma rifiuto</Button>
                  <Button variant="ghost" onClick={() => setRejecting(null)}>Annulla</Button>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Button onClick={() => respond(a.id, true)}><Check className="mr-1 h-4 w-4" />Accetta</Button>
                <Button variant="outline" onClick={() => setRejecting(a.id)}><X className="mr-1 h-4 w-4" />Rifiuta</Button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
