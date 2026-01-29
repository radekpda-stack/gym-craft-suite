
# Oprava a vylepšení statistik feedbacků

## Identifikované problémy

### Hlavní problém: Prázdná data v tabulkách

| Komponenta | Problém | Příčina |
|------------|---------|---------|
| **FeedbackPeriodComparison** | Porovnání období ukazuje nuly | Hook počítá `totalSent` podle `sent_at`, ale 74 z 74 completed feedbacků má `sent_at = NULL` |
| **FeedbackTrendsOverview** | Průměrná doba odpovědi = žádná data | Počítá čas mezi `sent_at` a `completed_at`, ale `sent_at` není vyplněno |
| **FeedbackTrendsOverview** | Časté bolesti = žádné | Pole `pain_area` je vyplněno jen u 5 ze 77 feedbacků |

### Kořenová příčina
Většina feedbacků je vytvořena přes **zkopírování odkazu** (ne odesláním e-mailu), takže `sent_at` zůstává `NULL`. Hooky to interpretují jako "neodesláno".

---

## Technické řešení

### 1. Oprava hookü `useFeedbackPeriodComparison`

Změnit logiku počítání `totalSent`:
- Aktuálně: `totalSent = requests.filter(r => r.sent_at).length`
- Nově: `totalSent = requests.length` (všechny požadavky vytvořené v období)

Nebo alternativně použít `created_at` jako fallback pro `sent_at`.

```typescript
// PŘED:
const totalSent = (requests || []).filter(r => r.sent_at).length;

// PO:
// Feedback je "odeslán" pokud:
// 1. má sent_at (e-mail), NEBO
// 2. byl vytvořen (created_at) - odkaz zkopírován
const totalSent = (requests || []).length;
```

### 2. Oprava hooku `useFeedbackAnalytics`

Stejná logika - považovat `created_at` za odeslání.

```typescript
// PŘED:
const totalSent = (requests || []).filter(r => r.sent_at).length;

// PO:
const totalSent = (requests || []).length;
```

### 3. Oprava průměrné doby odpovědi

Použít `created_at` jako fallback pro `sent_at`:

```typescript
// PŘED:
const responseTimes = (requests || [])
  .filter(r => r.sent_at && r.completed_at)
  .map(r => { ... });

// PO:
const responseTimes = (requests || [])
  .filter(r => r.completed_at)
  .map(r => {
    const sentTime = r.sent_at || r.created_at;
    const completed = new Date(r.completed_at!);
    return (completed.getTime() - new Date(sentTime).getTime()) / (1000 * 60 * 60);
  });
```

---

## Nové ukazatele - rozšíření statistik

Na základě analýzy databáze máme dostupná, ale nevyužitá data:

| Pole | Vyplněnost | Popis |
|------|-----------|-------|
| `session_fit` | 75/77 (97%) | Jak klientovi trénink sedí (1-10) |
| `difficulty` | 76/77 (99%) | Vnímaná náročnost (1-10) |
| `sleep_after` | 31/77 (40%) | Kvalita spánku po tréninku |
| `sleep_hours` | 65/77 (84%) | Počet hodin spánku |
| `comment` | 14/77 (18%) | Komentář klienta |

### Nové karty/sekce pro statistiky:

#### A) Karta "Jak sedí tréninky" (Session Fit)

```text
┌─────────────────────────────────────────────────────┐
│ 🎯 JAK SEDÍ TRÉNINKY                               │
│                                                     │
│ Průměr: 6.2/10      Trend: ↗ +0.3                 │
│                                                     │
│ Distribuce:                                         │
│ [████████░░] 8-10: Výborně (35%)                   │
│ [██████░░░░] 5-7:  Dobře (42%)                     │
│ [███░░░░░░░] 1-4:  Nesedí (23%)                    │
│                                                     │
│ Korelace s RPE: 0.42 (střední)                     │
│ → Vyšší RPE = horší session fit                    │
└─────────────────────────────────────────────────────┘
```

#### B) Karta "Spánek a regenerace"

```text
┌─────────────────────────────────────────────────────┐
│ 😴 SPÁNEK A REGENERACE                              │
│                                                     │
│ Průměr hodin: 7.2h          Trend: → stejný        │
│                                                     │
│ Kvalita spánku po tréninku:                        │
│ [██████████] Dobrý: 45%                            │
│ [████████░░] Průměrný: 38%                         │
│ [███░░░░░░░] Špatný: 17%                           │
│                                                     │
│ Korelace spánek × energie další den:               │
│ 0.68 (silná pozitivní)                             │
└─────────────────────────────────────────────────────┘
```

#### C) Karta "Náročnost vs. Pocit"

```text
┌─────────────────────────────────────────────────────┐
│ ⚡ NÁROČNOST VS. POCIT                              │
│                                                     │
│ Ø Difficulty: 5.4/10    Ø Body Feel: 6.1/10        │
│                                                     │
│ Scatter: Difficulty × Body Feel                     │
│ ┌────────────────────────────────────────────────┐ │
│ │     ●                           ●              │ │
│ │   ●   ●  ●                ●                    │ │
│ │ ●      ●    ●  ●  ●   ●                        │ │
│ │              ●  ●       ●     ●                │ │
│ └────────────────────────────────────────────────┘ │
│                                                     │
│ Korelace: -0.31 (slabá negativní)                  │
│ → Vyšší náročnost mírně snižuje pocit těla        │
└─────────────────────────────────────────────────────┘
```

#### D) Rozšíření "Postřehy z feedbacku"

Přidat detekci:
- **Opakovaně nízký session fit** u klienta
- **Nedostatek spánku** (< 6h) před tréninky
- **Vysoká náročnost + nízká zábava** (možná demotivace)

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useFeedbackPeriodComparison.ts` | Opravit počítání `totalSent`, použít `created_at` jako fallback |
| `src/hooks/useFeedbackAnalytics.ts` | Stejná oprava + přidat nové metriky (session_fit, difficulty, sleep) |
| `src/components/feedback/FeedbackTrendsOverview.tsx` | Přidat nové karty pro session fit, spánek, náročnost |
| `src/components/feedback/FeedbackCoachInsights.tsx` | Rozšířit o nové postřehy |

---

## Nové komponenty

| Komponenta | Účel |
|------------|------|
| `SessionFitStatsCard.tsx` | Statistiky jak sedí tréninky |
| `SleepRecoveryStatsCard.tsx` | Statistiky spánku a regenerace |
| `DifficultyVsFeelCard.tsx` | Korelace náročnost × pocit |

---

## Shrnutí

### Opravy:
1. **Response rate** - změnit logiku na `created_at` místo `sent_at`
2. **Průměrná doba odpovědi** - fallback na `created_at`
3. **Časté bolesti** - zobrazovat "Nedostatek dat" explicitně

### Nové ukazatele:
1. **Session Fit** - jak klientům sedí tréninky
2. **Spánek** - kvalita a korelace s energií
3. **Náročnost** - vztah s pocitem těla
4. **Rozšířené postřehy** - více pravidel pro detekci problémů

### Očekávaný výsledek:
- Tabulka "Porovnání období" zobrazí skutečné průměry metrik
- Response rate bude realistický (ne 0%)
- 3 nové karty s využitím session_fit, difficulty, sleep dat
