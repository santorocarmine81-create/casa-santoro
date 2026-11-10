/**
 * Casa Santoro - documenti, scadenze e impegni di famiglia.
 * Parte "Google" dell'app: salva i dati in un Foglio Google,
 * i file in una cartella di Drive e mette tutto nel Google Calendar.
 *
 * Il foglio, la cartella e il calendario si creano da soli al primo avvio.
 */

var NOME_APP = 'Casa Santoro';
var TAG_EVENTO = 'casaSantoro';

var CAMPI = {
  Persone:   ['id', 'nome', 'relazione', 'nascita', 'colore', 'emoji', 'note', 'cognome', 'altriNomi', 'codiceFiscale'],
  Documenti: ['id', 'personaId', 'tipo', 'numero', 'rilascio', 'scadenza', 'preavviso', 'note', 'files', 'eventi', 'aggiornato'],
  Ignorati:  ['id', 'nome'],
  Impegni:   ['id', 'titolo', 'categoria', 'data', 'oraInizio', 'oraFine', 'tuttoIlGiorno', 'persone', 'luogo', 'note', 'ripeti', 'ripetiFino', 'promemoria', 'eventi', 'aggiornato']
};

var IMPOSTAZIONI_BASE = {
  nome: 'Carmine',
  calendario: 'dedicato',   // 'dedicato' = calendario "Casa Santoro", 'principale' = il tuo calendario di sempre, 'altro' = calendario condiviso da un altro account
  preavviso: 30,
  mostraGoogle: true,
  email: false,
  cartellaScansione: '',
  calendarioAltro: ''
};

/* ---------------- Pagina ---------------- */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(NOME_APP)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------------- Foglio, cartella, calendario ---------------- */

function props_() { return PropertiesService.getScriptProperties(); }

var FOGLIO_CACHE_ = null;

function foglio_() {
  if (FOGLIO_CACHE_) return FOGLIO_CACHE_;
  var id = props_().getProperty('foglioId');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create(NOME_APP + ' - dati (non modificare a mano)');
    props_().setProperty('foglioId', ss.getId());
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
  if (id) { try { var c = DriveApp.getFolderById(id); if (!c.isTrashed()) return c; } catch (e) {} }
  var nuova = DriveApp.createFolder(NOME_APP + ' - Documenti');
  props_().setProperty('cartellaId', nuova.getId());
  return nuova;
}

function cartellaPersona_(nome) {
  var base = cartella_();
  var nomeCartella = nome || 'Senza nome';
  var it = base.getFoldersByName(nomeCartella);
  return it.hasNext() ? it.next() : base.createFolder(nomeCartella);
}

function calendario_() {
  var imp = leggiImpostazioni_();
  if (imp.calendario === 'principale') return CalendarApp.getDefaultCalendar();
  if (imp.calendario === 'altro') {
    // Calendario di un altro account, condiviso con questo con il permesso "Apportare modifiche agli eventi"
    var altro = CalendarApp.getCalendarById(imp.calendarioAltro);
    if (!altro) { try { altro = CalendarApp.subscribeToCalendar(imp.calendarioAltro); } catch (e) {} }
    if (!altro) throw new Error('Non vedo il calendario "' + imp.calendarioAltro + '": va condiviso con ' + Session.getEffectiveUser().getEmail() + ' con il permesso di modificare gli eventi.');
    return altro;
  }
  var id = props_().getProperty('calendarioId');
  if (id) { var c = CalendarApp.getCalendarById(id); if (c) return c; }
  var cal = CalendarApp.createCalendar('🏠 ' + NOME_APP, {
    summary: 'Scadenze e impegni di famiglia (dall\'app ' + NOME_APP + ')',
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
  if (s) { try { var o = JSON.parse(s); Object.keys(o).forEach(function (k) { imp[k] = o[k]; }); } catch (e) {} }
  return imp;
}

/* ---------------- Funzioni chiamate dall'app ---------------- */

function getTutto() {
  var imp = leggiImpostazioni_();
  imp.emailAttiva = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'controlloGiornaliero'; });
  return {
    persone: leggi_('Persone'),
    documenti: leggi_('Documenti'),
    impegni: leggi_('Impegni'),
    ignorati: leggi_('Ignorati').map(function (x) { return x.id; }),
    impostazioni: imp,
    link: {
      cartella: cartella_().getUrl(),
      foglio: foglio_().getUrl()
    },
    email: Session.getEffectiveUser().getEmail()
  };
}

function salva(tipo, obj) {
  if (!CAMPI[tipo]) throw new Error('Tipo sconosciuto: ' + tipo);
  if (!obj.id) obj.id = Utilities.getUuid().slice(0, 8);
  var avviso = '';
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    if (tipo === 'Persone') {
      var prima = leggi_('Persone').filter(function (x) { return x.id === obj.id; })[0];
      scrivi_(tipo, obj);
      // Se cambi il nome, aggiorno anche i titoli nel calendario
      if (prima && prima.nome !== obj.nome) aggiornaEventiPersona_(obj.id);
      return { obj: obj, avviso: '' };
    }
    if (tipo === 'Documenti' || tipo === 'Impegni') {
      var vecchio = leggi_(tipo).filter(function (x) { return x.id === obj.id; })[0];
      if (vecchio) cancellaEventi_(vecchio.eventi);
      obj.eventi = '';
      try {
        obj.eventi = tipo === 'Documenti' ? eventiDocumento_(obj) : eventiImpegno_(obj);
      } catch (e) {
        avviso = 'Salvato, ma il calendario non ha risposto: ' + e.message;
      }
      obj.aggiornato = new Date().toISOString();
    }
    scrivi_(tipo, obj);
  } finally {
    lock.releaseLock();
  }
  return { obj: obj, avviso: avviso };
}

function elimina(tipo, id) {
  var vecchio = leggi_(tipo).filter(function (x) { return x.id === id; })[0];
  if (!vecchio) return true;
  if (vecchio.eventi) cancellaEventi_(vecchio.eventi);
  if (tipo === 'Documenti' && vecchio.files) {
    JSON.parse(vecchio.files || '[]').forEach(function (f) { cestinaFile(f.id); });
  }
  cancellaRiga_(tipo, id);
  return true;
}

/** Riceve un file (foto o PDF) in base64 e lo salva nella cartella della persona. */
function caricaFile(nomePersona, nomeFile, mime, base64) {
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime || 'application/octet-stream', nomeFile);
  var file = cartellaPersona_(nomePersona).createFile(blob);
  return { id: file.getId(), nome: file.getName(), mime: file.getMimeType(), url: file.getUrl() };
}

/**
 * Fa una COPIA nella cartella dell'app di un file trovato nel tuo Drive.
 * L'originale non viene ne' spostato, ne' rinominato, ne' modificato.
 */
function copiaFileDrive(fileId, nomePersona) {
  var originale = DriveApp.getFileById(fileId);
  var copia = originale.makeCopy(originale.getName(), cartellaPersona_(nomePersona));
  return { id: copia.getId(), nome: copia.getName(), mime: copia.getMimeType(), url: copia.getUrl() };
}

/** Vero solo se il file sta dentro la cartella "Casa Santoro - Documenti" (o in una sua sottocartella). */
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
    if (fileId === props_().getProperty('foglioId')) return false; // il foglio dei dati non si tocca
    var f = DriveApp.getFileById(fileId);
    if (!fileDellApp_(f)) return false;
    f.setTrashed(true);
  } catch (e) { return false; }
  return true;
}

/* ---------------- Cerca documenti in una cartella (SOLO LETTURA) ---------------- */

/**
 * Accetta il link di una cartella Drive e restituisce l'elenco dei file, anche nelle sottocartelle.
 * Legge soltanto nomi e date: non apre, non sposta, non rinomina e non cancella nulla.
 */
function scansionaCartella(link) {
  var testo = String(link || '').trim();
  var m = testo.match(/folders\/([\w-]{10,})/) || testo.match(/[?&]id=([\w-]{10,})/) || testo.match(/^([\w-]{10,})$/);
  if (!m) throw new Error('Non riconosco il link della cartella. Aprila in Drive e copia l\'indirizzo dalla barra in alto.');
  var radice;
  try { radice = DriveApp.getFolderById(m[1]); radice.getName(); }
  catch (e) { throw new Error('Non riesco ad aprire quella cartella: controlla il link.'); }

  var imp = leggiImpostazioni_();
  imp.cartellaScansione = testo;
  props_().setProperty('impostazioni', JSON.stringify(imp));

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
function ignoraFile(id, nome) { scrivi_('Ignorati', { id: id, nome: nome }); return true; }
function ripristinaIgnorati() {
  leggi_('Ignorati').forEach(function (x) { cancellaRiga_('Ignorati', x.id); });
  return true;
}

function salvaImpostazioni(nuove) {
  var imp = leggiImpostazioni_();
  var calPrima = imp.calendario;
  Object.keys(IMPOSTAZIONI_BASE).forEach(function (k) { if (nuove[k] !== undefined) imp[k] = nuove[k]; });
  props_().setProperty('impostazioni', JSON.stringify(imp));
  impostaEmail_(!!imp.email);
  var spostati = 0;
  if (calPrima !== imp.calendario) spostati = sincronizzaTutto();
  imp.emailAttiva = !!imp.email;
  return { impostazioni: imp, spostati: spostati };
}

/** Cancella e ricrea tutti gli eventi dell'app nel calendario scelto. */
function sincronizzaTutto() {
  var n = 0;
  ['Documenti', 'Impegni'].forEach(function (tipo) {
    leggi_(tipo).forEach(function (o) {
      cancellaEventi_(o.eventi);
      try { o.eventi = tipo === 'Documenti' ? eventiDocumento_(o) : eventiImpegno_(o); } catch (e) { o.eventi = ''; }
      scrivi_(tipo, o);
      n++;
    });
  });
  return n;
}

function aggiornaEventiPersona_(personaId) {
  leggi_('Documenti').forEach(function (d) {
    if (d.personaId !== personaId) return;
    cancellaEventi_(d.eventi);
    try { d.eventi = eventiDocumento_(d); } catch (e) { d.eventi = ''; }
    scrivi_('Documenti', d);
  });
  leggi_('Impegni').forEach(function (o) {
    if (String(o.persone || '').split(',').indexOf(personaId) < 0) return;
    cancellaEventi_(o.eventi);
    try { o.eventi = eventiImpegno_(o); } catch (e) { o.eventi = ''; }
    scrivi_('Impegni', o);
  });
}

/** Eventi del tuo Google Calendar (tutti i calendari visibili), per vederli anche nell'app. */
function eventiGoogle(daISO, aISO) {
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

function cancellaEventi_(eventi) {
  if (!eventi) return;
  String(eventi).split(',').filter(String).forEach(function (coppia) {
    var parti = coppia.split('::');
    var cal = CalendarApp.getCalendarById(parti[0]);
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

/* ---------------- Email di promemoria ---------------- */

function impostaEmail_(attiva) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'controlloGiornaliero') ScriptApp.deleteTrigger(t);
  });
  if (attiva) ScriptApp.newTrigger('controlloGiornaliero').timeBased().everyDays(1).atHour(8).create();
}

/** Ogni mattina: se qualcosa sta per scadere (o c'e' un impegno domani) ti arriva una email. */
function controlloGiornaliero() {
  var oggi = new Date(); oggi.setHours(0, 0, 0, 0);
  var tz = Session.getScriptTimeZone();
  var imp = leggiImpostazioni_();
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
  if (!righe.length) return;
  MailApp.sendEmail({
    to: Session.getEffectiveUser().getEmail(),
    subject: '🏠 ' + NOME_APP + ': ' + righe.length + (righe.length === 1 ? ' cosa' : ' cose') + ' da ricordare',
    body: 'Ciao ' + imp.nome + '! 👋\n\nPromemoria di oggi:\n\n' + righe.join('\n') + '\n\nUn abbraccio,\nla tua app ' + NOME_APP
  });
}

/** Da lanciare a mano una volta dall'editor: chiede tutti i permessi e prepara foglio, cartella e calendario. */
function primoAvvio() {
  foglio_();
  cartella_();
  calendario_();
  Logger.log('Tutto pronto! Cartella: ' + cartella_().getUrl());
}
