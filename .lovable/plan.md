
## Komplexní redesign karty Výkonnost – Tréninkový deník premium

### Analýza současného stavu

Po podrobném prostudování kódu jsem identifikoval tyto klíčové problémy:

1. **Záložka Přehled** – `CategoryCards`, `ClientProgressLeaderboard`, `RecentPRsCompact` a `RecentExercisesChips` jsou vizuálně oddělené bloky bez vzájemné provázanosti. Na mobilu zabírají příliš vertikálního prostoru, metriky jsou roztroušené.

2. **KPI Bar** (`PerformanceKPIBar`) – tři karty jsou OK, ale vizuálně nezaujmou. Chybí kontext co daná čísla znamenají (trend za předchozí měsíc).

3. **Záložka Klienti / Journal** (`ClientProgressView`) – Funguje dobře strukturálně, ale:
   - **Karta cviku** (`ExerciseListItem`) je příliš kompaktní – ikony jsou malé, primární hodnota splývá s vedlejšími metrikami, datum je nečitelné
   - **Detail cviku** (`ExerciseDetailView`) – záznamy v historii jsou obtížně čitelné na mobilu, RPE badge je příliš malá, watts/tep jsou skryté za truncate
   - **KPI karty** v detailu jsou správné, ale vizuálně chudé

4. **ExerciseProgressDetail** (`ExerciseProgressDetail.tsx`) – jen zobrazuje základní `displayValue` bez RPE, watts nebo tepu. Záznamy nemají barevné odlišení.

5. **ExerciseHistoryTable mobilní view** – funguje, ale je vizuálně přehlcené – vše v jednom řádku textu bez jasné vizuální hierarchie.

6. **ClientExercisesView** – duplicitní implementace s `ClientProgressView`, ale pro jiný kontext (záložka Knihovna > Klient).

---

### Plán změn – 4 klíčové soubory

#### Soubor 1: `src/components/performance/ClientProgressView.tsx` – Premium Journal redesign

**A) ExerciseListItem – zcela přepsat vizuál:**
- Nahradit současný úzký řádek za **dvouřádkovou kartu** s jasnou hierarchií
- Horní řádek: Ikona (větší 10×10), název cviku (font-semibold), datum vpravo (výraznější)
- Dolní řádek: primární hodnota VELKÁ (text-lg font-bold), vedlejší metriky (vzdálenost, watty, tep) oddělené tečkami
- RPE badge přesunout do pravého horního rohu (prominentní)
- Trend šipka zcela vpravo jako velký indikátor
- Pro silové: zobrazit jak `4×5` SEPARÁTNĚ od `85 kg` (dvě distinct hodnoty)
- Přidat počet záznamů jako subtextík pod jménem cviku

**B) ExerciseDetailView – vylepšit KPI a záznamy:**
- KPI karty: Zvýraznit hodnoty (`text-2xl font-bold`), přidat barevné ikony odpovídající typu
- Graf: Přidat tečky PR jako zlaté hvězdy, přidat gradient fill pod čarou (area fill)
- Záznamy v historii: každý záznam jako **mini-karta** se světlým pozadím
  - Síla: `[🏆] 14.2. │ 4×5 │ 85 kg │ Vol: 1700 kg │ [RPE 8]`
  - Kardio: `[🏆] 19.2. │ ⏱ 0:57 │ 📏 250m │ ⚡ 245W │ ♥ 142 │ [RPE 8]`
  - Plyo: `[19.2.] │ 5 pok. │ 2.4m │ [RPE 7]`
- Přidat tlačítko "Upravit" (ikona tužky) u každého záznamu
- Kliknout na záznam → otevře `ExerciseEntryDetailSheet`

**C) JournalView – zlepšit layout:**
- Přidat mini stats strip pod klientem: počet cviků / záznamů / PR
- Filter pills: přidat počet jako superscript badge
- Prázdný stav: nový ilustrativní empty state s tlačítkem "Zapsat první výkon"

**D) ClientList – vylepšit:**
- Přidat mini barevné pruhy počtů (síla/kardio/plyo) u každého klienta jako malé colored dots
- Datum poslední aktivity = výraznější (badge místo textu)

#### Soubor 2: `src/components/performance/ExerciseProgressDetail.tsx` – Rozšíření záznamů

Tento soubor se používá v záložce **Knihovna** když trenér vybere klienta. Stávající zobrazení záznamů ukazuje jen `displayValue` bez RPE/watts/tepu.

- Rozšířit historii o RPE badge, watts, tep pro každý záznam
- Přidat barevný levý border záznamu dle RPE (zelená < 6, žlutá 6-8, červená > 8)
- Graf: typ svislé osy dle `exerciseType` (pro kardio = čas, pro sílu = kg)

#### Soubor 3: `src/components/performance/PerformanceKPIBar.tsx` – Mírné vylepšení

- Na mobilu: místo centrovaného textu použít horizontální layout s větší hodnotou
- Přidat tooltip s vysvětlením co KPI znamená
- Přidat subtextík "vs. minulý měsíc" pokud je trend dostupný

#### Soubor 4: `src/components/performance/RecentPRsCompact.tsx` – Visual upgrade

- Přidat barevný levý border dle typu cviku (primary/success/warning)
- Přidat ikonu typu cviku před název
- Přidat badge s typem (Síla / Kardio / Plyo)
- Zobrazit více detailu: pokud kardio PR → zobrazit čas/vzdálenost místo raw čísla

---

### Vizuální výsledek na mobilu

```text
KARTA CVIKU – KARDIO (nový design):
┌────────────────────────────────────────────────┐
│ ●─── 🟢 ───────────────────────────────────── │
│ [♥] SkillUp                     19.2.26  ↗ ↗ │
│      2 záznamy                   [RPE 8]      │
│                                               │
│  ⏱ 0:57          📏 250 m       ⚡ 245W      │
└────────────────────────────────────────────────┘

KARTA CVIKU – SÍLA (nový design):
┌────────────────────────────────────────────────┐
│ ●─── 🔵 ───────────────────────────────────── │
│ [🏋] Bench Press                14.2.26  ↗    │
│      14 záznamů                               │
│                                               │
│  4×5 │ 85 kg │ Vol: 1700 kg                  │
└────────────────────────────────────────────────┘

DETAIL ZÁZNAMU V HISTORII – SÍLA:
┌──────────────────────────────────────────────────┐
│ 🔵 │ 🏆 19.2.26          4×5 │ 85 kg │ ✏       │
│    │    Vol: 1700 kg  │ [RPE 8]                  │
└──────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────┐
│    │    5.2.26          3×5 │ 82.5 kg │ ✏        │
│    │    Vol: 1237 kg  │ [RPE 7]                  │
└──────────────────────────────────────────────────┘

DETAIL ZÁZNAMU V HISTORII – KARDIO:
┌──────────────────────────────────────────────────┐
│ 🟢 │    19.2.26  │ ⏱ 0:57 │ 📏 250m │ ⚡245W │ ✏│
│    │    ♥ 142 bpm │ [RPE 8]                     │
└──────────────────────────────────────────────────┘
```

---

### Technické detaily

**Nová struktura `ExerciseListItem`:**
```typescript
// Dvouřádkový layout s jasnou hierarchií
<button className="w-full flex flex-col gap-2 p-3.5 rounded-xl bg-card border border-l-4 hover:bg-muted/40">
  {/* Horní řádek: ikona + název + datum + trend */}
  <div className="flex items-center gap-2.5">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <p className="font-semibold text-sm truncate">{exercise.exerciseName}</p>
        <span className="text-[10px] text-muted-foreground">{exercise.count}×</span>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {format(lastDate, 'd. M. yy', { locale: cs })}
      </p>
    </div>
    {rpe && <RpeBadge rpe={rpe} />}
    <div className="flex flex-col items-end gap-0.5">
      {trendIcon}
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </div>
  </div>

  {/* Dolní řádek: hlavní metriky */}
  <div className="flex items-center gap-3 pl-12 text-sm font-medium">
    {primaryMetric}
    {secondaryMetric} 
    {tertiaryMetric}
  </div>
</button>
```

**RPE barevné kódování v historii:**
```typescript
const getEntryBorderColor = (rpe: number | null) => {
  if (!rpe) return 'border-l-border/30';
  if (rpe >= 9) return 'border-l-destructive';
  if (rpe >= 7) return 'border-l-warning';
  return 'border-l-success';
};
```

**Chart area fill pro progres graf:**
```typescript
// Přidat AreaChart místo LineChart nebo defs gradient
<defs>
  <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%" stopColor={strokeColor} stopOpacity={0.15} />
    <stop offset="95%" stopColor={strokeColor} stopOpacity={0} />
  </linearGradient>
</defs>
<Area type="monotone" fill="url(#colorGradient)" ... />
```

### Rozsah změn

| Soubor | Změna | Rozsah |
|--------|-------|--------|
| `ClientProgressView.tsx` | ExerciseListItem redesign + histórie záznamů + prázdný stav | Velký |
| `ExerciseProgressDetail.tsx` | RPE/watts/tep v historii + border kódování | Střední |
| `PerformanceKPIBar.tsx` | Mobilní layout + tooltip | Malý |
| `RecentPRsCompact.tsx` | Typ badge + border + lepší detail hodnoty | Malý |

- Žádné databázové změny
- Žádné nové endpointy
- Zpětně kompatibilní
