
# Plán: Rozdělení L/R pro plyometriku a věkové filtry v žebříčku

## Shrnutí požadavků

1. **Unilaterální cviky** (např. "Skok z jedné nohy") se musí zobrazovat jako dva samostatné záznamy: levá a pravá noha
2. **Věkové filtry** - klient se může porovnat v rámci věkových skupin (20-30, 30-40, 40-50, 50-60+)
3. **Výchozí stav** - všichni se porovnávají se všemi (bez filtrů)

---

## Technické změny

### 1. Edge funkce: `client-portal-benchmarks/index.ts`

#### A) Akce `get_available_exercises` - rozdělit unilaterální cviky

**Změna v SQL dotazu:**
```typescript
// Přidat sloupec 'side' do SELECT
const { data: exerciseData } = await supabase
  .from('exercise_entries')
  .select('exercise_name, exercise_id, client_id, weight_kg, distance_meters, height_cm, time_seconds, side')  // + side
  .eq('user_id', trainerId);
```

**Změna v logice seskupování:**
```typescript
// Místo klíče "exercise_name" použít "exercise_name + side"
// Pro side = 'left' nebo 'right' vytvořit oddělené záznamy
const key = (e.side === 'left' || e.side === 'right')
  ? `${e.exercise_name.toLowerCase().trim()}::${e.side}`
  : e.exercise_name.toLowerCase().trim();
```

**Výstup s označením strany:**
```typescript
// Upravit exercise_name pro zobrazení
const displayName = sideKey === 'left' 
  ? `${exerciseName} (L)` 
  : sideKey === 'right' 
  ? `${exerciseName} (R)` 
  : exerciseName;
```

#### B) Akce `get_exercise_leaderboard` - podpora pro side a věk

**Nové parametry:**
```typescript
const { 
  action, clientId, trainerId, exerciseName, 
  genderFilter, ageFilter, side,  // NOVÉ: ageFilter, side
  exerciseType, cardioMetric
} = body;
```

**Filtr podle věku:**
```typescript
// Výpočet věku z birth_date
function calculateAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Věkové filtry
type AgeFilter = 'all' | '20-30' | '30-40' | '40-50' | '50+';

// Aplikovat filtr
if (ageFilter && ageFilter !== 'all') {
  filteredClientIds = filteredClientIds.filter(cid => {
    const client = clientsMap.get(cid);
    if (!client?.birth_date) return false;
    const age = calculateAge(client.birth_date);
    switch (ageFilter) {
      case '20-30': return age >= 20 && age < 30;
      case '30-40': return age >= 30 && age < 40;
      case '40-50': return age >= 40 && age < 50;
      case '50+': return age >= 50;
      default: return true;
    }
  });
}
```

**Filtr podle strany (side):**
```typescript
// V SQL dotazu přidat filtr
const { data: entries } = await supabase
  .from('exercise_entries')
  .select('client_id, distance_meters, date, side')
  .eq('user_id', trainerId)
  .ilike('exercise_name', exerciseName)
  .eq('side', side)  // Pokud side je 'left' nebo 'right'
  .not('distance_meters', 'is', null);
```

---

### 2. Hook: `useExercisePercentiles.ts`

Rozšířit interface o stranu:

```typescript
export interface ExerciseWithPercentile {
  exercise_name: string;
  exercise_id: string | null;
  entry_count: number;
  exercise_type: 'strength' | 'cardio' | 'plyometrics';
  client_percentile: number | null;
  client_best_value: number | null;
  metric_type?: 'weight' | 'time' | 'distance' | 'height';
  side?: 'left' | 'right' | null;  // NOVÉ
}
```

---

### 3. Hook: `useExerciseLeaderboard.ts`

Přidat typ a parametr pro věkový filtr:

```typescript
export type AgeFilter = 'all' | '20-30' | '30-40' | '40-50' | '50+';

export function useStrengthExerciseLeaderboard(
  exerciseName: string | null,
  trainerId: string | undefined,
  genderFilter: GenderFilter = 'all',
  ageFilter: AgeFilter = 'all',  // NOVÉ
  side?: 'left' | 'right' | null  // NOVÉ
) {
  // ... předat do edge funkce
  body: {
    action: 'get_exercise_leaderboard',
    trainerId,
    clientId,
    exerciseName,
    exerciseType: 'strength',
    genderFilter,
    ageFilter,  // NOVÉ
    side,       // NOVÉ
  },
}
```

---

### 4. Komponenta: `ExerciseComparisonGrid.tsx`

#### A) Nový AgeFilterToggle komponent

```typescript
const AGE_FILTERS = [
  { value: 'all', label: 'Vše' },
  { value: '20-30', label: '20-30' },
  { value: '30-40', label: '30-40' },
  { value: '40-50', label: '40-50' },
  { value: '50+', label: '50+' },
] as const;

function AgeFilterToggle({ 
  value, 
  onChange 
}: { 
  value: AgeFilter; 
  onChange: (value: AgeFilter) => void;
}) {
  return (
    <ToggleGroup 
      type="single" 
      value={value} 
      onValueChange={(v) => v && onChange(v as AgeFilter)}
      size="sm"
    >
      {AGE_FILTERS.map(filter => (
        <ToggleGroupItem 
          key={filter.value}
          value={filter.value} 
          className="text-xs px-2 py-1.5 min-h-[36px]"
        >
          {filter.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
```

#### B) Přidání stavu pro věk do ExerciseCard

```typescript
function ExerciseCard({ exercise, ... }) {
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('all');
  const [ageFilter, setAgeFilter] = useState<AgeFilter>('all');  // NOVÉ
  
  // Předat do hooku
  const { data: strengthLeaderboard } = useStrengthExerciseLeaderboard(
    exerciseName,
    trainerId,
    genderFilter,
    ageFilter,      // NOVÉ
    exercise.side   // NOVÉ - pro unilaterální cviky
  );
}
```

#### C) Vizuální označení strany v kartě

```typescript
// V ExerciseCard header
<h4 className="font-semibold capitalize truncate text-base">
  {exercise.exercise_name}
  {exercise.side && (
    <Badge variant="outline" className="ml-2 text-xs">
      {exercise.side === 'left' ? 'L' : 'R'}
    </Badge>
  )}
</h4>
```

#### D) UI pro filtry (rozšířený)

```typescript
{/* Filters section */}
<div className="flex flex-col gap-2 pt-2 border-t border-border/30">
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">Pohlaví:</span>
    <GenderFilterToggle value={genderFilter} onChange={setGenderFilter} />
  </div>
  <div className="flex items-center gap-2">
    <span className="text-xs text-muted-foreground">Věk:</span>
    <AgeFilterToggle value={ageFilter} onChange={setAgeFilter} />
  </div>
  {exerciseType === 'cardio' && (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Metrika:</span>
      <CardioMetricToggle value={cardioMetric} onChange={setCardioMetric} />
    </div>
  )}
</div>
```

---

## Výsledné chování

### Pro klienta Tomáše Fremra:

| Cvik | Před | Po |
|------|------|-----|
| Skok z jedné nohy | Jeden záznam (1.72 m) | Dva záznamy: (L) 1.72 m, (R) 1.69 m |

### Filtrování:

| Filtr | Popis |
|-------|-------|
| Pohlaví: Vše | Všichni klienti |
| Pohlaví: ♂ | Pouze muži |
| Pohlaví: ♀ | Pouze ženy |
| Věk: 20-30 | Klienti ve věku 20-29 let |
| Věk: 30-40 | Klienti ve věku 30-39 let |
| Věk: 40-50 | Klienti ve věku 40-49 let |
| Věk: 50+ | Klienti 50 let a starší |

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `supabase/functions/client-portal-benchmarks/index.ts` | Rozdělit cviky podle side, přidat věkový filtr |
| `src/hooks/useExercisePercentiles.ts` | Přidat `side` do interface |
| `src/hooks/useExerciseLeaderboard.ts` | Přidat `AgeFilter` typ a parametry |
| `src/components/client-portal/leaderboard/ExerciseComparisonGrid.tsx` | AgeFilterToggle, zobrazení side badge |

---

## Vizuální ukázka filtrů

```text
┌─────────────────────────────────────────┐
│  Skok z jedné nohy (L)                  │
│  1.72 m • Top 25%                       │
├─────────────────────────────────────────┤
│                                         │
│  Pohlaví: [Vše] [♂] [♀]                │
│                                         │
│  Věk:     [Vše] [20-30] [30-40]        │
│           [40-50] [50+]                 │
│                                         │
│  #1  Rychlý Lev #42     2.06 m         │
│  #2  Silný Orel #15     1.93 m         │
│  #3  Tomáš (Ty)         1.72 m  ←      │
│  #4  Vytrvalý Vlk #8    1.45 m         │
│                                         │
└─────────────────────────────────────────┘
```
