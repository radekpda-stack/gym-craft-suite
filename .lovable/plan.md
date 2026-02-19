
## Komplexní redesign záložky Klienti (tréninkový deník) ve Výkonnosti

### Analýza problému

Po důkladné analýze kódu a databáze jsem identifikoval tato klíčová selhání aktuálního stavu:

1. **Záložka "Klienti" (ClientProgressView)** slouží primárně jako statistický přehled (Hero stats, sparkline grafy, PR timeline) – nevypadá ani nefunguje jako **tréninkový deník** pro rychlé zobrazení, přidávání a porovnání výkonů.

2. **Záložka "Klient" v ExercisesContent** (záložka ve starém ExercisesContent, která se nyní nezobrazuje přímo uživateli) obsahuje dobrou logiku zobrazení cviků dle kategorií, ale je skrytá uvnitř stránky a přístup k zápisu výkonu je komplikovaný.

3. **Mobilní zobrazení** v `ClientProgressView` – výběr klienta, přepínání módů a samotná data jsou nevhodně uspořádané pro rychlou práci na mobilu.

4. **Datové zobrazení** – v detailu záznamu/cviku se zobrazují jen primární metriky. RPE, vzdálenost, čas jsou schované nebo zcela chybí v přehledovém listu.

5. **Zápis výkonu** – není dostupný přímo ze záložky Klienti, je nutné přejít do Knihovny a najít cvik – to je pomalé v terénu.

6. **Real databáze**: Silové cviky nemají RPE/tep (NULL), kardio cviky (Veslo 500m, SkillUp) mají čas, vzdálenost, RPE, watty – to je data která musíme zobrazit správně.

---

### Navrhované řešení: Redesign záložky "Klienti" jako plnohodnotný tréninkový deník

Záložka **Klienti** bude kompletně přepracována. Zachováme stávající záložky "Porovnání" a "Benchmark", ale primární view "Klient" bude nyní fungovat jako rychlý deník:

```text
┌─────────────────────────────────────────────────────────┐
│  [Klient] ▾  Kokeš Jirka                    + Zapsat   │
│──────────────────────────────────────────────────────────│
│  [Síla 🔵] [Kardio 🟢] [Plyo 🟡] [Vše]               │
│──────────────────────────────────────────────────────────│
│  🔵 Bench Press                     85 kg × 5   ↗ PR   │
│     5× │ Ø 80 kg │ RPE 8             14.2.26          ›│
│──────────────────────────────────────────────────────────│
│  🟢 SkillUp                       ⏱ 0:57  📏 250 m    │
│     RPE 8                            19.2.26           ›│
│──────────────────────────────────────────────────────────│
│  🔵 Dřep (Back Squat)              120 kg × 3           │
│     4× │ Ø 112 kg │ RPE 7            5.2.26           ›│
└─────────────────────────────────────────────────────────┘
```

Po kliknutí na cvik → detail s grafem, celou historií, RPE badge, tep, waty:

```text
┌─────────────────────────────────────────────────────────┐
│ ← Bench Press        [🔵 Síla]         + Přidat záznam │
│   Kokeš Jirka                                           │
│──────────────────────────────────────────────────────────│
│  Max: 85 kg    Trend: +5 kg ↗    PR: 3    Záznamů: 14  │
│──────────────────────────────────────────────────────────│
│  [Graf progrese - čára]                                  │
│──────────────────────────────────────────────────────────│
│  ZÁZNAMY:                                               │
│  🏆 14.2.26 │ 4×5 │ 85 kg │ [RPE 8] │ ✏               │
│     5.2.26  │ 3×5 │ 82.5 kg │ [RPE 7] │ ✏              │
│    28.1.26  │ 4×5 │ 80 kg │ [RPE 8]  │ ✏              │
└─────────────────────────────────────────────────────────┘
```

---

### Přesné změny souborů

#### Soubor 1: `src/components/performance/ClientProgressView.tsx` – HLAVNÍ REDESIGN

**Cíl:** Přepracovat "single" mode z statistického přehledu na deník-first design.

**Změny v sekci výběru klienta (bez vybraného klienta):**
- Zachovat stávající seznam klientů, ale přidat statistiky přímo:
  - Počet silových cviků / kardio cviků / plyo cviků
  - Poslední aktivita
  - Počet PR

**Změny po výběru klienta (klíčová sekce):**
- **Odstranit** ProgressHeroCard z horní části (nebo schovat do collapsible sekce "Statistiky")
- **Nahradit** ProgressSparklineGrid a PRHistoryTimeline za `ClientExercisesView`-like komponentu:
  - Barevně rozlišené karty cviků (Síla = modrá, Kardio = zelená, Plyo = žlutá)
  - Quick filter tlačítka: [Síla] [Kardio] [Plyo] [Vše]
  - Každá karta cviku zobrazuje: primární hodnota, datum, RPE badge, počet záznamů, trend šipka
  - Kliknutím → inline detail s grafem + historií záznamů
- **Přidat** tlačítko "Zapsat výkon" vedle výběru klienta (otevírá `QuickLogDialog` s předvybraným klientem)

**Změny v detailu cviku (ExerciseProgressDetail):**
- Rozšířit zobrazení záznamů v historii:
  - Zobrazit RPE jako barevný badge (zelená/žlutá/červená) pro KAŽDÝ záznam
  - Pro kardio: zobrazit čas + vzdálenost + watty v jednom řádku
  - Pro sílu: zobrazit sériová struktura (3×5) + váha + objem
  - Pro plyo: zobrazit počet pokusů + výška/vzdálenost
- Přidat tlačítko "Přidat záznam" do záhlaví detailu cviku
- Přidat tlačítko "Upravit" u každého záznamu v historii

#### Soubor 2: `src/components/performance/ExerciseProgressDetail.tsx` – Rozšíření

**Cíl:** Přidat RPE, vzdálenost, watty do zobrazení záznamů.

- Rozšířit `useExerciseHistory` data o RPE a metriky specifické pro typ
- Pro každý záznam v historii zobrazit:
  - **Síla:** `3×8 │ 85 kg │ Vol: 2040 kg │ [RPE 8]`
  - **Kardio:** `⏱ 1:57 │ 📏 500 m │ ⚡ 394 W │ [RPE 10]`
  - **Plyo:** `5 pokusů │ 2.78 m │ [RPE 7]`
- Přidat kliknutí na záznam → `ExerciseEntryDetailSheet`
- Přidat tlačítko "+" pro zápis nového záznamu pro tento cvik + klienta

#### Soubor 3: `src/hooks/useExerciseHistory.ts` – Rozšíření dat

**Cíl:** Přidat `rpe`, `avg_watts`, `avg_heart_rate`, `sets`, `side` do vráceného objektu.

- Přidat pole do `ExerciseHistoryEntry` interface: `rpe`, `avg_watts`, `avg_heart_rate`, `sets`
- Přidat pole do SELECT dotazu
- Exportovat je v mapování záznamu

#### Soubor 4: `src/components/exercises/QuickLogDialog.tsx` – Předvyplnění klienta

**Cíl:** Přijmout volitelný `initialClientId` prop pro předvyplnění klienta.

- Přidat prop `initialClientId?: string`
- Nastavit `defaultValues.client_id` z `initialClientId` pokud je k dispozici

#### Soubor 5: `src/pages/PerformanceHub.tsx` – Předání `QuickLogDialog` stavu

**Cíl:** Propojit tlačítko "Zapsat výkon" v záložce Klienti s QuickLogDialog.

- Přidat `quickLogClientId` state
- Předat ho do `ClientProgressView` a do `QuickLogDialog`

---

### Vizuální mobilní design po změně

```text
ZÁLOŽKA KLIENTI – bez vybraného klienta:
┌──────────────────────────────────────────┐
│ Klienti                                  │
│ [🔍 Hledat klienta...]                  │
│──────────────────────────────────────────│
│ Kokeš Jirka               🏆 3 PR  14 → │
│ Síla 8 │ Kardio 2 │ Plyo 3              │
│ poslední: 19.2.26                        │
│──────────────────────────────────────────│
│ Novák Petr                🏆 1 PR  7  → │
│ Síla 5 │ Kardio 0                       │
└──────────────────────────────────────────┘

ZÁLOŽKA KLIENTI – vybraný klient:
┌──────────────────────────────────────────┐
│ ← Kokeš Jirka    [Karta klienta ↗]  +  │  ← + = Zapsat výkon
│──────────────────────────────────────────│
│ [🔵 Síla] [🟢 Kardio] [🟡 Plyo] [Vše]│
│──────────────────────────────────────────│
│ 🔵 Bench Press              85 kg ×5 ↗ │
│    14× │ RPE Ø8.2          19.2.26    › │
│──────────────────────────────────────────│
│ 🟢 SkillUp              ⏱ 0:57  250m  │
│    RPE 8                   19.2.26    › │
│──────────────────────────────────────────│
│ 🔵 Dřep                    120 kg ×3   │
│    22× │ RPE Ø7.5          14.2.26    › │
└──────────────────────────────────────────┘

DETAIL CVIKU (Bench Press):
┌──────────────────────────────────────────┐
│ ← Bench Press  [🔵 Síla]    + Přidat   │
│   Kokeš Jirka                           │
│──────────────────────────────────────────│
│ [Max: 85 kg] [Trend: +5↗] [PR: 3] [14×]│
│──────────────────────────────────────────│
│ [───●────────────────] Graf progrese    │
│──────────────────────────────────────────│
│ ZÁZNAMY                                 │
│ 🏆 19.2. │ 4×5 │ 85 kg │ [RPE 8] │ ✏  │
│    5.2.  │ 3×5 │ 82.5 kg│ [RPE 7] │ ✏  │
│   28.1.  │ 4×5 │ 80 kg  │ [RPE 8] │ ✏  │
└──────────────────────────────────────────┘

DETAIL KARDIO CVIKU (SkillUp):
┌──────────────────────────────────────────┐
│ ← SkillUp      [🟢 Kardio]  + Přidat   │
│   Kokeš Jirka                           │
│──────────────────────────────────────────│
│ [Nejlepší: 0:45] [Trend: -12s↗] [Záz: 2]│
│──────────────────────────────────────────│
│ [Graf]                                  │
│──────────────────────────────────────────│
│ ZÁZNAMY                                 │
│ 19.2. │ ⏱ 0:57 │ 📏 250m │ [RPE 8] │ ✏│
│  5.1. │ ⏱ 0:45 │ 📏 200m │ [RPE 7] │ ✏│
└──────────────────────────────────────────┘
```

---

### Rozsah změn

| Soubor | Typ | Rozsah |
|--------|-----|--------|
| `ClientProgressView.tsx` | Redesign (klíčový) | Velký |
| `ExerciseProgressDetail.tsx` | Rozšíření metrik | Střední |
| `useExerciseHistory.ts` | Přidat pole | Malý |
| `QuickLogDialog.tsx` | Přidat prop | Malý |
| `PerformanceHub.tsx` | State drilldown | Malý |

- **Žádné databázové změny** – všechna data jsou v DB
- **Zpětně kompatibilní** – ostatní záložky zůstanou beze změny
- **Záložky Porovnání a Benchmark** zůstanou zachovány

