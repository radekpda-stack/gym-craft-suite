

# Vylepšení grafů a statistik u cviků a klientů

## Problém
Současné zobrazení dat u cviků a klientů je omezené:
- `ExerciseProgressGraph` ukazuje jen jednu metriku (váha NEBO čas), jednoduchý line chart bez kontextu
- `ExerciseHistorySheet` má základní graf + seznam, ale chybí srovnání období, % zlepšení, průměry, volume trend
- `ClientPRsCard` zobrazuje jen nejlepší hodnotu bez kontextu progrese
- Nikde není vidět porovnání "tento měsíc vs minulý", RPE korelace s výkonem, nebo volume trendy

## Plán

### 1. Vylepšit `ExerciseProgressGraph` na multi-metrický graf
- Přidat sekundární osu Y pro **volume** (sets x reps x weight) jako sloupcový graf pod hlavní křivkou
- Zobrazit **RPE overlay** jako barevné tečky na křivce (zelená=nízké RPE, červená=vysoké)
- Přidat **trendovou linii** (lineární regrese) pro vizuální směr progrese
- Oblast grafu barevně rozlišit: zelená zóna = nad průměrem, červená = pod průměrem

### 2. Rozšířit `ExerciseHistorySheet` o analytický panel
- Nový tab **"Analýza"** (vedle Graf a Historie):
  - **Period comparison**: Porovnání průměrné hodnoty za posledních 30 dní vs předchozích 30 dní s % změnou
  - **Consistency score**: Kolikrát za měsíc klient cvičí tento cvik (frekvence)
  - **RPE vs výkon korelace**: Mini scatter plot — pokud RPE roste ale výkon ne, signál únavy
  - **Volume trend**: Celkový objem (sets x reps x weight) za týden v sloupcovém grafu
- Vylepšit stávající **quick stats** (3 karty): přidat 4. kartu "Trend" s % změnou za 30 dní

### 3. Vylepšit `ClientPRsCard` o kontext progrese
- Ke každému PR přidat mini-indikátor: **"↑ 12% za 3 měs."** (porovnání aktuální PR vs hodnota před 3 měsíci)
- Přidat **"Stáří PR"** badge: "Nový!" (< 7 dní), "Tento měsíc", "3+ měs." — vizuálně odlišit čerstvé vs staré PR
- Pod seznamem PR přidat sumární řádek: "X nových PR tento měsíc | Y cviků s rostoucím trendem"

### 4. Nová komponenta `ExerciseInsightPanel`
- Reusable panel zobrazující pokročilé metriky pro libovolný cvik:
  - **Progression classification**: "Skutečná síla" / "Nárůst úsilí" / "Signál únavy" (z RPE logiky)
  - **Best set vs average set**: Porovnání nejlepší série s průměrem
  - **Frequency heatmap**: Mini kalendář posledních 12 týdnů s barevnou intenzitou

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `ExerciseProgressGraph.tsx` | Multi-metrický graf: volume bary, RPE overlay, trend line, barevné zóny |
| `ExerciseHistorySheet.tsx` | Nový "Analýza" tab s period comparison, RPE korelací, volume trend |
| `ClientPRsCard.tsx` | PR stáří badge, % improvement indikátor, sumární řádek |
| `ExerciseInsightPanel.tsx` | Nová komponenta: progression class, best vs avg, frequency heatmap |
| `useExerciseHistory.ts` | Rozšířit o computed fields: volume, trend %, period averages |

Žádné DB změny — vše se počítá z existujících dat v `exercise_entries`, `cardio_entries`, `skill_entries`.

