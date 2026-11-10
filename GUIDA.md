# Casa Santoro/Longobardi – come metterla in funzione

Tempo: circa 15 minuti, da fare **sul PC con Chrome**.

> **Importante:** fai tutto con l'account Google **del tuo calendario personale**
> (NON quello del gestionale Santalucia). L'app userà il Drive, il foglio dati
> e il calendario dell'account con cui la crei. Tua moglie la userà poi con il suo account.

## 1. Crea il progetto su Google

1. Apri Chrome e controlla in alto a destra di essere entrato con l'account personale.
2. Vai su **https://script.google.com** e premi **Nuovo progetto**.
3. In alto clicca su "Progetto senza titolo" e chiamalo **Casa Santoro-Longobardi**.

## 2. Incolla il codice (2 file)

1. **Primo file.** A sinistra c'è già `Codice.gs`: cancella tutto quello che c'è dentro.
   Apri con il Blocco note il file
   `G:\Documents\pers\claude\casa-santoro\apps-script\Codice.gs`,
   seleziona tutto (Ctrl+A), copia (Ctrl+C) e incolla (Ctrl+V) nella pagina di Google.
2. **Secondo file.** Accanto a "File" premi **+** → **HTML** → scrivi il nome **Index**
   (con la I maiuscola, senza .html) → Invio. Cancella quello che c'è dentro e incollaci il contenuto di
   `G:\Documents\pers\claude\casa-santoro\apps-script\Index.html`.
3. Premi l'icona del **dischetto** (Salva).

## 3. Attiva il servizio Calendario (serve per condividere il calendario con tua moglie)

A sinistra, accanto a **Servizi**, premi **+** → scegli **Google Calendar API** → **Aggiungi**.
(Deve comparire "Calendar" sotto Servizi. Lascia il nome com'è: `Calendar`.)

## 4. Fuso orario

Ingranaggio a sinistra (**Impostazioni progetto**) → **Fuso orario** →
**(GMT+01:00) Ora dell'Europa centrale – Roma**.

## 5. Primo avvio e permessi

1. Torna all'editor (icona `< >` a sinistra) e apri `Codice.gs`.
2. In alto, nel menu a tendina accanto a "Debug", scegli **primoAvvio** e premi **Esegui**.
3. Google chiede i permessi: **Rivedi autorizzazioni** → scegli il tuo account personale.
4. Esce "Google non ha verificato questa app": è normale, l'app è tua.
   Premi **Avanzate** → **Vai a Casa Santoro-Longobardi (non sicuro)** → **Consenti**
   (se ci sono caselle da spuntare, spuntale tutte).

   I permessi servono a: leggere/creare file nel tuo Drive, gestire il calendario,
   usare il foglio dei dati, mandarti l'email di promemoria.
   **L'app crea, modifica e cancella file solo dentro la sua cartella "Casa Santoro-Longobardi - Documenti".**
   Le altre cartelle (Drive, PC, chiavette) le legge soltanto: se serve, copia i file nella sua cartella.
5. In basso deve comparire "Tutto pronto!". Nel tuo Drive ora c'è la cartella
   **Casa Santoro-Longobardi - Documenti** e nel calendario c'è **🏠 Casa Santoro/Longobardi**.

## 6. Pubblica l'app

1. In alto a destra: **Esegui il deployment** → **Nuovo deployment**.
2. Ingranaggio accanto a "Seleziona tipo" → **App web**.
3. Compila così (attenzione, sono diverse dal gestionale):
   - Descrizione: `Casa Santoro/Longobardi`
   - Esegui come: **Utente che accede all'app web**
   - Chi ha accesso: **Chiunque abbia un Account Google**

   Tranquillo: "chiunque" vuol dire solo che Google fa provare ad entrare chi ha il link.
   Entra davvero solo chi è di casa: tu e le persone con cui condividi l'app.
   Tutti gli altri vedono la pagina "Ehi, non ti conosco ancora!" e non vedono nessun dato.
4. **Esegui il deployment** → copia l'**URL dell'app web** (finisce con `/exec`).
5. **Mandami quell'indirizzo**: lo metto io nell'app, così non va incollato su ogni telefono.
   (In alternativa puoi incollarlo tu la prima volta che apri l'app.)

## 7. Installa sul telefono e sul PC

Indirizzo dell'app: **https://santorocarmine81-create.github.io/casa-santoro/**

- **Telefono (Chrome):** apri l'indirizzo → menu **⋮** → **Installa app** (o **Aggiungi a schermata Home**).
- **PC (Chrome):** apri l'indirizzo → icona **Installa** a destra nella barra degli indirizzi.

La prima volta Google chiede di nuovo "Consenti": è normale.
Se vedi una pagina bianca o un errore, premi **Entra con Google** nella barra in basso e scegli l'account personale.

## 8. Condividi con tua moglie

1. Nell'app vai in **👨‍👩‍👦 Famiglia** (pulsante in alto) → apri la scheda di tua moglie
   (se non c'è ancora, aggiungila).
2. Scrivi la sua **email Google** e premi **🤝 Condividi l'app**.
3. L'app ti prepara un messaggio con le istruzioni: premi **📤 Manda il messaggio** e mandaglielo su WhatsApp.
4. Lei apre il link da Chrome sul suo telefono, entra con **il suo** account Google,
   preme **Avanzate → Vai a … → Consenti** e poi **⋮ → Installa app**.

Cosa vede lei: tutto quello che vedi tu (documenti, calendario di casa, spesa, progetti, numeri).
Ognuno ha il suo saluto e può attivare la sua email di promemoria.
Per toglierle l'accesso: stessa scheda → **Togli l'accesso** (i dati restano).

> Se al passo 3 non hai attivato il servizio Calendario, l'app te lo dice: in quel caso condividi a mano
> il calendario "🏠 Casa Santoro/Longobardi" da Google Calendar → Impostazioni del calendario →
> **Condividi con persone specifiche** → la sua email → **Apportare modifiche agli eventi**.

## Importare i documenti con la chat di Claude

Come per il gestionale Santalucia, c'è una chat apposita che legge i documenti al posto tuo.

1. Nell'app Claude sul PC apri una **nuova sessione** (Code) e come cartella scegli
   `G:\Documents\pers\claude\casa-santoro\chat-importazione`. Chiamala "Lettore documenti di casa".
2. Scrivile la cartella da leggere, per esempio: *"Leggi i documenti in G:\Documents\pers\passaporto"*.
   Ti chiederà chi c'è in famiglia, leggerà PDF e foto e alla fine creerà nella cartella **un solo file**:
   `importazione-casa.json`. Non può cancellare né modificare nient'altro: è bloccata.
3. Nell'app, da Chrome sul PC: **☰ Altro → 📥 Importa da cartella → Scegli la cartella** e scegli la stessa cartella.
4. Controlla l'anteprima (togli la spunta a quello che non vuoi) e premi **Importa**.
   L'app crea le persone nuove, aggiorna i documenti che hanno una scadenza più recente, salta i doppioni,
   copia i file nella sua cartella e mette le scadenze nel calendario.

## Il calendario

- Scadenze, impegni e obiettivi dei progetti finiscono nel calendario **🏠 Casa Santoro/Longobardi**,
  che vedi nell'app Google Calendar del telefono insieme agli altri (puoi cambiarne il colore).
- Dalle impostazioni dell'app puoi scegliere invece il tuo calendario principale
  (ma per vederli anche tua moglie è meglio quello di casa).

## Quando ti mando una versione nuova

1. Incolla di nuovo i file cambiati (come al punto 2) e salva.
2. **Esegui il deployment** → **Gestisci deployment** → matita ✏️ → Versione: **Nuova versione** → **Esegui il deployment**.
   Così l'indirizzo resta lo stesso e l'app sul telefono si aggiorna da sola.
