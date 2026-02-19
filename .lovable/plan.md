
## Celkové vylepšení UI sekce Výkonnost – Karty cviků a mobilní zobrazení

### Co je aktuálně problém

Po analýze kódu jsem identifikoval 6 konkrétních problémových oblastí:

1. **ExercisesContent (záložky)** – textové popisky záložek jsou skryté na mobilu (`hidden sm:inline`), viditelné jsou jen ikony, bez popisků
2. **ExerciseListItem (ClientExercisesView)** – karty cviků jsou funkční, ale vizuálně chudé – chybí barevné pozadí karty dle kategorie, trend šipka, a zobrazení více metrik najednou (watty, tep)
3. **ExerciseDetailView (ClientExercisesView)** – detail cviku pro klienta zobrazuje základní KPI karty a graf, ale záznamy v historii (spodní seznam) zobrazují pouze datum + hodnotu, bez RPE badge, tepu nebo vzdálenosti
4. **ExerciseDetailOverview** – funguje dobře, ale nadpis "Záznamy" v sekci "Posledních 5 PR" je zavádějící – jsou to PR záznamy, ne obecné záznamy
5. **ExerciseHistoryTable (mobilní view)** – karty jsou funkční, ale vizuálně splývají – nulový vizuální kontrast mezi typy cviků (kardio vs. síla vs. plyo), chybí barevné odlišení
6. **ExerciseProgressChart** – kardio cviky dělají duplicitní dotaz na `exercises` tabulku dvakrát (jednou pro `is_time_based`, jednou pro `name/category`)

---

### Plán změn

#### Soubor 1: `src/components/performance/ExercisesContent.tsx`
**Cíl:** Zobrazit textové popisky záložek i na mobilu

- Odstranit `hidden sm:inline` ze všech tří `<span>` v záložkách
- Přidat `text-xs` pro kompaktnější text na mobilu
- Přidat `shrink-0` na ikony, aby se nezmenšovaly

#### Soubor 2: `src/components/exercises/ClientExercisesView.tsx`
**Cíl:** Vylepšit vizuál `ExerciseListItem` a seznam záznamů v `ExerciseDetailView`

**ExerciseListItem vylepšení:**
- Přidat barevný levý border dle typu (kardio = zelená/success, síla = primary, skill = warning)
- Přidat zobrazení dalších metrik: pokud kardio a má watty → zobrazit ⚡ watts; pokud má tep → zobrazit ♥ HR
- Přidat vizuální trend indikátor (šipka nahoru/dolů) pokud `data.length >= 2`
- Pro sílu: zobrazit i počet opakování (`× reps`) vedle max váhy

**ExerciseDetailView – seznam záznamů (spodní část):**
- Rozšířit záznamy o RPE badge (barevná dle hodnoty), vzdálenost (pokud kardio), watty
- Přidat možnost kliknout na záznam a otevřít `ExerciseEntryDetailSheet` (spodní sheet s detailem)
- Předat `exerciseId` do `ExerciseDetailView` přes `exercise.exerciseId` nebo vyhledat z DB

#### Soubor 3: `src/components/exercises/ExerciseHistoryTable.tsx`
**Cíl:** Barevné odlišení typů cviků v mobilním kartovém zobrazení

- Přidat barevný levý border na mobilní karty dle `isTimeBased` / `isJumpExercise`:
  - Kardio (isTimeBased): `border-l-2 border-l-success`
  - Plyometrie (isJumpExercise): `border-l-2 border-l-warning`  
  - Síla: `border-l-2 border-l-primary`
- Pro silová cvičení zobrazit na mobilních kartách navíc i objem (volume) jako terciální řádek
- Zviditelnit poznámku (notes) pokud existuje – zkrátit truncate na max 60 znaků

#### Soubor 4: `src/components/exercises/ExerciseProgressChart.tsx`
**Cíl:** Opravit duplicitní dotaz

- Sloučit dva `supabase.from('exercises').select(...)` dotazy do jednoho, který fetchuje `is_time_based, category, name, name_cs` najednou

---

### Vizuální výsledek

```text
PŘED (ExerciseListItem – kardio):
┌─────────────────────────────────────────────────┐
│ ♥ SkillUp          57 s        19.2.26  →       │
│     1×  RPE 8                                   │
└─────────────────────────────────────────────────┘

PO (ExerciseListItem – kardio):
┌╔══════════════════════════════════════════════════╗
│║ ♥ SkillUp          ⏱ 57s  📏 250m  ↗ trend     ║
│║     1× │ RPE 8 │ ⚡ 245W              19.2.26 → ║
└╚══════════════════════════════════════════════════╝

PŘED (mobilní karta v historii):
19.2.26  Kokeš Jirka
⏱ 0:57  📏 250 m  RPE 8

PO (mobilní karta v historii – barevně odlišená):
┌────────────────────────────────────────────────┐
│ 🟢 19.2.26  Kokeš Jirka                    ✏️ │
│    ⏱ 0:57   📏 250 m   ⚡ 245W              │
│    [RPE 8]  ♥ 142 bpm                         │
│    Pozn.: skvělý výkon dnes...                 │
└────────────────────────────────────────────────┘
```

### Záložky na mobilu

```text
PŘED:          PO:
[⊞] [👤] [📊]   [⊞ Seznam] [👤 Klient] [📊 Analytika]
(bez textu)     (text viditelný)
```

### Rozsah změn

| Soubor | Typ změny | Rozsah |
|--------|-----------|--------|
| `ExercisesContent.tsx` | UI fix | Malý |
| `ClientExercisesView.tsx` | UI vylepšení | Střední |
| `ExerciseHistoryTable.tsx` | UI vylepšení | Malý |
| `ExerciseProgressChart.tsx` | Optimalizace | Malý |

- Žádné databázové změny
- Žádné nové API endpointy
- Zpětně kompatibilní se stávajícími daty
