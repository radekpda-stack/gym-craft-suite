
# Zjednoduseni aplikace -- nalezene problemy a plan oprav

## Prehled nalezu

Audit odhalil 4 hlavni oblasti kde lze aplikaci zjednodusit: mrtvy kod (nepouzivane komponenty), duplicitni stranky, prilis slozite UI a zbytecna granularita.

---

## 1. Smazani 20+ nepouzivanych dashboard komponent (VYSOKY DOPAD)

Slozka `src/components/dashboard/` obsahuje 95 souboru, ale hlavni dashboard (`Index.tsx`) pouziva pouze 8 z nich. Nasledujici komponenty **nejsou nikde importovany** a jsou pozustatkem predchozich redesignu:

**K okamzitemu smazani (0 importu):**
- `AlertsSummaryCard.tsx`
- `BusinessHealthScoreCard.tsx` + `BusinessHealthDetailModal.tsx`
- `BusinessYieldScoreCard.tsx` + `BusinessYieldDetailModal.tsx`
- `CareerMilestoneCard.tsx`
- `GoalTrackerCard.tsx`
- `WinOfTheWeekCard.tsx`
- `YearComparisonCard.tsx`
- `CapacityAlertsCard.tsx`
- `CapacityHeatmapCard.tsx`
- `CapacityKPICard.tsx`
- `CapacityTrendChart.tsx`
- `AnimatedHealthGauge.tsx`
- `AttentionCard.tsx`
- `AttentionSection.tsx`
- `BusinessAnalyticsCard.tsx`
- `ClientAnalyticsCard.tsx`
- `ClientProgressCard.tsx`
- `ClientStatusCard.tsx`
- `ClientsAtRiskCard.tsx`
- `ClientsInDebtCard.tsx`
- `ClientsQuickOverviewSection.tsx`
- `ClientsSchedule.tsx`
- `CreditSignalBox.tsx`
- `DashboardControlBar.tsx`
- `DashboardGlobalFilters.tsx`
- `DashboardStatusBar.tsx`
- `DayTimelineSection.tsx`
- `FeedbackTrendsCard.tsx`
- `FinancePanelSection.tsx`
- `TrendsPanelSection.tsx`
- `WeekSummarySection.tsx`
- `HeroAttentionCard.tsx`
- `MobileDashboardHeader.tsx`
- `MobileBottomBar.tsx`

**Prinos:** Snizeni velikosti bundle, prehlednejsi struktura, jednodussi udrzba. Celkem ~35 souboru k odstraneni.

---

## 2. Smazani osirelych stranek (STREDNI DOPAD)

### `src/pages/Exercises.tsx` -- duplicita s PerformanceHub
Stranka `Exercises.tsx` nema zadnou routu v `App.tsx` a neni nikde importovana. Veskerá jeji funkcionalita (seznam cviku + analytika) je jiz integrovana do `PerformanceHub.tsx` jako zalosky "Knihovna" a "Analytika".

**Akce:** Smazat `src/pages/Exercises.tsx`.

### `src/pages/DemoPage.tsx` -- overit pouzivani
Pokud demo mod neni aktivne pouzivan, jde o dalsi kandidata na smazani.

---

## 3. FeedbackOverview -- prilis mnoho zalolek (UX ZLEPSENI)

Stranka `FeedbackOverview.tsx` ma **5 zalolek** (K odeslani, Vyplnene, Statistiky, Historie, Nastaveni) plus bocni panel. To je pro jednoduchou funkci "zpetna vazba" prilis:

**Navrh zjednoduseni:**
- Sloucit "Vyplnene" a "Historie" do jedne zalozky "Prehled" s filtrem
- Presunout "Nastaveni" do hlavniho Nastaveni aplikace (kde uz FeedbackSettings existuje jako samostatna sekce)
- Vysledek: 3 zalozky misto 5 (K odeslani, Prehled, Statistiky)

---

## 4. ClientDetailTabs -- 8 zalolek je hodne (UX ZLEPSENI)

Karta klienta ma 8 zalolek (Profil, Media, Treninky, Finance, Vykon, Zdravi, Zpravy, Nastaveni). Na mobilu to vyzaduje horizontalni scroll.

**Navrh zjednoduseni:**
- Sloucit "Profil" + "Nastaveni" do jedne zalozky "Profil & Nastaveni" (obe jsou administrativni)
- Sloucit "Media" do zalozky "Zpravy" (media a komunikace spolu souvisi)
- Vysledek: 6 zalolek misto 8, vsechny viditelne na mobilu bez scrollovani

---

## Souhrn priorit

| # | Oblast | Typ | Soubory | Dopad |
|---|--------|-----|---------|-------|
| 1 | Mrtvy dashboard kod | Smazani | ~35 souboru | Cistsi kod, mensi bundle |
| 2 | Osirela stranka Exercises | Smazani | 1 soubor | Odstraneni zmatenych duplicit |
| 3 | FeedbackOverview zalozky | UX refaktoring | 1 soubor | Jednodussi orientace |
| 4 | ClientDetailTabs | UX refaktoring | 1 soubor | Lepsi mobilni UX |

Doporucuji zacit bodem 1 a 2 (ciste smazani bez rizika regrese), pak pokracovat body 3 a 4 (UX zmeny).
