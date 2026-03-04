
# Návrh zlepšení aplikace JustMove Asistent

Po prozkoumání kódu jsem identifikoval několik oblastí, kde lze aplikaci zjednodušit a zlepšit.

---

## 1) Smazat ~20 nepoužívaných dashboard komponent

V `src/components/dashboard/` existuje velké množství komponent, které **nejsou nikde importovány** a jsou pozůstatky starších verzí dashboardu. Jejich přítomnost zvyšuje technický dluh a ztěžuje orientaci v kódu.

**Komponenty k odstranění:**
- `CashflowForecastCard.tsx` (data jsou v `WeekOverviewCard`)
- `FinanceSummaryCard.tsx` (nahrazeno `WeekOverviewCard`)
- `QuickStats.tsx`, `WeeklyQuickStats.tsx` (konsolidováno)
- `QuickActionsBar.tsx`, `QuickActionsGrid.tsx` (nahrazeno `DashboardActions`)
- `TodayCards.tsx`, `TodayPlanCard.tsx`, `TodayPlanCompact.tsx`, `SmartDailyPlanCard.tsx` (nahrazeno `TodayTimelineCompact`)
- `TopClientsTable.tsx`, `TopClientsRanking.tsx`, `MostActiveClientsCard.tsx`
- `PendingPaymentsCard.tsx`, `UnassignedSessionsCard.tsx` (v `ActionCenterCard`)
- `UpcomingAnniversariesCard.tsx`, `FollowupsSection.tsx`, `FollowupsDashboardWidget.tsx`
- `TrainingFocusTimeline.tsx`, `TrainingsCalendarCard.tsx`
- `TrainingTrendChart.tsx`, `TrainingActivityChart.tsx`
- `SalesChart.tsx`, `ProductSalesChart.tsx`, `ProfitChart.tsx`, `IncomeChart.tsx`, `UnifiedFinancialChart.tsx`
- `StrengthDevelopmentCard.tsx`, `PRTimelineCard.tsx`
- `PerformanceMetricsSection.tsx`, `PriorityTasksSection.tsx`, `TodayAlertsSection.tsx`
- `LastTrainingWidget.tsx`, `NewRecordButton.tsx`, `KPICard.tsx`
- `SendBroadcastDialog.tsx`, `ActionBar.tsx`, `ActionBlock.tsx`, `QuickNoteDialog.tsx`
- `StatsOverviewCard.tsx`

Před smazáním ověřím, že žádný z nich nemá nepřímý import (přes barrel exporty apod.). Spolu s nimi i osiřelé hooky, které slouží jen těmto komponentám (`useTopClientsData`, `useProductSalesData`, `usePerformanceMetricsData`, `useUnifiedFinancialData`, `useTrainingActivityData`).

**Dopad:** Méně kódu k údržbě, rychlejší orientace, menší bundle.

---

## 2) Zlepšit DashboardLifetimeStats – přidat roční srovnání

Aktuální `DashboardLifetimeStats` ukazuje jen celkové lifetime čísla. Přidáme k metrikám malý indikátor **letos vs. loni** (rok-over-rok), což je pro trenéra mnohem užitečnější. Hook `useLifetimeStats` rozšíříme o `thisYear` / `lastYear` výpočty z dat, která už načítáme.

---

## 3) Zjednodušit DashboardActions (desktop bottom bar)

`DashboardActions` zbytečně načítá `useClients()` a `useCreateTrainingSession()` eagerly (i když uživatel trénink většinou nevytváří). Přesuneme tyto hooky dovnitř `CreateTrainingSheet` (lazy) a komponentu zeštíhlíme.

---

## 4) Konsolidovat duplicitní `formatCurrency` funkce

V kódu existují minimálně 3 různé `formatCurrency` implementace:
- `src/lib/formatters.ts` (globální)
- `DashboardHeader.tsx` (lokální, jiný formát s "k")
- `WeekOverviewCard.tsx` (lokální)

Sjednotíme na jednu globální s volitelným `compact` parametrem.

---

## 5) Odstranit zbytečné `SectionErrorBoundary` wrappery na dashboardu

Každá sekce na dashboardu je zabalena v `<section><SectionErrorBoundary>`. To je opatrné, ale 7 error boundaries na jedné stránce je přehnané. Stačí 3-4 pro logické bloky (Hero, Timeline+Actions, Overview+Stats, Insights).

---

## Soubory k úpravě
- **Smazat:** ~25 nepoužívaných komponent v `src/components/dashboard/` + ~5 osiřelých hooků
- **Edit:** `src/components/dashboard/DashboardLifetimeStats.tsx` (roční srovnání)
- **Edit:** `src/components/dashboard/DashboardActions.tsx` (lazy hooks)
- **Edit:** `src/components/dashboard/DashboardHeader.tsx` + `WeekOverviewCard.tsx` (sjednotit formatCurrency)
- **Edit:** `src/pages/Index.tsx` (zjednodušit error boundary strukturu)
