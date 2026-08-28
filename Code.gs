/* ═══════════════════════════════════════════════════════════════
   MIS FINANZAS — Google Apps Script (Code.gs)
   Backend de un solo usuario sobre Google Sheets.
   Hojas: Cuentas, Categorias, ModosPago, Movimientos, Inversiones, Config.

   SETUP:
   1. Creá una planilla nueva en Google Sheets (será la base de datos).
   2. Extensiones → Apps Script. Borrá todo y pegá este código.
   3. Guardá (Ctrl+S).
   4. Ejecutá una vez la función `generarToken` (selector de funciones → Ejecutar).
      Autorizá los permisos y copiá el token que aparece en el registro.
   5. Implementar → Nueva implementación → Tipo: Aplicación web.
   6. Ejecutar como: Yo.  Quién tiene acceso: Cualquiera con el enlace.
   7. Implementar → copiá la URL /exec.
   8. Pegá la URL y el token en la app, pestaña Ajustes → Conexión.

   AL ACTUALIZAR EL CÓDIGO (cada fase nueva): pegá el código, guardá y andá a
   Implementar → Administrar implementaciones → ✏️ (editar) → Versión: Nueva
   versión → Implementar. Así la URL /exec sigue siendo la misma.
   Si en vez de eso creás una implementación nueva, te da otra URL y la vieja
   sigue sirviendo el código viejo.

   SEGURIDAD: la app se publica como "Cualquiera con el enlace" porque el fetch
   del navegador desde GitHub Pages no puede autenticarse con tu cuenta. Por eso
   toda acción exige un token compartido, guardado en las Propiedades del script
   (nunca en este archivo, que sí va al repo público). Sin el token, la URL no
   devuelve datos.

   IMPORTANTE: al agregar columnas en fases futuras, agregarlas SIEMPRE
   al final del array de columnas. Nunca reordenar.
═══════════════════════════════════════════════════════════════ */

const CUENTAS_SHEET = "Cuentas";
const CONFIG_SHEET  = "Config";
const MOV_SHEET     = "Movimientos";
const CAT_SHEET     = "Categorias";
const MODOS_SHEET   = "ModosPago";
const INV_SHEET     = "Inversiones";
const REGLAS_SHEET  = "Reglas";

const CUENTAS_COLS = ["ID","Nombre","Tipo","Moneda","SaldoInicial","FechaInicial","EnPatrimonio","Orden","Activo"];
const CONFIG_COLS  = ["clave","valor"];
const CAT_COLS     = ["ID","Nombre","Aplica","Color","Orden","Activo"];
const MODOS_COLS   = ["ID","Nombre","Orden","Activo"];

/* Movimientos: Cuenta, CuentaDestino y Categoria guardan el ID de su ficha
   (así renombrarlas no rompe el historial). ModoPago guarda el nombre.       */
const MOV_COLS = [
  "ID","Mes","Fecha","Tipo","Categoria","Concepto","Cuenta","CuentaDestino",
  "Moneda","Monto","MonedaDestino","MontoDestino","Cotizacion","ModoPago","Observacion","Timestamp",
  "Hash","Fuente"
];

/* Reglas de autocategorización por patrón sobre el Concepto. */
const REGLAS_COLS = ["ID","Patron","TipoPatron","Categoria","Tipo","Prioridad","Hits","Activo"];

/* Tenencias cargadas a mano. `ValorActual` = Cantidad × PrecioActual, lo calcula
   el backend para que la hoja se pueda leer y sumar sin la app. */
const INV_COLS = ["ID","Broker","Especie","Descripcion","TipoActivo","Cantidad","PrecioActual","Moneda","ValorActual","Fecha"];

/* Zona horaria de la app: los sellos de tiempo se guardan en hora argentina,
   no en UTC, para que la planilla se lea directo. */
const TZ = "America/Argentina/Buenos_Aires";

/** "yyyy-MM-dd HH:mm:ss" en hora de Argentina. */
function ahoraAR() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd HH:mm:ss");
}

/* ───────── Token ─────────
   Vive en las Propiedades del script, no en el código. Para verlo o cambiarlo:
   Configuración del proyecto ⚙ → Propiedades del script.                      */
const TOKEN_KEY = "MF_TOKEN";

function getToken() {
  return String(PropertiesService.getScriptProperties().getProperty(TOKEN_KEY) || "").trim();
}

/** Ejecutar UNA vez desde el editor: genera el token y lo deja en el registro. */
function generarToken() {
  const t = Utilities.getUuid().replace(/-/g, "");
  PropertiesService.getScriptProperties().setProperty(TOKEN_KEY, t);
  Logger.log("Token de Mis Finanzas (pegalo en Ajustes → Conexión):\n" + t);
  return t;
}

/** Compara sin cortar en la primera diferencia. */
function tokenValido(recibido) {
  const esperado = getToken();
  const a = String(recibido || "");
  if (!esperado || a.length !== esperado.length) return false;
  let dif = 0;
  for (let i = 0; i < esperado.length; i++) dif |= a.charCodeAt(i) ^ esperado.charCodeAt(i);
  return dif === 0;
}

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
  // Chequeo de salud: no devuelve datos, sólo confirma qué código está publicado.
  return jsonResponse({
    ok: true,
    msg: "Mis Finanzas API activa",
    version: "fase7",
    auth: "token",
    tokenConfigurado: !!getToken()
  });
}

function handleAction(data) {
  if (!getToken()) {
    return { ok:false, error:"El backend no tiene token configurado. Ejecutá la función generarToken() desde el editor de Apps Script." };
  }
  if (!tokenValido(data.token)) {
    return { ok:false, error:"Token inválido. Revisá Ajustes → Conexión." };
  }

  switch (data.action) {
    case "ping":         return { ok:true, msg:"pong" };

    /* Un request para todo */
    case "bootstrap":    return handleBootstrap();

    /* Cuentas */
    case "listCuentas":  return { ok:true, cuentas: listCuentas() };
    case "saveCuenta":   return saveCuenta(data.cuenta);
    case "deleteCuenta": return deleteCuenta(data.id);

    /* Categorías */
    case "listCategorias":  return { ok:true, categorias: listCategorias() };
    case "saveCategoria":   return saveCategoria(data.categoria);
    case "saveCategorias":  return saveCategorias(data.categorias || []);
    case "deleteCategoria": return deleteCategoria(data.id);

    /* Modos de pago */
    case "listModosPago":  return { ok:true, modosPago: listModosPago() };
    case "saveModoPago":   return saveModoPago(data.modoPago);
    case "saveModosPago":  return saveModosPago(data.modosPago || []);
    case "deleteModoPago": return deleteModoPago(data.id);

    /* Movimientos */
    case "listMovimientos":  return { ok:true, movimientos: listMovimientos(data.mes) };
    case "saveMovimiento":   return saveMovimiento(data.mov);
    case "saveMovimientos":  return saveMovimientos(data.movimientos || []);
    case "deleteMovimiento": return deleteMovimiento(data.id);

    /* Reglas */
    case "listReglas":  return { ok:true, reglas: listReglas() };
    case "saveRegla":   return saveRegla(data.regla);
    case "saveReglas":  return saveReglas(data.reglas || []);
    case "deleteRegla": return deleteRegla(data.id);

    /* Inversiones */
    case "listInversiones":  return { ok:true, inversiones: listInversiones() };
    case "saveInversion":    return saveInversion(data.inversion);
    case "saveInversiones":  return saveInversiones(data.inversiones || []);
    case "deleteInversion":  return deleteInversion(data.id);

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
    cuentas:     listCuentas(),   // devuelve todas, con el flag `activo`; el front filtra
    categorias:  listCategorias(),
    modosPago:   listModosPago(),
    movimientos: listMovimientos(),
    inversiones: listInversiones(),
    reglas:      listReglas(),
    config:      getConfig()
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
  if (!c.id) c.id = uid();
  upsert(CUENTAS_SHEET, CUENTAS_COLS, cuentaToRow(c));
  return { ok:true, id:c.id };
}

function deleteCuenta(id) {
  // Con movimientos asociados no se borra: quedarían huérfanos.
  const usada = listMovimientos().some(m => m.cuenta === String(id) || m.cuentaDestino === String(id));
  if (usada) return { ok:false, error:"La cuenta tiene movimientos. Archivala en vez de borrarla, o pasá esos movimientos a otra cuenta." };
  return borrarPorId(CUENTAS_SHEET, CUENTAS_COLS, id);
}

/* ───────── Categorías ───────── */
function catToRow(c) {
  return [
    String(c.id || uid()),
    String(c.nombre || ""),
    String(c.aplica || "ambos"),          // gasto | ingreso | ambos
    String(c.color || "#64748b"),
    Number(c.orden || 0),
    c.activo === false ? false : true
  ];
}
function rowToCat(r) {
  return {
    id:     String(r[0]),
    nombre: String(r[1] || ""),
    aplica: String(r[2] || "ambos"),
    color:  String(r[3] || "#64748b"),
    orden:  Number(r[4] || 0),
    activo: toBool(r[5], true)
  };
}
function listCategorias() {
  const sh  = getOrCreateSheet(CAT_SHEET, CAT_COLS);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return [];
  return all.slice(1).filter(r => r[0]).map(rowToCat)
    .sort((a,b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre, "es"));
}
function saveCategoria(c) {
  if (!c || !String(c.nombre || "").trim()) return { ok:false, error:"La categoría necesita un nombre" };
  if (!c.id) c.id = uid();
  upsert(CAT_SHEET, CAT_COLS, catToRow(c), c.id);
  return { ok:true, id:c.id };
}
function saveCategorias(lista) {
  const rows = lista.filter(c => String(c.nombre || "").trim()).map(catToRow);
  if (rows.length) upsertBatch(CAT_SHEET, CAT_COLS, rows);
  return { ok:true, categorias: listCategorias() };
}
function deleteCategoria(id) {
  const usada = listMovimientos().some(m => m.categoria === String(id));
  if (usada) return { ok:false, error:"La categoría está usada en movimientos. Recategorizalos antes de borrarla." };
  return borrarPorId(CAT_SHEET, CAT_COLS, id);
}

/* ───────── Modos de pago ───────── */
function modoToRow(m) {
  return [
    String(m.id || uid()),
    String(m.nombre || ""),
    Number(m.orden || 0),
    m.activo === false ? false : true
  ];
}
function rowToModo(r) {
  return { id:String(r[0]), nombre:String(r[1] || ""), orden:Number(r[2] || 0), activo:toBool(r[3], true) };
}
function listModosPago() {
  const sh  = getOrCreateSheet(MODOS_SHEET, MODOS_COLS);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return [];
  return all.slice(1).filter(r => r[0]).map(rowToModo)
    .sort((a,b) => (a.orden - b.orden) || a.nombre.localeCompare(b.nombre, "es"));
}
function saveModoPago(m) {
  if (!m || !String(m.nombre || "").trim()) return { ok:false, error:"El modo de pago necesita un nombre" };
  if (!m.id) m.id = uid();
  upsert(MODOS_SHEET, MODOS_COLS, modoToRow(m), m.id);
  return { ok:true, id:m.id };
}
function saveModosPago(lista) {
  const rows = lista.filter(m => String(m.nombre || "").trim()).map(modoToRow);
  if (rows.length) upsertBatch(MODOS_SHEET, MODOS_COLS, rows);
  return { ok:true, modosPago: listModosPago() };
}
function deleteModoPago(id) { return borrarPorId(MODOS_SHEET, MODOS_COLS, id); }

/* ───────── Movimientos ───────── */
function movToRow(m) {
  const fecha = formatFecha(m.fecha);
  return [
    String(m.id || uid()),
    String(m.mes || fecha.slice(0,7)),
    fecha,
    String(m.tipo || ""),
    String(m.categoria || ""),
    String(m.concepto || ""),
    String(m.cuenta || ""),
    String(m.cuentaDestino || ""),
    String(m.moneda || "ARS"),
    Number(m.monto || 0),
    String(m.monedaDestino || ""),
    numOrBlank(m.montoDestino),
    numOrBlank(m.cotizacion),
    String(m.modoPago || ""),
    String(m.observacion || ""),
    String(m.timestamp || ahoraAR()),
    String(m.hash || calcHash(m)),
    String(m.fuente || "manual")
  ];
}
function rowToMov(r) {
  return {
    id:            String(r[0]),
    mes:           String(r[1] || ""),
    fecha:         formatFecha(r[2]),
    tipo:          String(r[3] || ""),
    categoria:     String(r[4] || ""),
    concepto:      String(r[5] || ""),
    cuenta:        String(r[6] || ""),
    cuentaDestino: String(r[7] || ""),
    moneda:        String(r[8] || "ARS"),
    monto:         Number(r[9] || 0),
    monedaDestino: String(r[10] || ""),
    montoDestino:  r[11] === "" || r[11] == null ? null : Number(r[11]),
    cotizacion:    r[12] === "" || r[12] == null ? null : Number(r[12]),
    modoPago:      String(r[13] || ""),
    observacion:   String(r[14] || ""),
    timestamp:     formatFechaHora(r[15]),
    hash:          String(r[16] || ""),
    fuente:        String(r[17] || "manual")
  };
}
/** @param {string=} mes "YYYY-MM"; sin mes devuelve todos. */
function listMovimientos(mes) {
  const sh  = getOrCreateSheet(MOV_SHEET, MOV_COLS);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return [];
  let out = all.slice(1).filter(r => r[0]).map(rowToMov);
  if (mes) out = out.filter(m => m.mes === String(mes));
  // más nuevos primero
  return out.sort((a,b) => (b.fecha + b.timestamp).localeCompare(a.fecha + a.timestamp));
}
function saveMovimiento(m) {
  const err = validarMovimiento(m);
  if (err) return { ok:false, error:err };
  if (!m.id) m.id = uid();
  // El sello de tiempo lo pone el backend, en hora argentina, y sobrevive a las ediciones.
  if (!String(m.timestamp || "").trim()) m.timestamp = ahoraAR();
  upsert(MOV_SHEET, MOV_COLS, movToRow(m), m.id);
  return { ok:true, id:m.id, timestamp:m.timestamp };
}
/** Clave de deduplicación: fecha|centavos|concepto(40)|cuenta. */
function calcHash(m) {
  return [
    formatFecha(m.fecha),
    Math.round((Number(m.monto) || 0) * 100),
    String(m.concepto || "").toLowerCase().slice(0, 40),
    String(m.cuenta || "")
  ].join("|");
}

/**
 * Alta en lote (importación). Omite los que ya existen por `Hash`, tanto contra
 * la hoja como dentro del mismo lote. La categoría puede venir vacía: los
 * importados sin categorizar quedan pendientes y se resuelven con las reglas.
 */
function saveMovimientos(lista) {
  if (!lista.length) return { ok:true, guardados:0, omitidos:0 };
  const sh    = getOrCreateSheet(MOV_SHEET, MOV_COLS);
  const all   = sh.getDataRange().getValues();
  const iHash = MOV_COLS.indexOf("Hash");
  const vistos = {};
  for (let i = 1; i < all.length; i++) if (all[i][iHash]) vistos[String(all[i][iHash])] = true;

  const filas = [], errores = [];
  let omitidos = 0;
  for (const m of lista) {
    const err = validarMovimiento(m);
    if (err) { errores.push(err); continue; }
    if (!m.id) m.id = uid();
    if (!String(m.timestamp || "").trim()) m.timestamp = ahoraAR();
    if (!m.hash) m.hash = calcHash(m);
    if (vistos[m.hash]) { omitidos++; continue; }
    vistos[m.hash] = true;
    filas.push(movToRow(m));
  }
  if (filas.length) sh.getRange(sh.getLastRow() + 1, 1, filas.length, MOV_COLS.length).setValues(filas);
  const out = { ok:true, guardados:filas.length, omitidos:omitidos };
  if (errores.length) out.errores = errores;
  return out;
}

function validarMovimiento(m) {
  if (!m) return "Movimiento vacío";
  if (["Ingreso","Egreso","Interno"].indexOf(String(m.tipo)) < 0) return "Tipo inválido: " + m.tipo;
  if (!formatFecha(m.fecha)) return "El movimiento necesita una fecha";
  if (!(Number(m.monto) > 0)) return "El monto tiene que ser mayor a cero";
  if (!String(m.cuenta || "").trim()) return "El movimiento necesita una cuenta";
  if (m.tipo === "Interno") {
    if (!String(m.cuentaDestino || "").trim()) return "Un movimiento interno necesita cuenta destino";
    if (String(m.cuentaDestino) === String(m.cuenta)) return "La cuenta destino tiene que ser distinta de la de origen";
    if (!(Number(m.montoDestino) > 0)) return "El monto que entra tiene que ser mayor a cero";
  }
  return "";
}
function deleteMovimiento(id) { return borrarPorId(MOV_SHEET, MOV_COLS, id); }

/* ───────── Reglas ───────── */
function reglaToRow(r) {
  return [
    String(r.id || uid()),
    String(r.patron || ""),
    String(r.tipoPatron || "contiene"),   // contiene | empieza | igual | regex
    String(r.categoria || ""),
    String(r.tipo || ""),                 // casi siempre vacío
    Number(r.prioridad || 0),
    Number(r.hits || 0),
    r.activo === false ? false : true
  ];
}
function rowToRegla(r) {
  return {
    id:         String(r[0]),
    patron:     String(r[1] || ""),
    tipoPatron: String(r[2] || "contiene"),
    categoria:  String(r[3] || ""),
    tipo:       String(r[4] || ""),
    prioridad:  Number(r[5] || 0),
    hits:       Number(r[6] || 0),
    activo:     toBool(r[7], true)
  };
}
function listReglas() {
  const sh  = getOrCreateSheet(REGLAS_SHEET, REGLAS_COLS);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return [];
  return all.slice(1).filter(r => r[0]).map(rowToRegla)
    .sort((a,b) => (b.prioridad - a.prioridad) || a.patron.localeCompare(b.patron, "es"));
}
function saveRegla(r) {
  if (!r || !String(r.patron || "").trim()) return { ok:false, error:"La regla necesita un patrón" };
  if (!String(r.categoria || "").trim() && !String(r.tipo || "").trim()) {
    return { ok:false, error:"La regla tiene que asignar al menos una categoría o un tipo" };
  }
  if (!r.id) r.id = uid();
  upsert(REGLAS_SHEET, REGLAS_COLS, reglaToRow(r));
  return { ok:true, id:r.id };
}
function saveReglas(lista) {
  const rows = lista.filter(r => String(r.patron || "").trim()).map(reglaToRow);
  if (rows.length) upsertBatch(REGLAS_SHEET, REGLAS_COLS, rows);
  return { ok:true, reglas: listReglas() };
}
function deleteRegla(id) { return borrarPorId(REGLAS_SHEET, REGLAS_COLS, id); }

/* ───────── Inversiones ───────── */
function invToRow(i) {
  const cantidad = Number(i.cantidad || 0);
  const precio   = Number(i.precioActual || 0);
  return [
    String(i.id || uid()),
    String(i.broker || ""),
    String(i.especie || ""),
    String(i.descripcion || ""),
    String(i.tipoActivo || "otro"),
    cantidad,
    precio,
    String(i.moneda || "ARS"),
    cantidad * precio,          // ValorActual siempre derivado
    formatFecha(i.fecha)
  ];
}
function rowToInv(r) {
  return {
    id:           String(r[0]),
    broker:       String(r[1] || ""),
    especie:      String(r[2] || ""),
    descripcion:  String(r[3] || ""),
    tipoActivo:   String(r[4] || "otro"),
    cantidad:     Number(r[5] || 0),
    precioActual: Number(r[6] || 0),
    moneda:       String(r[7] || "ARS"),
    valorActual:  Number(r[8] || 0),
    fecha:        formatFecha(r[9])
  };
}
function listInversiones() {
  const sh  = getOrCreateSheet(INV_SHEET, INV_COLS);
  const all = sh.getDataRange().getValues();
  if (all.length <= 1) return [];
  return all.slice(1).filter(r => r[0]).map(rowToInv)
    .sort((a,b) => a.broker.localeCompare(b.broker, "es") ||
                   (a.especie || a.descripcion).localeCompare(b.especie || b.descripcion, "es"));
}
function saveInversion(i) {
  if (!i) return { ok:false, error:"Tenencia vacía" };
  if (!String(i.especie || "").trim() && !String(i.descripcion || "").trim()) {
    return { ok:false, error:"La tenencia necesita una especie o una descripción" };
  }
  if (Number(i.cantidad) < 0 || Number(i.precioActual) < 0) {
    return { ok:false, error:"Cantidad y precio no pueden ser negativos" };
  }
  if (!i.id) i.id = uid();
  upsert(INV_SHEET, INV_COLS, invToRow(i));
  return { ok:true, id:i.id };
}
function saveInversiones(lista) {
  const rows = lista
    .filter(i => String(i.especie || "").trim() || String(i.descripcion || "").trim())
    .map(invToRow);
  if (rows.length) upsertBatch(INV_SHEET, INV_COLS, rows);
  return { ok:true, inversiones: listInversiones() };
}
function deleteInversion(id) { return borrarPorId(INV_SHEET, INV_COLS, id); }

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
/** Inserta o actualiza filas por su ID (columna 1), con una sola lectura. */
function upsertBatch(name, cols, rows) {
  const sh  = getOrCreateSheet(name, cols);
  const all = sh.getDataRange().getValues();
  const rowOf = {};
  for (let i = 1; i < all.length; i++) if (all[i][0]) rowOf[String(all[i][0])] = i + 1;
  const nuevas = [];
  for (const row of rows) {
    const r = rowOf[String(row[0])];
    if (r) sh.getRange(r, 1, 1, cols.length).setValues([row]);
    else nuevas.push(row);
  }
  if (nuevas.length) sh.getRange(sh.getLastRow() + 1, 1, nuevas.length, cols.length).setValues(nuevas);
}
function upsert(name, cols, row) { upsertBatch(name, cols, [row]); }

/** Borrado físico de la fila cuyo ID (columna 1) coincide. */
function borrarPorId(name, cols, id) {
  const sh  = getOrCreateSheet(name, cols);
  const all = sh.getDataRange().getValues();
  for (let i = all.length - 1; i >= 1; i--) {
    if (String(all[i][0]) === String(id)) { sh.deleteRow(i + 1); return { ok:true }; }
  }
  return { ok:true };
}

/** Number(v) o "" si viene vacío (para no escribir ceros donde no aplica). */
function numOrBlank(v) {
  return (v === "" || v == null) ? "" : Number(v);
}

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
    // El Timestamp se guarda como texto en hora argentina: si Sheets lo tomara
    // como fecha, lo reinterpretaría con la zona horaria de la planilla.
    const iTs = cols.indexOf("Timestamp");
    if (iTs >= 0) sh.getRange(2, iTs + 1, sh.getMaxRows() - 1, 1).setNumberFormat("@");
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

/** Sello de tiempo "yyyy-MM-dd HH:mm:ss" en hora argentina, venga como venga el valor. */
function formatFechaHora(val) {
  if (val === "" || val === null || val === undefined) return "";
  if (val instanceof Date) return Utilities.formatDate(val, TZ, "yyyy-MM-dd HH:mm:ss");
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(s)) return s;   // ya está en hora local
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {                                 // ISO viejo, en UTC
    const d = new Date(s);
    if (!isNaN(d.getTime())) return Utilities.formatDate(d, TZ, "yyyy-MM-dd HH:mm:ss");
  }
  return s;
}

/**
 * Ejecutar UNA vez desde el editor si ya tenías movimientos cargados: pasa los
 * `Timestamp` viejos (que estaban en UTC) a hora argentina y deja la columna
 * como texto, para que Sheets no la reinterprete.
 */
function normalizarTimestamps() {
  const sh   = getOrCreateSheet(MOV_SHEET, MOV_COLS);
  const last = sh.getLastRow();
  if (last < 2) return "No hay movimientos para normalizar.";
  const col = MOV_COLS.indexOf("Timestamp") + 1;
  const rng = sh.getRange(2, col, last - 1, 1);
  const vals = rng.getValues().map(r => [formatFechaHora(r[0])]);
  rng.setNumberFormat("@");
  rng.setValues(vals);
  const msg = "Listo: " + vals.length + " timestamps en hora argentina.";
  Logger.log(msg);
  return msg;
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
