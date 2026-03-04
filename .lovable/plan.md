

# Další zjednodušení aplikace

Po analýze kódu jsem identifikoval 5 konkrétních oblastí ke zlepšení.

---

## 1) Smazat osiřelé settings komponenty (6 souborů)

Tyto soubory v `src/components/settings/` **nejsou nikde importovány**:

- `ComparisonSettings.tsx`
- `NutritionQuestionnaireSettings.tsx`
- `DiagnosticQuestionnaireSettings.tsx`
- `DataExport.tsx`
- `PaymentTagsManagement.tsx`
- `NutritionSettings.tsx`

---

## 2) Smazat osiřelou stránku `Tests.tsx` (265 řádků)

Stránka `src/pages/Tests.tsx` **nemá žádnou routu v App.tsx** -- její obsah byl integrován do PerformanceHub přes `TestsContent`. Jde o mrtvý kód.

---

## 3) Deduplikovat klientský portál routy v App.tsx

Routy `/zona` a `/client` jsou **identické kopie** (20+ duplicitních řádků). Extrahujeme je do sdíleného pole a renderujeme jednou přes `.map()`.

---

## 4) Odstranit `AnimatePresence mode="wait"` ze Sidebar

V `Sidebar.tsx` je 4x `AnimatePresence mode="wait"` na labely a texty, které se zobrazují/schovávají při collapse. Toto způsobuje zbytečné zpoždění (čekání na exit animaci před vstupní). Nahradíme jednoduchým `AnimatePresence` bez `mode="wait"` pro plynulejší pocit.

---

## 5) Zjednodušit DashboardActions – odstranit duplicitní "Hledat"

`DashboardActions` (desktop bottom bar) obsahuje tlačítko "Hledat", které duplikuje vyhledávací pole v top baru (`Layout.tsx` -- `⌘K`). Na desktopu je zbytečné mít dvě místa pro stejnou akci. Odstraníme "Hledat" z bottom baru a necháme jen "Nový trénink" a "Statistiky", čímž bar zjednodušíme.

---

## Soubory

- **Smazat:** 6 settings komponent + `Tests.tsx` (7 souborů)
- **Edit:** `src/App.tsx` (deduplikace portal routů)
- **Edit:** `src/components/layout/Sidebar.tsx` (odstranit `mode="wait"`)
- **Edit:** `src/components/dashboard/DashboardActions.tsx` (odstranit duplicitní hledání)

