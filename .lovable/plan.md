
# AI na pozadí - Inteligentní nutriční a kalorická analýza

## Přehled návrhu

Vytvoříme **background AI systém**, který na pozadí:
1. **U jídel**: Odhaduje kalorie + makroživiny (bílkoviny, sacharidy, tuky) a sjednocuje podobné názvy
2. **U tréninků**: Počítá kalorický výdej na základě typu cvičení a délky
3. **Správa databáze**: Automaticky merguje duplicity a normalizuje názvy jídel

Klient nevidí AI přímo - vše probíhá na pozadí po uložení záznamu.

---

## Architektura systému

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                           KLIENT ZADÁ JÍDLO                                  │
│                              "Kuřecí prsa s rýží"                           │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    1. OKAMŽITÉ ULOŽENÍ (sync)                               │
│   • Záznam se uloží do DB ihned                                             │
│   • Klient vidí potvrzení "Přidáno ✓"                                       │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│              2. AI OBOHACENÍ NA POZADÍ (async/fire-and-forget)              │
│   • Volá se Edge Function "ai-nutrition-enrichment"                         │
│   • AI analyzuje popis jídla a doplní:                                      │
│     - calories_estimate (low/high)                                          │
│     - protein_g, carbs_g, fat_g                                             │
│   • Sjednotí podobné názvy v meal_templates                                 │
└─────────────────────────────────┬────────────────────────────────────────────┘
                                  │
                                  ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    3. DATABÁZE AKTUALIZOVÁNA                                │
│   • Template má nyní nutriční hodnoty                                       │
│   • Při příštím použití se hodnoty předvyplní                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Databázové změny

### 1. Rozšíření tabulky `nutrition_meal_templates`

Přidáme sloupce pro makroživiny:

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `calories_per_portion` | integer | Kalorie pro střední porci |
| `protein_g` | numeric | Bílkoviny v gramech |
| `carbs_g` | numeric | Sacharidy v gramech |
| `fat_g` | numeric | Tuky v gramech |
| `fiber_g` | numeric | Vláknina v gramech (volitelné) |
| `ai_enriched` | boolean | Zda AI již obohatila záznam |
| `ai_enriched_at` | timestamptz | Kdy bylo AI obohacení provedeno |
| `normalized_name` | text | Sjednocený název pro deduplication |

### 2. Rozšíření tabulky `client_workout_logs`

Přidáme sloupec pro kalorický výdej:

| Sloupec | Typ | Popis |
|---------|-----|-------|
| `calories_burned` | integer | Odhadované spálené kalorie |
| `ai_enriched` | boolean | Zda AI již obohatila záznam |

---

## Nové Edge Functions

### 1. `ai-nutrition-enrichment`

Tato funkce běží na pozadí po uložení jídla.

```text
Input:
{
  "entryId": "uuid",         // ID záznamu v nutrition_food_entries
  "templateId": "uuid",      // ID šablony v nutrition_meal_templates
  "description": "Kuřecí prsa s rýží",
  "portionSize": "medium",
  "clientId": "uuid"
}

AI Prompt:
"Analyzuj toto české jídlo a odhadni nutriční hodnoty pro střední porci (~250g):
- Kalorie (rozmezí min-max)
- Bílkoviny v gramech
- Sacharidy v gramech
- Tuky v gramech
Také navrhni normalizovaný název pro databázi (bez překlepů, jednotný formát)."

Output (JSON):
{
  "calories_low": 380,
  "calories_high": 450,
  "protein_g": 35,
  "carbs_g": 40,
  "fat_g": 8,
  "fiber_g": 2,
  "normalized_name": "Kuřecí prsa s rýží",
  "confidence": "high"
}
```

### 2. `ai-workout-calories`

Tato funkce běží na pozadí po uložení tréninku.

```text
Input:
{
  "workoutLogId": "uuid",
  "workoutType": "cardio",
  "durationMinutes": 45,
  "exercises": [
    { "name": "Běh", "durationSeconds": 1800, "distanceMeters": 5000 },
    { "name": "Posilování", "sets": 4, "reps": 10 }
  ],
  "clientWeight": 75  // Váha klienta z měření
}

AI Prompt:
"Na základě těchto údajů o tréninku odhadni kalorický výdej.
Použij MET hodnoty pro jednotlivé aktivity.
Váha klienta: 75 kg, Délka tréninku: 45 minut."

Output (JSON):
{
  "calories_burned": 420,
  "breakdown": [
    { "activity": "Běh", "calories": 350 },
    { "activity": "Posilování", "calories": 70 }
  ],
  "confidence": "medium"
}
```

### 3. `ai-merge-similar-foods` (plánované)

Pravidelný job pro deduplikaci databáze jídel.

---

## Integrace do stávajícího kódu

### Úprava `useAddFoodEntry` (onSuccess)

```typescript
onSuccess: async (data, { clientId, entry }) => {
  // ... stávající invalidace cache ...
  
  // Auto-save template (již existuje)
  await autoSaveMealTemplate(clientId, { ... });
  
  // NEW: AI enrichment na pozadí (fire-and-forget)
  supabase.functions.invoke('ai-nutrition-enrichment', {
    body: {
      entryId: data.id,
      description: entry.description,
      portionSize: entry.portion_size,
      clientId: clientId,
    }
  }).catch(err => console.error('AI enrichment failed:', err));
  // Nečekáme na výsledek - běží na pozadí
}
```

### Úprava `useCreateWorkoutLog` (onSuccess)

```typescript
onSuccess: async (log, variables) => {
  // ... stávající notifikace ...
  
  // NEW: Výpočet kalorií na pozadí
  // Nejprve získat váhu klienta z posledního měření
  const { data: measurement } = await supabase
    .from('measurements')
    .select('weight')
    .eq('client_id', variables.client_id)
    .order('date', { ascending: false })
    .limit(1)
    .single();
    
  supabase.functions.invoke('ai-workout-calories', {
    body: {
      workoutLogId: log.id,
      workoutType: variables.workout_type,
      durationMinutes: variables.duration_minutes,
      exercises: variables.exercises,
      clientWeight: measurement?.weight || 70,
    }
  }).catch(err => console.error('AI calories calc failed:', err));
}
```

---

## Jak to vypadá pro klienta

### Při zadávání jídla

```text
┌──────────────────────────────────────────────────────────────┐
│ 🍽️ Co jsi jedl/a?                                           │
│                                                              │
│ [Kuře_] ← začne psát                                        │
│                                                              │
│ Návrhy:                                                      │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ⭐ Kuřecí prsa s rýží                                  │  │
│ │    ~420 kcal • 35g B • 40g S • 8g T     (použito 5×)  │  │
│ ├────────────────────────────────────────────────────────┤  │
│ │ ⭐ Kuřecí řízek                                        │  │
│ │    ~550 kcal • 28g B • 25g S • 35g T    (použito 3×)  │  │
│ └────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### V přehledu dne

```text
┌──────────────────────────────────────────────────────────────┐
│ 📊 DNEŠNÍ SHRNUTÍ                                           │
│                                                              │
│ 🍽️ Příjem:     ~1850 kcal                                   │
│    Bílkoviny:  125g  ████████████████░░░░ 83%               │
│    Sacharidy:  180g  ██████████████░░░░░░ 72%               │
│    Tuky:       65g   ████████████████████ 100%              │
│                                                              │
│ 🏋️ Výdej:      ~420 kcal (45 min kardio + síla)             │
│                                                              │
│ ⚖️ Bilance:    ~1430 kcal                                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Soubory k vytvoření/úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `supabase/functions/ai-nutrition-enrichment/index.ts` | VYTVOŘIT | Edge Function pro AI analýzu jídla |
| `supabase/functions/ai-workout-calories/index.ts` | VYTVOŘIT | Edge Function pro výpočet kalorií tréninku |
| `src/hooks/useClientPortalNutrition.ts` | UPRAVIT | Přidat volání AI enrichment v onSuccess |
| `src/hooks/useClientWorkoutLogs.ts` | UPRAVIT | Přidat volání AI calories v onSuccess |
| `src/hooks/useNutritionMealTemplates.ts` | UPRAVIT | Rozšířit interface o nutriční hodnoty |
| `src/components/client-portal/nutrition/FoodAutocomplete.tsx` | UPRAVIT | Zobrazit nutriční hodnoty v návrzích |
| `src/components/client-portal/nutrition/NutritionDaySummary.tsx` | VYTVOŘIT | Komponenta pro denní souhrn kalorií |
| `supabase/config.toml` | UPRAVIT | Přidat nové edge functions |

---

## Databázová migrace

```sql
-- Rozšíření nutrition_meal_templates o nutriční hodnoty
ALTER TABLE nutrition_meal_templates
ADD COLUMN IF NOT EXISTS calories_per_portion integer,
ADD COLUMN IF NOT EXISTS protein_g numeric(5,1),
ADD COLUMN IF NOT EXISTS carbs_g numeric(5,1),
ADD COLUMN IF NOT EXISTS fat_g numeric(5,1),
ADD COLUMN IF NOT EXISTS fiber_g numeric(5,1),
ADD COLUMN IF NOT EXISTS ai_enriched boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS ai_enriched_at timestamptz,
ADD COLUMN IF NOT EXISTS normalized_name text;

-- Rozšíření client_workout_logs o kalorie
ALTER TABLE client_workout_logs
ADD COLUMN IF NOT EXISTS calories_burned integer,
ADD COLUMN IF NOT EXISTS ai_enriched boolean DEFAULT false;

-- Index pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_meal_templates_normalized 
ON nutrition_meal_templates (client_id, normalized_name);
```

---

## Výhody tohoto řešení

| Výhoda | Popis |
|--------|-------|
| **Transparentní pro klienta** | Klient nevidí AI, pouze výsledky |
| **Neblokující** | AI běží na pozadí, nezdržuje ukládání |
| **Učící se** | Systém se učí z každého záznamu |
| **Deduplikace** | AI sjednocuje podobné názvy jídel |
| **Personalizované** | Každý klient má vlastní databázi |
| **Využívá existující** | LOVABLE_API_KEY, sloupce v DB |

---

## Technické detaily

### Edge Function prompt pro jídla

```text
Jsi nutriční expert. Analyzuj tento popis jídla a odhadni nutriční hodnoty.

Jídlo: "${description}"
Porce: ${portionSize} (malá ~150g, střední ~250g, velká ~400g)

Pravidla:
- Odhadni kalorie s rozmezím (low/high)
- Bílkoviny, sacharidy, tuky v gramech
- Pokud je popis nejasný, použij průměrné hodnoty pro typické české jídlo
- Normalizuj název (oprav překlepy, sjednoť formát)

Odpověz POUZE ve formátu JSON:
{
  "calories_low": number,
  "calories_high": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "normalized_name": "string",
  "confidence": "high" | "medium" | "low"
}
```

### Edge Function prompt pro tréninky

```text
Jsi fitness expert. Vypočítej kalorický výdej tréninku.

Typ tréninku: ${workoutType}
Délka: ${durationMinutes} minut
Váha klienta: ${clientWeight} kg
Cviky: ${JSON.stringify(exercises)}

Použij MET hodnoty:
- Běh 8 km/h = 8.3 MET
- Silový trénink = 6.0 MET
- HIIT = 8.0 MET
- Jóga = 3.0 MET
- Cyklistika = 7.5 MET

Vzorec: Kalorie = MET × váha(kg) × čas(h)

Odpověz POUZE ve formátu JSON:
{
  "calories_burned": number,
  "breakdown": [{ "activity": "string", "calories": number }],
  "confidence": "high" | "medium" | "low"
}
```

---

## Shrnutí workflow

1. **Klient zadá jídlo** → uloží se ihned
2. **Na pozadí běží AI** → doplní kalorie a nutrienty do templates
3. **Při příštím hledání** → klient vidí nutriční hodnoty v návrzích
4. **Klient zadá trénink** → uloží se ihned
5. **Na pozadí běží AI** → doplní kalorický výdej
6. **V přehledu dne** → klient vidí bilanci příjem vs. výdej
