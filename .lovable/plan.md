

# Audit a Zjednodušení Aplikace - Fáze 2

## Shrnutí analýzy

Po důkladném prozkoumání kódové základny jsem identifikoval několik oblastí, kde lze dále zjednodušit architekturu, odstranit nepoužívané soubory a zlepšit celkovou udržovatelnost.

---

## 1. Nepoužívané / Duplicitní Komponenty

### Dashboard komponenty - kandidáti k odstranění

| Soubor | Problém | Doporučení |
|--------|---------|------------|
| `DashboardInsights.tsx` (842 řádků) | Starší verze, nahrazena `DashboardInsightsRefactored.tsx` | **Smazat** |
| `DashboardSettings.tsx` | Duplicitní s `DashboardSettingsNew.tsx` | **Smazat starší** |
| `DashboardSettingsNew.tsx` | Nikde se neimportuje | **Smazat nebo integrovat** |

### RX Workout V1/V2 duplicita

| Soubor | Stav |
|--------|------|
| `useRxWorkoutParser.ts` | V1 - původní verze |
| `useRxWorkoutParserV2.ts` | V2 - aktivně používaná |
| `useRxWorkouts.ts` | V1 - částečně používaná |
| `useRxWorkoutsV2.ts` | V2 - aktivně používaná |

**Doporučení**: Sloučit V1 a V2 do jedné verze, odstranit starší kód.

---

## 2. Celebration Contexty - duplicita

### Problém
Existují **2 duplicitní celebration kontexty**:
- `CelebrationContext.tsx` (80 řádků) - jednoduchý
- `SmartCelebrationContext.tsx` (132 řádků) - pokročilý s queue

Oba se používají paralelně v `ClientPortalShell.tsx`.

### Doporučení
Sloučit do jednoho `SmartCelebrationContext`, odstranit `CelebrationContext`.

---

## 3. Analytics Stránky - kandidáti ke sloučení

### Separátní analytické stránky

| Stránka | Řádků | Použití |
|---------|-------|---------|
| `ExerciseAnalytics.tsx` | 460 | Samostatná stránka |
| `FinanceAnalytics.tsx` | 366 | Samostatná stránka |
| `ClientAnalytics.tsx` | 326 | Samostatná stránka |

### Doporučení
Tyto stránky lze integrovat do stávajících modulů:
- `ExerciseAnalytics` → `PerformanceHub` jako tab
- `FinanceAnalytics` → `Statistics` jako sub-tab ve Finance
- `ClientAnalytics` → `Statistics` jako sub-tab v Klienti

---

## 4. Nevyužívané Admin Stránky

| Stránka | Účel | Doporučení |
|---------|------|------------|
| `PriceMigration.tsx` | Jednorázová migrace cen | **Smazat** - migrace dokončena |
| `AppUsageStats.tsx` | Admin-only analytika (1 uživatel) | Přesunout do `Settings` jako sekci |

---

## 5. Hooky - přebujelý stav

### Statistika
- **332 souborů** s hooky v `src/hooks/`
- **4160 exportovaných funkcí** typu `use*`

### Identifikované duplicity/podobnosti

| Oblast | Hooky | Problém |
|--------|-------|---------|
| Alerts | `useSmartAlerts`, `useTodayAlerts` | Podobná funkcionalita |
| Analytics | `useAdvancedAnalytics` (6 funkcí), `useFeatureStats`, `useAppUsageAnalytics` | Překryv |
| Client health | `usePainHistory`, `useClientInjuryHistory`, `useHealthConditions` | Podobná data |
| Business | `useBusinessAnalytics`, `useBusinessHealthScore`, `useBusinessYieldScore` | 3 různé "business skóre" |

### Doporučení
1. Sloučit `useSmartAlerts` a `useTodayAlerts` do jednoho `useAlerts`
2. Konsolidovat business analytics do `useBusinessHub`
3. Sloučit health-related hooky do `useClientHealth`

---

## 6. Trainings.tsx vs SchedulePage.tsx

### Problém
Existují **2 podobné stránky** pro tréninky:
- `Trainings.tsx` (487 řádků) - seznam tréninků
- `SchedulePage.tsx` - kalendářní pohled na rozvrh

### Doporučení
Sloučit `Trainings.tsx` do `SchedulePage.tsx` jako alternativní view (list vs calendar).

---

## 7. Client Portal - 18 stránek

### Současný stav
Klientský portál má **18 samostatných stránek**:

```
ClientPortalOverview     ClientPortalNutrition
ClientPortalProgress     ClientPortalProfile
ClientPortalAttendance   ClientPortalSettings
ClientPortalCredit       ClientPortalChallenges
ClientPortalWorkoutDiary ClientPortalBadges
ClientPortalLeaderboard  ClientPortalCompetitions
ClientPortalRewards      ClientPortalPurchases
ClientPortalHomework     ClientPortalChat
ClientPortalDiagnostic   ClientPortalNutritionTab
```

### Doporučení - Seskupit do 5 hlavních sekcí

| Nová sekce | Původní stránky |
|------------|-----------------|
| **Přehled** | Overview |
| **Můj pokrok** | Progress + Badges + Leaderboard + WorkoutDiary |
| **Můj účet** | Credit + Purchases + Attendance |
| **Výzvy** | Challenges + Competitions + Rewards + Homework |
| **Profil** | Profile + Settings + Nutrition + Chat + Diagnostic |

---

## 8. FeedbackOverview.tsx - velká stránka

### Problém
`FeedbackOverview.tsx` má **1006 řádků** - příliš velká pro jednu stránku.

### Doporučení
Rozdělit na menší komponenty nebo integrovat do `Statistics.tsx` jako tab "Zpětná vazba".

---

## Prioritizovaný Plán Implementace

### Fáze A: Čištění mrtvého kódu (Low-risk)

1. **Smazat `DashboardInsights.tsx`** - nahrazeno `DashboardInsightsRefactored`
2. **Smazat `DashboardSettings.tsx`** a `DashboardSettingsNew.tsx` - nepoužívané
3. **Smazat `PriceMigration.tsx`** - jednorázová migrace dokončena
4. **Vyčistit RX V1 hooky** - ponechat pouze V2 verze

### Fáze B: Sloučení kontextů

1. Sloučit `CelebrationContext` do `SmartCelebrationContext`
2. Aktualizovat importy napříč aplikací

### Fáze C: Konsolidace Analytics stránek

1. Integrovat `ExerciseAnalytics` do `PerformanceHub`
2. Integrovat `FinanceAnalytics` do `Statistics`
3. Integrovat `ClientAnalytics` do `Statistics`
4. Smazat samostatné stránky po migraci

### Fáze D: Sloučení tréninků

1. Přidat "list view" do `SchedulePage.tsx`
2. Migrovat funkcionalitu z `Trainings.tsx`
3. Smazat `Trainings.tsx`

### Fáze E: Client Portal reorganizace

1. Vytvořit tabbed layout pro seskupení stránek
2. Reorganizovat navigaci z 18 na 5 sekcí
3. Zachovat deep-linky pro zpětnou kompatibilitu

### Fáze F: Konsolidace hooků

1. Vytvořit `useAlerts` sloučením `useSmartAlerts` + `useTodayAlerts`
2. Vytvořit `useBusinessHub` sloučením business score hooků
3. Aktualizovat index exporty

---

## Očekávané výsledky

| Metrika | Před | Po |
|---------|------|-----|
| Dashboard komponenty | 95+ | ~75 |
| Mrtvé komponenty | 5+ | 0 |
| Analytics stránky | 3 separátní | Integrované |
| Client Portal navigace | 18 položek | 5 sekcí |
| Duplicitní kontexty | 2 | 1 |
| RX hook verze | 2 (V1+V2) | 1 |

---

## Poznámky k implementaci

### Bezpečnostní opatření
- Před smazáním komponenty ověřit, že není nikde importována
- Vytvořit redirecty pro smazané routy
- Zachovat zpětnou kompatibilitu API hooků

### Postupné zavádění
Fáze A-B jsou bezrizikové a mohou být implementovány okamžitě.
Fáze C-F vyžadují více testování a mohou být rozloženy do více iterací.

