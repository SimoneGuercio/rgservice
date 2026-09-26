import { createFileRoute, Link } from "@tanstack/react-router";
import { Box, CalendarRange, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StageVault — Magazzino 3D per noleggio eventi" },
      { name: "description", content: "Vedi in 3D cosa è disponibile per ogni data, crea ordini e assegna i lavori alla tua squadra." },
      { property: "og:title", content: "StageVault — Magazzino 3D per noleggio eventi" },
      { property: "og:description", content: "Disponibilità attrezzatura audio, DJ e luci in un magazzino 3D." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const features = [
    { icon: Box, t: "Magazzino 3D", d: "Ogni cassa, console e moving head colorata per disponibilità nella data scelta." },
    { icon: CalendarRange, t: "Zero sovrapposizioni", d: "Il sistema blocca l'attrezzatura già impegnata e ti dice in quale ordine." },
    { icon: Users, t: "Squadra organizzata", d: "Preparazione, consegna, montaggio: ogni lavoro al tecnico giusto." },
  ];
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/20 blur-[140px]" />
      <div className="pointer-events-none absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-accent/20 blur-[140px]" />
      <div className="relative mx-auto max-w-5xl px-6 py-24">
        <p className="font-display text-sm uppercase tracking-[0.3em] text-muted-foreground">StageVault</p>
        <h1 className="mt-6 text-5xl font-bold leading-[1.05] md:text-7xl">
          Il tuo magazzino,<br /><span className="neon-text">acceso per ogni data.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Gestionale per il noleggio di audio, DJ e luci: disponibilità in 3D, ordini senza conflitti e lavori assegnati.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild size="lg" className="neon-glow"><Link to="/magazzino">Apri il magazzino</Link></Button>
          <Button asChild size="lg" variant="outline"><Link to="/auth">Accedi</Link></Button>
        </div>
        <div className="mt-20 grid gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.t} className="rounded-xl border bg-card/60 p-6 backdrop-blur">
              <f.icon className="h-6 w-6 text-primary" />
              <h3 className="mt-4 font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
