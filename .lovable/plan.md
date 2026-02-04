# Audit a Zjednodušení Aplikace - Fáze 2

## Stav implementace

| Fáze | Stav | Poznámka |
|------|------|----------|
| A: Čištění mrtvého kódu | ✅ Dokončeno | Smazáno: DashboardInsights, DashboardSettings, DashboardSettingsNew, PriceMigration, usePriceMigration |
| B: Sloučení kontextů | ✅ Dokončeno | CelebrationContext sloučen do SmartCelebrationContext |
| C: Konsolidace Analytics | ⏳ Čeká | |
| D: Sloučení tréninků | ⏳ Čeká | |
| E: Client Portal reorganizace | ⏳ Čeká | |
| F: Konsolidace hooků | ⏳ Čeká | |

---

## Poznámky z implementace

### Fáze A: Mrtvý kód
- **RX V1 hooky** nelze smazat - stále se aktivně používají v 11 souborech
- Smazané soubory:
  - `src/components/dashboard/DashboardInsights.tsx` (842 řádků)
  - `src/components/dashboard/DashboardSettings.tsx`
  - `src/components/dashboard/DashboardSettingsNew.tsx`
  - `src/pages/PriceMigration.tsx`
  - `src/hooks/usePriceMigration.ts`
  - Route `/admin/price-migration` odstraněna z App.tsx

### Fáze B: Celebration kontexty
- `SmartCelebrationContext` nyní obsahuje oba API:
  - Smart API: `celebrate()`, `currentCelebration`, `dismissCurrent()`, `pendingCount`, `mode`, `setMode()`
  - Legacy API: `showLevelUp()`, `showBadge()`, `showPR()`, `showStreak()`
- `CelebrationContext.tsx` smazán
- `CelebrationProvider` odstraněn z `ClientPortalShell.tsx`
- Aktualizovány importy v 4 souborech

---

## Zbývající úkoly (Fáze C-F)

### Fáze C: Analytics stránky
- [ ] Integrovat `ExerciseAnalytics` do `PerformanceHub` jako tab
- [ ] Integrovat `FinanceAnalytics` do `Statistics` jako sub-tab
- [ ] Integrovat `ClientAnalytics` do `Statistics` jako sub-tab

### Fáze D: Tréninky
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
