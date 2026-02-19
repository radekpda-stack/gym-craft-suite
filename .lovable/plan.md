
## Rozšíření Historie výkonů o všechny metriky a filtrování

### Problém

Záznamy pro SkillUp (kardio cvik) obsahují data – čas (57 s), vzdálenost (250 m), RPE (8) – ale tabulka je na mobilu nečitelná. Sloupce Tempo, Watty a RPE jsou schované přes `hidden sm:table-cell`, takže na telefonu vidíte jen datum a klienta.

### Co se změní

#### 1. `ExerciseHistoryTable.tsx` – hlavní tabulka Historie

**Mobilní zobrazení přepsat ze tabulky na karty:**
- Na mobilu (< sm breakpoint) místo tabulky se zobrazí kompaktní řádkové karty
- Každý záznam bude mít: datum + klient (vlevo), hlavní metriky (čas / vzdálenost / RPE) přímo viditelné
- Na tabletu/desktopu zůstane tabulka s plnými sloupci

**Přidat sloupce které chybí:**
- Pro kardio typ: přidat sloupec "Vzdálenost" vedle "Čas" (vzdálenost je teď skryta)
- Zviditelnit RPE i na menších obrazovkách

**Rozšířit třídění:**
- Přidat možnost třídit podle RPE (Podle obtížnosti)
- Přidat možnost třídit podle vzdálenosti

**Přidat filtr klienta:**
- Pokud není vybrán konkrétní klient, přidat dropdown pro rychlé filtrování

#### 2. `ExerciseHistoryTable.tsx` – data fetching

Aktuálně se fetchuje: `time_seconds, avg_watts, pace_sec_per_500m, pace_sec_per_km, avg_speed_kmh, rpe, distance_meters`

Přidat do SELECT:
- `avg_heart_rate` (průměrný tep)
- `max_heart_rate` (max tep)
- `strokes` (záběry – pro veslo)
- `cadence_spm` (kadence)
- `calories_kcal` (kalorie)

#### 3. Nová mobilní karta pro každý záznam

```text
┌──────────────────────────────────────────────┐
│ 🏆 5.1.26   Trenér Radek                     │
│ ⏱ 0:45   📏 200 m   ⚡ RPE 7/10             │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 19.2.26   Kokeš Jirka                        │
│ ⏱ 0:57   📏 250 m   ⚡ RPE 8/10             │
└──────────────────────────────────────────────┘
```

#### 4. Rozšířit třídící možnosti

Pro kardio typ:
- Datum (stávající)
- Čas (nejlepší = nejkratší)
- Vzdálenost (největší)
- RPE (vnímaná obtížnost)
- Watty (výkon)

### Technické detaily

**Soubory k úpravě:**
1. `src/components/exercises/ExerciseHistoryTable.tsx`
   - Přidat `avg_heart_rate`, `max_heart_rate`, `strokes`, `cadence_spm`, `calories_kcal` do SELECT dotazu
   - Mapovat tyto hodnoty do `rows` objektu
   - Přidat `sortBy` možnosti: `'rpe'` a rozšířit `'distance'` na kardio typ
   - Přepsat mobilní zobrazení z tabulky na responzivní karty (grid layout na sm+)
   - Na mobilu zobrazit: čas, vzdálenost, RPE, průměrný tep v jednom řádku s ikonami
   - Na desktopu zachovat tabulku s přidanými sloupci vzdálenosti a tepu

**Klíčová logika:**

```typescript
// Mobilní karta pro kardio
const CardioRow = ({ row }) => (
  <div className="flex items-center justify-between py-2 border-b">
    <div>
      <div className="flex items-center gap-1.5">
        {row.isPR && <Trophy className="w-3 h-3 text-primary" />}
        <span className="font-medium">{format(row.date, 'd.M.yy')}</span>
        {!clientId && <span className="text-muted-foreground text-sm">{row.clientName}</span>}
      </div>
      <div className="flex items-center gap-3 mt-0.5 text-sm">
        {row.timeSeconds && <span>⏱ {formatTime(row.timeSeconds)}</span>}
        {row.distanceMeters && <span>📏 {row.distanceMeters} m</span>}
        {row.rpe && <Badge className={getRpeBgColor(row.rpe)}>{row.rpe}/10</Badge>}
        {row.avgHeartRate && <span>♥ {row.avgHeartRate}</span>}
      </div>
    </div>
    <Button variant="ghost" size="icon" onClick={() => setDetailEntryId(row.id)}>
      <ChevronRight className="w-4 h-4" />
    </Button>
  </div>
);
```

**Třídění podle RPE (nový SQL order):**
```typescript
} else if (sortBy === 'rpe') {
  exerciseQuery = exerciseQuery.order('rpe', { ascending: false, nullsFirst: false });
}
```

### Rozsah změny

Pouze **1 soubor**: `src/components/exercises/ExerciseHistoryTable.tsx`

- Žádné databázové změny (všechna data jsou již v tabulce)
- Žádné nové API endpointy
- Zpětně kompatibilní (silové cviky se zobrazí stejně jako dříve)
