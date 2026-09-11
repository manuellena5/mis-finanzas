# Changelog

## v10.3 — UX del importador: modal, mapeo colapsable, solapas fijas, internos claros y MEP (2026-09-11) ✅

Ajustes de usabilidad sobre la importación del resumen de cuenta (Fases 10 / 10.1 / 10.2) y el manejo de la compra/venta de dólar MEP. **Sólo frontend: no toca el parser, la lógica del backend ni el modelo de datos.** `Code.gs` cambia únicamente en `VERSION`, que va en sincronía con `index.html` y `sw.js`: hay que **re-deployar el Apps Script** o el chip del header queda en rojo avisando el desfasaje.

**El modal ya no se cierra por accidente**
Un resbalón del mouse afuera del modal tiraba a la basura el mapeo, las categorías y los internos ya armados. Ahora el click en el overlay **no cierra**: sólo la ✕ o `Escape`, y si hay filas cargadas sin confirmar pregunta *"¿Descartar la importación? Se pierde lo que cargaste."* antes de descartar. Sin filas cargadas (paso del archivo) cierra directo. El resto de los modales queda como estaba.

**"Cuentas detectadas" compacto y colapsable**
- El bloque de mapeo pasa a ser un acordeón con header `Cuentas detectadas · Falta asignar 3 cuentas` (en rojo) o `· 5 asignadas ✓` (en verde), con chevron.
- **Se colapsa solo** apenas todas las cuentas quedan asignadas, y se vuelve a abrir si alguna queda suelta. El click del usuario manda hasta el próximo cambio.
- Filas más chicas y, en desktop (≥900px), en **dos columnas**. El botón *Crear* queda pero más chico.
- La conciliación de saldos pasa de dos párrafos a **una línea** junto al nombre del archivo: `Saldos: $ ✓ … · U$S ✓ …`.

**Solapas y títulos de columna fijos**
La cabecera del modal (resumen + mapeo + solapas) dejó de scrollear: era `overflow:auto; max-height:42vh` y con el mapeo abierto las solapas se iban de pantalla. Ahora scrollea **sólo el cuerpo**, con el `thead` sticky adentro, así que al recorrer los movimientos siempre se ven las solapas y los títulos de columna. El pie con el contador y el botón **Importar** ya estaba fijo. En mobile las solapas van en **una sola fila que scrollea de costado** en vez de envolver en cuatro renglones que se comían la tabla.

**Solapa "Internos / transferencias" rediseñada**
- Cada interno se muestra como una **tarjeta de dos lados** (`Sale de` → `Entra en`) con el monto de cada pata, en vez de una fila de tabla con un editor colgando abajo. Si cambian de moneda, el lado que entra pide el monto y abajo se lee el **tipo de cambio implícito**.
- Un tag distingue los **autodetectados** (`pago de tarjeta · detectado`, `detectado`) de los **manuales**, y los armados uniendo dos líneas (`MEP · 2 líneas`).
- En un **pago de tarjeta**, `Sale de` se completa solo con la cuenta de la app mapeada a esa cuenta bancaria y sigue el mapeo si se cambia. Mientras esa cuenta no esté asignada, el cartel ya no es el críptico *"Falta la cuenta de origen"* sino *"Asigná la cuenta bancaria en «Cuentas detectadas» y el origen se completa solo"*.
- Botón **No es interno** / **Separar** para revertir, y validación por tarjeta igual que antes (origen y destino, distintos, monto que entra > 0), con la tarjeta en rojo si falta algo.

**Compra/venta de dólar MEP: unir dos líneas en un Interno**
Una MEP aparece en el resumen como dos movimientos —uno que sale de la caja en dólares y otro que entra en la de pesos, o al revés—. Ahora se pueden unir:
- Botón **⇄** por fila en las solapas de cuenta para marcar cada pata. La marca **sobrevive al cambio de solapa** (las dos patas están en cuentas distintas), y una barra arriba muestra qué hay marcado y qué falta.
- **Unir como interno** crea un solo `tipo:"Interno"`: `cuenta`/`monto`/`moneda` = la pata que sale, `cuentaDestino`/`montoDestino`/`monedaDestino` = la que entra, y muestra el **TC implícito** (`montoDestino / monto`) — el MEP de esa operación.
- La otra línea **se absorbe**: no se importa, así no se duplica, y la tarjeta deja a la vista de qué dos líneas vino. El contador del pie lo dice (`7 de 7 para importar · 1 línea unida a un interno`).
- Se puede **deshacer** con *Separar*: las dos filas vuelven a sus solapas como estaban.
- Sólo une una pata que sale con una que entra, de cuentas distintas y de **distinta moneda**; si no, la barra explica por qué no se puede. El modelo detallado vía broker sigue disponible con el control de la 10.1: esto es el atajo para el caso simple (Santander USD ↔ Santander pesos).

**Bug latente corregido**: las filas absorbidas se filtraban con `!f.absorbidoPor`, que da `true` para la fila de índice **0** — la primera línea del resumen, si quedaba absorbida, se contaba igual. Ahora hay un helper `absorbida(f)` que compara contra `null`, usado en las solapas, el contador y el confirmar. También el botón **Importar** ahora se deshabilita si falta mapear una cuenta aunque se refresque el pie sin repintar (antes sólo lo frenaba el confirmar, con un toast).

**Verificado** sobre un resumen fabricado (3 cuentas bancarias + 1 tarjeta embebida con pata en dólares, 8 movimientos): el click afuera no cierra y la ✕ con filas cargadas pregunta antes de descartar (cancelar deja todo). El mapeo arranca abierto con *Falta asignar 3 cuentas* y **se colapsa solo** al asignar la tercera. Con la tabla scrolleada 400px, el `thead` queda pegado al borde del cuerpo y las solapas siguen a la vista. El pago de tarjeta muestra `Caja de Ahorro $ → Visa Santander` sin error una vez mapeada la cuenta. Marcar la línea de `u$s 500` que sale y la de `$625.000` que entra y unirlas dejó un Interno **USD→ARS** con TC implícito **$1.250,00 por USD**, y el total bajó de 8 a 7 movimientos; *Separar* las devolvió a sus solapas y volvió a 8. La importación mandó los 7 movimientos con la MEP como `cuenta: Santander USD / monto 500 / USD → cuentaDestino: Caja de Ahorro $ / montoDestino 625000 / ARS`. Sin errores de consola recorriendo todas las solapas, y en 375px el modal mide 360×747 con la cabecera en 182px una vez colapsado el mapeo, sin scroll horizontal de página.

## v10.2 — Versión visible (2026-09-10) ✅

Un número de versión a la vista, para saber si el navegador está corriendo lo último y si el backend está al día. **Toca `Code.gs`: requiere re-deploy** (una vez; después el propio cartel avisa cuando haga falta).

**Una sola versión, en tres archivos**
`APP_VERSION` en `index.html`, `APP_VERSION` en `sw.js` (de ahí sale el nombre del cache) y `VERSION` en `Code.gs`. Se suben juntas en cada cambio. Como el nombre del cache incluye la versión, publicar una nueva **descarta sola la anterior**.

**Dónde se ve**
- En el **header**, al lado del nombre: `v10.2`. Si el backend publicado informa otra versión, el chip se pone rojo con un ⚠ y el tooltip dice cuál tiene.
- En **Ajustes → Versión**: las dos versiones lado a lado (app y backend) con un estado — *al día*, *desactualizado* o *no informa versión* — y la instrucción concreta de qué hacer en cada caso.
- El backend devuelve su versión tanto en el chequeo de salud de `doGet` como dentro de `bootstrap`, así que la app la tiene sin pedir nada extra.

**Botón "Buscar actualizaciones"**: fuerza al service worker a buscar una versión nueva, borra los caches y recarga. Es la salida cuando pusheaste cambios y el navegador sigue mostrando los viejos.

**Verificado**: con el backend en la misma versión el chip queda neutro y la tarjeta dice "al día"; con el backend en v9 aparece el ⚠, el tooltip y la instrucción de re-deployar; con un backend anterior a la v10.2 (que no informa versión) explica que hay que actualizarlo. El botón borró el cache y recargó, y al volver la app quedó en v10.2 con el cache regenerado — de hecho, durante la prueba el servidor local se cayó y el service worker sirvió todo desde el cache viejo: exactamente el caso que esto ahora deja a la vista. Sin errores de consola y sin scroll horizontal en 375px.

## Fase 10.1 — Modal de importación grande + Internos a mano (2026-09-10) ✅

Dos ajustes sobre la previsualización de importación. **Sólo frontend.**

**El modal usa la pantalla**
- Pasa a `min(1500px, 96vw)` × `92vh` con layout en columna: la cabecera (mapeo de cuentas y solapas) arriba, la **tabla scrollea adentro** y el pie con el contador y el botón **Importar** queda pineado abajo, siempre visible. Todo con flexbox, sin `position:fixed`.
- Con ese ancho la tabla **entra sin scroll horizontal en desktop**: las columnas fijas se ajustan a su contenido y el concepto se queda con el resto. En mobile la tabla sigue scrolleando de costado, pero la página no.
- Sólo aplica al modal de importación; el resto queda igual.

**Marcar un movimiento como Interno**
- Cada fila tiene ahora una columna **Tipo** con `Ingreso` / `Egreso` / `Interno`. Al elegir Interno se despliega debajo un editor con **Sale de** y **Entra en**, que listan **todas** las cuentas de la app (la contraparte puede no estar en el resumen: MercadoPago, por ejemplo).
- **Prellenado por el signo**: si la plata entró, el destino ya viene puesto en la cuenta del resumen y sólo elegís el origen; si salió, al revés.
- Si las dos cuentas son de la misma moneda, `montoDestino` se completa solo. Si son de distinta, aparece **Monto que entra** y se muestra el **tipo de cambio implícito**, con el mismo helper que el alta manual (`tcImplicito`).
- **Validación por fila**: sin origen, sin destino, origen igual a destino o monto que entra en cero, la fila se marca en rojo, el editor dice qué falta y el confirmar se bloquea con ese mismo mensaje.
- La fila se muda a la solapa **Internos / transferencias** y la app te lleva ahí para completarla. Se guarda como **un solo movimiento** con las dos patas, sin categoría, y queda neutro en los totales del mes.

**Bug corregido (venía de la Fase 10)**: al marcar una fila como Interno cambia su cuenta de origen, y como el `Hash` incluye la cuenta, al reimportar el mismo PDF esa fila ya no se reconocía y **se duplicaba**. La detección de duplicados de la preview ahora usa además una clave sin la cuenta (fecha + importe + concepto), así que sobrevive a que cambies el tipo, el origen o el mapeo entre importaciones.

**Verificado con el resumen real**: modal 1382×828 sobre 1440×900 (96% × 92%), tabla scrolleando adentro sin scroll horizontal y pie visible; en 375px el modal mide 360×747, la página no scrollea de costado y el botón queda a la vista. Una "Transferencia recibida" de $289.073,15 convertida a Interno con origen MercadoPago quedó guardada como **MercadoPago → Santander Caja de Ahorro**, sin categoría, con `0` ingresos de ese monto y los saldos moviéndose en las dos cuentas (MercadoPago $500.000 → $210.926,85). Un interno en dólares hacia una cuenta en pesos pidió el monto que entra y mostró el TC implícito. Las cuatro validaciones bloquean el confirmar. Reimportar el mismo PDF: 68/68 duplicadas, incluida la convertida a Interno. Sin errores de consola.

## Fase 10 — Resumen de cuenta Santander (multi-cuenta + tarjetas embebidas) (2026-09-10) ✅

Un solo PDF del homebanking trae la caja de ahorro en pesos, la cuenta corriente, la caja de ahorro en dólares y, al final, los resúmenes de las dos tarjetas. Ahora se importa todo junto. **Sólo frontend, no requiere re-deploy.**

**Parser bancario multi-cuenta**
- `pdfLineasItems()` conserva la posición de cada fragmento (antes sólo se guardaba el texto): la sección en pesos tiene una columna por cuenta y sólo la `x` dice de cuál es cada importe.
- La columna de cada monto se resuelve por su **borde derecho** contra el del encabezado —los importes van alineados a la derecha—, así que funciona sin números mágicos y se adapta solo a la sección en dólares, que tiene otras columnas.
- La fecha se arrastra, las líneas de contraparte (`A fulano…` / `De fulano…`) se concatenan al concepto, y `Saldo Inicial` se usa como saldo de apertura en vez de importarse como movimiento.
- **Conciliación**: como el "Saldo en cuenta" del resumen es el acumulado de todas las cuentas de esa moneda, se controla por moneda y se muestra en la preview.

**Tarjetas embebidas**
Resultó que **no usan el mismo formato que los PDF sueltos de la Fase 8**: dicen `Consumos del mes` en vez de `Movimientos de`, `Tu pago` en vez de `Su pago`, y los totales cierran con `Consumos totales` / `Total a pagar`. Tienen su propio parser (`parseTarjetasEmbebidas`), que devuelve la misma forma normalizada, así que preview, reglas, dedupe y guardado se reutilizan sin cambios.

**Mapeo de cuentas**
Antes de la preview se listan las cuentas detectadas (bancarias y tarjetas, una por moneda) con un select para asignarlas y un botón para crear la que falte —tarjetas con `EnPatrimonio` off—. El auto-mapeo sólo asigna cuando el nombre coincide: con una sola cuenta bancaria en pesos, adivinar mandaría la Cuenta Corriente a la Caja de Ahorro.

**Internos, sin doble conteo**
Cada `Pago de tarjeta de credito` del cuerpo bancario se convierte en **Interno banco→tarjeta**, emparejado por moneda e importe con el `Tu pago` del resumen de esa tarjeta, que entonces **se saltea**. El gasto entra una sola vez (por los consumos) y el pago es neutro. Además se sugieren como Internos los pares egreso/ingreso espejo entre cuentas propias (mismo importe, misma moneda, hasta 2 días de diferencia), editables en la preview. Todos se revisan juntos en una solapa **Internos / transferencias**.

**Preview con solapas**
Una por cuenta detectada más la de internos, cada una con la tabla editable de la Fase 7.1 (dos fechas, categoría, regla por fila) más un selector de cuenta por fila para corregir el corte de columna, y el destino editable en los internos.

**Verificado con el resumen real** (`2026-08-27`, 17 páginas): 3 cuentas bancarias + 2 tarjetas detectadas, 68 movimientos. Los saldos **cuadran exacto**: pesos $51.574,64 + (−$3.109,12) = **$48.465,52** y dólares **u$s 2,16**, los mismos totales que imprime el resumen. Los 4 pagos de tarjeta quedaron como Internos con su destino correcto (Visa/Amex en pesos y en dólares) y **ningún `Tu pago` se importó** (`0` filas). Los consumos de cada tarjeta suman su subtotal impreso ($663.843,10 la Visa; $355.388,37 + u$s 21,99 la Amex). Las reglas categorizaron sola la línea de Claude. El patrimonio no se infla con las tarjetas. Reimportar el mismo PDF marcó las 68 filas como duplicadas y dejó el botón deshabilitado. Sin errores de consola y sin scroll horizontal en 375px.

**A tener en cuenta**: si importás sólo este resumen, la tarjeta queda con saldo positivo, porque el pago que aparece acá cancela el resumen del mes anterior, cuya deuda no está cargada. Se acomoda importando también el resumen anterior (o cargando el saldo inicial de la tarjeta).

**Pendiente**: PPI, Balanz y MercadoPago.

## Fase 7.1 — Preview de importación editable y reglas por fila (2026-09-10) ✅

Revisión del prompt de la Fase 7 con una previsualización más completa. Todo lo demás de esa fase (columnas `Hash` / `Fuente` / `FechaResumen`, dedupe, motor de reglas, ABM, `saveMovimientos` en lote) ya estaba: esta entrada cubre sólo el delta. **Sólo frontend, no requiere re-deploy.**

**Las dos fechas, editables**
- La preview tiene ahora una columna **Fecha consumo** y otra **Fecha resumen**, editables por fila.
- Arriba, un campo **Fecha de resumen (cierre)** prellenado con el cierre que trae el archivo funciona de atajo: se aplica a todas las líneas de una, y después se corrige la que haga falta. Al lado se muestran el período (derivado) y el vencimiento.
- Editar la fecha de consumo recalcula el `Hash` de esa fila y vuelve a chequear duplicados al instante.

**Reglas por fila, con editor inline**
- Cada fila tiene su propio checkbox **Regla**. Al tildarlo se despliega debajo un mini-editor prellenado desde ese movimiento: patrón (derivado del concepto), tipo de match, categoría, forzar tipo y prioridad — todo editable ahí mismo.
- Mientras escribís el patrón, **se resaltan las otras filas del resumen que ese patrón también matchearía**, y un contador dice a cuántas alcanza. Si queda vacío, avisa que esa regla no se va a crear.
- Son independientes: dos filas con regla producen dos reglas distintas. Reemplaza al checkbox único global de la versión anterior.
- Al confirmar: se guardan los movimientos, después las reglas nuevas en lote, y **se reaplica el engine** a lo importado que quedó sin categoría. El toast informa las tres cosas.

**Formulario manual**
El checkbox "Crear regla" ahora abre el mismo editor (patrón, match, categoría, tipo, prioridad) en vez de crear una regla fija derivada del concepto.

**Detalle de implementación**: la preview pasó a actualizarse **por partes** en vez de repintar el modal entero. Con el repintado anterior, un input de fecha o de patrón perdía el foco a mitad de la edición.

**Verificado** en el navegador con un resumen `.xlsx` generado al vuelo: las 8 columnas con las dos fechas por fila; el atajo de cierre aplicando `2026-08-02` a las 8 líneas y recalculando el período a `2026-07`; el editor inline abriendo con patrón prellenado y foco puesto; al cambiar el patrón a `merpago` se resaltó la fila correspondiente **sin perder el foco**; dos reglas independientes (`youtube → Suscripciones`, `coto → Supermercado`) creadas en una sola importación, con el engine reaplicado (`Importados 8 · 2 reglas creadas · 2 categorizados por las reglas`); una fecha de consumo editada a mano hizo que esa línea **no** se marcara como duplicada al reimportar, mientras las otras 7 sí. En el alta manual, el editor guardó `farmacity` / *empieza con* / prioridad 20 tal cual, y el movimiento quedó con `FechaResumen = Fecha`. Sin errores de consola; en 375px la tabla scrollea sola sin arrastrar la página.

## Fase 9 — Lente por consumo / por resumen (2026-08-28) ✅

Un toggle que cambia con qué fecha se agrupan los meses, para responder dos preguntas distintas: *¿qué gasto me impacta este mes?* y *¿en qué mes compré?*.

**Nota de alcance**: la fase estaba planteada como "sólo frontend", pero la columna `FechaResumen` que necesita **no existía** — la Fase 7 la había dejado explícitamente fuera de alcance y el cierre del resumen quedaba sólo como texto en `Observacion`. Así que esta fase también agrega esa columna y **requiere re-deploy** (`version: "fase9"`).

**Backend `Code.gs`**
- `Movimientos` suma `FechaResumen` **al final** (columna 19). Si no viene, vale la fecha de consumo, así los movimientos manuales tienen las dos iguales y no cambian entre lentes.
- `completarFechaResumen()`: función para ejecutar **una vez** si ya importaste resúmenes. Completa la columna a partir del período que quedó escrito en `Observacion` ("Resumen 2026-07 · …") usando el día 1 de ese mes: para agrupar por mes es exacto, aunque no sea el día real de cierre (ese sigue en la observación). No pisa las filas que ya la tengan.

**Frontend**
- `state.lente` (`resumen` | `consumo`, default `resumen`) persistido en `localStorage`.
- `mesLente(mov)` y `fechaLente(mov)` son ahora el único criterio de agrupación mensual: los usan los totales del mes, el gráfico por categoría, la lista de movimientos y el salto de mes al guardar o importar. Se mantuvo `mesDe(iso)` como helper de cadenas para no cambiarle el significado a una función ya usada en todos lados.
- Toggle segmentado en Resumen y Movimientos, con una línea que explica la vista activa. Al cambiar de lente, si el mes elegido queda vacío salta solo al último mes con datos.
- La lista de movimientos ordena y agrupa por la fecha de la lente, y cada fila muestra **la otra fecha** como tag ("consumo 10/04/2026" cuando mirás por resumen, y al revés): así se entiende por qué una compra de abril aparece en agosto.
- En el detalle de un movimiento con dos fechas distintas se editan las dos ("Fecha consumo" y "Fecha resumen"); en los manuales sigue habiendo una sola y al guardar se igualan.
- La importación completa `FechaResumen` con el cierre que trae el resumen.

**Lo que NO cambia con la lente**: saldos por cuenta, patrimonio e inversiones. Un saldo es acumulado a hoy y no depende de cómo mires los meses.

**Verificado** con el caso del análisis (nafta del 15/08 en el resumen que cierra el 30/08, y una notebook comprada el 10/04 en 6 cuotas, una por resumen de abril a septiembre): por resumen, agosto da $165.000 y las cuotas se reparten $100.000 por mes de abril a septiembre; por consumo, abril concentra los $600.000 y agosto queda en $65.000. Saldos ($−640.000 la tarjeta) y patrimonio ($475.000) **idénticos** con las dos lentes. Estando en mayo —vacío en la lente por consumo— la app saltó sola a agosto. El movimiento manual cae en agosto en ambas. Editar la fecha de resumen movió el movimiento de agosto a septiembre. Backend: 9 checks contra el mock (columna al final, default, lote, y la migración en sus tres casos). Sin errores de consola ni scroll horizontal en 375px.

## Fase 8 — Resúmenes de tarjeta en PDF (2026-08-28) ✅

El homebanking de Santander entrega los resúmenes en PDF, así que el mismo modal de importación ahora los acepta. **Sólo frontend**: el backend, la preview, las reglas y `saveMovimientos` se reutilizan sin cambios.

**Lectura del PDF**
- pdf.js 3.11.174 por CDN (con su worker), sumado a la precache del service worker (`mis-finanzas-v3`). El archivo se procesa en tu navegador, igual que el Excel.
- pdf.js entrega fragmentos con coordenadas, no líneas: `pdfLines()` los reagrupa por `y` y los ordena por `x` para reconstruir cada renglón tal como se ve.
- `parseTarjetaPDF()` recorre las secciones del resumen (*Pago anterior y devoluciones*, *Movimientos de…*, *Impuestos, intereses y percepciones*), arrastra la fecha cuando la celda viene vacía, descarta las líneas de `Saldo anterior` / `Saldo del resumen anterior` —que son balances, no movimientos—, y limpia número de comprobante y cuotas de la descripción.
- Fechas en `dd/mm/yy`, importes `$`/`U$S` con negativos, y la fila de seis fechas del encabezado resuelve cierre y vencimiento del período actual.

**Integración**
- El modal ramifica por extensión: `.pdf` → pdf.js, `.xlsx` → SheetJS. Las dos vías producen la **misma** lista normalizada, así que preview, mapeo a las cuentas ARS/USD de la tarjeta, reglas, deduplicación por `Hash` y guardado en lote son exactamente los de la Fase 7.
- Los consumos e impuestos entran como Egreso; los pagos y devoluciones (negativos) como Ingreso, bajando la deuda de la tarjeta.

**Conciliación más precisa**
Ahora el parser captura el **subtotal de consumos** del resumen y la preview concilia contra eso, que es lo que detecta si quedó una línea afuera. Antes se comparaba contra el *total a pagar*, que en los PDF reales incluye otros conceptos y hacía saltar una alerta falsa en cada importación. Cuando no hay subtotal (caso `.xlsx`) sigue comparando contra el total. El mensaje muestra siempre el desglose: consumos · impuestos · pagos.

**Verificado**: el parser da exacto contra los datos de los dos resúmenes reales. Visa 5517 — cierre `2026-07-30`, vencimiento `2026-08-07`, período `2026-07`, 7 consumos por $672.013,12 + U$S6,94 (= el subtotal), fecha arrastrada en la tercera línea, cuotas `6/6` `3/6` `3/9` `2/6`, 4 pagos con las dos líneas de `Saldo…` descartadas, 7 impuestos por $6.617,83. Amex 5802 — vencimiento `2026-08-10`, 9 consumos, 3 pagos, 5 impuestos, con `Google *google one` y `Anthropic* claude sub` a la cuenta USD y la línea de continuación sin importe descartada. `pdfLines` se probó de punta a punta generando un PDF real en el navegador y pasándolo por el input de archivo: reimportarlo marcó las 12 filas como duplicadas y dejó el botón deshabilitado. Sin errores de consola; en 375px la tabla scrollea sola sin arrastrar la página.

**Pendiente**: los PDF de **caja de ahorro** (Santander banco), **PPI** y **Balanz** son otra plantilla — próxima sub-fase. Sus parsers están en el historial de git.

## Fase 7 — Importación de resúmenes de tarjeta + reglas (2026-08-28) ✅

Importar el Excel de Amex/Visa de Santander y un motor de reglas que autocategoriza por patrón. **Requiere re-deploy** (`version: "fase7"`).

**Backend `Code.gs`**
- Hoja nueva `Reglas` `[ID, Patron, TipoPatron, Categoria, Tipo, Prioridad, Hits, Activo]` con su CRUD (`listReglas` / `saveRegla` / `saveReglas` / `deleteRegla`). `bootstrap` la incluye.
- `Movimientos` suma dos columnas **al final**: `Hash` (dedupe) y `Fuente` (`manual` | `import`). Las existentes no se tocan.
- `Hash` = `fecha|centavos|concepto(40)|cuentaID`, lo calcula el backend si viene vacío.
- `saveMovimientos` (lote): valida cada fila, omite las que ya existen por `Hash` —contra la hoja y dentro del mismo lote— y devuelve `{guardados, omitidos}` más los errores de las filas inválidas, sin cortar el resto. La categoría puede venir vacía: lo importado sin categorizar queda pendiente.

**Parser de tarjeta** (el validado en la v1, portado tal cual)
- Lee el `.xlsx` con SheetJS **en el navegador**: el archivo no sale de tu máquina.
- Saca total a pagar, cierre, vencimiento y los consumos, arrastrando la fecha cuando la celda viene vacía; separa pesos de dólares, los pagos (negativos) y el bloque de "Otros conceptos" (IVA, sellos, percepciones), que se fechan al cierre.
- Deriva el **período** del cierre (cierre antes del día 15 ⇒ mes anterior) y detecta emisor y número de tarjeta.

**Flujo de importación**
- Botón **⬆ Importar resumen** en Movimientos: archivo (drag & drop), mapeo de cuentas, período editable y previsualización.
- Como una cuenta tiene una sola moneda, la tarjeta se representa con **dos cuentas** (ARS y USD). Se autocompletan por número o emisor, y si falta la de dólares hay un botón para crearla (tipo tarjeta, fuera del patrimonio).
- La preview marca los **duplicados** (destildados y en gris), precarga la categoría con las reglas, muestra chips de *impuesto* y *pago*, y **concilia** la suma de las líneas contra el total del resumen como aviso informativo.
- Cada línea entra como Egreso (o Ingreso si es un pago o devolución), con la `Cotizacion` congelada del día —una consulta por fecha distinta, en paralelo— y `observacion` = `Resumen AAAA-MM · vence DD/MM/AAAA`.

**Motor de reglas**
- `aplicarReglas(concepto)` con match `contiene` / `empieza` / `igual` / `regex` (regex inválida no rompe: no matchea), resuelto por prioridad.
- Al importar precarga categorías; en la carga manual, escribir el concepto **sugiere** la categoría y lo dice ("✨ sugerida por la regla «netflix»").
- Crear reglas sin ir a Ajustes: checkbox en el formulario manual y, en la importación, una sola casilla que crea las reglas de todas las categorías que asignaste a mano. El patrón sale del concepto (sin dígitos ni símbolos, dos palabras).
- **✨ Aplicar reglas a N sin categoría** en Movimientos, para lo ya importado.
- ABM de reglas en Ajustes (patrón, tipo de match, categoría, prioridad, hits) con un set sugerido que además crea las categorías que falten (Suscripciones, Pago de tarjeta, Impuestos y sellos).
- Los `Hits` se llevan solos cuando la regla se aplica en una importación o en el reprocesado.

**Otros**
- El desplegable de broker en Inversiones sugiere siempre **Balanz** y **PPI**, además de los que ya usaste (sin repetir ni distinguir mayúsculas). Se sigue pudiendo escribir cualquier otro.
- **Filtro por broker** en Inversiones: pills que además recalculan el total del encabezado y la composición por tipo de activo. El patrimonio y el resumen siguen mostrando todas las tenencias: el filtro es sólo de esa pantalla.
- El select de categoría del formulario manual arranca en "— elegí una categoría —" en vez de la primera de la lista: antes se podía guardar una categoría por descuido.
- SheetJS 0.18.5 por CDN, sumado a la precache del service worker (`mis-finanzas-v2`).

**Verificado**: 20 checks del backend contra el mock de Sheets (reglas CRUD, dedupe contra la hoja y dentro del lote, categoría vacía permitida, hash, fuente, encabezados) y el flujo completo en el navegador generando resúmenes `.xlsx` reales con SheetJS y pasándolos por el input de archivo. Un resumen Amex de 10 líneas quedó con la cuota `(cuota 5/6)`, la fecha arrastrada, los u$s en la cuenta USD recién creada, el pago como Ingreso, los impuestos al cierre, y el **saldo de la tarjeta dio exactamente el total del resumen** ($−57.826,60 y u$s −21,99). Reimportar el mismo archivo marcó las 10 filas como duplicadas y dejó el botón deshabilitado. Sin errores de consola ni scroll horizontal en 375px.

**Pendiente**: la importación de **PDF** (Santander caja de ahorro, PPI, Balanz) y de MercadoPago. Los parsers están en el historial de git, en el `index.html` anterior a la reescritura.

## Cuentas archivables (2026-08-27)

El campo `Activo` de `Cuentas` se usa por fin: se puede **archivar** una cuenta que ya no usás sin perder su historial. Es casi todo frontend; el backend sólo cambia un mensaje.

**Qué hace archivar**
- La cuenta **desaparece de las altas** de movimientos y **deja de sumar al patrimonio** y a las composiciones.
- Su **historial se mantiene intacto**: los movimientos la referencian por ID, así que siguen mostrando su nombre, y el filtro por cuenta la incluye marcada como *(archivada)*.
- Si editás un movimiento viejo que la usa, la cuenta aparece igual en el select (marcada) para no perderla al guardar.
- Se **reactiva** con un clic.

**Detalles**
- Botón 📥 / ↩️ en cada fila de Ajustes → Cuentas; las archivadas se listan en su propia sección, atenuadas.
- Al archivar, si la cuenta tiene saldo, el confirm lo dice. Y en Patrimonio aparece una tarjeta **"Cuentas archivadas con saldo"** para que esa plata no quede invisible.
- `state.cuentas` ahora guarda **todas** las cuentas (las archivadas hacen falta para resolver el historial); `cuentasActivas()` filtra donde corresponde operar.
- Corregido de paso: editar una cuenta archivada desde el modal la reactivaba sin querer (el formulario mandaba `activo: true` fijo).
- La lista de Ajustes ahora muestra el **saldo actual** (inicial + movimientos) en vez del inicial, con el inicial como referencia.
- `deleteCuenta` sugiere archivar en vez de borrar cuando la cuenta tiene movimientos. Es el único cambio del backend: el re-deploy es **opcional** (`version: "fase6.2"`).

**Verificado** en el navegador: al archivar, el patrimonio baja de $130.000 a $100.000 y la cuenta pasa a su sección; el movimiento histórico sigue mostrando "Caja vieja"; el alta nueva no la ofrece pero la edición del movimiento viejo sí, ya seleccionada; editar la cuenta archivada no la reactiva; reactivar devuelve el saldo al patrimonio. Sin errores de consola ni scroll horizontal en 375px.

## Fase 6.1 — Timestamp en hora argentina (2026-08-27)

La columna `Timestamp` de `Movimientos` se guardaba en UTC (`2026-08-26T21:40:24.849Z`): tres horas adelantada y con formato incómodo de leer en la planilla. Ahora se guarda como `2026-08-26 18:40:24`, en hora de Buenos Aires.

- `Code.gs`: constante `TZ` y helper `ahoraAR()` con `Utilities.formatDate`. El sello lo pone **siempre el backend** (`saveMovimiento` lo devuelve en la respuesta) y **se conserva al editar**: sigue marcando cuándo se cargó el movimiento.
- Lectura robusta con `formatFechaHora()`: si Sheets devolvió la celda como fecha, o si quedó un valor viejo en UTC, se normaliza a hora argentina en vez de propagarse mal.
- La columna se marca como **texto** al crear la hoja, para que Sheets no la reinterprete con la zona horaria de la planilla.
- `normalizarTimestamps()`: función para ejecutar **una vez** desde el editor si ya tenías movimientos cargados. Convierte los sellos viejos de UTC a hora argentina y deja la columna como texto.
- El frontend ya no genera el sello: manda el campo vacío en las altas y usa el que devuelve el backend.

**Verificado** con el mock de Sheets: formato sin `Z`, hora efectivamente UTC−3, sello conservado al editar, conversión de los valores viejos (21:40 UTC → 18:40 AR, y un caso que cambia de día: 1/7 02:30 UTC → 30/6 23:30 AR) y la migración sobre filas existentes. En el navegador, el alta manda el campo vacío y toma el sello del backend.

**Requiere re-deploy** (`version: "fase6.1"`).

## Fase 6 — Inversiones (2026-08-27) ✅

ABM manual de tenencias y su aporte al patrimonio. **Vuelve a tocar el backend**: hay que re-deployar.

**Backend `Code.gs`**
- Hoja nueva `Inversiones` `[ID, Broker, Especie, Descripcion, TipoActivo, Cantidad, PrecioActual, Moneda, ValorActual, Fecha]`.
- Acciones `listInversiones` / `saveInversion` / `saveInversiones` (lote, lista para la importación de la Fase 7) / `deleteInversion`. `bootstrap` las incluye.
- `ValorActual` lo **deriva el backend** (`Cantidad × PrecioActual`) en cada guardado, así la hoja se puede leer y sumar sin la app.
- Validación: hace falta especie o descripción, y ni cantidad ni precio pueden ser negativos.
- `doGet` ahora reporta `version: "fase6"`.

**Frontend `index.html`**
- **Pantalla Inversiones**: total en tenencias, composición por tipo de activo (acciones, CEDEARs, bonos, ON, FCI, cripto, plazo fijo) y detalle agrupado por broker, con FAB para cargar.
- Formulario con broker (autocompletado con los que ya usaste), especie, descripción, tipo, cantidad, precio, moneda y fecha de valuación. El **valor se calcula en vivo** y muestra el equivalente en la otra moneda al dólar de hoy.
- **Aporte al patrimonio**: `activosPatrimonio()` unifica cuentas y tenencias, así que el total, la composición por moneda y la de por tipo ya las incluyen, en Patrimonio y en Resumen. Las tenencias son una foto de hoy: no entran cuando se pide un patrimonio con fecha de corte.
- En Patrimonio, las tenencias aparecen con su total por broker, y hay un **aviso de doble conteo**: si además tenés una cuenta de tipo Inversión con saldo que representa lo mismo, avisa para que desmarques "Suma al patrimonio" en una de las dos.

**Verificado**: 12 checks del backend contra el mock de Sheets (alta, `ValorActual` derivado y recalculado al editar, orden, validaciones, lote, borrado, `bootstrap` y encabezados) y el flujo completo en el navegador (alta de dos tenencias en distintas monedas, valor en vivo, agrupación por broker, edición, borrado, las tres monedas del toggle). El patrimonio con tenencias dio exactamente lo calculado a mano, y Resumen y Patrimonio coinciden. Las cinco pantallas sin errores de consola ni scroll horizontal en 375px.

## Fase 5 — Patrimonio (2026-08-26) ✅

Pantalla de patrimonio con composición y detalle. Sin tocar el backend.

**Pantalla Patrimonio**
- Hero con el **total de hoy** y la cotización usada para valuarlo.
- **Composición por moneda** (cuánto pesa lo que está en pesos y lo que está en dólares) y **por tipo de cuenta** (efectivo, banco, billetera, inversión), con barras y porcentajes.
- **Detalle por cuenta agrupado por tipo**, con el peso de cada una en el patrimonio y, si el toggle convierte, el saldo original como referencia.
- **Fuera del patrimonio**: las cuentas con `EnPatrimonio` desactivado (tarjetas) van aparte, con su total; si es negativo se muestra además el **patrimonio neto** descontándolas.
- Sección de Inversiones que explica que se suman en la Fase 6, y que mientras tanto una cuenta de tipo *Inversión* cumple la misma función.

**Bug corregido (afectaba a las Fases 3 y 4)**
Los tres agregadores descartaban un monto de **ambas** monedas cuando no se podía expresar en una de ellas. Sin cotización cargada, el patrimonio en pesos daba `$0` aunque las cuentas en pesos no necesiten ninguna conversión, y lo mismo pasaba con los totales del mes y el gráfico. Ahora un acumulador bimonetario (`acum` / `sumar`) suma cada moneda por separado y cuenta aparte lo que falta en cada una: un saldo en pesos sigue sumando en pesos aunque no haya dólar. La composición no muestra un grupo en cero cuando no se pudo convertir: lo omite y avisa.

**Verificado** con cinco cuentas en dos monedas, una tarjeta con saldo negativo y una compra de dólares (interno ARS→USD): saldos por cuenta, patrimonio total en ARS y USD, porcentajes de ambas composiciones, patrimonio neto descontando la tarjeta, y el caso sin cotización (los grupos en pesos siguen sumando, los de dólares se omiten con aviso). Las cinco pantallas renderizan sin errores y sin scroll horizontal en 375px, y Resumen y Patrimonio coinciden en el total.

## Fase 4 — Resumen (2026-08-26) ✅

Dashboard con patrimonio, totales del mes, gráfico por categoría y saldo por cuenta. Sin tocar el backend.

**Motor de saldos** (adelantado de la Fase 5, porque la Fase 4 necesita el saldo por cuenta)
- `saldosPorCuenta(hasta)` recorre los movimientos una sola vez y devuelve el saldo de cada cuenta: `SaldoInicial` + ingresos − egresos, y en los internos resta en el origen y suma `MontoDestino` en el destino. Acepta una fecha de corte.
- `patrimonio(hasta)` suma las cuentas marcadas `EnPatrimonio`, valuadas **al dólar de hoy**, y cuenta las que no se pudieron convertir.
- El saldo vive en la moneda de la cuenta: no se convierte para calcularlo, sólo para mostrarlo.

**Pantalla Resumen**
- Hero con el **patrimonio de hoy** y cuántas cuentas lo componen (en "Ambas" muestra las dos monedas).
- Navegación por mes **compartida con Movimientos**: cambiar el mes en una pantalla lo cambia en la otra.
- Totales del mes (ingresos / egresos / neto) reusando el bloque de la Fase 3.
- **Gráfico por categoría** con barras horizontales, en HTML/CSS (sin librerías), con el color de cada categoría, su porcentaje y el monto. Un par de pills alterna entre egresos e ingresos.
- **Saldo por cuenta** a hoy, con las cuentas fuera del patrimonio (tarjetas) listadas aparte.
- FAB ＋ para cargar un movimiento sin ir a la otra pantalla.

**Verificado** con un set de 6 movimientos en dos monedas y dos meses: saldos por cuenta ($1.152.480 y u$s 150 partiendo de $50.000 y u$s 300), patrimonio a hoy en ARS y USD, totales del mes usando la cotización congelada de cada movimiento (un gasto de u$s 50 a 1500 pesa $75.000, no $80.000), interno y mes anterior excluidos de los totales, gráfico con los porcentajes correctos (88% / 12%), sincronía de mes entre pantallas, y las tres monedas del toggle. Sin errores de consola; en 375px no hay scroll horizontal.

## Fase 3 — Multimoneda (2026-08-26) ✅

El toggle ARS / USD / Ambas del header ahora afecta los datos, con la regla de oro del `PLAN.md`.

**Conversión**
- `convertir(monto, moneda, cur, tc)` es el único lugar donde se cambia de moneda; devuelve `null` si no hay cotización con la que hacerlo (nunca inventa un número).
- **Movimientos: valor congelado a su fecha.** Cada uno se valúa con su propia `Cotizacion` (`tcDe`), no con la de hoy. Dos sueldos iguales de meses distintos dan USD distintos, que es el punto.
- **Saldos: al dólar de hoy.** Las cuentas usan `valorHoy` con la cotización actual, porque representan cuánto valen ahora. `valorHoy` queda listo para el patrimonio de la Fase 5.
- `montoVista` decide cómo se muestra: si hubo conversión, el monto convertido va arriba y **el original queda debajo como referencia** — nunca se ve un importe convertido con la etiqueta de su moneda original. El `title` explica a qué cotización se convirtió.

**Aplicado en**
- Lista de movimientos: montos y, en los internos, el lado destino (en vista nativa muestra lo que entra y el TC; convertido, ambos lados dan lo mismo).
- **Totales del mes** (ingresos / egresos / neto) sobre lo que se está viendo, respetando los filtros. Los internos no suman: mueven plata entre cuentas propias. En "Ambas" se muestran las dos monedas; los movimientos sin ninguna cotización quedan fuera del total, con la aclaración de cuántos son.
- Saldos de cuentas en Ajustes.
- Aviso cuando no hay cotización del día y el toggle pide convertir.

**Verificado** en el navegador con datos de las dos monedas y cotizaciones congeladas distintas (1000, 1500, 1531) frente a un dólar de hoy de 1600: cada movimiento se convierte con la suya, los totales cuadran en ARS y USD, el interno queda excluido, las cuentas se valúan a hoy (u$s 300 → $480.000), y el caso sin cotización muestra el monto nativo y se descuenta del total. Sin errores de consola y sin scroll horizontal en 375px.

## Fase 2 — Movimientos (2026-08-26) ✅

Alta, edición y borrado de movimientos uno por uno, más los dos ABM que los alimentan.

**Backend `Code.gs`**
- Hojas nuevas: `Movimientos` `[ID, Mes, Fecha, Tipo, Categoria, Concepto, Cuenta, CuentaDestino, Moneda, Monto, MonedaDestino, MontoDestino, Cotizacion, ModoPago, Observacion, Timestamp]`, `Categorias` `[ID, Nombre, Aplica, Color, Orden, Activo]` y `ModosPago` `[ID, Nombre, Orden, Activo]`.
- Acciones: `listMovimientos` (opcionalmente por mes) / `saveMovimiento` / `deleteMovimiento`, `listCategorias` / `saveCategoria` / `saveCategorias` (lote) / `deleteCategoria`, y las equivalentes de `ModosPago`. `bootstrap` ahora devuelve `{cuentas, categorias, modosPago, movimientos, config}`.
- `Cuenta`, `CuentaDestino` y `Categoria` guardan el **ID** de su ficha (renombrarlas no rompe el historial); `ModoPago` guarda el nombre.
- `Mes` se deriva de la fecha en el backend, así siempre coincide.
- Validación server-side: tipo válido, monto > 0, cuenta obligatoria y, en internos, cuenta destino distinta y monto de entrada > 0.
- Guardas de borrado: no se borra una cuenta con movimientos ni una categoría en uso (devuelven el motivo).
- Helpers nuevos `upsertBatch` / `upsert` / `borrarPorId`; `saveCuenta` y `deleteCuenta` pasaron a usarlos.

**Frontend `index.html`**
- **Pantalla Movimientos**: navegación por mes (‹ › y "Hoy"), filtros por tipo, cuenta, categoría y búsqueda por concepto, lista agrupada por día y FAB ＋.
- **Formulario** (modal) para Ingreso / Egreso / Interno: el símbolo de moneda sale de la cuenta elegida, las categorías se filtran por su campo `Aplica`, y en internos aparece la cuenta destino. Si las dos cuentas tienen distinta moneda se pide el monto que entra y se muestra el **tipo de cambio implícito** (venta MEP: `MontoDestino / Monto`), que además autocompleta `Cotizacion`. Con la misma moneda, lo que entra es igual a lo que sale.
- `Cotizacion` se autocompleta con el MEP del día del movimiento (histórico de argentinadatos para fechas pasadas, con fallback al valor actual) y se puede editar a mano.
- **Ajustes**: ABM de Categorías (nombre, aplica, color, orden) y de Modos de pago (alta inline, renombrar, borrar), ambos con un botón para cargar un set sugerido editable.

**Verificado**: 20 checks del backend contra un mock de Google Sheets (CRUD, derivación de `Mes`, orden, filtro por mes, validaciones, guardas de borrado, encabezados) y el flujo completo en el navegador contra un backend falso (alta de los tres tipos, TC implícito, filtros, navegación de mes, edición con salto de mes, borrado, mobile/desktop).

**Pendiente**: los totales del mes y el saldo por cuenta llegan con las Fases 4 y 5 (sumar ARS y USD necesita la conversión de la Fase 3). El toggle ARS/USD/Ambas sigue siendo sólo preferencia visual. La cotización histórica no se pudo probar de punta a punta acá (la API estaba bloqueada en el entorno de desarrollo); si falla, cae al valor actual.

## Fase 1.1 — Token de acceso (2026-08-26)

La web app se publica como "Cualquiera con el enlace" (el `fetch` desde GitHub Pages no puede usar la sesión de Google), así que ahora **toda acción exige un token compartido**:

- `Code.gs`: token en las Propiedades del script (`MF_TOKEN`), nunca en el código. `generarToken()` lo crea y lo deja en el registro. `handleAction` valida antes de rutear y **falla cerrado** si no hay token configurado. Comparación en tiempo constante. `doGet` sin `action` sigue abierto como chequeo de salud, pero sólo informa `version` y `tokenConfigurado` — no devuelve datos.
- `index.html`: campo de token (tipo password) en Ajustes → Conexión, guardado en `localStorage` (`mf_token`); `api()` lo manda en el **cuerpo** del POST, nunca en la URL. Sin token, la app no intenta conectarse.

Para rotarlo: ejecutar `generarToken()` otra vez y volver a pegarlo en Ajustes.

## Fase 1 — Esqueleto (2026-08-26) ✅

Reescritura desde cero: PWA + backend + cotización + ABM Cuentas. La v1 (importador de resúmenes) queda en el historial de git.

**Backend `Code.gs`**
- Ruteo `doPost` / `doGet` (`?action=` para debug) → `handleAction`.
- Hojas auto-creadas con `getOrCreateSheet`: `Cuentas` `[ID, Nombre, Tipo, Moneda, SaldoInicial, FechaInicial, EnPatrimonio, Orden, Activo]` y `Config` `[clave, valor]`.
- Acciones: `ping`, `bootstrap` (`{cuentas, config}` en un solo request), `listCuentas`, `saveCuenta` (alta o edición por `ID`), `deleteCuenta` (borrado físico), `getConfig`, `setConfig`.
- `bootstrap` devuelve **todas** las cuentas con el flag `activo`; el front filtra las inactivas.

**Frontend `index.html`**
- Header sticky: toggle ARS / USD / Ambas + chip de cotización (clic = reintenta online).
- Navegación de 5 pantallas: sidebar en desktop (≥860px), bottom-nav en mobile. Resumen, Movimientos, Patrimonio e Inversiones son placeholders "Próximamente".
- Ajustes funcional: **Conexión** (URL `/exec` en `localStorage` + probar conexión), **Cotización** (online en cascada MEP → MEP → Blue, carga manual que no se pisa al recargar, "volver a automático") y **ABM Cuentas** (alta / edición en modal, borrado con confirm, botón que se bloquea con "Guardando…").
- Helpers ya listos para las fases siguientes: `fmt(monto, moneda)`, `isoDate` / `dispDate` (toleran fechas serializadas por Sheets), `rate()`, `toARS` / `toUSD`, `api()` con `text/plain` (sin preflight CORS), toasts y empty states.
- Preferencias persistidas en `localStorage`: `mf_url`, `mf_cur`, `mf_mep`, `mf_tab`.

**PWA**
- `manifest.json` (standalone, verde `#0F5132`), íconos 192 / 512 / 512-maskable, `sw.js` con app-shell cacheado: network-first para el documento (para que cada fase nueva se vea al publicarla) y cache-first para estáticos y fuentes. Los POST al Apps Script nunca se interceptan.

**Verificado**: alta / edición / borrado de cuentas de punta a punta (ARS y USD), cotización online y manual sobreviviendo al reload, app abriendo offline desde el service worker, layout mobile (bottom-nav) y desktop (sidebar).

**Pendiente para la Fase 2**: ABM Categorías, ABM Modos de pago y alta de movimientos (Ingreso / Egreso / Interno, incluido cambio de moneda con TC implícito) + lista por mes con filtros. El saldo de una cuenta sigue siendo su `SaldoInicial` hasta la Fase 5.
