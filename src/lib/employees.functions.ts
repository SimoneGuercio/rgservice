import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  employeeId: z.string().uuid().optional(),
  nome: z.string().trim().min(1).max(80),
  cognome: z.string().trim().min(1).max(80),
  ruolo: z.enum(["magazziniere", "tecnico_audio", "tecnico_luci", "autista"]),
  telefono: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
});

// Admin creates a login for an employee (new or existing record) and links it.
export const createEmployeeAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Solo l'amministratore può creare dipendenti");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error || !created.user) {
      const msg = error?.message ?? "";
      if (msg.toLowerCase().includes("already")) throw new Error("Esiste già un account con questa email");
      throw new Error("Impossibile creare l'account");
    }
    const row = {
      nome: data.nome,
      cognome: data.cognome,
      ruolo: data.ruolo,
      telefono: data.telefono || null,
      email: data.email,
      user_id: created.user.id,
    };
    const res = data.employeeId
      ? await context.supabase.from("employees").update(row).eq("id", data.employeeId)
      : await context.supabase.from("employees").insert(row);
    if (res.error) {
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      throw new Error("Impossibile salvare il dipendente");
    }
    return { ok: true };
  });
