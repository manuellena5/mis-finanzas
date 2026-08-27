# Changelog

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
