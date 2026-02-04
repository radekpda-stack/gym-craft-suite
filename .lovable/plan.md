# Audit a Zjednodušení Aplikace - Fáze 2

## Stav implementace

| Fáze | Stav | Poznámka |
|------|------|----------|
| A: Čištění mrtvého kódu | ✅ Dokončeno | Smazáno: DashboardInsights, DashboardSettings, DashboardSettingsNew, PriceMigration, usePriceMigration |
| B: Sloučení kontextů | ✅ Dokončeno | CelebrationContext sloučen do SmartCelebrationContext |
| C: Konsolidace Analytics | ✅ Dokončeno | ExerciseAnalytics, ClientAnalytics, FinanceAnalytics odstraněny, routy přesměrovány |
| D: Sloučení tréninků | ⏳ Čeká | |
| E: Client Portal reorganizace | ⏳ Čeká | |
| F: Konsolidace hooků | ⏳ Čeká | |

---

## Dokončené změny

### Fáze A: Mrtvý kód
- Smazané soubory:
  - `src/components/dashboard/DashboardInsights.tsx` (842 řádků)
  - `src/components/dashboard/DashboardSettings.tsx`
  - `src/components/dashboard/DashboardSettingsNew.tsx`
  - `src/pages/PriceMigration.tsx`
  - `src/hooks/usePriceMigration.ts`
- Route `/admin/price-migration` odstraněna

### Fáze B: Celebration kontexty
- `SmartCelebrationContext` nyní obsahuje legacy API: `showLevelUp()`, `showBadge()`, `showPR()`, `showStreak()`
- `CelebrationContext.tsx` smazán
- Aktualizovány importy v 4 souborech

### Fáze C: Analytics konsolidace
- Smazané stránky:
  - `src/pages/ExerciseAnalytics.tsx` (460 řádků)
  - `src/pages/ClientAnalytics.tsx` (326 řádků)
  - `src/pages/FinanceAnalytics.tsx` (366 řádků)
- Routy přesměrovány:
  - `/exercises/analytics` → `/performance?tab=analytics`
  - `/clients/analytics` → `/statistics?tab=clients`
  - `/statistics/analytics` → `/statistics?tab=finance`
- Hooky ponechány - používají je komponenty v `/components/analytics/`

---

## Zbývající úkoly (Fáze D-F)
- [ ] Přidat list view do `SchedulePage.tsx`
- [ ] Sloučit funkcionalitu z `Trainings.tsx`
- [ ] Smazat `Trainings.tsx`

### Fáze E: Client Portal
- [ ] Seskupit 18 stránek do 5 sekcí
- [ ] Vytvořit tabbed layout
- [ ] Zachovat deep-linky

### Fáze F: Hooky
- [ ] Sloučit `useSmartAlerts` + `useTodayAlerts` → `useAlerts`
- [ ] Konsolidovat business score hooky
