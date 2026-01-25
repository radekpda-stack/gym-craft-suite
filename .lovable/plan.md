
# Oprava feedbackových statistik - Nesmyslná data a vylepšení UX

## Identifikované problémy na screenshotech

### 1. Míra odpovědí zobrazuje tisíce procent (4600%, 3100%)

**Příčina:**
- Hooky `useFeedbackPeriodComparison.ts`, `useFeedbackAnalytics.ts`, `useTrainerFeedbackBaseline.ts` počítají response rate ručně bez omezení na 100%
- Funkce `responseRate()` v `feedbackCalculations.ts` je správná (obsahuje `Math.min(100, ...)`), ale není všude použita

**Kód problému:**
```typescript
// V useFeedbackPeriodComparison.ts řádek 107:
const responseRate = totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;
// Může vrátit >100% pokud totalCompleted > totalSent
```

### 2. NaN/10 pro Energii

**Příčina:**
- Pole `energy` neexistuje v databázi - správný název je `energy_rating`
- `safeAverage()` vrací `null`, ale komponenta nezpracovává `null` správně a zobrazí `NaN`

### 3. Vyplněno 31 z 1 odeslaných (logický nesmysl)

**Příčina:**
- Porovnávají se nekonzistentní datasety
- `totalSent` se počítá z requests s `sent_at`, ale `totalCompleted` zahrnuje všechny completed bez ohledu na `sent_at`

### 4. Změna +2375% (nerealistická procentuální změna)

**Příčina:**
- Procentuální změna není omezena rozumným rozsahem
- Když minulé období má 1 a aktuální 32, výsledek je +3100%

### 5. Chybí vysvětlení metrik pro trenéra

**Příčina:**
- Metriky nemají tooltip nebo popis co znamenají
- Trenér neví co je "normální" hodnota

---

## Navrhované opravy

### Fáze 1: Oprava kalkulací v hooks

**1.1 Opravit `useFeedbackPeriodComparison.ts`:**
- Importovat a použít `responseRate()` z feedbackCalculations
- Přidat validaci `totalCompleted <= totalSent`

**1.2 Opravit `useFeedbackAnalytics.ts`:**
- Použít `responseRate()` místo ruční kalkulace
- Opravit field name `energy` → `energy_rating`

**1.3 Opravit `useTrainerFeedbackBaseline.ts`:**
- Použít `responseRate()` místo ruční kalkulace

### Fáze 2: Bezpečné zobrazení metrik

**2.1 Vytvořit helper pro zobrazení:**
```typescript
// V feedbackCalculations.ts
export function safeResponseRate(completed: number, sent: number): number {
  // Nikdy nepřekročí 100%, nikdy není záporné
  if (sent <= 0 || !isFinite(sent)) return 0;
  if (!isFinite(completed) || completed < 0) return 0;
  const capped = Math.min(completed, sent); // completed nemůže být > sent
  return Math.min(100, Math.round((capped / sent) * 100));
}

export function safePercentageChange(current: number, previous: number): number | null {
  // Omezit na rozumný rozsah ±500%
  if (previous === 0) return current > 0 ? null : 0; // Nelze vypočítat z 0
  const change = Math.round(((current - previous) / previous) * 100);
  return Math.max(-500, Math.min(500, change));
}
```

**2.2 Opravit komponenty:**
- `FeedbackTrendsOverview.tsx`: Zobrazit "—" místo NaN
- `FeedbackPeriodComparison.tsx`: Omezit změny na ±500%

### Fáze 3: Opravit database field names

V `useFeedbackAnalytics.ts` a dalších hooks:
- `energy` → `energy_rating` (skutečný název sloupce v DB)

### Fáze 4: Přidat vysvětlující tooltips

**Pro každou metriku přidat:**
- Pocit těla: "Jak se klient celkově cítil (1=špatně, 10=skvěle)"
- Svalovka: "Míra svalové bolesti po tréninku (1=žádná, 10=extrémní)"
- Energie: "Energetická hladina klienta (1=vyčerpaný, 10=plný energie)"
- Bolest: "Intenzita bolesti (1=žádná, 10=silná)"
- Zábava: "Jak moc klienta trénink bavil (1=nudný, 10=super)"

### Fáze 5: Vylepšit vizuální prezentaci

**5.1 Přidat reference pro hodnoty:**
```text
Míra odpovědí:
- < 50%: Nízká (zvážit jiný čas odesílání)
- 50-80%: Průměrná
- > 80%: Vysoká

Metriky 1-10:
- Zobrazit progress bar s barevným indikátorem
- Hodnoty bez dat zobrazit jako "—" s popisem "Bez dat"
```

**5.2 Zobrazit absolutní čísla vedle procent:**
```text
Míra odpovědí: 76% (38 z 50)
```
místo jen "76%"

---

## Technické kroky implementace

### Krok 1: Rozšířit `feedbackCalculations.ts`
```text
- Přidat safeResponseRate() s validací completed <= sent
- Přidat safePercentageChange() s omezením na ±500%
- Přidat formátovací funkce pro konzistentní zobrazení
```

### Krok 2: Opravit `useFeedbackPeriodComparison.ts`
```text
- Import responseRate z feedbackCalculations
- Nahradit ruční kalkulaci na řádku 107
- Opravit field names pro energy
```

### Krok 3: Opravit `useFeedbackAnalytics.ts`
```text
- Import responseRate z feedbackCalculations
- Nahradit ruční kalkulaci na řádku 75
- Změnit 'energy' na 'energy_rating' v metrics
```

### Krok 4: Opravit `useTrainerFeedbackBaseline.ts`
```text
- Import responseRate z feedbackCalculations
- Nahradit ruční kalkulace na řádcích 80 a 178
```

### Krok 5: Vylepšit `FeedbackTrendsOverview.tsx`
```text
- Přidat Tooltip s vysvětlením metrik
- Použít formatMetric() pro bezpečné zobrazení
- Přidat reference hodnot (co je normální)
```

### Krok 6: Vylepšit `FeedbackPeriodComparison.tsx`
```text
- Omezit zobrazení změn na ±500%
- Zobrazit ">" pro větší změny
- Přidat vysvětlující tooltip pro změny
```

### Krok 7: Přidat metric explanations komponenta
```text
- Nová komponenta FeedbackMetricTooltip
- Obsahuje popis a referenční hodnoty pro každou metriku
```

---

## Výsledek po úpravách

| Problém | Před | Po |
|---------|------|-----|
| Response rate | 4600%, 3100% | Max 100%, nikdy nepřekročí |
| NaN hodnoty | "NaN/10" | "—" s popisem "Bez dat" |
| Absurdní změny | +2375% | Max ±500% s indikátorem ">" |
| Nesmyslná čísla | "31 z 1 odeslaných" | Validované: completed ≤ sent |
| Chybějící kontext | Čísla bez vysvětlení | Tooltips s popisem metrik |
| Referenční hodnoty | Žádné | Barevné indikátory + popisy |

---

## Prioritizace

**Kritická (způsobují zmatení):**
1. Opravit response rate limit na 100%
2. Opravit NaN zobrazení
3. Validovat completed ≤ sent

**Vysoká priorita:**
4. Omezit procentuální změny na ±500%
5. Opravit field name energy → energy_rating

**Střední priorita:**
6. Přidat tooltips s vysvětlením metrik
7. Přidat referenční hodnoty

**Nižší priorita:**
8. Vizuální vylepšení progress barů
9. Barevné kódování hodnot
