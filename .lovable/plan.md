
# Plán: Oprava žebříčku v klientském centru

## Shrnutí problému
Žebříček v klientském centru nezobrazuje plyometrické cviky (skoky) a kardio cviky (veslo, skierg). Navíc se zobrazují všechny cviky trenéra místo pouze těch, které klient skutečně má.

## Hlavní změny

### 1. Filtrování cviků podle klientových záznamů
Klient uvidí pouze cviky, kde má vlastní záznamy. Pokud nemá bench press, nebude ho v žebříčku vidět.

### 2. Správná kategorizace cviků
Místo dvou kategorií (Síla/Kardio) budou tři:

| Kategorie | Typ metriky | Příklady |
|-----------|-------------|----------|
| **Síla** | váha (kg) | Bench press, Mrtvý tah, Dřep |
| **Plyometrika** | vzdálenost (m), výška (cm) | Skok do dálky, Skok z jedné nohy, Výskok |
| **Kardio** | čas (nižší = lepší) | Veslo 500m, SkiErg 500m, Běh |

### 3. Sjednocení zdroje dat
Kardio cviky budou čerpány jak z `cardio_entries` tak z `exercise_entries` (kde mají time_seconds).

---

## Technické detaily

### Změny v edge funkci `client-portal-benchmarks`

**Soubor:** `supabase/functions/client-portal-benchmarks/index.ts`

**Akce `get_available_exercises` - úpravy:**

1. **Přidat filtrování podle klienta:**
```typescript
// Před vrácením výsledků - filtrovat pouze cviky, kde klient má záznamy
const strength = strengthResults
  .filter(e => e.client_best_value !== null) // NOVÉ: pouze cviky s klientovými záznamy
  .sort((a, b) => b.entry_count - a.entry_count);
```

2. **Rozdělit výsledky do 3 kategorií:**
```typescript
// Kategorizace podle metric_type
const strengthExercises = results.filter(e => e.metric_type === 'weight');
const plyometricExercises = results.filter(e => 
  e.metric_type === 'distance' || e.metric_type === 'height'
);
const cardioExercises = results.filter(e => e.metric_type === 'time');
```

3. **Vrátit 3 kategorie:**
```typescript
return new Response(
  JSON.stringify({ 
    strength: strengthExercises,
    plyometrics: plyometricExercises,
    cardio: cardioExercises
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);
```

### Změny v React komponentách

**Soubor:** `src/hooks/useExercisePercentiles.ts`

Přidat nový typ pro plyometriku:
```typescript
export interface ExerciseWithPercentile {
  // ... existující
  exercise_type: 'strength' | 'cardio' | 'plyometrics';
}

// Upravit return:
return {
  strength: (data?.strength || []),
  plyometrics: (data?.plyometrics || []),
  cardio: (data?.cardio || []),
};
```

**Soubor:** `src/pages/client-portal/ClientPortalLeaderboard.tsx`

Přidat novou sekci pro plyometriku:
```typescript
{/* Plyometrics Section */}
<motion.section className="space-y-3">
  <div className="flex items-center gap-2">
    <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
      <Zap className="w-4 h-4 text-warning" />
    </div>
    <h2 className="text-lg font-semibold">Plyometrika</h2>
    <span className="text-sm text-muted-foreground">
      ({exercises?.plyometrics.length || 0} cviků)
    </span>
  </div>
  
  <ExerciseComparisonGrid
    exercises={exercises?.plyometrics || []}
    exerciseType="plyometrics"
    trainerId={trainerId}
    clientId={clientId}
    isLoading={exercisesLoading}
  />
</motion.section>
```

**Soubor:** `src/components/client-portal/leaderboard/ExerciseComparisonGrid.tsx`

Přidat podporu pro typ `plyometrics`:
```typescript
interface ExerciseComparisonGridProps {
  exercises: ExerciseWithPercentile[];
  exerciseType: 'strength' | 'cardio' | 'plyometrics';
  // ...
}

// Přidat ikonu pro plyometriku
{exerciseType === 'plyometrics' && (
  <Zap className="w-6 h-6 text-warning" />
)}
```

---

## Očekávaný výsledek

Po implementaci:

1. Klient **uvidí pouze cviky, kde má záznamy** - žádné prázdné karty
2. **Plyometrické cviky** (Skok do dálky, Skok z jedné nohy) budou ve vlastní sekci s ikonou blesku
3. **Kardio cviky** (Veslo 500m, SkiErg) budou ve správné sekci s měřením času
4. **Silové cviky** zůstanou v sekci Síla s měřením váhy

## Poznámka
Klient Jiří Kokeš (aktuální route) nemá žádné plyometrické ani kardio záznamy, takže tyto sekce pro něj budou prázdné - což je správné chování. Sekce se zobrazí pouze pokud má alespoň jeden záznam.
