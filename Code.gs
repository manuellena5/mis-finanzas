/* ═══════════════════════════════════════════════════════════════
   MIS FINANZAS — Google Apps Script (Code.gs)
   Backend de un solo usuario sobre Google Sheets.

   SETUP:
   1. Creá una planilla nueva en Google Sheets (será la base de datos).
   2. Extensiones → Apps Script. Borrá todo y pegá este código.
   3. Guardá (Ctrl+S).
   4. Implementar → Nueva implementación → Tipo: Aplicación web.
   5. Ejecutar como: Yo.  Quién tiene acceso: Solo yo (o Cualquiera con enlace).
   6. Implementar → autorizá → copiá la URL /exec.
   7. Pegá esa URL en la app (pestaña Config).
═══════════════════════════════════════════════════════════════ */

const MOV_SHEET    = "Movimientos";
const REGLAS_SHEET = "Reglas";
const CUENTAS_SHEET= "Cuentas";
const INV_SHEET    = "Inversiones";
const CONFIG_SHEET = "Config";

const MOV_COLS = [
  "Fecha","Descripcion","Moneda","Monto","Tipo",
  "Categoria","Subcategoria","Cuenta","Fuente","Estado",
  "Cuotas","Observaciones","Hash","ID","Periodo","FechaPago","CuentaDestino"
];
const REGLAS_COLS  = ["patron","tipoPatron","categoria","subcategoria","tipo","cuenta","prioridad","hits","id"];
const CUENTAS_COLS = ["nombre","tipo","moneda","saldo","enPatrimonio","fechaSaldo","id"];
const INV_COLS     = ["broker","especie","descripcion","tipoActivo","cantidad","precio","valorARS","valorUSD","fecha","id"];
const CONFIG_COLS  = ["clave","valor"];

/* ───────── Routing ───────── */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    return jsonResponse(handleAction(data));
  } catch (err) {
    return jsonResponse({ ok:false, error: err.message });
  }
}
function doGet(e) {
  // Permite GET ?action=all para bootstrap sin preflight CORS
  if (e && e.parameter && e.parameter.action) {
    try { return jsonResponse(handleAction(e.parameter)); }
    catch (err) { return jsonResponse({ ok:false, error: err.message }); }
  }
  return jsonResponse({ ok:true, msg:"Mis Finanzas API activa" });
}

function handleAction(data) {
  switch (data.action) {

    case "all": return handleAll();

    /* ── Movimientos ── */
    case "list":       return { ok:true, movimientos: listMov() };
    case "save":       return saveMov(data.mov);
    case "update":     return saveMov(data.mov, true);
    case "delete":     return deleteRow(MOV_SHEET, 14, data.id);
    case "saveBatch":  return saveBatchMov(data.movs || []);
    case "deleteAllMov": {
      const sh = getOrCreateSheet(MOV_SHEET, MOV_COLS);
      const last = sh.getLastRow();
      if (last > 1) sh.deleteRows(2, last - 1);
      return { ok:true };
    }

    /* ── Reglas ── */
    case "listReglas": return { ok:true, reglas: listGeneric(REGLAS_SHEET, REGLAS_COLS) };
    case "saveReglas": return saveGenericBatch(REGLAS_SHEET, REGLAS_COLS, data.reglas || [], "id");
    case "deleteRegla":return deleteRow(REGLAS_SHEET, 9, data.id);

    /* ── Cuentas ── */
    case "listCuentas": return { ok:true, cuentas: listGeneric(CUENTAS_SHEET, CUENTAS_COLS) };
    case "saveCuenta":  return saveGenericOne(CUENTAS_SHEET, CUENTAS_COLS, data.cuenta, "id", 7);
    case "deleteCuenta":return deleteRow(CUENTAS_SHEET, 7, data.id);

    /* ── Inversiones ── */
    case "listInversiones": return { ok:true, inversiones: listGeneric(INV_SHEET, INV_COLS) };
    case "saveInversion":   return saveGenericOne(INV_SHEET, INV_COLS, data.inversion, "id", 10);
    case "deleteInversion": return deleteRow(INV_SHEET, 10, data.id);
    case "replaceInversionesBroker": return replaceInvBroker(data.broker, data.inversiones || []);

    /* ── Config ── */
    case "getConfig": return { ok:true, config: getConfig() };
    case "setConfig": return setConfig(data.clave, data.valor);

    default: return { ok:false, error:"Accion desconocida: " + data.action };
  }
}

/* ───────── Bootstrap: todo en un request ───────── */
function handleAll() {
  return {
    ok: true,
    movimientos: listMov(),
    reglas:      listGeneric(REGLAS_SHEET, REGLAS_COLS),
    cuentas:     listGeneric(CUENTAS_SHEET, CUENTAS_COLS),
    inversiones: listGeneric(INV_SHEET, INV_COLS),
    config:      getConfig()
  };
}

/* ───────── Movimientos ───────── */
function movToRow(m) {
  return [
    m.fecha, m.descripcion, m.moneda, Number(m.monto), m.tipo || "",
    m.categoria || "", m.subcategoria || "", m.cuenta || "", m.fuente || "manual",
    m.estado || "pendiente", m.cuotas || "", m.observaciones || "",
    m.hash || "", m.id, m.periodo || "", m.fechaPago || "", m.cuentaDestino || ""
  ];
}
function rowToMov(r) {
  return {
    fecha:String(r[0]), descripcion:String(r[1]), moneda:String(r[2]), monto:Number(r[3]),
    tipo:String(r[4]||""), categoria:String(r[5]||""), subcategoria:String(r[6]||""),
    cuenta:String(r[7]||""), fuente:String(r[8]||""), estado:String(r[9]||""),
    cuotas:String(r[10]||""), observaciones:String(r[11]||""), hash:String(r[12]||""), id:String(r[13]),
    periodo:String(r[14]||""), fechaPago:String(r[15]||""), cuentaDestino:String(r[16]||"")
  };
}
function listMov() {
  const sh = getOrCreateSheet(MOV_SHEET, MOV_COLS);
  const all = sh.getDataRange().getValues();
  return all.slice(1).filter(r => r[13]).map(r => { r[0]=formatFecha(r[0]); return rowToMov(r); }).reverse();
}
function saveMov(m, isUpdate) {
  const sh = getOrCreateSheet(MOV_SHEET, MOV_COLS);
  const rows = sh.getDataRange().getValues();
  for (let i=1;i<rows.length;i++){
    if (String(rows[i][13])===String(m.id)){
      sh.getRange(i+1,1,1,MOV_COLS.length).setValues([movToRow(m)]);
      return { ok:true };
    }
  }
  sh.appendRow(movToRow(m));
  return { ok:true };
}
function saveBatchMov(movs) {
  const sh = getOrCreateSheet(MOV_SHEET, MOV_COLS);
  const all = sh.getDataRange().getValues();
  const existing = {};
  for (let i=1;i<all.length;i++){ if (all[i][12]) existing[String(all[i][12])] = true; }
  const toAdd = [];
  let skipped = 0;
  for (const m of movs){
    if (m.hash && existing[String(m.hash)]) { skipped++; continue; }
    if (m.hash) existing[String(m.hash)] = true;
    toAdd.push(movToRow(m));
  }
  if (toAdd.length){
    sh.getRange(sh.getLastRow()+1, 1, toAdd.length, MOV_COLS.length).setValues(toAdd);
  }
  return { ok:true, saved: toAdd.length, skipped: skipped };
}

/* ───────── Inversiones: reemplazar por broker ───────── */
function replaceInvBroker(broker, lista) {
  const sh = getOrCreateSheet(INV_SHEET, INV_COLS);
  const all = sh.getDataRange().getValues();
  for (let i=all.length-1;i>=1;i--){
    if (String(all[i][0]).toLowerCase() === String(broker).toLowerCase()) sh.deleteRow(i+1);
  }
  const rows = lista.map(x => INV_COLS.map(c => (c==="cantidad"||c==="precio"||c==="valorARS"||c==="valorUSD") ? Number(x[c]||0) : (x[c]||"")));
  if (rows.length) sh.getRange(sh.getLastRow()+1,1,rows.length,INV_COLS.length).setValues(rows);
  return { ok:true, saved: rows.length };
}

/* ───────── Genéricos (Reglas, Cuentas, Inversiones) ───────── */
function listGeneric(name, cols) {
  const sh = getOrCreateSheet(name, cols);
  const all = sh.getDataRange().getValues();
  if (all.length<=1) return [];
  const idIdx = cols.length-1;
  return all.slice(1).filter(r => r[idIdx]).map(r => {
    const o = {};
    cols.forEach((c,i)=> o[c] = (r[i] instanceof Date) ? formatFecha(r[i]) : r[i]);
    return o;
  });
}
function saveGenericOne(name, cols, obj, idKey, idColNum) {
  const sh = getOrCreateSheet(name, cols);
  const all = sh.getDataRange().getValues();
  const row = cols.map(c => obj[c] !== undefined ? obj[c] : "");
  for (let i=1;i<all.length;i++){
    if (String(all[i][idColNum-1])===String(obj[idKey])){
      sh.getRange(i+1,1,1,cols.length).setValues([row]);
      return { ok:true };
    }
  }
  sh.appendRow(row);
  return { ok:true };
}
function saveGenericBatch(name, cols, list, idKey) {
  const sh = getOrCreateSheet(name, cols);
  const all = sh.getDataRange().getValues();
  const idIdx = cols.length-1;
  const rowOf = {};
  for (let i=1;i<all.length;i++){ if (all[i][idIdx]) rowOf[String(all[i][idIdx])] = i+1; }
  for (const obj of list){
    const row = cols.map(c => obj[c] !== undefined ? obj[c] : "");
    if (rowOf[String(obj[idKey])]) sh.getRange(rowOf[String(obj[idKey])],1,1,cols.length).setValues([row]);
    else sh.appendRow(row);
  }
  return { ok:true };
}
function deleteRow(name, idColNum, id) {
  const sh = getOrCreateSheet(name, colsFor(name));
  const all = sh.getDataRange().getValues();
  for (let i=all.length-1;i>=1;i--){
    if (String(all[i][idColNum-1])===String(id)){ sh.deleteRow(i+1); return { ok:true }; }
  }
  return { ok:true };
}
function colsFor(name){
  return name===MOV_SHEET?MOV_COLS:name===REGLAS_SHEET?REGLAS_COLS:name===CUENTAS_SHEET?CUENTAS_COLS:name===INV_SHEET?INV_COLS:CONFIG_COLS;
}

/* ───────── Config (clave/valor) ───────── */
function getConfig() {
  const sh = getOrCreateSheet(CONFIG_SHEET, CONFIG_COLS);
  const all = sh.getDataRange().getValues();
  const o = {};
  for (let i=1;i<all.length;i++){ if (all[i][0]) o[String(all[i][0])] = String(all[i][1]); }
  return o;
}
function setConfig(clave, valor) {
  const sh = getOrCreateSheet(CONFIG_SHEET, CONFIG_COLS);
  const all = sh.getDataRange().getValues();
  for (let i=1;i<all.length;i++){
    if (String(all[i][0])===String(clave)){ sh.getRange(i+1,2).setValue(valor); return { ok:true }; }
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
    const h = sh.getRange(1,1,1,cols.length);
    h.setValues([cols]); h.setBackground("#0F5132"); h.setFontColor("#ffffff"); h.setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}
function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function formatFecha(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return val.getFullYear()+"-"+String(val.getMonth()+1).padStart(2,"0")+"-"+String(val.getDate()).padStart(2,"0");
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}
