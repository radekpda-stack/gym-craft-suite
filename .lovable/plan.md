

# Vylepšení komponenty "Feedback podle tagů" + Integrace do Statistik

## Současný stav

Komponenta `FeedbackTagCorrelation.tsx` zobrazuje cenná data z feedbacků agregovaná podle tréninkových tagů (Typ tréninku, Partie, Intenzita). 

### Nalezené problémy na screenshotu:
1. **Tabulka zobrazuje pouze 3 sloupce** (Tag, Počet, Ø Svalovka) - chybí ostatní metriky (Energie, Bolest, Pocit)
2. **Vizuálně málo atraktivní** - pouze text a čísla bez grafických prvků
3. **Badge může přetékat** - při delších názvech tagů
4. **Chybí vizuální indikace** hodnot (např. škála 0-10 není graficky znázorněna)

---

## Navrhované změny UI

### 1. Kompaktnější mobilní zobrazení s vizuálními metrikami

Místo 6 sloupců v tabulce použít:
- **Mobilní view**: Karta pro každý tag s progress bary
- **Desktop view**: Vylepšená tabulka s mini-grafy

**Nový mobilní layout (karty):**
```text
┌─────────────────────────────────────────────┐
│ [Max síla]                        30× ▼     │
│ ─────────────────────────────────────────── │
│ Svalovka   ████████░░░░░░░░ 3.4             │
│ Energie    ██████████████░░ 7.2             │
│ Bolest     ██░░░░░░░░░░░░░░ 1.5             │
│ Pocit      ████████████░░░░ 6.8             │
└─────────────────────────────────────────────┘
```

### 2. Mini progress bar pro hodnoty

Nahradit textové hodnoty (3.4, 4.4, 3.0...) vizuálním progress barem:
- Škála 0-10 převedena na % šířky
- Barva: `bg-primary` (cyan/teal z designu)
- Background: `bg-muted` 

### 3. Vylepšená tabulka pro desktop

```text
┌────────────────┬───────┬─────────────────────────────────────┐
│ Tag            │ Počet │ Metriky (Svalovka | Energie | Pocit)│
├────────────────┼───────┼─────────────────────────────────────┤
│ Max síla       │  30   │ ████ 3.4  ████████ 7.2  ██████ 6.8  │
│ Hypertrofie    │   9   │ █████ 4.4 ███████ 6.5   █████ 5.2   │
│ Plyometrie     │   3   │ ███ 3.0   ██████ 6.0    ████ 4.5    │
└────────────────┴───────┴─────────────────────────────────────┘
```

### 4. Fixní šířky sloupců pro prevenci přetékání

- Tag sloupec: `max-w-[120px] truncate`
- Počet: `w-16 text-center`
- Metriky: `flex-1` s mini-bar vizualizací

---

## Nová komponenta: `FeedbackTagCard` (pro mobilní karty)

Nová sub-komponenta pro zobrazení jednoho tagu jako karty:
- Název tagu jako header s badge
- 4 mini progress bary pro metriky
- Collapsible pro rozbalení detailů

---

## Nová komponenta: `MetricMiniBar`

Reusable komponenta pro mini progress bar:
```tsx
interface MetricMiniBarProps {
  value: number | null;  // 0-10
  label?: string;
  showValue?: boolean;
  size?: 'sm' | 'md';
}
```

Vizualizace:
- Výška 4px (sm) nebo 6px (md)
- Zaoblené konce (`rounded-full`)
- Tooltip s hodnotou při hover

---

## Integrace do Statistik tréninků

### Kam přidat:

Do `TrainingStatsSection.tsx` jako novou sekci pod `GlobalTagDistributionCard`:

```tsx
{/* Feedback by Tags - Training insights */}
<FeedbackTagCorrelation days={dateRange === 'all' ? 365 : dateRange} />
```

### Úprava props:

Komponenta již podporuje `days` prop, takže bude reagovat na `periodRange` ze Statistics.

---

## Technické kroky implementace

### Krok 1: Vytvořit `MetricMiniBar` komponentu
```text
- Nová komponenta src/components/feedback/MetricMiniBar.tsx
- Props: value (0-10), label, showValue, size
- Vizualizace jako tenký progress bar s hodnotou vpravo
```

### Krok 2: Vytvořit `FeedbackTagRow` pro desktop tabulku
```text
- Nová sub-komponenta místo současného TableRow
- Zobrazí tag badge + počet + 4 mini-bary v řádku
- Tooltips pro jednotlivé metriky
```

### Krok 3: Vytvořit `FeedbackTagCard` pro mobilní view
```text
- Nová komponenta pro card-based layout
- Kompaktní zobrazení všech 4 metrik
- Expandable pro více detailů
```

### Krok 4: Refaktorovat `FeedbackTagCorrelation`
```text
- Použít responsive layout: karty na mobilu, tabulka na desktopu
- Přepnout na MetricMiniBar místo textových hodnot
- Přidat truncate a max-w na tag names
```

### Krok 5: Přidat do `TrainingStatsSection`
```text
- Import FeedbackTagCorrelation
- Přidat pod GlobalTagDistributionCard
- Předat days prop z periodRange
```

---

## Výsledek po úpravách

| Oblast | Před | Po |
|--------|------|-----|
| Zobrazení metrik | Pouze text "3.4" | Mini progress bar + text |
| Mobilní layout | Horizontální tabulka | Vertikální karty |
| Přetékání textu | Možné u dlouhých tagů | `truncate` + `max-w` |
| Počet viditelných metrik | 3 (na screenshotu) | 4 (Svalovka, Energie, Bolest, Pocit) |
| Integrace do Stats | Chybí | Nová sekce v Tréninky tab |

---

## Vizuální návrh finální karty

```text
┌─────────────────────────────────────────────────────────────┐
│ 🏷️ Feedback podle tagů                          21 tagů    │
├─────────────────────────────────────────────────────────────┤
│ [Typ tréninku ✓ 5] [Partie 14] [Intenzita]                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Max síla ───────────────────────────────── 30× ────┐    │
│  │ Svalovka  ████░░░░░░ 3.4   Energie ████████░░ 7.2   │    │
│  │ Bolest    ██░░░░░░░░ 1.5   Pocit   ███████░░░ 6.8   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─ Hypertrofie ──────────────────────────────  9× ────┐    │
│  │ Svalovka  █████░░░░░ 4.4   Energie ███████░░░ 6.5   │    │
│  │ Bolest    ███░░░░░░░ 2.1   Pocit   ██████░░░░ 5.8   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Prioritizace

**Vysoká priorita:**
1. Přidat `MetricMiniBar` pro vizualizaci hodnot
2. Opravit přetékání textu u tagů
3. Přidat komponentu do Training stats

**Střední priorita:**
4. Responzivní layout (karty/tabulka)
5. Zobrazit všechny 4 metriky

**Nižší priorita:**
6. Tooltips a micro-interakce
7. Collapsible karty

