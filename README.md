# Mis Finanzas

App web personal de finanzas (un solo usuario): movimientos uno por uno (Ingreso / Egreso / Interno entre cuentas), multimoneda ARS/USD, patrimonio, resumen e inversiones.

HTML + CSS + JS vanilla en un único `index.html`, **PWA** instalable, con **Google Sheets** como base de datos vía **Google Apps Script**. Se publica en GitHub Pages.

> Reescritura desde cero. La v1 (importador de resúmenes) vive en el historial de git; sus parsers se reusan en la Fase 7. El roadmap completo está en [`PLAN.md`](PLAN.md).

## Estado

| Fase | Qué incluye | Estado |
|---|---|---|
| 1 | PWA + backend + `bootstrap` + cotización (online y manual) + ABM Cuentas | ✅ Completa |
| 2 | Categorías, modos de pago y alta/edición de movimientos | ⏳ Pendiente |
| 3 | Multimoneda (cotización congelada por movimiento, toggle real) | ⏳ Pendiente |
| 4 | Resumen | ⏳ Pendiente |
| 5 | Patrimonio (saldos calculados por movimientos) | ⏳ Pendiente |
| 6 | Inversiones | ⏳ Pendiente |
| 7 | Importación de resúmenes | ⏳ Pendiente |

Ver [`CHANGELOG.md`](CHANGELOG.md) para el detalle de cada fase.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Toda la app: markup, estilos y lógica |
| `Code.gs` | Backend de Apps Script (pegar en el editor de la planilla) |
| `manifest.json`, `sw.js`, `icon-*.png` | PWA: instalación y app-shell offline |
| `PLAN.md` | Plan maestro: arquitectura, modelo de datos, fases |
| `PROMPT_faseN_*.md` | Prompt autónomo de cada fase |

## Setup del backend (Google Apps Script) — una sola vez

1. Creá una **planilla nueva** en [sheets.google.com](https://sheets.google.com) (será la base de datos).
2. En la planilla: **Extensiones → Apps Script**.
3. Borrá el código de ejemplo, pegá el contenido de **`Code.gs`** y guardá (Ctrl+S).
4. **Implementar → Nueva implementación** → ⚙ tipo **Aplicación web**.
5. *Ejecutar como*: **Yo**. *Quién tiene acceso*: **Cualquiera con el enlace** (necesario para abrirla desde el celular sin loguearte).
6. **Implementar** → autorizá los permisos → copiá la **URL** que termina en `/exec`.
7. En la app: **Ajustes → Conexión**, pegá la URL y tocá **Guardar y conectar**.

Las hojas (`Cuentas`, `Config`, y las que sumen las fases siguientes) se crean solas la primera vez, con sus encabezados.

La URL del backend se guarda en el `localStorage` del navegador: no viaja al repo ni queda hardcodeada.

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
