# Changelog

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
