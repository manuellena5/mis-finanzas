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

## Setup del backend (Google Apps Script) — una sola vez

1. Entrá a [sheets.google.com](https://sheets.google.com) y creá una **planilla nueva** (será la base de datos). Podés llamarla "Mis Finanzas DB".
2. En la planilla: menú **Extensiones → Apps Script**.
3. Borrá todo el código de ejemplo y pegá el contenido de **`Code.gs`**. Guardá (Ctrl+S).
4. Arriba a la derecha: **Implementar → Nueva implementación**.
5. Engranaje ⚙ → tipo **Aplicación web**.
6. Configurá: *Ejecutar como* = **Yo**; *Quién tiene acceso* = **Solo yo** (o "Cualquiera con el enlace" si querés abrirla desde el celu sin loguearte con la misma cuenta).
7. **Implementar** → autorizá los permisos → copiá la **URL** que termina en `/exec`.
8. Abrí la app, andá a **Config**, pegá esa URL y tocá **Guardar y conectar**.

Las pestañas (Movimientos, Reglas, Cuentas, Inversiones, Config) se crean solas en la planilla la primera vez.

## Publicar en GitHub Pages

1. Creá un repo (privado o público) y subí `index.html` a la raíz.
2. En el repo: **Settings → Pages → Source: Deploy from a branch → main / root**.
3. Abrí la URL `https://<usuario>.github.io/<repo>/`.
4. En Config pegá la URL del backend. Listo — la URL y tus preferencias quedan guardadas en el navegador.

> Como los datos viven en tu Google Sheet (no en el repo), podés tener el repo público sin exponer tu información. Si querés doble candado, hacé el repo privado.

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

## Transferencias entre cuentas propias

Cuando movés plata entre tus cuentas (ej. de MercadoPago a Santander), esos movimientos **no deberían contar como ingreso ni gasto**. Marcá el movimiento con tipo **"Transferencia interna"** y elegí la **cuenta contraparte** (a/desde dónde fue el dinero). Esos movimientos quedan neutros en los KPIs (no suman ni restan) y se muestran como `Cuenta A → Cuenta B`.

Para automatizarlo, creá una **regla** con tu nombre como patrón (ej. "manuel alejandro ellena") y Tipo "Transferencia interna": todas tus transferencias entre cuentas propias se marcan solas. Los pagos de tarjeta también se tratan como neutros (ya están contados en los consumos).

## Cotización del dólar

Se toma automáticamente el **dólar MEP** (con respaldo al Blue si la fuente principal falla). Si tu red bloquea las APIs y no trae nada, en **Config** podés **fijar el valor a mano** (1 USD = $…) y queda guardado.

## Tarjetas: consumo vs. resumen vs. pago

Un consumo de tarjeta tiene tres fechas distintas. Ejemplo: comprás el **30/5**, cae en el **resumen de junio** (cierre 02/07) y lo pagás en **julio**. La app guarda las tres y podés elegir cómo verlo con el toggle **Consumo / Resumen / Pago** en Movimientos:

- **Consumo** (por defecto): el gasto cuenta en el mes en que lo hiciste (mayo). Refleja tus hábitos reales.
- **Resumen**: cuenta en el período del resumen (junio), como lo muestra el banco. Sirve para reconciliar.
- **Pago**: cuenta cuando pagás (julio). Mirada de flujo de caja.

Al importar una tarjeta, el **período del resumen** se deduce de la fecha de cierre (cierre a principio de mes ⇒ mes anterior) y podés editarlo antes de confirmar.

## Notas técnicas

- Un solo `index.html` autocontenido. Librerías desde CDN: **SheetJS** (Excel), **pdf.js** (PDF), **dolarapi** (MEP).
- Dedupe por hash `fecha|monto|descripción|cuenta`: reimportar el mismo resumen no duplica.
- El backend usa `text/plain` en el POST para evitar el preflight CORS de Apps Script.
- Todo es de un solo usuario: no hay login ni "compartido" como en gastos-mb.

## Archivos

- `index.html` — la app (subir a GitHub Pages).
- `Code.gs` — backend para pegar en Apps Script.
- `README.md` — este archivo.
