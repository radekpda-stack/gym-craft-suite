
# Redesign Analytiky Výkonnosti – Pohled Trenéra

## ✅ IMPLEMENTOVÁNO

Všechny změny byly implementovány:
- ✅ StagnationAlertCard - seznam klientů/cviků bez progresu 3+ týdny
- ✅ MovementGapsCard - identifikace podtrénovaných pohybových vzorců
- ✅ UnusedExercisesCard - cviky z knihovny nepoužité 30+ dní
- ✅ ClientAttentionCard - klienti vyžadující pozornost trenéra
- ✅ Hook rozšířen o nová data (stagnatingClients, movementGaps, unusedExercises, clientsNeedingAttention)
- ✅ KPI řádek upraven (nahrazeno BW reps → Klienti s pozorností)
- ✅ Smazány zastaralé komponenty (VolumeTimelineCardNew, PRTimelineCardNew, RpeTimelineCard)

---

## Problém

Aktuální záložka **Analytika** v sekci Výkonnost obsahuje grafy, které mají nízkou užitnou hodnotu pro trenéra:

| Současný prvek | Problém |
|----------------|---------|
| Objem v čase (VolumeTimelineCardNew) | Trenér neřeší historický objem – zajímá ho, kdo stagnuje a proč |
| PR trend (PRTimelineCardNew) | Graf kumulativních PR za týden nepomáhá rozhodovat |
| RPE timeline (RpeTimelineCard) | Průměr RPE za týden je příliš abstraktní |

## Návrh nové struktury

Nová analytika bude odpovídat na otázky:
1. **Kdo potřebuje pozornost?** (stagnace, žádný progres)
2. **Co v tréninku chybí?** (opomíjené pohybové vzorce)
3. **Které cviky jsou nevyužité?** (knihovna vs. realita)
4. **Kde jsou asymetrie?** (L vs R disbalance)

---

## Nové komponenty

### 1. StagnationAlertCard (nahrazuje VolumeTimelineCardNew)
- **Účel**: Seznam klientů/cviků, kde nedošlo k progresu 3+ týdny
- **Akce**: Klik → detail klienta/cviku
- **Data**: Využije existující `useTrainingAnalytics` hook

### 2. MovementGapsCard (nahrazuje PRTimelineCardNew)
- **Účel**: Identifikace chybějících/podtrénovaných pohybových vzorců
- **Vizualizace**: Heat-bar ukazující zastoupení vzorců (push_vertical: 1×, rotation: 1×, locomotion: 1× vs. squat: 206×)
- **Akce**: Klik → doporučené cviky pro daný vzorec

### 3. UnusedExercisesCard (nahrazuje RpeTimelineCard)
- **Účel**: Cviky z knihovny, které se nepoužívají 30+ dní
- **Hodnota**: "Máte 43 cviků, ale 28 z nich jste nepoužili tento měsíc"
- **Akce**: Rychlé přidání do tréninku

### 4. ClientAttentionCard (nový – pod sekundární bloky)
- **Účel**: Seznam klientů vyžadujících pozornost trenéra
- **Kritéria**:
  - Žádné PR za 30 dní
  - Klesající frekvence tréninků
  - Vysoká asymetrie (>20%)
- **Vizualizace**: Karty s barevným indikátorem priority

---

## Technická implementace

### Fáze 1: Nové komponenty
```
src/components/exercises/analytics/
├── StagnationAlertCard.tsx      (nový)
├── MovementGapsCard.tsx         (nový)
├── UnusedExercisesCard.tsx      (nový)
├── ClientAttentionCard.tsx      (nový)
```

### Fáze 2: Rozšíření hooku
```typescript
// useExerciseAnalyticsComplete.ts - nová data
interface AnalyticsData {
  // Stávající
  kpi: AnalyticsKPI;
  loadDistribution: ...;
  movementPatterns: ...;
  topExercises: ...;
  
  // Nové
  stagnatingClients: {
    clientId: string;
    clientName: string;
    exerciseName: string;
    weeksStagnant: number;
    lastValue: number;
  }[];
  
  movementGaps: {
    pattern: string;
    label: string;
    usageCount: number;
    isUnderworked: boolean; // <5% celkového objemu
    suggestedExercises: string[];
  }[];
  
  unusedExercises: {
    id: string;
    name: string;
    lastUsedDate: string | null;
    daysSinceUse: number;
  }[];
  
  clientsNeedingAttention: {
    clientId: string;
    clientName: string;
    reasons: ('no_pr' | 'declining_frequency' | 'high_asymmetry')[];
    priority: 'high' | 'medium' | 'low';
  }[];
}
```

### Fáze 3: Úprava StrengthAnalyticsView.tsx
```tsx
// Nahradit 3 grafy novými kartami
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
  <StagnationAlertCard data={data?.stagnatingClients} />
  <MovementGapsCard data={data?.movementGaps} />
  <UnusedExercisesCard data={data?.unusedExercises} />
</div>

// Pod LoadDistribution a MovementPatterns přidat
<ClientAttentionCard data={data?.clientsNeedingAttention} />
```

---

## Změny v KPI řádku

| Stávající | Nové |
|-----------|------|
| Tonnage | **Ponechat** – užitečná metrika |
| PR count | **Ponechat** – důležité pro trenéra |
| Frekvence | **Ponechat** – klíčová metrika |
| Ø RPE | **Nahradit** → "Klienti s pozorností" (počet) |
| BW reps | **Odstranit** – nízká hodnota |

---

## Vizuální styl

Zachovat existující design systém:
- `AnalyticsCard` wrapper pro konzistenci
- Glassmorphism (`bg-card/80 backdrop-blur-md`)
- Signální barvy (warning pro stagnaci, destructive pro vysokou prioritu)
- Klikatelné položky s hover efektem

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `useExerciseAnalyticsComplete.ts` | Rozšířit o nová data |
| `StrengthAnalyticsView.tsx` | Nahradit 3 grafy novými kartami |
| `AnalyticsKPIRow.tsx` | Upravit metriky |
| `VolumeTimelineCardNew.tsx` | Smazat |
| `PRTimelineCardNew.tsx` | Smazat |
| `RpeTimelineCard.tsx` | Smazat |
| `StagnationAlertCard.tsx` | Vytvořit |
| `MovementGapsCard.tsx` | Vytvořit |
| `UnusedExercisesCard.tsx` | Vytvořit |
| `ClientAttentionCard.tsx` | Vytvořit |

---

## Očekávaný výsledek

Analytika přestane být "dashboard s grafy" a stane se **pracovním nástrojem trenéra**:
- Okamžitě vidí, kdo potřebuje pozornost
- Identifikuje mezery v tréninkovém plánu
- Může rychle reagovat na stagnaci
- Využije celou knihovnu cviků efektivněji
