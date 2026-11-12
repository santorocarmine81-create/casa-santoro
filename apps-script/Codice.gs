/**
 * Casa Santoro/Longobardi - documenti, scadenze, impegni, spesa, progetti e numeri utili di famiglia.
 * Parte "Google" dell'app: salva i dati in un Foglio Google,
 * i file in una cartella di Drive e mette scadenze e impegni nel Google Calendar.
 *
 * Il foglio, la cartella e il calendario si creano da soli al primo avvio (funzione primoAvvio).
 * L'app si puo' condividere con altre persone di famiglia (es. la moglie): vedi condividiCon().
 *
 * REGOLA DI SICUREZZA: l'app crea, modifica e cancella file SOLO dentro la sua cartella.
 * Le altre cartelle (Drive, PC, chiavette) le legge soltanto; se serve, copia i file nella sua cartella.
 */

var NOME_APP = 'Casa Santoro/Longobardi';
var TAG_EVENTO = 'casaSantoro';

var CAMPI = {
  Persone:   ['id', 'nome', 'relazione', 'nascita', 'colore', 'emoji', 'note', 'cognome', 'altriNomi', 'codiceFiscale', 'email', 'accesso'],
  Documenti: ['id', 'personaId', 'tipo', 'numero', 'rilascio', 'scadenza', 'preavviso', 'note', 'files', 'eventi', 'aggiornato'],
  Ignorati:  ['id', 'nome'],
  Impegni:   ['id', 'titolo', 'categoria', 'data', 'oraInizio', 'oraFine', 'tuttoIlGiorno', 'persone', 'luogo', 'note', 'ripeti', 'ripetiFino', 'promemoria', 'eventi', 'aggiornato'],
  Spesa:     ['id', 'nome', 'quantita', 'reparto', 'preso', 'aggiuntoDa', 'aggiornato'],
  Progetti:  ['id', 'titolo', 'descrizione', 'categoria', 'priorita', 'stato', 'costo', 'messoDaParte', 'dataObiettivo', 'persone', 'passi', 'note', 'eventi', 'aggiornato'],
  Numeri:    ['id', 'nome', 'categoria', 'telefono', 'telefono2', 'email', 'indirizzo', 'note', 'preferito'],
  Pagamenti: ['id', 'titolo', 'categoria', 'importo', 'scadenza', 'pagata', 'dataPagamento', 'metodo', 'periodo', 'personaId', 'ripeti', 'files', 'note', 'eventi', 'aggiornato']
};

// Impostazioni comuni a tutta la famiglia (il nome e l'email di promemoria invece sono di ciascuno)
var IMPOSTAZIONI_BASE = {
  calendario: 'dedicato',   // 'dedicato' = calendario "Casa Santoro/Longobardi", 'principale' = il calendario principale del proprietario, 'altro' = calendario condiviso da un altro account
  calendarioPrincipale: '',
  calendarioAltro: '',
  preavviso: 30,
  mostraGoogle: true,
  cartellaScansione: ''
};

/* ---------------- Chi sta usando l'app ---------------- */

function props_() { return PropertiesService.getScriptProperties(); }
function utente_() { return String(Session.getActiveUser().getEmail() || Session.getEffectiveUser().getEmail() || '').toLowerCase(); }
function proprietario_() { return String(props_().getProperty('proprietario') || '').toLowerCase(); }
function sonoProprietario_() { var p = proprietario_(); return !p || p === utente_(); }

/** Vero se chi apre l'app e' il proprietario o una persona di famiglia con cui l'app e' condivisa. */
function puoEntrare_() {
  if (sonoProprietario_()) return true;
  var io = utente_();
  if (!io) return false;
  // 1) elenco degli account di casa salvato a parte (non serve poter aprire il foglio)
  if (ospiti_().some(function (e) { return stessaEmail_(e, io); })) return true;
  // 2) come prima: cerco nel foglio delle persone
  try {
    return leggi_('Persone').some(function (p) { return p.accesso === 'si' && stessaEmail_(p.email, io); });
  } catch (e) { return false; }
}

/** Gmail ignora punti, maiuscole e "+qualcosa": due modi di scrivere la stessa casella risultano uguali. */
function emailNorm_(email) {
  var e = String(email || '').trim().toLowerCase();
  var parti = e.split('@');
  if (parti.length !== 2) return e;
  var nome = parti[0], dom = parti[1];
  if (dom === 'googlemail.com') dom = 'gmail.com';
  if (dom === 'gmail.com') nome = nome.split('+')[0].replace(/\./g, '');
  return nome + '@' + dom;
}
function stessaEmail_(a, b) { return !!a && !!b && emailNorm_(a) === emailNorm_(b); }

/** Account di casa (oltre al proprietario), salvati nelle proprieta' dello script. */
function ospiti_() {
  try { return JSON.parse(props_().getProperty('ospiti') || '[]'); } catch (e) { return []; }
}
function segnaOspite_(email, dentro) {
  var lista = ospiti_().filter(function (e) { return !stessaEmail_(e, email); });
  if (dentro && email) lista.push(String(email).trim().toLowerCase());
  props_().setProperty('ospiti', JSON.stringify(lista));
}

/**
 * Solo per il proprietario: controlla che chi ha l'accesso abbia davvero foglio e cartella condivisi
 * (es. la prima volta l'email era sbagliata) e, se manca qualcosa, rifa' la condivisione.
 */
function riparaCondivisioni_() {
  if (!sonoProprietario_() || !proprietario_()) return [];
  var riparati = [];
  try {
    var conAccesso = leggi_('Persone').filter(function (p) { return p.accesso === 'si' && emailValida_(p.email); });
    var emailOspiti = conAccesso.map(function (p) { return String(p.email).trim().toLowerCase(); });
    if (JSON.stringify(emailOspiti) !== JSON.stringify(ospiti_())) props_().setProperty('ospiti', JSON.stringify(emailOspiti));
    if (!conAccesso.length) return [];
    var foglio = DriveApp.getFileById(props_().getProperty('foglioId'));
    var cart = cartella_();
    var edFoglio = foglio.getEditors().map(function (u) { return u.getEmail(); });
    var edCart = cart.getEditors().map(function (u) { return u.getEmail(); });
    var ha = function (lista, email) { return lista.some(function (e) { return stessaEmail_(e, email); }); };
    conAccesso.forEach(function (p) {
      var fatto = false;
      if (!ha(edFoglio, p.email)) { try { foglio.addEditor(p.email); fatto = true; } catch (e) {} }
      if (!ha(edCart, p.email)) { try { cart.addEditor(p.email); fatto = true; } catch (e) {} }
      if (fatto) riparati.push(p.nome + ' (' + p.email + ')');
    });
  } catch (e) {}
  return riparati;
}
function controllo_() {
  if (!puoEntrare_()) throw new Error('Questo account (' + utente_() + ') non e\' tra quelli di casa. Chiedi di condividere l\'app con te.');
}

/* ---------------- Pagina ---------------- */

/**
 * Google oggi fa scegliere i permessi uno per uno: se qualcuno ne lascia uno senza spunta (es. Fogli),
 * l'app gira ma non puo' aprire i dati. Restituisce il link per ridarli tutti, oppure '' se e' tutto a posto.
 */
function permessiMancanti_() {
  try {
    var info = ScriptApp.getAuthorizationInfo(ScriptApp.AuthMode.FULL);
    if (info.getAuthorizationStatus() === ScriptApp.AuthorizationStatus.REQUIRED) return info.getAuthorizationUrl() || '#';
  } catch (e) {}
  return '';
}

function doGet() {
  var link = permessiMancanti_();
  if (link) {
    return HtmlService.createHtmlOutput(
      '<div style="font-family:system-ui,sans-serif;text-align:center;padding:40px 16px;color:#2b2633;background:#fff6ee;min-height:100vh;box-sizing:border-box">' +
      '<div style="font-size:56px">🏠🔑</div><h2>Manca un permesso</h2>' +
      '<p>Sei entrato come <b>' + (utente_() || 'questo account') + '</b>, ma a Google manca il permesso di usare qualcosa che serve all\'app (di solito Fogli, Drive o Calendar).</p>' +
      '<p><a href="' + link + '" target="_top" style="display:inline-block;background:#ff6b57;color:#fff;padding:14px 22px;border-radius:14px;font-weight:800;text-decoration:none">🔑 Dai i permessi</a></p>' +
      '<p>Nella pagina di Google <b>spunta TUTTE le caselle</b> (oppure "Seleziona tutto") e premi <b>Continua</b>. Poi riapri l\'app.</p></div>')
      .setTitle(NOME_APP)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  if (!puoEntrare_()) {
    var io = utente_() || 'questo account';
    return HtmlService.createHtmlOutput(
      '<div style="font-family:system-ui,sans-serif;text-align:center;padding:40px 16px;color:#2b2633;background:#fff6ee;min-height:100vh;box-sizing:border-box">' +
      '<div style="font-size:56px">🏠🔒</div><h2>Ehi, non ti conosco ancora!</h2>' +
      '<p>Sei entrato come <b>' + io + '</b>, che non è tra gli account di casa.</p>' +
      '<p>Chiedi di aggiungerti: nell\'app, in <b>Famiglia</b>, apri la tua scheda, scrivi questa email e premi <b>🤝 Condividi l\'app</b>.</p>' +
      '<p style="color:#8a8194">Se hai più account Google sul telefono, controlla di essere entrato con quello giusto.</p></div>')
      .setTitle(NOME_APP)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(NOME_APP)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------------- Foglio, cartella, calendario ---------------- */

var NON_CONDIVISO = 'Non riesco ad aprire i dati di casa con questo account: chiedi di condividere l\'app con te (Famiglia → la tua scheda → 🤝 Condividi l\'app).';
var FOGLIO_CACHE_ = null;

function foglio_() {
  if (FOGLIO_CACHE_) return FOGLIO_CACHE_;
  var id = props_().getProperty('foglioId');
  var ss = null, motivo = '';
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; motivo = e && e.message ? e.message : String(e); } }
  if (!ss) {
    // Solo il proprietario puo' creare un foglio nuovo: chi e' ospite non deve mai "sostituire" i dati
    if (id && !sonoProprietario_()) {
      // "Specified permissions are not sufficient... Required permissions: .../auth/spreadsheets" = permesso non dato
      if (/not sufficient|required permissions|non sono sufficienti|autorizzazioni richieste|auth\/spreadsheets/i.test(motivo)) {
        throw new Error('A Google manca il permesso di aprire Fogli per questo account. Chiudi e riapri l\'app: comparirà il tasto "Dai i permessi"; spunta tutte le caselle. (Motivo: ' + motivo + ')');
      }
      throw new Error(NON_CONDIVISO + (motivo ? ' (Motivo: ' + motivo + ')' : ''));
    }
    ss = SpreadsheetApp.create(NOME_APP + ' - dati (non modificare a mano)');
    props_().setProperty('foglioId', ss.getId());
    if (!proprietario_()) props_().setProperty('proprietario', utente_());
    try { DriveApp.getFileById(ss.getId()).moveTo(cartella_()); } catch (e) {}
  }
  Object.keys(CAMPI).forEach(function (nome) {
    var sh = ss.getSheetByName(nome);
    if (!sh) {
      sh = ss.insertSheet(nome);
      sh.getRange(1, 1, 1, CAMPI[nome].length).setValues([CAMPI[nome]]).setFontWeight('bold');
      sh.setFrozenRows(1);
      sh.getRange('A:Z').setNumberFormat('@'); // tutto come testo: niente date "pasticciate"
    } else if (sh.getLastColumn() < CAMPI[nome].length) {
      // Versione nuova con campi in piu': aggiungo solo le intestazioni mancanti, i dati restano
      sh.getRange(1, 1, 1, CAMPI[nome].length).setValues([CAMPI[nome]]).setFontWeight('bold');
    }
  });
  var vecchio = ss.getSheetByName('Foglio1') || ss.getSheetByName('Sheet1');
  if (vecchio && ss.getSheets().length > 1) ss.deleteSheet(vecchio);
  FOGLIO_CACHE_ = ss;
  return ss;
}

function cartella_() {
  var id = props_().getProperty('cartellaId');
  if (id) {
    try { var c = DriveApp.getFolderById(id); if (!c.isTrashed()) return c; } catch (e) {}
    if (!sonoProprietario_()) throw new Error(NON_CONDIVISO);
  }
  var nuova = DriveApp.createFolder(NOME_APP.replace('/', '-') + ' - Documenti');
  props_().setProperty('cartellaId', nuova.getId());
  if (!proprietario_()) props_().setProperty('proprietario', utente_());
  return nuova;
}

function cartellaPersona_(nome) {
  var base = cartella_();
  var nomeCartella = nome || 'Senza nome';
  var it = base.getFoldersByName(nomeCartella);
  return it.hasNext() ? it.next() : base.createFolder(nomeCartella);
}

/** Apre un calendario per ID; se e' condiviso ma non ancora "aggiunto" all'account, lo aggiunge. */
function apriCal_(id) {
  if (!id) return null;
  var c = CalendarApp.getCalendarById(id);
  if (!c) { try { c = CalendarApp.subscribeToCalendar(id); } catch (e) { c = null; } }
  return c;
}

function calendario_() {
  var imp = leggiImpostazioni_();
  if (imp.calendario === 'principale') {
    var idP = imp.calendarioPrincipale || (sonoProprietario_() ? CalendarApp.getDefaultCalendar().getId() : '');
    var princ = apriCal_(idP);
    if (!princ) throw new Error('Non posso scrivere nel calendario principale di ' + proprietario_() + ' con questo account.');
    return princ;
  }
  if (imp.calendario === 'altro') {
    var altro = apriCal_(imp.calendarioAltro);
    if (!altro) throw new Error('Non vedo il calendario "' + imp.calendarioAltro + '": va condiviso con ' + utente_() + ' con il permesso di modificare gli eventi.');
    return altro;
  }
  var id = props_().getProperty('calendarioId');
  if (id) {
    var c = apriCal_(id);
    if (c) return c;
    if (!sonoProprietario_()) throw new Error('Non vedo il calendario di casa: va condiviso con ' + utente_() + '.');
  }
  var cal = CalendarApp.createCalendar('🏠 ' + NOME_APP, {
    summary: 'Scadenze, impegni e progetti di famiglia (dall\'app ' + NOME_APP + ')',
    color: CalendarApp.Color.RED
  });
  props_().setProperty('calendarioId', cal.getId());
  return cal;
}

/* ---------------- Lettura / scrittura righe ---------------- */

function leggi_(nome) {
  var sh = foglio_().getSheetByName(nome);
  var campi = CAMPI[nome];
  var n = sh.getLastRow() - 1;
  if (n < 1) return [];
  var valori = sh.getRange(2, 1, n, campi.length).getDisplayValues();
  return valori.filter(function (r) { return r[0]; }).map(function (r) {
    var o = {};
    campi.forEach(function (c, i) { o[c] = r[i]; });
    return o;
  });
}

function trovaRiga_(sh, id) {
  var n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  var ids = sh.getRange(2, 1, n, 1).getDisplayValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return -1;
}

function scrivi_(nome, obj) {
  var sh = foglio_().getSheetByName(nome);
  var campi = CAMPI[nome];
  var riga = campi.map(function (c) { return obj[c] === undefined || obj[c] === null ? '' : String(obj[c]); });
  var r = trovaRiga_(sh, obj.id);
  if (r < 0) r = sh.getLastRow() + 1;
  var range = sh.getRange(r, 1, 1, campi.length);
  range.setNumberFormat('@');
  range.setValues([riga]);
}

function cancellaRiga_(nome, id) {
  var sh = foglio_().getSheetByName(nome);
  var r = trovaRiga_(sh, id);
  if (r > 0) sh.deleteRow(r);
}

function leggiImpostazioni_() {
  var s = props_().getProperty('impostazioni');
  var imp = {};
  Object.keys(IMPOSTAZIONI_BASE).forEach(function (k) { imp[k] = IMPOSTAZIONI_BASE[k]; });
  if (s) { try { var o = JSON.parse(s); Object.keys(o).forEach(function (k) { if (k in IMPOSTAZIONI_BASE) imp[k] = o[k]; }); } catch (e) {} }
  return imp;
}

/** Il nome con cui l'app saluta chi la sta usando. */
function nomeUtente_() {
  var n = PropertiesService.getUserProperties().getProperty('nome');
  if (n) return n;
  var io = utente_();
  var p = leggi_('Persone').filter(function (x) { return x.email && stessaEmail_(x.email, io); })[0];
  if (p) return p.nome;
  return sonoProprietario_() ? 'Carmine' : '';
}

function emailAttiva_() {
  return ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'controlloGiornaliero'; });
}

/* ---------------- Funzioni chiamate dall'app ---------------- */

function getTutto() {
  controllo_();
  var riparati = riparaCondivisioni_();
  return {
    riparati: riparati,
    persone: leggi_('Persone'),
    documenti: leggi_('Documenti'),
    impegni: leggi_('Impegni'),
    spesa: leggi_('Spesa'),
    progetti: leggi_('Progetti'),
    numeri: leggi_('Numeri'),
    pagamenti: leggi_('Pagamenti'),
    ignorati: leggi_('Ignorati').map(function (x) { return x.id; }),
    impostazioni: leggiImpostazioni_(),
    link: { cartella: cartella_().getUrl(), foglio: foglio_().getUrl() },
    io: { email: utente_(), nome: nomeUtente_(), proprietario: sonoProprietario_(), emailAttiva: emailAttiva_(), proprietarioEmail: proprietario_() }
  };
}

/** Rilegge una sola sezione (es. la spesa, che magari ha appena cambiato tua moglie). */
function leggiSezione(tipo) {
  controllo_();
  if (!CAMPI[tipo]) throw new Error('Sezione sconosciuta: ' + tipo);
  return leggi_(tipo);
}

var CON_CALENDARIO = { Documenti: true, Impegni: true, Progetti: true, Pagamenti: true };

function salva(tipo, obj) {
  controllo_();
  if (!CAMPI[tipo]) throw new Error('Tipo sconosciuto: ' + tipo);
  if (!obj.id) obj.id = Utilities.getUuid().slice(0, 8);
  var avviso = '';
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (tipo === 'Persone') {
      var prima = leggi_('Persone').filter(function (x) { return x.id === obj.id; })[0];
      // l'accesso all'app si da' con condividiCon e si toglie con togliCondivisione;
      // se si cambia l'email di chi ha gia' l'accesso, l'accesso si sposta da solo sulla nuova email
      obj.accesso = prima ? prima.accesso : '';
      obj.email = String(obj.email || '').trim().toLowerCase();
      var vecchia = prima ? String(prima.email || '').trim().toLowerCase() : '';
      if (prima && prima.accesso === 'si' && vecchia !== obj.email) {
        if (!sonoProprietario_()) {
          obj.email = vecchia;
          avviso = 'L\'email non l\'ho cambiata: solo ' + proprietario_() + ' può spostare l\'accesso all\'app.';
        } else if (!obj.email) {
          togliAccesso_(vecchia);
          obj.accesso = '';
          avviso = 'Hai tolto l\'email: ho tolto anche l\'accesso all\'app a ' + vecchia + '.';
        } else {
          var avvisiNuova = daiAccesso_(obj.email); // se l'email nuova non va bene si ferma qui e non tocca niente
          togliAccesso_(vecchia);
          avviso = 'Ho spostato l\'accesso all\'app da ' + vecchia + ' a ' + obj.email + ' ✅' + (avvisiNuova.length ? ' ' + avvisiNuova.join(' ') : '');
        }
      }
      scrivi_(tipo, obj);
      if (prima && prima.nome !== obj.nome) aggiornaEventiPersona_(obj.id); // aggiorno i titoli nel calendario
      return { obj: obj, avviso: avviso };
    }
    if (tipo === 'Spesa') {
      if (!obj.aggiuntoDa) obj.aggiuntoDa = nomeUtente_();
      obj.aggiornato = new Date().toISOString();
    }
    if (CON_CALENDARIO[tipo]) {
      var vecchio = leggi_(tipo).filter(function (x) { return x.id === obj.id; })[0];
      if (vecchio) cancellaEventi_(vecchio.eventi);
      obj.eventi = '';
      try { obj.eventi = creaEventi_(tipo, obj); }
      catch (e) { avviso = 'Salvato, ma il calendario non ha risposto: ' + e.message; }
      obj.aggiornato = new Date().toISOString();
    }
    scrivi_(tipo, obj);
  } finally {
    lock.releaseLock();
  }
  return { obj: obj, avviso: avviso };
}

function elimina(tipo, id) {
  controllo_();
  var vecchio = leggi_(tipo).filter(function (x) { return x.id === id; })[0];
  if (!vecchio) return true;
  if (tipo === 'Persone' && vecchio.accesso === 'si') throw new Error('Prima togli la condivisione dell\'app con questa persona.');
  if (vecchio.eventi) cancellaEventi_(vecchio.eventi);
  if ((tipo === 'Documenti' || tipo === 'Pagamenti') && vecchio.files) {
    JSON.parse(vecchio.files || '[]').forEach(function (f) { cestinaFile(f.id); });
  }
  cancellaRiga_(tipo, id);
  return true;
}

/** Lista della spesa: toglie tutte le cose gia' prese. */
function svuotaPresi() {
  controllo_();
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    leggi_('Spesa').filter(function (x) { return x.preso === 'si'; }).forEach(function (x) { cancellaRiga_('Spesa', x.id); });
  } finally { lock.releaseLock(); }
  return leggi_('Spesa');
}

/** Riceve un file (foto o PDF) in base64 e lo salva nella cartella della persona. */
function caricaFile(nomePersona, nomeFile, mime, base64) {
  controllo_();
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime || 'application/octet-stream', nomeFile);
  var file = cartellaPersona_(nomePersona).createFile(blob);
  return { id: file.getId(), nome: file.getName(), mime: file.getMimeType(), url: file.getUrl() };
}

/**
 * Fa una COPIA nella cartella dell'app di un file trovato nel tuo Drive.
 * L'originale non viene ne' spostato, ne' rinominato, ne' modificato.
 */
function copiaFileDrive(fileId, nomePersona) {
  controllo_();
  var originale = DriveApp.getFileById(fileId);
  var copia = originale.makeCopy(originale.getName(), cartellaPersona_(nomePersona));
  return { id: copia.getId(), nome: copia.getName(), mime: copia.getMimeType(), url: copia.getUrl() };
}

/** Vero solo se il file sta dentro la cartella dell'app (o in una sua sottocartella). */
function fileDellApp_(file) {
  var idApp = cartella_().getId();
  var daGuardare = [], visti = {};
  var p = file.getParents();
  while (p.hasNext()) daGuardare.push(p.next());
  while (daGuardare.length) {
    var c = daGuardare.shift();
    if (visti[c.getId()]) continue;
    visti[c.getId()] = true;
    if (c.getId() === idApp) return true;
    var su = c.getParents();
    while (su.hasNext()) daGuardare.push(su.next());
  }
  return false;
}

/**
 * I file tolti da un documento vanno nel cestino di Drive (recuperabili per 30 giorni).
 * BLOCCO DI SICUREZZA: un file che non sta nella cartella dell'app non viene MAI toccato.
 */
function cestinaFile(fileId) {
  try {
    controllo_();
    if (fileId === props_().getProperty('foglioId')) return false; // il foglio dei dati non si tocca
    var f = DriveApp.getFileById(fileId);
    if (!fileDellApp_(f)) return false;
    f.setTrashed(true);
  } catch (e) { return false; }
  return true;
}

/* ---------------- Condivisione con la famiglia ---------------- */

/**
 * Condivide l'app con una persona di famiglia (serve la sua email Google):
 * le da' accesso al foglio dei dati, alla cartella dei documenti e al calendario di casa.
 * Tocca SOLO i permessi della cartella e del foglio dell'app, nient'altro.
 */
function emailValida_(email) { return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(email || '')); }

/** Da' a un'email l'accesso a cartella, foglio e calendario di casa. Restituisce gli eventuali avvisi. */
function daiAccesso_(email) {
  email = String(email || '').trim().toLowerCase();
  if (!emailValida_(email)) throw new Error('Scrivi prima la sua email Google nella scheda e salva.');
  if (stessaEmail_(email, utente_())) throw new Error('Questa è la tua email: l\'app è già tua 🙂');
  var avvisi = [];
  segnaOspite_(email, true);
  cartella_().addEditor(email);
  DriveApp.getFileById(props_().getProperty('foglioId')).addEditor(email);
  var imp = leggiImpostazioni_();
  if (imp.calendario === 'dedicato') {
    var esito = condividiCalendario_(calendario_().getId(), email, true);
    if (!esito) avvisi.push('Il calendario "🏠 ' + NOME_APP + '" condividilo tu da Google Calendar (Impostazioni del calendario → Condividi con persone specifiche → ' + email + ' → "Apportare modifiche agli eventi").');
  } else {
    avvisi.push('Gli eventi vanno nel tuo calendario ' + (imp.calendario === 'principale' ? 'principale' : 'scelto') + ': se vuoi che li veda anche lei, condividilo tu da Google Calendar.');
  }
  return avvisi;
}

/** Toglie a un'email l'accesso a cartella, foglio e calendario di casa (i dati restano). */
function togliAccesso_(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return;
  segnaOspite_(email, false);
  try { cartella_().removeEditor(email); } catch (e) {}
  try { DriveApp.getFileById(props_().getProperty('foglioId')).removeEditor(email); } catch (e) {}
  var idCal = props_().getProperty('calendarioId');
  if (idCal) condividiCalendario_(idCal, email, false);
}

function condividiCon(personaId) {
  if (!sonoProprietario_()) throw new Error('Solo ' + proprietario_() + ' può condividere l\'app.');
  var p = leggi_('Persone').filter(function (x) { return x.id === personaId; })[0];
  if (!p) throw new Error('Persona non trovata');
  var avvisi = daiAccesso_(p.email);
  p.email = String(p.email).trim().toLowerCase();
  p.accesso = 'si';
  scrivi_('Persone', p);
  return { obj: p, avvisi: avvisi };
}

function togliCondivisione(personaId) {
  if (!sonoProprietario_()) throw new Error('Solo ' + proprietario_() + ' può farlo.');
  var p = leggi_('Persone').filter(function (x) { return x.id === personaId; })[0];
  if (!p) throw new Error('Persona non trovata');
  togliAccesso_(p.email);
  p.accesso = '';
  scrivi_('Persone', p);
  return { obj: p, avvisi: [] };
}

/** Usa il servizio avanzato "Google Calendar API" se e' stato attivato nell'editor; altrimenti restituisce false. */
function condividiCalendario_(idCal, email, aggiungi) {
  if (typeof Calendar === 'undefined') return false;
  try {
    if (aggiungi) Calendar.Acl.insert({ role: 'writer', scope: { type: 'user', value: email } }, idCal);
    else Calendar.Acl.remove(idCal, 'user:' + email);
    return true;
  } catch (e) { return false; }
}

/* ---------------- Cerca documenti in una cartella (SOLO LETTURA) ---------------- */

/**
 * Accetta il link di una cartella Drive e restituisce l'elenco dei file, anche nelle sottocartelle.
 * Legge soltanto nomi e date: non apre, non sposta, non rinomina e non cancella nulla.
 */
function scansionaCartella(link) {
  controllo_();
  var testo = String(link || '').trim();
  var radice = apriCartellaDaLink_(testo);

  var imp = leggiImpostazioni_();
  imp.cartellaScansione = testo;
  props_().setProperty('impostazioni', JSON.stringify(imp));

  return elencaFile_(radice);
}

function apriCartellaDaLink_(testo) {
  testo = String(testo || '').trim();
  var m = testo.match(/folders\/([\w-]{10,})/) || testo.match(/[?&]id=([\w-]{10,})/) || testo.match(/^([\w-]{10,})$/);
  if (!m) throw new Error('Non riconosco il link della cartella. Aprila in Drive e copia l\'indirizzo dalla barra in alto.');
  try { var radice = DriveApp.getFolderById(m[1]); radice.getName(); return radice; }
  catch (e) { throw new Error('Non riesco ad aprire quella cartella: controlla il link.'); }
}

/**
 * Importa da una cartella Drive: legge il file importazione-casa.json preparato dalla chat di Claude
 * e l'elenco dei file (per copiarli dopo). SOLO LETTURA: non cambia niente nella cartella.
 */
function leggiImportazioneDrive(link) {
  controllo_();
  var radice = apriCartellaDaLink_(link);
  var it = radice.getFilesByName('importazione-casa.json');
  if (!it.hasNext()) throw new Error('In quella cartella non c\'è il file importazione-casa.json: fallo preparare prima alla chat di Claude.');
  var testo = it.next().getBlob().getDataAsString('UTF-8');
  var elenco = elencaFile_(radice);
  return { nomeCartella: elenco.nomeCartella, testo: testo, files: elenco.files, troncato: elenco.troncato };
}

function elencaFile_(radice) {
  var idApp = props_().getProperty('cartellaId');
  var inizio = Date.now(), MAX = 3000;
  var tz = Session.getScriptTimeZone();
  var out = [], coda = [{ cartella: radice, percorso: '' }], troncato = false;
  while (coda.length && !troncato) {
    var c = coda.shift();
    if (c.cartella.getId() === idApp) continue; // la cartella dell'app la conosco gia'
    var files = c.cartella.getFiles();
    while (files.hasNext()) {
      if (out.length >= MAX || Date.now() - inizio > 240000) { troncato = true; break; }
      var f = files.next();
      out.push({
        id: f.getId(), nome: f.getName(), mime: f.getMimeType(), url: f.getUrl(),
        percorso: c.percorso, modificato: Utilities.formatDate(f.getLastUpdated(), tz, 'yyyy-MM-dd')
      });
    }
    var sotto = c.cartella.getFolders();
    while (sotto.hasNext()) {
      var s = sotto.next();
      coda.push({ cartella: s, percorso: (c.percorso ? c.percorso + ' / ' : '') + s.getName() });
    }
  }
  return { nomeCartella: radice.getName(), files: out, troncato: troncato };
}

/** "Non mi interessa": la lista sta solo nel foglio dell'app, il file non viene toccato. */
function ignoraFile(id, nome) { controllo_(); scrivi_('Ignorati', { id: id, nome: nome }); return true; }
function ripristinaIgnorati() {
  controllo_();
  leggi_('Ignorati').forEach(function (x) { cancellaRiga_('Ignorati', x.id); });
  return true;
}

/* ---------------- Impostazioni ---------------- */

function salvaImpostazioni(nuove) {
  controllo_();
  var imp = leggiImpostazioni_();
  var calPrima = imp.calendario;
  Object.keys(IMPOSTAZIONI_BASE).forEach(function (k) { if (nuove[k] !== undefined) imp[k] = nuove[k]; });
  if (imp.calendario === 'principale' && !imp.calendarioPrincipale && sonoProprietario_()) {
    imp.calendarioPrincipale = CalendarApp.getDefaultCalendar().getId();
  }
  props_().setProperty('impostazioni', JSON.stringify(imp));
  // nome ed email di promemoria: ognuno i suoi
  if (nuove.nome !== undefined) PropertiesService.getUserProperties().setProperty('nome', String(nuove.nome || ''));
  if (nuove.email !== undefined) impostaEmail_(!!nuove.email);
  var spostati = 0;
  if (calPrima !== imp.calendario) spostati = sincronizzaTutto();
  return {
    impostazioni: imp, spostati: spostati,
    io: { email: utente_(), nome: nomeUtente_(), proprietario: sonoProprietario_(), emailAttiva: emailAttiva_(), proprietarioEmail: proprietario_() }
  };
}

/** Cancella e ricrea tutti gli eventi dell'app nel calendario scelto. */
function sincronizzaTutto() {
  controllo_();
  var n = 0;
  Object.keys(CON_CALENDARIO).forEach(function (tipo) {
    leggi_(tipo).forEach(function (o) {
      cancellaEventi_(o.eventi);
      try { o.eventi = creaEventi_(tipo, o); } catch (e) { o.eventi = ''; }
      scrivi_(tipo, o);
      n++;
    });
  });
  return n;
}

function aggiornaEventiPersona_(personaId) {
  Object.keys(CON_CALENDARIO).forEach(function (tipo) {
    leggi_(tipo).forEach(function (o) {
      var coinvolto = (tipo === 'Documenti' || tipo === 'Pagamenti') ? o.personaId === personaId : String(o.persone || '').split(',').indexOf(personaId) >= 0;
      if (!coinvolto) return;
      cancellaEventi_(o.eventi);
      try { o.eventi = creaEventi_(tipo, o); } catch (e) { o.eventi = ''; }
      scrivi_(tipo, o);
    });
  });
}

/** Eventi del Google Calendar di chi sta usando l'app (tutti i suoi calendari visibili). */
function eventiGoogle(daISO, aISO) {
  controllo_();
  var da = dataDa_(daISO), a = dataDa_(aISO);
  a.setDate(a.getDate() + 1);
  var idApp = props_().getProperty('calendarioId');
  var tz = Session.getScriptTimeZone();
  var out = [];
  CalendarApp.getAllCalendars().forEach(function (cal) {
    if (cal.getId() === idApp) return;
    try { if (!cal.isSelected() || cal.isHidden()) return; } catch (e) {}
    var colore = cal.getColor();
    cal.getEvents(da, a).forEach(function (ev) {
      if (ev.getTag(TAG_EVENTO)) return; // e' un evento messo dall'app: c'e' gia'
      var tg = ev.isAllDayEvent();
      var fine = ev.getEndTime();
      if (tg) fine = new Date(fine.getTime() - 1000);
      out.push({
        titolo: ev.getTitle() || '(senza titolo)',
        data: Utilities.formatDate(ev.getStartTime(), tz, 'yyyy-MM-dd'),
        fine: Utilities.formatDate(fine, tz, 'yyyy-MM-dd'),
        ora: tg ? '' : Utilities.formatDate(ev.getStartTime(), tz, 'HH:mm'),
        oraFine: tg ? '' : Utilities.formatDate(ev.getEndTime(), tz, 'HH:mm'),
        luogo: ev.getLocation() || '',
        calendario: cal.getName(),
        colore: colore
      });
    });
  });
  return out;
}

/* ---------------- Calendario: creazione eventi ---------------- */

function dataDa_(iso, ora) {
  var p = String(iso).split('-');
  var h = 0, m = 0;
  if (ora) { var q = String(ora).split(':'); h = +q[0] || 0; m = +q[1] || 0; }
  return new Date(+p[0], (+p[1]) - 1, +p[2], h, m, 0);
}

function nomePersona_(id) {
  var p = leggi_('Persone').filter(function (x) { return x.id === id; })[0];
  return p ? p.nome : '';
}

function itData_(iso) {
  var p = String(iso).split('-');
  return p[2] + '/' + p[1] + '/' + p[0];
}

function creaEventi_(tipo, o) {
  if (tipo === 'Documenti') return eventiDocumento_(o);
  if (tipo === 'Impegni') return eventiImpegno_(o);
  if (tipo === 'Progetti') return eventiProgetto_(o);
  if (tipo === 'Pagamenti') return eventiPagamento_(o);
  return '';
}

function eventiDocumento_(d) {
  if (!d.scadenza) return '';
  var cal = calendario_();
  var chi = nomePersona_(d.personaId);
  var titolo = d.tipo + (chi ? ' di ' + chi : '');
  var descr = 'Documento: ' + d.tipo + (chi ? '\nDi: ' + chi : '') +
    (d.numero ? '\nNumero: ' + d.numero : '') + (d.note ? '\nNote: ' + d.note : '') +
    '\n\n(Messo qui dall\'app ' + NOME_APP + ')';
  var ids = [];

  var ev = cal.createAllDayEvent('⚠️ Scade: ' + titolo, dataDa_(d.scadenza), { description: descr });
  ev.setTag(TAG_EVENTO, d.id);
  ev.removeAllReminders();
  ev.addPopupReminder(60 * 24 * 7);  // una settimana prima
  ev.addPopupReminder(15 * 60);      // il giorno prima alle 9
  ids.push(cal.getId() + '::' + ev.getId());

  var giorni = parseInt(d.preavviso, 10);
  if (giorni > 0) {
    var quando = dataDa_(d.scadenza);
    quando.setDate(quando.getDate() - giorni);
    var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
    if (quando >= oggi) {
      var ev2 = cal.createAllDayEvent('⏰ Da rinnovare: ' + titolo + ' (scade il ' + itData_(d.scadenza) + ')', quando, { description: descr });
      ev2.setTag(TAG_EVENTO, d.id);
      ev2.removeAllReminders();
      ev2.addPopupReminder(15 * 60);
      ids.push(cal.getId() + '::' + ev2.getId());
    }
  }
  return ids.join(',');
}

var EMOJI_CATEGORIA = {
  'Salute': '🩺', 'Scuola': '🏫', 'Sport': '⚽', 'Festa': '🎉', 'Casa': '🏠',
  'Auto': '🚗', 'Pagamenti': '💶', 'Chiesa': '🙏', 'Lavoro': '💼', 'Viaggio': '✈️', 'Altro': '📌'
};

function eventiImpegno_(o) {
  if (!o.data) return '';
  var cal = calendario_();
  var persone = String(o.persone || '').split(',').filter(String).map(nomePersona_).filter(String);
  var titolo = (EMOJI_CATEGORIA[o.categoria] || '📌') + ' ' + o.titolo + (persone.length ? ' – ' + persone.join(', ') : '');
  var opz = {
    description: (o.note ? o.note + '\n\n' : '') + (persone.length ? 'Chi: ' + persone.join(', ') + '\n' : '') + '(Messo qui dall\'app ' + NOME_APP + ')',
    location: o.luogo || ''
  };
  var tuttoGiorno = o.tuttoIlGiorno === 'si' || !o.oraInizio;
  var inizio = dataDa_(o.data, tuttoGiorno ? '' : o.oraInizio);
  var fine;
  if (!tuttoGiorno) {
    fine = o.oraFine ? dataDa_(o.data, o.oraFine) : new Date(inizio.getTime() + 60 * 60 * 1000);
    if (fine <= inizio) fine = new Date(inizio.getTime() + 60 * 60 * 1000);
  }

  var ev;
  if (o.ripeti && o.ripeti !== 'no') {
    var reg = CalendarApp.newRecurrence();
    var regola = o.ripeti === 'settimanale' ? reg.addWeeklyRule()
      : o.ripeti === 'mensile' ? reg.addMonthlyRule()
      : reg.addYearlyRule();
    if (o.ripetiFino) regola.until(dataDa_(o.ripetiFino, '23:59'));
    ev = tuttoGiorno ? cal.createAllDayEventSeries(titolo, inizio, reg, opz)
                     : cal.createEventSeries(titolo, inizio, fine, reg, opz);
  } else {
    ev = tuttoGiorno ? cal.createAllDayEvent(titolo, inizio, opz)
                     : cal.createEvent(titolo, inizio, fine, opz);
  }
  ev.setTag(TAG_EVENTO, o.id);
  ev.removeAllReminders();
  var minuti = parseInt(o.promemoria, 10);
  if (minuti > 0) ev.addPopupReminder(Math.min(minuti, 40320));
  return cal.getId() + '::' + ev.getId();
}

function euro_(n) {
  var v = parseFloat(String(n || '').replace(',', '.'));
  return isNaN(v) ? '' : v.toFixed(2).replace('.', ',') + ' €';
}

/** Bollette e pagamenti: l'avviso nel calendario c'e' solo finche' non e' pagata. */
function eventiPagamento_(p) {
  if (!p.scadenza || p.pagata === 'si') return '';
  var cal = calendario_();
  var chi = p.personaId ? nomePersona_(p.personaId) : '';
  var importo = euro_(p.importo);
  var ev = cal.createAllDayEvent('💶 Da pagare: ' + p.titolo + (importo ? ' – ' + importo : ''), dataDa_(p.scadenza), {
    description: (p.periodo ? 'Periodo: ' + p.periodo + '\n' : '') + (p.metodo ? 'Come si paga: ' + p.metodo + '\n' : '') +
      (chi ? 'Intestata a: ' + chi + '\n' : '') + (p.note ? p.note + '\n' : '') + '\n(Messo qui dall\'app ' + NOME_APP + ')'
  });
  ev.setTag(TAG_EVENTO, p.id);
  ev.removeAllReminders();
  ev.addPopupReminder(60 * 24 * 3);  // tre giorni prima
  ev.addPopupReminder(15 * 60);      // il giorno prima alle 9
  return cal.getId() + '::' + ev.getId();
}

function eventiProgetto_(p) {
  if (!p.dataObiettivo || p.stato === 'fatto') return '';
  var cal = calendario_();
  var ev = cal.createAllDayEvent('🎯 Obiettivo: ' + p.titolo, dataDa_(p.dataObiettivo), {
    description: (p.descrizione ? p.descrizione + '\n\n' : '') + '(Progetto dall\'app ' + NOME_APP + ')'
  });
  ev.setTag(TAG_EVENTO, p.id);
  ev.removeAllReminders();
  ev.addPopupReminder(60 * 24 * 7);
  return cal.getId() + '::' + ev.getId();
}

function cancellaEventi_(eventi) {
  if (!eventi) return;
  String(eventi).split(',').filter(String).forEach(function (coppia) {
    var parti = coppia.split('::');
    var cal = apriCal_(parti[0]);
    if (!cal) return;
    try {
      var serie = cal.getEventSeriesById(parti[1]);
      if (serie) { serie.deleteEventSeries(); return; }
    } catch (e) {}
    try {
      var ev = cal.getEventById(parti[1]);
      if (ev) ev.deleteEvent();
    } catch (e) {}
  });
}

/* ---------------- Email di promemoria (ognuno attiva la sua) ---------------- */

function impostaEmail_(attiva) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'controlloGiornaliero') ScriptApp.deleteTrigger(t);
  });
  if (attiva) ScriptApp.newTrigger('controlloGiornaliero').timeBased().everyDays(1).atHour(8).create();
}

/** Ogni mattina: se qualcosa sta per scadere (o c'e' un impegno domani) arriva una email. */
function controlloGiornaliero() {
  var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  var tz = Session.getScriptTimeZone();
  var righe = [];
  leggi_('Documenti').forEach(function (d) {
    if (!d.scadenza) return;
    var giorni = Math.round((dataDa_(d.scadenza) - oggi) / 86400000);
    var pre = parseInt(d.preavviso, 10) || 0;
    var chi = nomePersona_(d.personaId);
    var nome = d.tipo + (chi ? ' di ' + chi : '');
    if (giorni === 0) righe.push('🔴 OGGI scade ' + nome);
    else if (giorni === 1) righe.push('🟠 Domani scade ' + nome);
    else if (giorni === 7 || (pre > 0 && giorni === pre)) righe.push('🟡 Tra ' + giorni + ' giorni scade ' + nome + ' (' + itData_(d.scadenza) + ')');
  });
  var domani = new Date(oggi); domani.setDate(domani.getDate() + 1);
  var sDomani = Utilities.formatDate(domani, tz, 'yyyy-MM-dd');
  leggi_('Impegni').forEach(function (o) {
    if (o.data === sDomani) righe.push('📌 Domani: ' + o.titolo + (o.oraInizio ? ' alle ' + o.oraInizio : ''));
  });
  leggi_('Pagamenti').forEach(function (p) {
    if (!p.scadenza || p.pagata === 'si') return;
    var g = Math.round((dataDa_(p.scadenza) - oggi) / 86400000);
    var cosa = p.titolo + (euro_(p.importo) ? ' (' + euro_(p.importo) + ')' : '');
    if (g < 0 && g >= -30 && (-g) % 7 === 1) righe.push('🔴 Non risulta pagata: ' + cosa + ', scaduta il ' + itData_(p.scadenza));
    else if (g === 0) righe.push('💶 OGGI scade il pagamento: ' + cosa);
    else if (g === 1 || g === 3) righe.push('💶 Tra ' + g + (g === 1 ? ' giorno' : ' giorni') + ' da pagare: ' + cosa);
  });
  if (!righe.length) return;
  var nome = nomeUtente_();
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: '🏠 ' + NOME_APP + ': ' + righe.length + (righe.length === 1 ? ' cosa' : ' cose') + ' da ricordare',
    body: 'Ciao' + (nome ? ' ' + nome : '') + '! 👋\n\nPromemoria di oggi:\n\n' + righe.join('\n') + '\n\nUn abbraccio,\nla tua app ' + NOME_APP
  });
}

/** Da lanciare a mano UNA volta dall'editor: chiede i permessi e prepara foglio, cartella e calendario. */
function primoAvvio() {
  if (!proprietario_()) props_().setProperty('proprietario', utente_());
  foglio_();
  cartella_();
  calendario_();
  Logger.log('Tutto pronto! Proprietario: ' + proprietario_() + ' - Cartella: ' + cartella_().getUrl());
}
