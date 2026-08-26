/* ═══════════════════════════════════════════════════════════════
   MIS FINANZAS — Google Apps Script (Code.gs)
   Backend de un solo usuario sobre Google Sheets.
   Fase 1: Cuentas + Config.

   SETUP:
   1. Creá una planilla nueva en Google Sheets (será la base de datos).
   2. Extensiones → Apps Script. Borrá todo y pegá este código.
   3. Guardá (Ctrl+S).
   4. Implementar → Nueva implementación → Tipo: Aplicación web.
   5. Ejecutar como: Yo.  Quién tiene acceso: Cualquiera con el enlace.
   6. Implementar → autorizá → copiá la URL /exec.
   7. Pegá esa URL en la app, pestaña Ajustes → Conexión.

   IMPORTANTE: al agregar columnas en fases futuras, agregarlas SIEMPRE
   al final del array de columnas. Nunca reordenar.
═══════════════════════════════════════════════════════════════ */

const CUENTAS_SHEET = "Cuentas";
const CONFIG_SHEET  = "Config";

const CUENTAS_COLS = ["ID","Nombre","Tipo","Moneda","SaldoInicial","FechaInicial","EnPatrimonio","Orden","Activo"];
const CONFIG_COLS  = ["clave","valor"];

/* ───────── Routing ───────── */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return jsonResponse(handleAction(data));
  } catch (err) {
    return jsonResponse({ ok:false, error: String(err && err.message || err) });
  }
}

function doGet(e) {
  // ?action=... permite debuggear desde el navegador sin preflight CORS
  if (e && e.parameter && e.parameter.action) {
    try { return jsonResponse(handleAction(e.parameter)); }
    catch (err) { return jsonResponse({ ok:false, error: String(err && err.message || err) }); }
  }
  return jsonResponse({ ok:true, msg:"Mis Finanzas API activa", version:"fase1" });
}

function handleAction(data) {
  switch (data.action) {
    case "ping":         return { ok:true, msg:"pong" };

    /* Un request para todo */
    case "bootstrap":    return handleBootstrap();

    /* Cuentas */
    case "listCuentas":  return { ok:true, cuentas: listCuentas() };
    case "saveCuenta":   return saveCuenta(data.cuenta);
    case "deleteCuenta": return deleteCuenta(data.id);

    /* Config */
    case "getConfig":    return { ok:true, config: getConfig() };
    case "setConfig":    return setConfig(data.clave, data.valor);

    default: return { ok:false, error:"Accion desconocida: " + data.action };
  }
}

/* ───────── Bootstrap ───────── */
function handleBootstrap() {
  return {
    ok: true,
    cuentas: listCuentas(),   // devuelve todas, con el flag `activo`; el front filtra
    config:  getConfig()
  };
}

/* ───────── Cuentas ───────── */
function cuentaToRow(c) {
  return [
    String(c.id || uid()),
    String(c.nombre || ""),
    String(c.tipo || "otro"),
    String(c.moneda || "ARS"),
    Number(c.saldoInicial || 0),
    String(c.fechaInicial || ""),
    c.enPatrimonio === false ? false : true,
    Number(c.orden || 0),
    c.activo === false ? false : true
  ];
}

function rowToCuenta(r) {
  return {
    id:            String(r[0]),
    nombre:        String(r[1] || ""),
    tipo:          String(r[2] || "otro"),
    moneda:        String(r[3] || "ARS"),
    saldoInicial:  Number(r[4] || 0),
    fechaInicial:  formatFecha(r[5]),
    enPatrimonio:  toBool(r[6], true),
    orden:         Number(r[7] || 0),
    activo:        toBool(r[8], true)
  };
}

function listCuentas() {
  const sh  = getOrCreateSheet(CUENTAS_SHEET, CUENTAS_COLS);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return [];
  return all.slice(1)
    .filter(r => r[0])
    .map(rowToCuenta)
    .sort((a,b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre, "es"));
}

function saveCuenta(c) {
  if (!c || !String(c.nombre || "").trim()) return { ok:false, error:"La cuenta necesita un nombre" };
  const sh  = getOrCreateSheet(CUENTAS_SHEET, CUENTAS_COLS);
  const all = sh.getDataRange().getValues();
  if (!c.id) c.id = uid();
  const row = cuentaToRow(c);
  for (let i = 1; i < all.length; i++) {
    if (String(all[i][0]) === String(c.id)) {
      sh.getRange(i+1, 1, 1, CUENTAS_COLS.length).setValues([row]);
      return { ok:true, id:c.id };
    }
  }
  sh.appendRow(row);
  return { ok:true, id:c.id };
}

function deleteCuenta(id) {
  const sh  = getOrCreateSheet(CUENTAS_SHEET, CUENTAS_COLS);
  const all = sh.getDataRange().getValues();
  for (let i = all.length - 1; i >= 1; i--) {
    if (String(all[i][0]) === String(id)) { sh.deleteRow(i+1); return { ok:true }; }
  }
  return { ok:true };
}

/* ───────── Config (clave/valor) ───────── */
function getConfig() {
  const sh  = getOrCreateSheet(CONFIG_SHEET, CONFIG_COLS);
  const all = sh.getDataRange().getValues();
  const o = {};
  for (let i = 1; i < all.length; i++) {
    if (all[i][0]) o[String(all[i][0])] = String(all[i][1]);
  }
  return o;
}

function setConfig(clave, valor) {
  if (!clave) return { ok:false, error:"Falta la clave" };
  const sh  = getOrCreateSheet(CONFIG_SHEET, CONFIG_COLS);
  const all = sh.getDataRange().getValues();
  for (let i = 1; i < all.length; i++) {
    if (String(all[i][0]) === String(clave)) {
      sh.getRange(i+1, 2).setValue(valor);
      return { ok:true };
    }
  }
  sh.appendRow([clave, valor]);
  return { ok:true };
}

/* ───────── Helpers ───────── */
function getOrCreateSheet(name, cols) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    const h = sh.getRange(1, 1, 1, cols.length);
    h.setValues([cols]);
    h.setBackground("#0F5132");
    h.setFontColor("#ffffff");
    h.setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function toBool(v, def) {
  if (v === "" || v === null || v === undefined) return def;
  if (typeof v === "boolean") return v;
  const s = String(v).trim().toLowerCase();
  if (s === "false" || s === "no" || s === "0") return false;
  if (s === "true"  || s === "si" || s === "sí" || s === "1") return true;
  return def;
}

function formatFecha(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return val.getFullYear() + "-" +
           String(val.getMonth()+1).padStart(2,"0") + "-" +
           String(val.getDate()).padStart(2,"0");
  }
  const s = String(val).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? m[1]+"-"+m[2]+"-"+m[3] : s;
}
