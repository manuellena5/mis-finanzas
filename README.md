# Mis Finanzas

Webapp personal (solo para vos) para cargar resúmenes de cuenta, categorizar movimientos con reglas automáticas, seguir tus inversiones y ver tu patrimonio total. Pensada para GitHub Pages, responsive (mobile + PC), con Google Sheets como base de datos.

## Qué hace

- **Resumen** (pantalla de inicio): KPIs del período y una tabla de ingresos y egresos por categoría, mes a mes. Con filtros de período y cuenta.
- **Movimientos**: importás resúmenes de MercadoPago, Santander, Amex y Visa (Excel o PDF). La app los normaliza, aplica reglas de autocategorización y te deja categorizar lo que quedó pendiente. También podés cargar movimientos a mano.
- **Reglas**: cada vez que categorizás algo, podés crear una regla (por "contiene / empieza / igual / regex") para que la próxima vez se detecte solo.
- **Inversiones**: importás la tenencia valorizada de PPI o Balanz (PDF) y ves tu cartera por activo y por tipo.
- **Patrimonio**: suma cuentas + billeteras + inversiones + efectivo. La deuda de tarjetas se muestra aparte (no se resta).
- **Monedas**: toggle ARS / USD / ambas, con cotización MEP del día (dolarapi.com).

## Formatos soportados (detección automática)

| Fuente | Formato | Qué se extrae |
|---|---|---|
| MercadoPago | `.xlsx` | Movimientos + saldo final |
| Santander (caja de ahorro) | `.pdf` | Movimientos en $ y US$ + saldos |
| Amex / Visa Santander | `.xlsx` | Consumos, cuotas, pagos + total a pagar |
| PPI (Portfolio Personal) | `.pdf` (con clave) | Tenencia valorizada por especie |
| Balanz | `.pdf` (Posición consolidada) | Tenencia valorizada por especie |

> **Balanz**: exportá el reporte **"Posición consolidada / Tenencia"**, no el extracto de cuenta corriente (ese no tiene valuación).

Al importar, el saldo de la cuenta se actualiza con el que trae el archivo — **salvo que el que ya tenías cargado sea más nuevo**. Así podés importar resúmenes viejos para completar los movimientos sin que te arruinen el patrimonio de hoy. Cuando pasa, la app te avisa de qué cuentas conservó el saldo. La fecha del archivo se toma del cierre del resumen, o del último movimiento que contiene.

## Setup del backend (Google Apps Script) — una sola vez

1. Entrá a [sheets.google.com](https://sheets.google.com) y creá una **planilla nueva** (será la base de datos). Podés llamarla "Mis Finanzas DB".
2. En la planilla: menú **Extensiones → Apps Script**.
3. Borrá todo el código de ejemplo y pegá el contenido de **`Code.gs`**. Guardá (Ctrl+S).
4. Arriba a la derecha: **Implementar → Nueva implementación**.
5. Engranaje ⚙ → tipo **Aplicación web**.
6. Configurá: *Ejecutar como* = **Yo**; *Quién tiene acceso* = **Cualquiera con el enlace** (así entrás desde el celular sin loguearte con la misma cuenta de Google; lo que protege tus datos es la clave, no el enlace).
7. **Implementar** → autorizá los permisos → copiá la **URL** que termina en `/exec`.
8. Pegá esa URL en la constante `BACKEND_URL`, arriba de todo del `<script>` de `index.html`:
   ```js
   const BACKEND_URL = "https://script.google.com/macros/s/…/exec";
   ```
9. Subí el `index.html`, abrilo y **definí tu clave**. Hacelo apenas despliegues: hasta que exista una clave, el backend acepta cualquier pedido. Queda guardada (hasheada) en las Propiedades del script, no en la planilla.

Las pestañas (Movimientos, Reglas, Cuentas, Inversiones, Config) se crean solas en la planilla la primera vez.

> Si preferís no tocar el archivo, dejá `BACKEND_URL` vacía y pegá la URL en **Config**, como antes. La diferencia es que en cada dispositivo nuevo vas a tener que pegar la URL además de escribir la clave.

**Cada vez que cambies `Code.gs`** hay que volver a implementar: **Implementar → Administrar implementaciones → ✏️ editar → Versión: Nueva → Implementar**. Si creás una implementación nueva en lugar de editar la existente, la URL cambia y hay que actualizar `BACKEND_URL`.

## Publicar en GitHub Pages

1. Creá un repo (privado o público) y subí `index.html` a la raíz.
2. En el repo: **Settings → Pages → Source: Deploy from a branch → main / root**.
3. Abrí la URL `https://<usuario>.github.io/<repo>/`.
4. Escribí tu clave una vez y listo: queda guardada en ese navegador junto con tus preferencias.

> Los datos viven en tu Google Sheet, no en el repo, así que el repo puede ser público. La URL del backend queda a la vista en el `index.html`, pero sin la clave no sirve para nada: el backend rechaza todo pedido que no la traiga.

## Seguridad

La app se abre con una **clave**, que escribís una sola vez por dispositivo.

- La clave **nunca viaja ni se guarda en texto plano**. El navegador calcula su SHA-256 (con un salt fijo) y lo que se manda y se guarda es ese hash.
- La validación es **del lado del backend**: el Apps Script compara el hash contra el que tiene guardado y rechaza cualquier acción que no coincida. Por eso tener el `index.html` o la URL `/exec` no alcanza para ver nada.
- El hash **no vive en la planilla** sino en las **Propiedades del script** (Apps Script → ⚙ Configuración del proyecto → Propiedades del script). No se ve desde la hoja, no se borra por accidente y no sale en copias ni exportaciones del archivo de Sheets.
- Cada intento fallido **tarda más que el anterior** (hasta 5 segundos), pero **la clave correcta entra siempre**. No hay bloqueo total a propósito: como la URL es pública, cualquiera podría fallar la clave a propósito y dejarte afuera a vos.
- En **Config → Seguridad** podés cambiar la clave (te pide la actual) o cerrar sesión en ese dispositivo. Al cambiarla, los otros dispositivos van a pedirte la nueva la próxima vez que abran.
- **Si la olvidás**: abrí el editor de Apps Script, elegí la función `resetearClave` y tocá **Ejecutar**. La próxima vez que abras la app te va a dejar definir una nueva.

### Por qué la URL sí va en el archivo

La URL `/exec` no puede guardarse en una propiedad del script: el navegador necesita conocerla para hacer el primer pedido, y sin la URL no hay a quién preguntarle. Es un problema del huevo y la gallina. Con la clave validándose en el backend, igual dejó de ser un secreto: es una dirección, no una credencial. Lo que sí es secreto —el hash de la clave— está del lado del servidor.

Lo que esto *no* es: la clave protege el acceso a tus datos, pero no los cifra dentro de la planilla. Quien tenga acceso a tu cuenta de Google sigue viendo todo, como siempre.

## Uso diario

1. Descargá el resumen de tu banco/billetera/tarjeta (Excel donde puedas, PDF si no).
2. **Movimientos → Importar** → arrastrá el archivo → revisá la previsualización (los duplicados vienen destildados) → **Importar seleccionados**.
3. Categorizá lo pendiente. Al guardar, tildá "crear regla" para automatizar la próxima.
4. Para inversiones: **Inversiones → Importar** el PDF de PPI/Balanz (reemplaza la tenencia de ese broker).

## Pantalla Resumen

Es la primera pestaña y la que abre por defecto. Todo lo que muestra responde a dos filtros: **período** (últimos 3 / 6 / 12 meses, este año, todo el historial, o un mes puntual) y **cuenta**. Si hay tarjetas, también aplica el toggle **Consumo / Resumen / Pago**.

**KPIs** del período, cada uno comparado contra el período anterior de igual longitud:

| KPI | Qué mide |
|---|---|
| Ingresos / Egresos | Totales del período (las transferencias internas y pagos de tarjeta no cuentan) |
| Balance | Ingresos − egresos: superávit o déficit |
| Tasa de ahorro | Qué porcentaje de lo que entra no se gasta (la variación se muestra en puntos porcentuales) |
| Gasto promedio / mes | Promedio mensual, excluyendo el mes en curso para no ensuciarlo con un mes incompleto |
| Proyección | A qué gasto llega el mes actual si seguís al ritmo diario de lo que va del mes |

**Tabla de ingresos y egresos por categoría**: una fila por categoría y una columna por mes, en dos secciones (egresos arriba, ingresos abajo) con subtotales y una fila final de balance mensual. Los montos de las celdas van abreviados (`181k`, `1,2M`) para que entren varios meses en pantalla; la columna **Total** va completa junto al **%** que representa dentro de su sección. El sombreado de cada celda es más intenso cuanto mayor es el monto, así se ve de un vistazo dónde se concentró el gasto. Tocando una categoría saltás a Movimientos con ese filtro aplicado. Si el período tiene más de 12 meses se muestran los 12 más recientes.

El selector **ARS / USD / Ambas** de arriba también afecta al Resumen: en ARS y USD todo se convierte al MEP del día, y en "Ambas" se agrega en pesos y cada total muestra su equivalente en dólares abajo. Si no hay cotización disponible, aparece un aviso porque los montos de la otra moneda no se pueden convertir.

## Cargar movimientos a mano

En **Movimientos** tenés dos botones:

- **＋ Nuevo movimiento**: abre el formulario de alta. Ahí mismo editás o borrás cualquier movimiento existente (tocá la fila para abrirlo). El signo lo pone la app según el tipo — cargás siempre el monto en positivo y un "Gasto" se guarda en negativo, un "Ingreso" en positivo. Pide descripción, monto y fecha antes de guardar.
- **⇄ Transferencia**: para mover plata entre tus propias cuentas (ver abajo).

También podés filtrar la lista por **mes**, **categoría**, **cuenta** y estado, y combinarlos entre sí. Los totales de gasto e ingreso de la pestaña reflejan los filtros aplicados, así que si elegís una categoría ves cuánto llevás gastado solo en ella. El botón **✕ Limpiar filtros** aparece cuando hay alguno activo.

## Transferencias entre cuentas propias

Cuando movés plata entre tus cuentas (ej. de MercadoPago a Santander), esos movimientos **no deberían contar como ingreso ni gasto**. El botón **⇄ Transferencia** carga una sola línea en la cuenta de origen, con tipo "Transferencia interna" y la cuenta destino como contraparte: queda neutra en los KPIs y se muestra como `Cuenta A → Cuenta B`.

Por defecto **ajusta los saldos** de ambas cuentas en Patrimonio (resta en origen, suma en destino). Tené en cuenta que si después importás el resumen del banco, el saldo importado pisa al ajustado a mano — destildá esa opción si preferís que los saldos vengan solo de los resúmenes.

Si las dos cuentas están en monedas distintas, el formulario pide además **cuánto llegó** a la cuenta destino: sugiere la conversión al MEP del día pero podés reemplazarla por la cotización real de tu operación. El movimiento se guarda en la moneda de origen y el monto recibido queda anotado en observaciones.

También podés marcar a mano cualquier movimiento ya cargado con tipo **"Transferencia interna"** y elegir la **cuenta contraparte**, que es lo que pasa cuando los detecta una regla al importar.

Para automatizarlo, creá una **regla** con tu nombre como patrón (ej. "manuel alejandro ellena") y Tipo "Transferencia interna": todas tus transferencias entre cuentas propias se marcan solas. Los pagos de tarjeta también se tratan como neutros (ya están contados en los consumos).

## Cómo se muestran los montos

El toggle **ARS / USD / Ambas** decide en qué moneda ves todo:

- En **ARS** o **USD**, los movimientos en la otra moneda se convierten al MEP del día y abajo del importe queda el **monto original** como referencia (ej. `–$2.302.500` con `u$s 1.500` debajo). Pasando el mouse por encima ves a qué cotización se convirtió.
- En **Ambas**, cada movimiento se muestra en su propia moneda, con el código de moneda abajo.
- Si no hay cotización cargada no se inventa ninguna conversión: se muestra el monto original y aparece un aviso para que la cargues en Config.

## Cotización del dólar

Se toma automáticamente el **dólar MEP** (con respaldo al Blue si la fuente principal falla). Si tu red bloquea las APIs y no trae nada, en **Config** podés **fijar el valor a mano** (1 USD = $…) y queda guardado.

## Tarjetas: consumo vs. resumen vs. pago

Un consumo de tarjeta tiene tres fechas distintas. Ejemplo: comprás el **30/5**, cae en el **resumen de junio** (cierre 02/07) y lo pagás en **julio**. La app guarda las tres y podés elegir cómo verlo con el toggle **Consumo / Resumen / Pago** en Movimientos:

- **Consumo** (por defecto): el gasto cuenta en el mes en que lo hiciste (mayo). Refleja tus hábitos reales.
- **Resumen**: cuenta en el período del resumen (junio), como lo muestra el banco. Sirve para reconciliar.
- **Pago**: cuenta cuando pagás (julio). Mirada de flujo de caja.

Al importar una tarjeta, el **período del resumen** se deduce de la fecha de cierre (cierre a principio de mes ⇒ mes anterior) y podés editarlo antes de confirmar.

## Versionado y actualizaciones

La app lleva su propio número de versión (semver: `mayor.menor.parche`) declarado arriba de todo en `index.html`:

```js
const APP_VERSION = "1.4.0";
const APP_FECHA   = "2026-08-10";
const CHANGELOG = [ … ];
```

**Regla: cada vez que se modifica `index.html` hay que subir `APP_VERSION`**, poner la fecha del día en `APP_FECHA` y agregar la entrada correspondiente arriba de todo en `CHANGELOG`. Subí el **parche** (`1.4.0` → `1.4.1`) para arreglos y retoques, el **menor** (`1.4.1` → `1.5.0`) cuando agregás una función, y el **mayor** cuando cambia algo de fondo. Si no la subís, la app no tiene forma de saber que hay algo nuevo.

Cómo funciona la detección: la app baja su propio `index.html` publicado (sin caché) y le lee el `APP_VERSION`. Si el publicado es mayor que el que estás corriendo, aparece una barra verde arriba con **Actualizar** (recarga forzada, salteando la caché del navegador) o **Después** (silencia el aviso solo para esa versión). Chequea a los pocos segundos de abrir, cada media hora, y cada vez que volvés a la pestaña si pasaron más de 5 minutos. En **Config → Versión** ves cuál tenés instalada, un botón para buscar actualizaciones a mano y las novedades de las últimas versiones.

Como todo pasa por el `index.html` publicado, no hace falta tocar nada en el backend ni llevar la cuenta en otro lado: alcanza con subir el archivo a GitHub Pages.

## Notas técnicas

- Un solo `index.html` autocontenido. Librerías desde CDN: **SheetJS** (Excel), **pdf.js** (PDF), **dolarapi** (MEP).
- Dedupe por hash `fecha|monto|descripción|cuenta`: reimportar el mismo resumen no duplica.
- El backend usa `text/plain` en el POST para evitar el preflight CORS de Apps Script.
- Todo es de un solo usuario: no hay login ni "compartido" como en gastos-mb.

## Archivos

- `index.html` — la app (subir a GitHub Pages).
- `Code.gs` — backend para pegar en Apps Script.
- `README.md` — este archivo.
