# Mis Finanzas

App web personal de finanzas (un solo usuario): movimientos uno por uno (Ingreso / Egreso / Interno entre cuentas), multimoneda ARS/USD, patrimonio, resumen e inversiones.

HTML + CSS + JS vanilla en un único `index.html`, **PWA** instalable, con **Google Sheets** como base de datos vía **Google Apps Script**. Se publica en GitHub Pages.

> Reescritura desde cero. La v1 (importador de resúmenes) vive en el historial de git; sus parsers se reusan en la Fase 7. El roadmap completo está en `PLAN.md` (local, no versionado).

## Estado

| Fase | Qué incluye | Estado |
|---|---|---|
| 1 | PWA + backend + `bootstrap` + cotización (online y manual) + ABM Cuentas | ✅ Completa |
| 2 | Categorías, modos de pago y alta/edición de movimientos | ✅ Completa |
| 3 | Multimoneda (cotización congelada por movimiento, toggle real) | ✅ Completa |
| 4 | Resumen (patrimonio, totales del mes, gráfico por categoría) | ✅ Completa |
| 5 | Patrimonio: composición por moneda y por tipo, detalle por cuenta | ✅ Completa |
| 6 | Inversiones: ABM de tenencias y su aporte al patrimonio | ✅ Completa |
| 7 | Importación de resúmenes | ⏳ Pendiente |

Ver [`CHANGELOG.md`](CHANGELOG.md) para el detalle de cada fase.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la app: markup, estilos y lógica |
| `Code.gs` | Backend de Apps Script (pegar en el editor de la planilla) |
| `manifest.json`, `sw.js`, `icon-*.png` | PWA: instalación y app-shell offline |
| `PLAN.md`, `PROMPT_faseN_*.md` | Plan maestro y prompt de cada fase (locales, en `.gitignore`) |

## Setup del backend (Google Apps Script) — una sola vez

1. Creá una **planilla nueva** en [sheets.google.com](https://sheets.google.com) (será la base de datos).
2. En la planilla: **Extensiones → Apps Script**.
3. Borrá el código de ejemplo, pegá el contenido de **`Code.gs`** y guardá (Ctrl+S).
4. En el selector de funciones elegí **`generarToken`** y tocá **Ejecutar**. Autorizá los permisos y copiá el token que aparece en el **registro de ejecución**.
5. **Implementar → Nueva implementación** → ⚙ tipo **Aplicación web**.
6. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquiera con el enlace** (necesario para abrirla desde el celular sin loguearte).
7. **Implementar** → copiá la **URL** que termina en `/exec`.
8. En la app: **Ajustes → Conexión**, pegá la URL y el token, y tocá **Guardar y conectar**.

Las hojas (`Cuentas`, `Categorias`, `ModosPago`, `Movimientos`, `Inversiones`, `Config`) se crean solas la primera vez, con sus encabezados.

La URL y el token se guardan en el `localStorage` del navegador: no viajan al repo ni quedan hardcodeados.

### Al actualizar el backend (cada fase nueva)

Pegá el código, guardá, y después **Implementar → Administrar implementaciones → ✏️ editar → Versión: Nueva versión → Implementar**. Así la URL `/exec` sigue siendo la misma.

Si en cambio creás una *implementación nueva*, te da otra URL y la vieja sigue sirviendo el código viejo — el síntoma típico es un error tipo `Accion desconocida: bootstrap`. Para saber qué versión está publicada, abrí tu URL `/exec` en el navegador: el JSON de salud dice `version` y `tokenConfigurado`.

## Fechas y zona horaria

Las fechas se guardan en ISO (`YYYY-MM-DD`) y se muestran como `DD/MM/YYYY`. El `Timestamp` de cada movimiento se guarda en **hora de Buenos Aires** (`2026-08-26 18:40:24`), no en UTC, y lo pone el backend: marca cuándo se cargó y no cambia al editar.

Conviene que la planilla esté en la misma zona horaria: **Archivo → Configuración → Zona horaria → (GMT-03:00) Buenos Aires**.

Si ya tenías movimientos cargados con el formato viejo en UTC, ejecutá **una vez** la función `normalizarTimestamps` desde el editor de Apps Script: convierte los sellos existentes a hora argentina y deja la columna como texto.

## Seguridad

La app se publica como *Cualquiera con el enlace* porque el `fetch` del navegador desde GitHub Pages no puede autenticarse con tu cuenta de Google (sin sesión de origen cruzado, CORS lo bloquea). Para que la URL sola no alcance:

- Toda acción exige un **token compartido**, guardado en las **Propiedades del script** (⚙ Configuración del proyecto). Nunca está en `Code.gs`, así que no viaja al repo público.
- El token va en el **cuerpo** del POST, nunca en la URL: no queda en historiales ni en logs de referer.
- Si falta el token en el backend, se rechaza todo (falla cerrado). El único endpoint abierto es el chequeo de salud de `doGet`, que no devuelve datos.
- Si el token se filtra, corré `generarToken()` de nuevo: invalida el anterior al instante.

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
