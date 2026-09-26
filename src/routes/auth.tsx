import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Accedi — StageVault" },
      { name: "description", content: "Accedi al gestionale StageVault per il noleggio attrezzatura eventi." },
      { property: "og:title", content: "Accedi — StageVault" },
      { property: "og:description", content: "Area riservata a titolare e dipendenti." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/magazzino", replace: true });
    });
  }, [nav]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        nav({ to: "/magazzino", replace: true });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/magazzino" },
        });
        if (error) throw error;
        if (data.session) nav({ to: "/magazzino", replace: true });
        else toast.success("Controlla la tua email per confermare l'account.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Errore di accesso");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="neon-glow w-full max-w-sm space-y-5 rounded-2xl border bg-card p-8">
        <div>
          <p className="font-display text-xs uppercase tracking-[0.3em] text-muted-foreground">StageVault</p>
          <h1 className="mt-2 text-2xl font-bold">{mode === "login" ? "Accedi" : "Crea account"}</h1>
          {mode === "signup" && (
            <p className="mt-1 text-xs text-muted-foreground">Il primo account registrato diventa amministratore.</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">Password</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Attendere…" : mode === "login" ? "Accedi" : "Registrati"}
        </Button>
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Non hai un account? Registrati" : "Hai già un account? Accedi"}
        </button>
      </form>
    </main>
  );
}
