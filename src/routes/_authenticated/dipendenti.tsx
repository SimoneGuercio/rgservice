import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserPlus, KeyRound, Phone, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";
import { createEmployeeAccount } from "@/lib/employees.functions";
import { RUOLO_LABEL } from "@/lib/assignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

export const Route = createFileRoute("/_authenticated/dipendenti")({
  head: () => ({
    meta: [
      { title: "Dipendenti — StageVault" },
      { name: "description", content: "Crea i profili dei dipendenti e i loro accessi." },
      { property: "og:title", content: "Dipendenti — StageVault" },
      { property: "og:description", content: "Crea i profili dei dipendenti e i loro accessi." },
    ],
  }),
  component: DipendentiPage,
});

function DipendentiPage() {
  const { isAdmin, loading } = useRole();
  const [editing, setEditing] = useState<Tables<"employees"> | "new" | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase.from("employees").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  if (loading || isLoading) return <div className="p-8 text-muted-foreground">Caricamento…</div>;
  if (!isAdmin) return <div className="p-8 text-muted-foreground">Questa sezione è riservata all'amministratore.</div>;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Dipendenti</h1>
          <p className="text-sm text-muted-foreground">Crea il profilo e l'accesso: comunica tu email e password al dipendente.</p>
        </div>
        <Button onClick={() => setEditing("new")}><UserPlus className="mr-1 h-4 w-4" />Nuovo dipendente</Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {data?.map((e) => (
          <div key={e.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-display font-semibold">{e.nome} {e.cognome}</p>
                <p className="text-xs text-primary">{RUOLO_LABEL[e.ruolo]}</p>
              </div>
              {e.user_id ? <Badge variant="outline" className="border-status-ok/50 text-status-ok">Accesso attivo</Badge>
                : <Badge variant="outline" className="text-muted-foreground">Senza accesso</Badge>}
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              {e.telefono && <p><Phone className="mr-1.5 inline h-3.5 w-3.5" />{e.telefono}</p>}
              {e.email && <p><Mail className="mr-1.5 inline h-3.5 w-3.5" />{e.email}</p>}
            </div>
            {!e.user_id && (
              <Button size="sm" variant="secondary" className="mt-3" onClick={() => setEditing(e)}>
                <KeyRound className="mr-1 h-4 w-4" />Crea accesso
              </Button>
            )}
          </div>
        ))}
      </div>
      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          {editing && <EmployeeForm key={editing === "new" ? "new" : editing.id} existing={editing === "new" ? null : editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmployeeForm({ existing, onDone }: { existing: Tables<"employees"> | null; onDone: () => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createEmployeeAccount);
  const [f, setF] = useState({
    nome: existing?.nome ?? "", cognome: existing?.cognome ?? "", ruolo: existing?.ruolo ?? "tecnico_audio",
    telefono: existing?.telefono ?? "", email: existing?.email ?? "", password: "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (f.password.length < 8) return toast.error("La password deve avere almeno 8 caratteri");
    setBusy(true);
    try {
      await create({ data: { ...f, employeeId: existing?.id } });
      toast.success("Dipendente creato. Comunicagli email e password.");
      qc.invalidateQueries({ queryKey: ["employees"] });
      qc.invalidateQueries({ queryKey: ["ordini-full"] });
      onDone();
    } catch (e) {
      toast.error((e as Error).message || "Creazione non riuscita");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <DialogHeader><DialogTitle>{existing ? "Crea accesso" : "Nuovo dipendente"}</DialogTitle></DialogHeader>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Nome</Label><Input required value={f.nome} onChange={set("nome")} maxLength={80} /></div>
        <div className="space-y-1"><Label>Cognome</Label><Input required value={f.cognome} onChange={set("cognome")} maxLength={80} /></div>
      </div>
      <div className="space-y-1">
        <Label>Ruolo</Label>
        <Select value={f.ruolo} onValueChange={(v) => setF({ ...f, ruolo: v as typeof f.ruolo })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{Object.entries(RUOLO_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label>Telefono</Label><Input value={f.telefono} onChange={set("telefono")} maxLength={30} /></div>
      <div className="space-y-1"><Label>Email di accesso</Label><Input required type="email" value={f.email} onChange={set("email")} /></div>
      <div className="space-y-1"><Label>Password (min. 8 caratteri)</Label><Input required type="text" value={f.password} onChange={set("password")} minLength={8} /></div>
      <Button type="submit" disabled={busy} className="w-full">{busy ? "Creazione…" : "Crea dipendente"}</Button>
    </form>
  );
}
