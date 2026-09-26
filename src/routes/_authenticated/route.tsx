import { createFileRoute, Link, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Box, LayoutDashboard, Package, ClipboardList, CalendarDays, KanbanSquare, Users, LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: Shell,
});

const soon = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Package, label: "Inventario" },
  { icon: ClipboardList, label: "Ordini" },
  { icon: CalendarDays, label: "Calendario" },
  { icon: KanbanSquare, label: "Lavori" },
  { icon: Users, label: "Dipendenti" },
];

function Shell() {
  const { isAdmin, email } = useRole();
  const qc = useQueryClient();
  const nav = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    nav({ to: "/auth", replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-sidebar">
        <div className="px-5 py-5">
          <p className="font-display text-lg font-bold neon-text">StageVault</p>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">Noleggio eventi</p>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          <Link
            to="/magazzino"
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            activeProps={{ className: "bg-sidebar-accent text-primary" }}
          >
            <Box className="h-4 w-4" /> Magazzino 3D
          </Link>
          {soon.map((s) => (
            <div key={s.label} className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60">
              <s.icon className="h-4 w-4" /> {s.label}
              <span className="ml-auto text-[9px] uppercase tracking-wider">presto</span>
            </div>
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="truncate px-2 text-xs text-muted-foreground">{email}</p>
          <p className="px-2 text-[10px] uppercase tracking-wider text-primary">{isAdmin ? "Admin" : "Dipendente"}</p>
          <button onClick={signOut} className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground">
            <LogOut className="h-4 w-4" /> Esci
          </button>
        </div>
      </aside>
      <main className="relative flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
