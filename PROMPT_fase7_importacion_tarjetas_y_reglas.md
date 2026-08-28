# Fase 7 — Importación de resúmenes de tarjeta + reglas de autocategorización

Continúa las fases 1 a 6.1, todas implementadas (ver `CHANGELOG.md`). Esta fase agrega **importar los resúmenes de tarjeta de crédito** (Amex y Visa de Santander, formato **Excel `.xlsx`**) y un **motor de reglas** que autocategoriza por patrón — especialmente útil para los consumos recurrentes (suscripciones como Netflix, Spotify, YouTube, Claude, etc.).

Los PDF de banco/broker (Santander caja de ahorro, PPI, Balanz) quedan para una sub-fase posterior. **Esta fase es solo tarjetas en `.xlsx`.**

Leé `PLAN.md` (modelo de datos y regla de multimoneda) antes de empezar. Respetá las convenciones ya establecidas: `api()` con token en el cuerpo, `bootstrap` para traer todo, hojas auto-creadas, columnas nuevas **siempre al final**, botones que se bloquean con "Guardando…", DM Sans/DM Mono, sin librerías salvo las que se indican.

---

## Objetivo

1. Poder subir el Excel del resumen de Amex o Visa, ver una **previsualización editable** de los movimientos detectados y confirmarlos en lote.
2. Cada consumo se guarda como **Egreso en la cuenta de la tarjeta** (tipo `tarjeta`), en la moneda de la línea.
3. Un **sistema de reglas** que, por patrón en el concepto, asigna categoría (y opcionalmente tipo) automáticamente — al importar y en la carga manual. Al categorizar algo a mano, ofrecer crear la regla.

---

## Modelo de datos — cambios

### Hoja nueva `Reglas`
`[ID, Patron, TipoPatron, Categoria, Tipo, Prioridad, Hits, Activo]`
- `Patron`: texto a buscar en el `Concepto` del movimiento (case-insensitive).
- `TipoPatron`: `contiene` | `empieza` | `igual` | `regex`.
- `Categoria`: **ID** de una categoría (misma convención que `Movimientos.Categoria`).
- `Tipo`: opcional (`Egreso` | `Ingreso` | `Interno` | ""). Casi siempre vacío; sirve para casos como marcar transferencias.
- `Prioridad`: número; gana la más alta ante varios matches.
- `Hits`: contador de cuántas veces se aplicó (informativo).
- `Activo`: soft-flag.

### Hoja `Movimientos` — dos columnas nuevas **al final** (no reordenar las existentes)
`… , Timestamp, Hash, Fuente`
- `Hash`: clave de deduplicación = `fecha|round(monto*100)|concepto[0..40] en minúsculas|cuentaID`. La calcula el backend al guardar si viene vacía (y también el front para marcar duplicados en la preview).
- `Fuente`: `manual` | `import` (para poder filtrar/borrar una importación).

`bootstrap` debe incluir `reglas` en su respuesta.

---

## Backend `Code.gs`

Acciones nuevas:
- `listReglas` / `saveRegla` (alta o edición por ID) / `saveReglas` (lote) / `deleteRegla`, usando los helpers `upsert` / `upsertBatch` / `borrarPorId` ya existentes.
- `saveMovimientos` (lote): recibe `{ movimientos:[...] }`, y por cada uno calcula el `Hash` si falta y **omite** los que ya existen (mismo `Hash` en la hoja). Devuelve `{ ok:true, guardados:N, omitidos:M }`. Reutilizá la validación de `saveMovimiento` pero **permití `Categoria` vacía** cuando `Fuente==="import"` (los sin categoría entran como pendientes y se categorizan después).
- `bootstrap`: agregar `reglas`.
- Subir `doGet` a `version: "fase7"`. **Requiere re-deploy.**

Mantené el patrón: derivar `Mes` de `Fecha` en el backend, sello `Timestamp` en hora AR, `Cuenta`/`Categoria` guardan ID.

---

## Frontend — dependencia nueva

Agregar **SheetJS** desde CDN para leer `.xlsx`:
`https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
Agregarlo también a la precache del `sw.js` para que la importación funcione offline-ish (la lectura del archivo es local).

---

## Parser de tarjeta (validado en la v1 — reutilizar tal cual)

Los resúmenes de Amex/Visa de Santander tienen esta estructura (leídos con `XLSX.utils.sheet_to_json(ws,{header:1,raw:false,defval:""})` → array de arrays `aoa`):

- Arriba: `Total a pagar` (fila siguiente: total en pesos | total en dólares), `Fecha de cierre` | `Fecha de vencimiento` (fila siguiente con las dos fechas `dd/mm/yyyy`), y más abajo `Cierre: dd/mm/yyyy` / `Vencimiento: dd/mm/yyyy`.
- Los consumos vienen en bloques que arrancan con una fila header `Fecha | Descripción | Cuotas | Comprobante | Monto en pesos | Monto en dólares` y terminan en `Total de …`. La **fecha se arrastra**: si la celda de fecha está vacía, vale la última no vacía. Una línea trae monto en pesos **o** en dólares (columnas 4 y 5, 0-based).
- Los pagos aparecen como `Su pago en pesos` / `Su pago en usd` con **monto negativo**.
- Al final, `Otros conceptos` lista impuestos/percepciones con header `Descripción | Monto en pesos` (IVA, sellos, percepciones), montos positivos.

Helpers a incluir (si no existen ya): `parseNum` (es-AR: saca `$`, `U$S`, miles con punto, decimal con coma, respeta el signo) y usá el `isoDate` existente para pasar `dd/mm/yyyy` → ISO.

```js
function parseNum(v){
  if(v==null||v==="") return null;
  if(typeof v==="number") return v;
  let s=String(v).replace(/U\$[SD]?|AR\$|US\$|\$/g,"").replace(/\s| /g,"");
  const neg=s.indexOf("-")>=0; s=s.replace(/-/g,"").replace(/\./g,"").replace(/,/g,".");
  const n=parseFloat(s); return isNaN(n)?null:(neg?-n:n);
}

// Deriva el período del resumen desde la fecha de cierre (cierre a principio de mes => mes anterior)
function periodoDesdeCierre(iso){
  const m=String(iso||"").match(/^(\d{4})-(\d{2})-(\d{2})/); if(!m) return "";
  let y=+m[1], mo=+m[2], d=+m[3]; if(d<15){ mo--; if(mo<1){mo=12;y--;} }
  return `${y}-${String(mo).padStart(2,"0")}`;
}

// Devuelve { lineas:[{fechaIso, desc, cuotas, moneda, importe}], meta:{totalPesos,totalUsd,cierreIso,vencIso,periodo} }
function parseTarjeta(aoa){
  const lineas=[]; let inMov=false, inTax=false, lastDate="", totalPesos=null, totalUsd=null, cierre="", venc="";
  for(let i=0;i<aoa.length;i++){
    const r=aoa[i]; const c0=String(r[0]||"").trim();
    if(c0==="Total a pagar"){ const nx=aoa[i+1]||[]; totalPesos=parseNum(nx[0]); totalUsd=parseNum(nx[1]); }
    if(c0==="Fecha de cierre" && !cierre){ const nx=aoa[i+1]||[]; cierre=isoDate(nx[0]); venc=isoDate(nx[1]); }
    if(!cierre){ const mc=c0.match(/Cierre:\s*(\d{2}\/\d{2}\/\d{4})/); if(mc) cierre=isoDate(mc[1]); }
    if(!venc){ const mv=c0.match(/Vencimiento:\s*(\d{2}\/\d{2}\/\d{4})/); if(mv) venc=isoDate(mv[1]); }
    if(c0.startsWith("Fecha") && String(r[1]||"").startsWith("Descrip")){ inMov=true; inTax=false; continue; }
    if(c0.startsWith("Total de ")){ inMov=false; continue; }
    if(c0.startsWith("Otros conceptos")){ inMov=false; inTax=true; continue; }
    if(c0.startsWith("Aviso")) break;
    if(inMov){
      const isDate=/^\d{2}\/\d{2}\/\d{4}$/.test(c0);
      const fecha=isDate?c0:lastDate; if(isDate) lastDate=c0;
      const desc=String(r[1]||"").trim(); if(!desc) continue;
      const cuotas=String(r[2]||"").trim();
      const ars=parseNum(r[4]), usd=parseNum(r[5]);
      const moneda = usd!=null ? "USD" : "ARS";
      const importe = usd!=null ? usd : ars;
      if(importe==null) continue;
      lineas.push({ fechaIso:isoDate(fecha), desc, cuotas, moneda, importe });
    } else if(inTax){
      // Otros conceptos: Descripción | Monto en pesos
      if(/^Descripci/.test(c0)) continue;
      const monto=parseNum(r[1]); if(monto==null) continue;
      lineas.push({ fechaIso:cierre, desc:c0, cuotas:"", moneda:"ARS", importe:Math.abs(monto), impuesto:true });
    }
  }
  return { lineas, meta:{ totalPesos, totalUsd, cierreIso:cierre, vencIso:venc, periodo:periodoDesdeCierre(cierre) } };
}
```

Detección del emisor (por contenido de las primeras filas, en minúsculas): `american express` → Amex; `visa` → Visa. Mostrá el número de tarjeta si aparece (`terminada en NNNN`).

> El parser completo de la v1 (con MercadoPago, Santander PDF, PPI y Balanz) está en el historial de git, en el `index.html` anterior a la reescritura (commit `c5bd283` / `355af1c`). No hace falta para esta fase, pero está ahí para la sub-fase de PDFs.

---

## Mapeo línea → movimiento

- **Cuenta destino del import = la cuenta de la tarjeta.** Como una cuenta es de **una** moneda y la tarjeta tiene consumos en pesos **y** en dólares, la tarjeta se representa con **dos cuentas**: una ARS y otra USD (ej. "Amex 5802" y "Amex 5802 USD"). En la preview, el usuario **elige/confirma la cuenta ARS y la cuenta USD** de esa tarjeta; si la de USD no existe y hay líneas en dólares, ofrecer crearla (tipo `tarjeta`, `EnPatrimonio` off).
- **Tipo por signo** (importar "todo tal cual"):
  - importe **positivo** (consumo o impuesto) → `tipo:"Egreso"`, `monto:importe`.
  - importe **negativo** (Su pago / devolución / crédito) → `tipo:"Ingreso"`, `monto:abs(importe)` (reduce la deuda de la tarjeta). El usuario puede reclasificarlo a Interno después.
- `moneda` = la de la línea; `cuenta` = la cuenta tarjeta de esa moneda.
- `concepto` = descripción limpia + cuotas concatenadas: `"Merpago*toolshop (cuota 5/6)"` (parsear "5 de 6" → "5/6").
- `fecha` = **fecha de consumo** de la línea (para impuestos, la de cierre).
- `cotizacion` = `await mepDe(fechaIso)` (congela el histórico; cae al valor de hoy si la API falla) — igual que la carga manual.
- `observacion` = `"Resumen ${periodo} · vence ${dispDate(venc)}"` para dejar registrado a qué resumen y vencimiento pertenece (sin agregar columnas nuevas al esquema por ahora).
- `modoPago` = "crédito" (o el modo de pago que corresponda, si existe en la lista; si no, vacío).
- `fuente` = "import".

---

## Flujo de importación (UI)

Botón **⬆ Importar** en la pantalla Movimientos (y/o en Ajustes). Abre un modal **ancho**:

1. **Elegir archivo** (`.xlsx`), drag & drop o file input. Detectar emisor.
2. **Mapeo de cuentas**: selects para la cuenta ARS y la cuenta USD de la tarjeta (autocompletar por nombre; permitir crear).
3. **Período**: input `month` autocompletado con `meta.periodo` (editable) — se guarda en `observacion` de cada línea.
4. **Previsualización** (tabla editable):
   - Columnas: checkbox, fecha, concepto, monto (con signo/color), moneda, **categoría** (select, precargada por reglas), y un chip si es impuesto o pago.
   - **Duplicados**: calcular el `Hash` de cada fila y marcar (deshabilitar el check + estilo tenue) las que ya existan en `state.movimientos`. Mostrar cuántas son.
   - Aplicar **reglas** a cada fila para precargar la categoría.
5. **Confirmar** → `saveMovimientos` en lote (solo las tildadas) → refrescar `state.movimientos` y `saldosPorCuenta`. Toast con `guardados`/`omitidos`.

Validaciones de UX: botón de confirmar bloqueado mientras guarda; si no se eligió cuenta destino no dejar confirmar; los montos y fechas se muestran con los helpers `fmt` y `dispDate`.

---

## Motor de reglas

- **Engine** `aplicarReglas(concepto)`: recorre `state.reglas` activas cuyo `Patron` matchea el concepto según `TipoPatron`, ordena por `Prioridad` desc y devuelve `{categoria, tipo}` de la primera. Case-insensitive; `regex` con `try/catch`.
- **Al importar**: cada fila de la preview arranca con la categoría (y tipo) que sugiere la regla; el usuario puede sobreescribir.
- **En la carga manual**: al escribir/salir del campo Concepto en el formulario de movimiento, si hay match y la categoría está vacía, **sugerirla** (sin pisar si el usuario ya eligió una).
- **Crear regla desde un movimiento**: en la preview y en el formulario manual, un checkbox "Crear regla para «`patrón`»" cuando se asigna categoría. El patrón se deriva del concepto: minúsculas, sacar dígitos y `*`, tomar las primeras 2 palabras significativas. `TipoPatron:"contiene"`, `Prioridad:10`.
- **Reaplicar**: botón en Movimientos "✨ Aplicar reglas a sin categoría" que corre el engine sobre los movimientos con `categoria` vacía y guarda los que cambian (usando `saveMovimiento` por cada uno, o `saveMovimientos` en lote).
- **ABM Reglas** en Ajustes: lista (patrón, tipo de match, categoría con su color, prioridad, hits), alta/edición en modal, borrado. Botón para cargar un set sugerido editable (ej. netflix/spotify/youtube/claude → Suscripciones; su pago → …).

---

## Fuera de alcance (NO en esta fase)

- Importar **PDF** (Santander caja de ahorro, PPI, Balanz). Es la sub-fase siguiente; los parsers están en el historial de git.
- Importar **MercadoPago**.
- Las "lentes" consumo / resumen / pago del v1 (acá `fecha` = consumo; el resumen y el vencimiento quedan como texto en `observacion`). Si más adelante se quieren las lentes, se agregan columnas `Periodo` / `FechaPago` — no ahora.
- **Plantillas recurrentes** que generan movimientos solos (se eligió autocategorización por patrón, no plantillas).
- Conciliación del total del resumen contra la suma importada (se puede mostrar como aviso informativo, pero no bloquear).

---

## Verificación

Usar los resúmenes reales de ejemplo (los que ya se validaron en la v1):

1. **Amex 5802**: detecta emisor, `periodo = 2026-06` (cierre 02/07/2026), vencimiento 14/07. Parsea **12 líneas**; `Total a pagar` $275.826,52 / u$s 21,99. Los consumos en pesos van como Egreso a la cuenta ARS, los `U$S` (Google One u$s1,99, Anthropic/Claude u$s20) a la cuenta USD con su `cotizacion` congelada; los `Su pago` como Ingreso; los de "Otros conceptos" (IVA, sellos, percepciones) como Egreso ARS.
2. **Visa 5517**: **18 líneas**, total $954.213,42 / u$s 9,53; una cuota "5 de 6" queda como `… (cuota 5/6)`.
3. **Reglas**: crear una regla `youtube → (categoría)`; reimportar y ver que las líneas de YouTube quedan categorizadas solas. En la carga manual, escribir "Netflix" sugiere la categoría de su regla.
4. **Deduplicación**: reimportar el mismo archivo → todas las filas aparecen como duplicadas (destildadas) y `saveMovimientos` devuelve `guardados:0, omitidos:N`.
5. **Saldos**: tras importar, el saldo de la cuenta tarjeta refleja los consumos (deuda), Patrimonio y Resumen siguen cuadrando, y como la tarjeta tiene `EnPatrimonio` off no infla el patrimonio.
6. Backend: correr los checks contra el mock de Sheets (reglas CRUD, `saveMovimientos` con dedupe y `Categoria` vacía permitida en import). Sin errores de consola ni scroll horizontal en 375px.

Al terminar, sumá la entrada al `CHANGELOG.md` y marcá la fase en `PLAN.md`, anotando que queda pendiente la importación de PDFs (banco/broker).
