# 🏠 Casa Santoro/Longobardi

App di famiglia installabile da Chrome su telefono e PC: documenti e scadenze, calendario (mese ed elenco)
collegato a Google Calendar, bollette e pagamenti, lista della spesa condivisa,
ricerca dei documenti nelle cartelle (in sola lettura) e condivisione con la famiglia.

- `apps-script/` – il programma che gira su Google Apps Script (dati in un Foglio Google,
  file in una cartella Drive, eventi nel Google Calendar).
- `index.html`, `manifest.json`, `sw.js`, `icons/` – la pagina installabile (GitHub Pages)
  che apre l'app di Google.
- `chat-importazione/` – la cartella per la chat di Claude che legge i documenti (solo lettura) e
  prepara `importazione-casa.json` per la funzione "📥 Importa da cartella".
- `test/prova-codice.html` – collaudo della parte Google con servizi finti (aprilo da un server locale).

Nessun dato personale sta in questo archivio: tutto resta nell'account Google di chi la usa.
Istruzioni: [GUIDA.md](GUIDA.md).
