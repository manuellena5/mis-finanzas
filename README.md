# Mis Finanzas

App web personal de finanzas (un solo usuario): movimientos uno por uno (Ingreso / Egreso / Interno entre cuentas), multimoneda ARS/USD, patrimonio, resumen e inversiones.

HTML + CSS + JS vanilla en un único `index.html`, **PWA** instalable, con **Google Sheets** como base de datos vía **Google Apps Script**. Se publica en GitHub Pages.

> Reescritura desde cero. La v1 (importador de resúmenes) vive en el historial de git; sus parsers se reusan en la Fase 7. El roadmap completo está en `PLAN.md` (local, no versionado).

## Versión

La app muestra su versión en el header (`v11.0`) y, en **Ajustes → Versión**, la compara con la que publica el backend: así se ve si el navegador quedó con una copia cacheada o si falta re-deployar el Apps Script. El botón **Buscar actualizaciones** borra el cache y recarga.

Al hacer cualquier cambio hay que subir el número en los **tres** lugares, que deben coincidir: `APP_VERSION` en `index.html`, `APP_VERSION` en `sw.js` (define el nombre del cache) y `VERSION` en `Code.gs`.

## Estado

| Fase | Qué incluye | Estado |
|---|---|---|
| 1 | PWA + backend + `bootstrap` + cotización (online y manual) + ABM Cuentas | ✅ Completa |
| 2 | Categorías, modos de pago y alta/edición de movimientos | ✅ Completa |
| 3 | Multimoneda (cotización congelada por movimiento, toggle real) | ✅ Completa |
| 4 | Resumen (patrimonio, totales del mes, gráfico por categoría) | ✅ Completa |
| 5 | Patrimonio: composición por moneda y por tipo, detalle por cuenta | ✅ Completa |
| 6 | Inversiones: ABM de tenencias y su aporte al patrimonio | ✅ Completa |
| 7 | Importación de resúmenes de tarjeta (.xlsx) + reglas de categorización | ✅ Completa |
| 7.1 | Preview de importación editable (dos fechas por fila) + reglas por fila | ✅ Completa |
| 8 | Resúmenes de tarjeta en PDF (Santander Visa/Amex) | ✅ Completa |
| 9 | Lente por consumo / por resumen (dos fechas por movimiento) | ✅ Completa |
| 10 | Resumen de cuenta Santander: multi-cuenta, tarjetas embebidas e internos | ✅ Completa |
| 10.1 | Modal de importación a pantalla completa + marcar Internos a mano | ✅ Completa |
| — | PPI, Balanz y MercadoPago | ⏳ Pendiente |

Ver [`CHANGELOG.md`](CHANGELOG.md) para el detalle de cada fase.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la app: markup, estilos y lógica |
| `Code.gs` | Backend de Apps Script (pegar en el editor de la planilla) |
| `manifest.json`, `sw.js`, `icon-*.png` | PWA: instalación y app-shell offline |
| `PLAN.md`, `PROMPT_faseN_*.md` | Plan maestro y prompt de cada fase (locales, en `.gitignore`) |

Únicas dependencias externas: **SheetJS** y **pdf.js** por CDN, para leer los resúmenes en `.xlsx` y `.pdf`. El archivo se procesa en el navegador: no se sube a ningún lado.

## Setup del backend (Google Apps Script) — una sola vez

1. Creá una **planilla nueva** en [sheets.google.com](https://sheets.google.com) (será la base de datos).
2. En la planilla: **Extensiones → Apps Script**.
3. Borrá el código de ejemplo, pegá el contenido de **`Code.gs`** y guardá (Ctrl+S).
4. **Implementar → Nueva implementación** → ⚙ tipo **Aplicación web**.
5. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquiera con el enlace** (necesario para abrirla desde el celular sin loguearte).
6. **Implementar** → autorizá los permisos → copiá la **URL** que termina en `/exec`.
7. Pegá esa URL en la constante `BACKEND_URL`, arriba de todo del `<script>` de `index.html`:
   ```js
   const BACKEND_URL = "https://script.google.com/macros/s/…/exec";
   ```
   Si preferís no tocar el archivo, dejala vacía y la pegás en **Ajustes → Conexión**; la diferencia es que en cada dispositivo nuevo vas a tener que escribir la URL además de la clave.
8. Abrí la app y **definí tu clave**. Hacelo apenas despliegues: hasta que exista una clave, cualquiera con la URL puede ver tus datos.

Las hojas (`Cuentas`, `Categorias`, `ModosPago`, `Movimientos`, `Inversiones`, `Reglas`, `Config`) se crean solas la primera vez, con sus encabezados.

La clave se escribe **una sola vez por dispositivo** y queda en el `localStorage` de ese navegador, hasheada.

### Al actualizar el backend (cada fase nueva)

Pegá el código, guardá, y después **Implementar → Administrar implementaciones → ✏️ editar → Versión: Nueva versión → Implementar**. Así la URL `/exec` sigue siendo la misma.

Si en cambio creás una *implementación nueva*, te da otra URL y la vieja sigue sirviendo el código viejo — el síntoma típico es un error tipo `Accion desconocida: bootstrap`. Para saber qué versión está publicada, abrí tu URL `/exec` en el navegador: el JSON de salud dice `version` y `claveConfigurada`.

## Fechas y zona horaria

Cada movimiento guarda dos fechas: **`Fecha`** (el día del consumo) y **`FechaResumen`** (el cierre del resumen que lo factura). En los manuales coinciden; en los de tarjeta difieren, y por eso el toggle **Por resumen / Por consumo** reagrupa los meses sin tocar los datos. Si ya tenías resúmenes importados de antes, ejecutá una vez `completarFechaResumen` desde el editor de Apps Script.

Las fechas se guardan en ISO (`YYYY-MM-DD`) y se muestran como `DD/MM/YYYY`. El `Timestamp` de cada movimiento se guarda en **hora de Buenos Aires** (`2026-08-26 18:40:24`), no en UTC, y lo pone el backend: marca cuándo se cargó y no cambia al editar.

Conviene que la planilla esté en la misma zona horaria: **Archivo → Configuración → Zona horaria → (GMT-03:00) Buenos Aires**.

Si ya tenías movimientos cargados con el formato viejo en UTC, ejecutá **una vez** la función `normalizarTimestamps` desde el editor de Apps Script: convierte los sellos existentes a hora argentina y deja la columna como texto.

## Seguridad

La app se publica como *Cualquiera con el enlace* porque el `fetch` del navegador desde GitHub Pages no puede autenticarse con tu cuenta de Google (sin sesión de origen cruzado, CORS lo bloquea). Para que la URL sola no alcance:

- Toda acción exige **tu clave**, que escribís una sola vez por dispositivo.
- La clave **nunca viaja ni se guarda en texto plano**: el navegador calcula su SHA-256 (con un salt fijo) y manda ese hash. El backend lo compara, en tiempo constante, contra el hash guardado en las **Propiedades del script** (⚙ Configuración del proyecto). No está en `Code.gs` ni en la planilla, así que no viaja al repo público ni sale en una exportación de la hoja.
- La clave va en el **cuerpo** del POST, nunca en la URL: no queda en historiales ni en logs de referer.
- Cada intento fallido **tarda más que el anterior** (hasta 5 segundos), pero **la clave correcta entra siempre**. No hay bloqueo total a propósito: como la URL es pública, cualquiera podría fallar la clave adrede para dejarte afuera a vos.
- En **Ajustes → Conexión** podés cambiar la clave (te pide la actual) u olvidarla en ese dispositivo. Al cambiarla, los demás dispositivos piden la nueva la próxima vez que abran.
- Si la olvidás, ejecutá **`resetearClave()`** desde el editor de Apps Script y definí una nueva desde la app.

La URL `/exec` no puede guardarse del lado del servidor: el navegador necesita conocerla para hacer el primer pedido. Con la clave validándose en el backend igual dejó de ser un secreto — es una dirección, no una credencial.

> Si venías de la versión con token, después de desplegar podés borrar la propiedad `MF_TOKEN` del script: ya no se usa.

Alternativa más fuerte, para más adelante: login con Google Identity Services en el frontend y verificación del `id_token` (y de tu email) en el backend. Requiere proyecto de GCP, client ID y orígenes autorizados.

## Publicar en GitHub Pages

1. Subí los archivos a la rama `main`.
2. **Settings → Pages → Source: Deploy from a branch**, rama `main`, carpeta `/ (root)`.
3. Abrí la URL que te da GitHub y, desde el celular, "Agregar a pantalla de inicio" para instalarla como PWA.

## Desarrollo local

```bash
python -m http.server 5173
```

Después abrí `http://localhost:5173`. El service worker sólo se registra en `localhost` o HTTPS.

## Cotización del dólar

Se busca en cascada: MEP de [dolarapi.com](https://dolarapi.com) → MEP de argentinadatos → Blue de bluelytics. Si todas fallan (redes que bloquean las APIs), en **Ajustes → Cotización** se carga a mano: el valor manual **no** se pisa con el online al recargar, hasta que toques "Volver a automático".
