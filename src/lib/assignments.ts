export const RUOLO_LABEL: Record<string, string> = {
  magazziniere: "Magazziniere",
  tecnico_audio: "Tecnico audio",
  tecnico_luci: "Tecnico luci",
  autista: "Autista",
};

export const ORDER_STATO_LABEL: Record<string, string> = {
  bozza: "Bozza",
  confermato: "Confermato",
  in_corso: "In corso",
  completato: "Completato",
  annullato: "Annullato",
};

export const ASSIGN_LABEL: Record<string, string> = {
  in_attesa: "In attesa",
  accettato: "Accettato",
  rifiutato: "Rifiutato",
};

export const ASSIGN_CLASS: Record<string, string> = {
  in_attesa: "border-status-maint/50 text-status-maint",
  accettato: "border-status-ok/50 text-status-ok",
  rifiutato: "border-destructive/50 text-destructive",
};

export function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("it-IT", { day: "2-digit", month: "short", year: "numeric" });
}

export function eur(n: number) {
  return n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}
