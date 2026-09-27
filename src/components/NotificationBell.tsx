import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function NotificationBell({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data = [] } = useQuery({
    queryKey: ["notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").eq("user_id", userId)
        .order("created_at", { ascending: false }).limit(30);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const ch = supabase.channel(`notif-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (p) => {
          const n = p.new as { titolo: string; messaggio: string | null };
          toast(n.titolo, { description: n.messaggio ?? undefined });
          qc.invalidateQueries({ queryKey: ["notifications", userId] });
          qc.invalidateQueries({ queryKey: ["ordini-full"] });
          qc.invalidateQueries({ queryKey: ["my-assignments"] });
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, qc]);

  const unread = data.filter((n) => !n.letta).length;

  async function markAll() {
    await supabase.from("notifications").update({ letta: true }).eq("user_id", userId).eq("letta", false);
    qc.invalidateQueries({ queryKey: ["notifications", userId] });
  }

  return (
    <Popover onOpenChange={(o) => { if (!o && unread) markAll(); }}>
      <PopoverTrigger className="relative flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent">
        <Bell className="h-4 w-4" /> Notifiche
        {unread > 0 && <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{unread}</span>}
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 p-0">
        <div className="border-b px-3 py-2 font-display text-xs uppercase tracking-widest text-muted-foreground">Notifiche</div>
        <div className="max-h-96 overflow-y-auto">
          {data.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nessuna notifica.</p>}
          {data.map((n) => (
            <button key={n.id} onClick={() => n.link && nav({ to: n.link })}
              className={`block w-full border-b px-3 py-2 text-left text-sm hover:bg-accent ${n.letta ? "opacity-60" : ""}`}>
              <p className="font-medium">{!n.letta && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-primary" />}{n.titolo}</p>
              {n.messaggio && <p className="text-xs text-muted-foreground">{n.messaggio}</p>}
              <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString("it-IT")}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
