# Event Gear Manager

Crea una web app gestionale per un'azienda di noleggio attrezzatura per eventi (audio, DJ e luci). L'interfaccia deve essere in italiano, con uno stile moderno, scuro e professionale (dark mode, accenti neon blu/viola tipo mondo eventi e club).

STACK TECNICO
- React + TypeScript + Tailwind + shadcn/ui
- Visualizzazione 3D con @react-three/fiber e @react-three/drei (Three.js)
- Backend e database con Supabase (autenticazione, database, row level security)

OBIETTIVO DELL'APP
Quando arriva un ordine, voglio selezionare una data (o un intervallo di date) e vedere subito, all'interno di un magazzino 3D, quale attrezzatura è disponibile e quale è già noleggiata. Voglio poi creare l'ordine con l'attrezzatura scelta e assegnare i lavori ai miei dipendenti.

STRUTTURA DEL DATABASE (Supabase)
- equipment_categories: id, nome (es. Casse, Subwoofer, Console DJ, Mixer, Luci Moving Head, Par LED, Laser, Macchine del fumo, Strobo, Cavi e accessori), icona, colore
- equipment: id, category_id, nome, marca, modello, numero_seriale, stato (disponibile / in_manutenzione / fuori_servizio), zona_magazzino, posizione_scaffale (coordinate x, y, z per il 3D), prezzo_giornaliero, note, foto_url
- orders: id, cliente_nome, cliente_telefono, cliente_email, luogo_evento, data_inizio, data_fine, stato (bozza / confermato / in_corso / completato / annullato), note, created_at
- order_items: id, order_id, equipment_id
- employees: id, user_id, nome, cognome, ruolo (magazziniere / tecnico audio / tecnico luci / autista), telefono, attivo
- tasks: id, order_id, employee_id, tipo (preparazione / carico / consegna / montaggio / smontaggio / rientro e controllo), data_ora, stato (da_fare / in_corso / completato), note

LOGICA DI DISPONIBILITÀ
Un'attrezzatura è NON disponibile in un intervallo di date se:
- è inclusa in un ordine confermato o in corso le cui date si sovrappongono all'intervallo selezionato
- oppure il suo stato è "in_manutenzione" o "fuori_servizio"
Impedisci di aggiungere a un ordine attrezzatura già occupata in quelle date e mostra un messaggio chiaro sul conflitto (con quale ordine si sovrappone).

VISTA MAGAZZINO 3D (pagina principale)
- Un capannone 3D con pavimento, pareti e scaffalature suddivise in zone per categoria (Zona Audio, Zona DJ, Zona Luci, Zona Effetti, Zona Accessori), con etichette leggibili sopra ogni zona
- Ogni pezzo di attrezzatura rappresentato con forme 3D semplici e riconoscibili (low-poly, geometrie base):
  - Casse: parallelepipedi verticali neri con un cerchio frontale (woofer)
  - Subwoofer: cubi grandi
  - Console DJ: piano basso e largo con piccoli dettagli
  - Moving head: base + testa che ruota lentamente
  - Par LED: cilindri corti
  - Laser e strobo: piccoli box
- Colore/illuminazione di stato:
  - Verde = disponibile nella data selezionata
  - Rosso = già noleggiato
  - Giallo = in manutenzione
  - Grigio = fuori servizio
- Controlli camera: rotazione, zoom e pan (OrbitControls), più pulsanti per spostarsi rapidamente su ciascuna zona
- Passando il mouse su un oggetto: tooltip con nome e stato
- Cliccando un oggetto: pannello laterale con dettagli (marca, modello, seriale, prezzo giornaliero, prossimi noleggi) e pulsante "Aggiungi all'ordine"
- In alto: selettore di intervallo date (data inizio e fine), filtro per categoria e barra di ricerca
- Riepilogo in sovraimpressione: numero di pezzi disponibili / noleggiati per categoria nella data selezionata
- Pulsante per passare a una vista a lista/tabella 2D alternativa con gli stessi filtri

PERFORMANCE 3D
Usa geometrie semplici, instancing dove possibile e poche luci dinamiche, in modo che la scena resti fluida anche con 200+ oggetti.

ALTRE PAGINE (menu laterale)
1. Dashboard: ordini di oggi e della settimana, attrezzatura in uscita e in rientro, task non assegnati
2. Magazzino 3D (descritto sopra)
3. Inventario: tabella CRUD dell'attrezzatura con filtri
4. Ordini: lista ordini + creazione/modifica ordine con selezione date, cliente e attrezzatura (solo quella disponibile)
5. Calendario: vista mensile/settimanale degli ordini con barre colorate per stato
6. Lavori e dipendenti: board Kanban dei task (Da fare / In corso / Completato), con assegnazione tramite drag & drop o menu a tendina
7. Dipendenti: gestione anagrafica del personale

RUOLI E ACCESSI
- Admin (titolare): accesso completo
- Dipendente: vede solo i propri task assegnati, può aggiornarne lo stato e consultare il magazzino in sola lettura

DATI DI ESEMPIO
Popola il database con dati realistici: circa 60 pezzi di attrezzatura (marchi come Pioneer DJ, RCF, JBL, Martin, Chauvet, Allen & Heath), 8 ordini distribuiti nelle prossime 3 settimane e 5 dipendenti con ruoli diversi.

Parti dalla struttura del database, dall'autenticazione e dalla vista Magazzino 3D con il filtro per data funzionante.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://rgservice.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/900aa3b6-921e-4314-ab58-1d82a0ddb8bd).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
