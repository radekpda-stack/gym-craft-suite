
# Zjednodušení aplikace - Audit a návrhy

## Shrnutí analýzy

Provedl jsem komplexní audit aplikace a identifikoval několik oblastí, kde lze zjednodušit architekturu, redukovat duplicity a zlepšit uživatelský zážitek.

---

## 1. Duplicitní hooky a datové vrstvy

### Problém
Existuje mnoho hooků, které dělají podobné věci nebo se vzájemně překrývají:

| Oblast | Počet hooků | Příklady duplicit |
|--------|-------------|-------------------|
| Klientské statistiky | 14+ | `useClientAttendanceStats` existuje ve 2 souborech |
| Finance | 8+ | `useFinancialStats`, `useFinanceAnalytics`, `useFinancialReportData` |
| Tréninky | 13+ | `useTrainingSessions`, `useTrainingProgress`, `useTrainingLoadStats` |

### Konkrétní duplicity
```
useClientAttendanceStats → src/hooks/useClientAttendanceStats.ts
useClientAttendanceStats → src/hooks/useClientPortalStats.ts (DUPLICITA!)
```

### Návrh řešení
Konsolidovat hooky do logických domén:
- **Fáze 1**: Sloučit duplicitní `useClientAttendanceStats` do jednoho
- **Fáze 2**: Vytvořit centrální `useClientData` hook s lazy-loading sub-dat
- **Fáze 3**: Refaktorovat finance hooky do jednoho `useFinanceHub`

---

## 2. Přebujelý systém modulů

### Problém
Existuje **13 konfigurovatelných modulů**:
- client_portal, nutrition, feedback, diagnostics, training_templates
- pr_history, tests, sales, calendar, statistics, challenges, exercises, rewards_system

Mnoho z nich se překrývá nebo jsou příliš granulární.

### Návrh řešení: Redukce na 5 hlavních modulů

| Nový modul | Obsahuje |
|------------|----------|
| **Klientský portál** | client_portal + rewards_system |
| **Výkonnost & Data** | exercises + tests + challenges + pr_history |
| **Strava & Feedback** | nutrition + feedback + diagnostics |
| **Finance** | sales + statistics |
| **Plánování** | calendar + training_templates |

Toto zjednoduší nastavení a navigaci.

---

## 3. Složitá navigace

### Problém
- Sidebar má **6 sekcí** a **14+ položek**
- Mobile menu replikuje vše s drobnými odlišnostmi
- Některé stránky jsou přístupné více cestami (duplicitní routy)

### Příklad duplicitních rout
```typescript
// V App.tsx existují tyto redirecty - zbytečná komplexita
<Route path="/trainings" element={<Navigate to="/schedule" replace />} />
<Route path="/calendar" element={<Navigate to="/schedule" replace />} />
<Route path="exercises" element={<Navigate to="/performance?tab=exercises" replace />} />
<Route path="tests" element={<Navigate to="/performance?tab=tests" replace />} />
<Route path="challenges" element={<Navigate to="/performance?tab=challenges" replace />} />
```

### Návrh řešení
1. **Odstranit legacy redirecty** - stránky `/trainings`, `/calendar`, `/exercises`, `/tests`, `/challenges` již nejsou potřeba
2. **Zjednodušit sidebar** - sloučit sekce "Data" a "Finance" do jedné "Business"
3. **Sjednotit mobile menu** - použít stejnou strukturu jako desktop

---

## 4. Příliš mnoho stránek

### Problém
Aplikace má **47 stránek** + **18 client portal stránek** = **65 stránek celkem**.

Některé jsou specializované a zřídka používané:
- `PriceMigration.tsx` - jednorázová migrace
- `CanceledTrainings.tsx` - lze integrovat do Schedule
- `FeedbackOverview.tsx` - lze integrovat do Dashboard
- `FollowupsPage.tsx` - lze integrovat do Dashboard nebo Client detail

### Návrh řešení

| Stránka k odstranění | Kam přesunout funkcionalitu |
|---------------------|------------------------------|
| `CanceledTrainings.tsx` | Filter v `SchedulePage` |
| `FeedbackOverview.tsx` | Tab v `Statistics.tsx` nebo widget v Dashboard |
| `FollowupsPage.tsx` | Sekce v `ClientDetail` nebo `ActionCenter` na Dashboard |
| `PRHistory.tsx` | Tab v `PerformanceHub.tsx` |
| `Records.tsx` | Tab v `PerformanceHub.tsx` |

Tím se redukuje počet hlavních stránek z 47 na ~42.

---

## 5. Klientský portál - příliš mnoho záložek

### Problém
Client Portal má **18 stránek/záložek**:
- Overview, Progress, Diary, Homework, Attendance, Credit, Purchases
- Nutrition, Challenges, Badges, Leaderboard, Competitions
- Rewards, Profile, Settings, Chat, Diagnostic

Pro běžného klienta je to přehnaně složité.

### Návrh řešení: Seskupit do 5 hlavních sekcí

```
Přehled     → Overview (se shrnutím všeho důležitého)
Můj pokrok  → Progress + Badges + Leaderboard + Diary
Můj účet    → Credit + Purchases + Attendance
Výzvy       → Challenges + Competitions + Rewards
Profil      → Profile + Settings + Chat + Nutrition (jako sub-tab)
```

Navigace klienta se zjednoduší z 18 na 5 položek.

---

## 6. Dashboard komponenty

### Problém
Dashboard má **90+ komponent** v `src/components/dashboard/`:
- Mnoho "Card" variant pro podobná data
- Modální okna pro detaily, které by mohly být inline

### Návrh řešení
1. Vytvořit generickou `DashboardCard` komponentu s props pro různé typy
2. Sloučit podobné karty (např. `BusinessHealthScoreCard` + `BusinessYieldScoreCard`)
3. Použít Sheet místo Modal pro detaily

---

## 7. Statistiky - duplicitní sekce

### Problém
Statistiky jsou rozptýleny:
- `Statistics.tsx` - hlavní stránka (4 záložky)
- `PerformanceHub.tsx` - má vlastní analytiku (6 záložek)
- `Dashboard` - má finance + insights
- `ExerciseAnalytics.tsx` - separátní stránka
- `FinanceAnalytics.tsx` - separátní stránka
- `ClientAnalytics.tsx` - separátní stránka

### Návrh řešení: Centralizace
1. **Statistics.tsx** zůstává jako hlavní hub
2. Odstranit separátní stránky `ExerciseAnalytics`, `FinanceAnalytics`, `ClientAnalytics`
3. Integrovat jejich obsah jako sub-záložky v příslušných sekcích

---

## 8. Settings - příliš granulární

### Problém
Nastavení má **50+ komponent** v `src/components/settings/`:
- Příliš mnoho specializovaných sekcí
- Některé funkce (Social Export, AI Assistant) by neměly být v nastavení

### Návrh řešení
1. Přesunout **Social Media Export** do samostatné stránky nebo Dashboard
2. Přesunout **AI Assistant** do globálního přístupu (Command Palette)
3. Sloučit podobné sekce (např. všechny ceníkové do jedné)

---

## Prioritizovaný plán implementace

### Fáze 1: Quick Wins (nízká složitost, vysoký dopad)
1. ✅ Odstranit duplicitní `useClientAttendanceStats` hook
2. ✅ Odstranit legacy redirecty z App.tsx
3. ✅ Sloučit `CanceledTrainings` do `SchedulePage` jako filter

### Fáze 2: Konsolidace navigace
1. Zjednodušit sidebar na 4-5 sekcí
2. Sjednotit mobile menu s desktop
3. Redukovat Client Portal na 5 hlavních sekcí

### Fáze 3: Sloučení duplicitních stránek
1. Integrovat `PRHistory` a `Records` do `PerformanceHub`
2. Integrovat `FollowupsPage` do Dashboard ActionCenter
3. Odstranit `FeedbackOverview` - integrovat do Statistics

### Fáze 4: Refaktoring hooků
1. Vytvořit `useClientHub` konsolidovaný hook
2. Vytvořit `useFinanceHub` konsolidovaný hook
3. Optimalizovat lazy-loading dat

### Fáze 5: Redukce modulů
1. Sloučit 13 modulů do 5 logických celků
2. Aktualizovat UI nastavení modulů
3. Upravit podmíněné zobrazování v navigaci

---

## Očekávané výsledky

| Metrika | Před | Po |
|---------|------|-----|
| Počet stránek | 65 | ~50 |
| Položky v navigaci (desktop) | 14 | 8 |
| Položky v Client Portal | 18 | 5 |
| Konfigurovatelné moduly | 13 | 5 |
| Duplicitní hooky | 8+ | 0 |
| Legacy redirecty | 5 | 0 |

---

## Doporučení pro okamžitou akci

Začnu s **Fází 1** - Quick Wins, které přinesou okamžité zlepšení bez velkého rizika:

1. **Odstranit duplicitní `useClientAttendanceStats`** - jeden je v `useClientAttendanceStats.ts`, druhý v `useClientPortalStats.ts`
2. **Vyčistit legacy redirecty** z App.tsx
3. **Přidat "Zrušené" filter** do SchedulePage místo separátní stránky
