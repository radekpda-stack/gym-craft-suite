

# Oprava: Tlačítko "Dokončit trénink" překryté spodní navigací

## Problém
`TrainingStatusBar` je na mobilu umístěn na `bottom-[88px]` (nad hlavní navigací). Samotný bar má výšku cca 100px (readiness indikátory + tlačítka). Celkový spodní offset je tedy ~188px, ale `TrainingDetailView` má pouze `pb-32` (128px) — obsah stránky tak zasahuje pod status bar.

## Řešení

### 1. Zvýšit spodní padding v `TrainingDetailView.tsx`
- `pb-32` → `pb-52` (208px) — dostatečný prostor pro status bar + navigaci na mobilu

### 2. Kompaktnější `TrainingStatusBar`
- Zmenšit vnitřní padding z `py-3 space-y-2` na `py-2 space-y-1.5`
- Tlačítka z `h-12` na `h-11` — stále komfortní touch target (44px)
- Readiness indikátory: menší text a padding

| Soubor | Změna |
|--------|-------|
| `TrainingDetailView.tsx` | `pb-32` → `pb-52` |
| `TrainingStatusBar.tsx` | Kompaktnější padding a výška tlačítek |

Čistě vizuální změny, žádné DB úpravy.

