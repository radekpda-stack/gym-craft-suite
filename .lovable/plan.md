
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

### Návrh řešení
Konsolidovat hooky do logických domén:
- ✅ **Fáze 1**: Sloučit duplicitní `useClientAttendanceStats` do jednoho (přejmenováno na `useClientPortalAttendanceStats`)
- **Fáze 4**: Vytvořit centrální `useClientData` hook s lazy-loading sub-dat
- **Fáze 4**: Refaktorovat finance hooky do jednoho `useFinanceHub`

---

## 2. Přebujelý systém modulů

### Problém
Existuje **13 konfigurovatelných modulů** - mnoho z nich se překrývá nebo jsou příliš granulární.

### Návrh řešení: Redukce na 5 hlavních modulů
*Plánováno pro Fázi 5*

---

## 3. Složitá navigace

### Problém
- Sidebar měl **6 sekcí** a **14+ položek**
- Mobile menu replikovalo vše s drobnými odlišnostmi

### Řešení
1. ✅ Odstranit legacy redirecty z App.tsx
2. ✅ Zjednodušit sidebar na **4 sekce**: Hlavní, Data & Výkonnost, Finance, Systém
3. ✅ Sjednotit mobile menu s desktop navigací

---

## 4. Příliš mnoho stránek

### Problém
Aplikace měla **47 stránek** + **18 client portal stránek** = **65 stránek celkem**.

### Řešení

| Stránka | Status | Řešení |
|---------|--------|--------|
| `CanceledTrainings.tsx` | ✅ Hotovo | Integrováno do `SchedulePage` jako Sheet |
| `PRHistory.tsx` | ✅ Hotovo | Integrováno do `PerformanceHub` jako tab "PR Historie" |
| `FollowupsPage.tsx` | ✅ Hotovo | Integrováno do Dashboard jako `FollowupsSection` |
| `FeedbackOverview.tsx` | ⏳ Odloženo | Komplexní funkcionalita - ponecháno jako samostatná stránka |
| `Records.tsx` | ⏳ Odloženo | Ponecháno jako samostatná stránka (jiná funkcionalita než PR) |

---

## 5. Klientský portál - příliš mnoho záložek

### Problém
Client Portal má **18 stránek/záložek** - pro běžného klienta je to přehnaně složité.

### Návrh řešení: Seskupit do 5 hlavních sekcí
*Plánováno pro budoucí fázi*

---

## Prioritizovaný plán implementace

### ✅ Fáze 1: Quick Wins (HOTOVO)
1. ✅ Odstranit duplicitní `useClientAttendanceStats` hook → přejmenováno na `useClientPortalAttendanceStats`
2. ✅ Odstranit legacy redirecty z App.tsx
3. ✅ Sloučit `CanceledTrainings` do `SchedulePage` jako `CanceledTrainingsSheet`

### ✅ Fáze 2: Konsolidace navigace (HOTOVO)
1. ✅ Zjednodušit sidebar na 4 sekce
2. ✅ Sjednotit mobile menu s desktop

### ✅ Fáze 3: Sloučení duplicitních stránek (HOTOVO)
1. ✅ Integrovat `PRHistory` do `PerformanceHub` jako nový tab "PR Historie"
2. ✅ Integrovat `FollowupsPage` do Dashboard jako `FollowupsSection`
3. ⏳ `FeedbackOverview` - ponecháno (komplexní unikátní funkcionalita)

### ✅ Fáze 4: Refaktoring hooků (HOTOVO)
1. ✅ Vytvořit `useClientHub` konsolidovaný hook
2. ✅ Vytvořit `useFinanceHub` konsolidovaný hook
3. ✅ Aktualizovat index exporty

### ✅ Fáze 5: Redukce modulů (HOTOVO)
1. ✅ Sloučit 13 modulů do 5 logických celků:
   - **Klientský portál** - client_portal
   - **Data & Výkonnost** - exercises, training_templates, pr_history, tests, challenges, diagnostics
   - **Strava & Zpětná vazba** - nutrition, feedback
   - **Finance** - sales, statistics
   - **Systém** - calendar, rewards_system
2. ✅ Aktualizovat UI nastavení modulů (collapsible groups)
3. ✅ Aktualizovat hooks (useModuleSettings, useTrainerModuleSettings)

---

## Výsledky po Fázi 1-4

| Metrika | Před | Po |
|---------|------|-----|
| Položky v navigaci (desktop) | 14 | **8** |
| Duplicitní hooky | 8+ | **1 opraveno** |
| Legacy redirecty | 5 | **0** |
| Stránky sloučené do komponent | 0 | **3** (CanceledTrainings, PRHistory, FollowupsPage) |
| Konsolidované hub hooky | 0 | **2** (useClientHub, useFinanceHub) |

### Smazané soubory
- `src/pages/CanceledTrainings.tsx` → `src/components/schedule/CanceledTrainingsSheet.tsx`
- `src/pages/PRHistory.tsx` → `src/components/performance/PRHistoryContent.tsx`
- `src/pages/FollowupsPage.tsx` → `src/components/dashboard/FollowupsSection.tsx`

### Nové komponenty
- `CanceledTrainingsSheet` - Sheet pro zobrazení zrušených tréninků v Schedule
- `PRHistoryContent` - Tab obsah pro PR historii v PerformanceHub
- `FollowupsSection` - Sbalitelná sekce připomenutí na Dashboard

### Nové hub hooky (Fáze 4)
- `useClientHub` - Konsolidovaný hook pro přístup ke všem client-related datům s lazy-loading
- `useClientsHub` - Hook pro práci s více klienty a filtrování
- `useFinanceHub` - Konsolidovaný hook pro přístup ke všem finance-related datům
- `useFinanceSummary` - Lightweight hook pro dashboard finanční souhrn
