
# Plán: Vylepšení UX v deníku a dashboardu

## Shrnutí požadavků

1. **Přidat tlačítka pro přidání** v záložce "Tréninky" a "Strava" - aby bylo jasné, že lze zapisovat
2. **Odstranit SimpleStatsCard** - tabulku s "dní v řadě" a "tento měsíc" a aktivitním gridem
3. **Přejmenovat "Chat" na "Chat s trenérem"** na dashboardu

---

## Technické změny

### 1. Odstranění SimpleStatsCard z deníku

**Soubor:** `src/pages/client-portal/ClientPortalWorkoutDiary.tsx`

Odstraním řádek 217:
```typescript
// ODSTRANIT:
<SimpleStatsCard workoutDates={workoutDates} />
```

A odstraním nepoužívaný import a proměnné:
- `import { SimpleStatsCard }` (řádek 38)
- `workoutDates` useMemo (řádky 82-86)

### 2. Přidání výrazného tlačítka v záložce Tréninky

**Soubor:** `src/pages/client-portal/ClientPortalWorkoutDiary.tsx`

Přidám nové tlačítko hned pod `<TabsContent value="workouts">`:

```typescript
{/* Add Workout Button - Always visible */}
<Button 
  onClick={() => setDialogOpen(true)}
  className="w-full gap-2 h-12"
  size="lg"
>
  <Plus className="w-5 h-5" />
  Přidat svůj trénink
</Button>
```

Toto tlačítko bude vždy viditelné nahoře a jasně ukáže, že lze přidávat tréninky.

### 3. Přidání výrazného tlačítka v záložce Strava

**Soubor:** `src/pages/client-portal/ClientPortalNutritionTab.tsx`

Přidám prominentní tlačítko hned po WeekStrip:

```typescript
{/* Add Food Button - Prominent CTA */}
<Button 
  onClick={() => {
    setPrefilledMealType(undefined);
    setShowAddForm(true);
  }}
  className="w-full gap-2 h-12"
  size="lg"
>
  <Plus className="w-5 h-5" />
  Přidat stravu
</Button>
```

### 4. Přejmenování "Chat" na "Chat s trenérem"

**Soubor:** `src/components/client-portal/dashboard/ClientQuickActions.tsx`

Změním řádek 28:
```typescript
// PŘED:
label: 'Chat',

// PO:
label: 'S trenérem',
```

Zkráceno na "S trenérem" aby se tlačítko vešlo do gridu 4 sloupců. Ikona MessageCircle a cesta zůstávají stejné.

---

## Vizuální ukázka změn

### Záložka Tréninky (před/po)

**PŘED:**
```text
┌─────────────────────────────┐
│ 🔥 0 dní v řadě | 🏆 3 tento│
│ [Aktivitní grid 5 týdnů]   │
├─────────────────────────────┤
│ Tréninky od trenéra...      │
│ Moje záznamy...             │
│         [+ FAB vpravo dole] │
└─────────────────────────────┘
```

**PO:**
```text
┌─────────────────────────────┐
│ [+ Přidat svůj trénink    ] │  ← Nové výrazné tlačítko
├─────────────────────────────┤
│ Tréninky od trenéra...      │
│ Moje záznamy...             │
│         [+ FAB vpravo dole] │
└─────────────────────────────┘
```

### Záložka Strava (přidání tlačítka)

**PO:**
```text
┌─────────────────────────────┐
│ [Week Strip - Po Út St...] │
├─────────────────────────────┤
│ [+ Přidat stravu          ] │  ← Nové výrazné tlačítko
├─────────────────────────────┤
│ 3 Jídel | 600ml | 2 Kávy   │
│ [Snídaně] [Oběd] [Večeře]  │
│ ...                         │
└─────────────────────────────┘
```

### Dashboard Quick Actions (přejmenování)

**PŘED:**
```text
[Trénink] [Chat] [Soutěže] [Pokrok]
```

**PO:**
```text
[Trénink] [S trenérem] [Soutěže] [Pokrok]
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/pages/client-portal/ClientPortalWorkoutDiary.tsx` | Odstranit SimpleStatsCard, přidat tlačítko "Přidat svůj trénink" |
| `src/pages/client-portal/ClientPortalNutritionTab.tsx` | Přidat tlačítko "Přidat stravu" |
| `src/components/client-portal/dashboard/ClientQuickActions.tsx` | Změnit "Chat" → "S trenérem" |

---

## Výsledek

1. **Jasná výzva k akci** - klient okamžitě vidí, že může přidávat záznamy
2. **Čistší design** - bez statistik, které zabíraly místo
3. **Srozumitelné tlačítko chatu** - "S trenérem" místo obecného "Chat"
4. **Konzistence** - obě záložky mají stejný styl tlačítka nahoře
