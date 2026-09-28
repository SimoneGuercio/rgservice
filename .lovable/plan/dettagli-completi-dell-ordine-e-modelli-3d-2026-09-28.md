# Dettagli completi dell’ordine e modelli 3D

## Obiettivo
- Mostrare al dipendente, per ogni incarico, descrizione completa, note, luogo, date, furgone, compenso e lista del materiale assegnato.
- Mostrare lo stesso riepilogo materiale nel dettaglio ordine dell’amministratore.
- Sostituire le forme cubiche generiche del magazzino con modelli 3D semirealistici e riconoscibili per casse, subwoofer, mixer, console DJ, luci e accessori.

## Interventi
- Estendere le letture degli ordini includendo `order_items` e i relativi dati attrezzatura.
- Organizzare il materiale per categoria e mostrare nome, marca e modello nelle schede lavoro e ordine.
- Rendere le notifiche di assegnazione più informative, mantenendo il collegamento alla scheda completa.
- Migliorare la scena con geometrie dettagliate, materiali, griglie, manopole, coni, maniglie e supporti, mantenendo il rendering ottimizzato per molti pezzi.
- Verificare il percorso amministratore/dipendente e la resa visiva su desktop e mobile.

## Note tecniche
- Nessuna modifica alla struttura del database: descrizione e materiale sono già collegati agli ordini.
- I modelli restano istanziati per categoria, così la scena rimane fluida anche con oltre 200 elementi.
