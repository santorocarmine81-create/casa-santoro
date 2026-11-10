# Casa Santoro – come metterla in funzione

Tempo: circa 10 minuti, da fare **sul PC con Chrome**.

> **Importante:** fai tutto con l'account Google **del tuo calendario personale**
> (NON quello del gestionale Santalucia). L'app userà il Drive, il foglio dati
> e il calendario dell'account con cui la crei.

## 1. Crea il progetto su Google

1. Apri Chrome, controlla in alto a destra di essere entrato con l'account personale.
2. Vai su **https://script.google.com** e premi **Nuovo progetto**.
3. In alto, clicca su "Progetto senza titolo" e chiamalo **Casa Santoro**.

## 2. Incolla il codice (2 file)

1. **Primo file.** A sinistra c'è già `Codice.gs`. Cancella tutto quello che c'è dentro.
   Apri con il Blocco note il file
   `G:\Documents\pers\claude\casa-santoro\apps-script\Codice.gs`,
   seleziona tutto (Ctrl+A), copia (Ctrl+C) e incolla (Ctrl+V) nella pagina di Google.
2. **Secondo file.** Accanto a "File" premi **+** → **HTML** → scrivi il nome **Index**
   (con la I maiuscola, senza .html) → Invio. Cancella quello che c'è dentro e incollaci il contenuto di
   `G:\Documents\pers\claude\casa-santoro\apps-script\Index.html`.
3. Premi l'icona del **dischetto** (Salva).

## 3. Fuso orario

Ingranaggio a sinistra (**Impostazioni progetto**) → **Fuso orario** → scegli
**(GMT+01:00) Ora dell'Europa centrale – Roma**.

## 4. Primo avvio e permessi

1. Torna all'editor (icona `< >` a sinistra) e apri `Codice.gs`.
2. In alto, nel menu a tendina accanto a "Debug", scegli **primoAvvio** e premi **Esegui**.
3. Google chiede i permessi: **Rivedi autorizzazioni** → scegli il tuo account personale.
4. Esce "Google non ha verificato questa app": è normale, l'app è tua.
   Premi **Avanzate** → **Vai a Casa Santoro (non sicuro)** → **Consenti** (spunta tutte le caselle se le chiede).

   I permessi servono a: leggere/creare file nel tuo Drive, gestire il calendario,
   usare il foglio dei dati e mandarti l'email di promemoria.
   **L'app cancella o modifica file solo dentro la sua cartella "Casa Santoro - Documenti".**
5. In basso deve comparire "Tutto pronto!". Nel tuo Drive ora c'è la cartella
   **Casa Santoro - Documenti** e nel calendario c'è **🏠 Casa Santoro**.

## 5. Pubblica l'app

1. In alto a destra: **Esegui il deployment** → **Nuovo deployment**.
2. Ingranaggio accanto a "Seleziona tipo" → **App web**.
3. Compila così:
   - Descrizione: `Casa Santoro`
   - Esegui come: **Me**
   - Chi ha accesso: **Solo io**
4. **Esegui il deployment** → copia l'**URL dell'app web** (finisce con `/exec`).
5. **Mandami quell'indirizzo**: lo metto io nell'app, così non devi incollarlo su ogni dispositivo.
   (In alternativa puoi incollarlo tu la prima volta che apri l'app.)

## 6. Installa sul telefono e sul PC

Indirizzo dell'app: **https://santorocarmine81-create.github.io/casa-santoro/**

- **Telefono (Chrome):** apri l'indirizzo → menu **⋮** → **Aggiungi a schermata Home** / **Installa app**.
- **PC (Chrome):** apri l'indirizzo → icona **Installa** a destra nella barra degli indirizzi.

Se all'apertura vedi una pagina bianca o un errore, premi **Entra con Google** nella barra in basso
e scegli l'account personale.

## Il calendario

- Le scadenze e gli impegni finiscono nel calendario **🏠 Casa Santoro** (lo vedi nell'app Google Calendar
  del telefono insieme agli altri; puoi cambiarne il colore). Dalle impostazioni dell'app puoi scegliere
  invece il calendario principale.
- Se un giorno volessi usare il calendario di **un altro account**: da quell'account apri Google Calendar →
  impostazioni del calendario → **Condividi con persone specifiche** → aggiungi l'account dove gira l'app
  con il permesso **Apportare modifiche agli eventi**; poi nell'app ⚙️ → "In un calendario di un altro account"
  e scrivi l'ID del calendario (per il principale è l'indirizzo email).

## Quando ti mando una versione nuova

1. Incolla di nuovo i file cambiati (come al punto 2) e salva.
2. **Esegui il deployment** → **Gestisci deployment** → matita ✏️ → Versione: **Nuova versione** → **Esegui il deployment**.
   Così l'indirizzo resta lo stesso e l'app sul telefono si aggiorna da sola.
