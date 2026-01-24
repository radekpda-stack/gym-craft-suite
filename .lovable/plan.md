

# Revize sekce Feedbacky - Audit UI a návrh vylepšení

## Aktuální stav modulu

Feedback modul (`/feedback-overview`) obsahuje 4 hlavní záložky:
- **K odeslání** - Tréninky čekající na odeslání feedbacku
- **Statistiky** - Trendy a metriky (míra odpovědí, bolesti, energie atd.)
- **Historie** - Seznam všech feedbacků s filtry
- **Nastavení** - Konfigurace dotazníku a thresholdů

### Aktuální analytické komponenty

| Komponenta | Funkce | Typ dat |
|------------|--------|---------|
| `FeedbackStatusCards` | 5 KPI karet (K odeslání, Čekající, Vyplněno, Expirováno, Red Flags) | Absolutní počty |
| `FeedbackTrendsOverview` | Míra odpovědí, průměry metrik, grafy v čase | Agregovaná data bez kontextu tréninku |
| `FeedbackAttentionInbox` | Prioritní inbox red flagů a čekajících | Akční seznam |
| `FeedbackActivityTimeline` | Poslední aktivita | Chronologický přehled |

---

## Nalezené problémy

### 1. Chybí korelace tréninku s feedbackem

Aktuálně existuje pouze `RecoveryInsightsCard` v detailu klienta, který ukazuje spánek vs. energie. **Chybí**:
- Zobrazení obsahu tréninku (cviky, objem, trvání) vedle feedbackových metrik
- Graf "Objem vs. Svalovka" nebo "RPE z tréninku vs. Pocit těla D+1"
- Identifikace, které typy tréninků vedou k lepšímu/horšímu feedbacku

### 2. Chybí historické porovnání období

`FeedbackTrendsOverview` ukazuje pouze trend za jedno období. **Chybí**:
- Možnost porovnat 2 období (např. Leden vs. Prosinec)
- Porovnání klienta s průměrem všech klientů (trenérský baseline)
- Vizualizace "Tento měsíc vs. Minulý měsíc"

### 3. Nevyužitá data z feedbacku

Data se sbírají, ale nevyužívají pro:
- Doporučení úprav programu (např. "Vysoká svalovka po silových = snížit objem")
- Identifikaci vzorců (např. "Po tréninku nohou vždy nízká energie")
- Korelaci s tagy tréninků (fokus, část těla, intenzita)

### 4. Záložka Statistiky - chybí kontext

`FeedbackTrendsOverview` zobrazuje:
- Míra odpovědí, průměrné metriky, grafy
- **Ale bez porovnání** - není jasné, jestli 6.5/10 je dobré nebo špatné

### 5. UI neoptimální pro rychlé rozhodování

- Status karty nahoře jsou velké (zabírají výšku)
- Attention inbox je v bočním panelu, ale trenér ho potřebuje vidět jako první
- Chybí "Dashboard summary" - rychlý přehled bez scrollování

---

## Navrhované změny

### Fáze 1: Korelace tréninku s feedbackem

**Nová komponenta `TrainingFeedbackCorrelationCard`:**

```text
┌─────────────────────────────────────────────────────────────┐
│ 📊 Trénink → Reakce                                          │
├─────────────────────────────────────────────────────────────┤
│ [Scatter plot: X = Objem tréninku, Y = Svalovka D+1]         │
│                                                              │
│ Poznámky:                                                    │
│ • Po silovém tréninku nohou: Ø svalovka 7.2/10              │
│ • Po kardio: Ø svalovka 3.1/10                              │
│ • Korelace objemu a svalovky: 0.72 (silná)                  │
└─────────────────────────────────────────────────────────────┘
```

**Nový hook `useTrainingFeedbackCorrelation`:**
- Propojí `exercise_entries` s `training_feedback` přes `training_session_id`
- Vypočítá korelaci mezi objemem/RPE a feedbackovými metrikami
- Agreguje podle tagů tréninku (fokus, část těla)

### Fáze 2: Historické porovnání období

**Rozšíření `FeedbackTrendsOverview` o comparison mode:**

```text
┌─────────────────────────────────────────────────────────────┐
│ 📈 Porovnání období                                          │
│ [Toto období: Leden 2026 ▾] vs [Minulé období: Prosinec ▾]   │
├─────────────────────────────────────────────────────────────┤
│ Metrika          │ Leden  │ Prosinec │ Změna                │
│ ─────────────────┼────────┼──────────┼─────────────────     │
│ Pocit těla       │ 7.2    │ 6.8      │ +0.4 ↑               │
│ Svalovka         │ 5.1    │ 6.3      │ -1.2 ↓ (lepší)       │
│ Bolest           │ 2.8    │ 3.5      │ -0.7 ↓               │
│ Energie          │ 6.9    │ 6.4      │ +0.5 ↑               │
│ Red Flags        │ 2      │ 5        │ -3 ↓                 │
└─────────────────────────────────────────────────────────────┘
```

### Fáze 3: Porovnání klient vs. trenérský průměr

**Nová komponenta `ClientVsBaselineCard`:**

```text
┌─────────────────────────────────────────────────────────────┐
│ 👤 Jan Novák vs. Průměr všech klientů                        │
├─────────────────────────────────────────────────────────────┤
│ [Bar chart - dvojité pruhy: klient | průměr]                │
│                                                              │
│ Pocit těla:  ████████░░ 7.8  vs  ████████░░ 7.2 (+0.6)       │
│ Svalovka:    █████░░░░░ 4.9  vs  ██████░░░░ 5.8 (-0.9)       │
│ Energie:     ███████░░░ 6.5  vs  ███████░░░ 6.7 (-0.2)       │
└─────────────────────────────────────────────────────────────┘
```

### Fáze 4: Vzory a korelace podle tagů

**Nová komponenta `FeedbackTagCorrelation`:**

```text
┌─────────────────────────────────────────────────────────────┐
│ 🏷️ Feedback podle typu tréninku                             │
├─────────────────────────────────────────────────────────────┤
│ Tag             │ Počet │ Ø Svalovka │ Ø Energie │ Ø Bolest │
│ ────────────────┼───────┼────────────┼───────────┼──────────│
│ Silový          │ 23    │ 6.8        │ 5.9       │ 2.1      │
│ Kardio          │ 15    │ 3.2        │ 7.2       │ 1.5      │
│ Nohy            │ 12    │ 7.5        │ 5.4       │ 2.8      │
│ Horní tělo      │ 11    │ 5.2        │ 6.8       │ 1.9      │
│ Vysoká intenzita│ 8     │ 7.1        │ 5.1       │ 3.2      │
└─────────────────────────────────────────────────────────────┘
```

### Fáze 5: Redesign záložky Statistiky

**Nový layout:**

```text
┌─────────────────────────────────────────────────────────────┐
│ [Období: 30 dní ▾] [Klient: Všichni ▾] [Porovnat s ▾]       │
├─────────────────────────────────────────────────────────────┤
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐    │
│ │ Míra odpovědí  │ │ Ø Pocit těla   │ │ Red Flags      │    │
│ │     76%        │ │     7.2/10     │ │     3          │    │
│ │ ↑ vs min. měsíc│ │ +0.4 vs min.   │ │ -2 vs min.     │    │
│ └────────────────┘ └────────────────┘ └────────────────┘    │
├─────────────────────────────────────────────────────────────┤
│ [Trendy] [Korelace] [Podle tagů]                             │
│                                                              │
│ ┌─ Trendy ──────────────────────────────────────────────┐   │
│ │ [Chart: Vývoj metrik v čase s comparison overlay]     │   │
│ └───────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Fáze 6: Praktické využití dat (Coach Insights)

**Rozšíření `FeedbackAttentionInbox` o akční doporučení:**

Aktuálně `src/lib/coachSuggestions.ts` obsahuje logiku pro generování doporučení. Integrace do přehledu:

```text
┌─────────────────────────────────────────────────────────────┐
│ 💡 Postřehy z feedbacku                                      │
├─────────────────────────────────────────────────────────────┤
│ • Jan Novák: Opakovaná bolest ramene (3× za 14 dní)         │
│   → Zvážit úpravu tlakových cviků                           │
│                                                              │
│ • Petra K.: Klesající energie posledních 5 tréninků         │
│   → Možná přetrénování, zkontrolovat spánek                 │
│                                                              │
│ • Celkově: Po silových trénincích nohou vysoká svalovka     │
│   → 45% klientů hlásí 7+/10                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Technické kroky implementace

### Krok 1: Nový hook `useTrainingFeedbackCorrelation`
```text
- Propojit training_feedback s exercise_entries přes training_session_id
- Vypočítat objem tréninku (sets × reps × weight)
- Korelovat s feedback metrikami (soreness, body_feel, energy)
- Agregovat podle training_type z training_sessions
```

### Krok 2: Komponenta `TrainingFeedbackCorrelationCard`
```text
- Scatter chart: X = objem, Y = svalovka (recharts)
- Tabulka: agregace podle typu tréninku
- Neutrální prezentace (bez hodnocení)
```

### Krok 3: Rozšíření `FeedbackTrendsOverview`
```text
- Přidat comparison mode toggle
- Přidat period selector pro 2 období
- Vypočítat rozdíly a zobrazit neutrálně (bez barev zelená/červená)
```

### Krok 4: Komponenta `FeedbackTagCorrelation`
```text
- Načíst tagy z training_sessions
- Agregovat feedback metriky podle tagů
- Zobrazit jako tabulku s fakty
```

### Krok 5: Hook pro trenérský baseline
```text
- useTrainerFeedbackBaseline: Ø metriky ze všech klientů
- Slouží jako referenční vrstva pro porovnání
```

### Krok 6: Integrace coach suggestions
```text
- Rozšířit FeedbackAttentionInbox o sekci "Postřehy"
- Využít existující coachSuggestions.ts logiku
- Zobrazit top 3-5 postřehů
```

---

## Výsledek po úpravách

| Oblast | Před | Po |
|--------|------|-----|
| Korelace trénink-feedback | Žádná | Scatter chart + tabulka |
| Porovnání období | Chybí | Period vs Period view |
| Porovnání klient vs baseline | Chybí | Client vs Trainer Average |
| Agregace podle tagů | Chybí | Tag correlation table |
| Využití dat | Pouze red flags | Coach insights + patterns |
| KPI trendy | Absolutní hodnoty | Relativní změny vs minulé období |

---

## Prioritizace

**Vysoká priorita (největší hodnota):**
1. Korelace tréninku s feedbackem (nový hook + komponenta)
2. Porovnání období (rozšíření FeedbackTrendsOverview)

**Střední priorita:**
3. Agregace podle tagů tréninku
4. Client vs Baseline porovnání

**Nižší priorita:**
5. Coach insights integrace
6. UI redesign statistik (kompaktnější layout)

---

## Datové zdroje pro implementaci

**Již dostupné:**
- `training_feedback` - všechny feedback metriky
- `exercise_entries` - cviky, objem, váhy, RPE
- `training_sessions` - datum, trvání, tagy (focus, body_part, intensity)
- `feedback_requests` - propojení feedback → trénink

**Nové kalkulace:**
- Session volume = Σ(sets × reps × weight) pro všechny cviky v tréninku
- Tag correlation = Ø feedback metrika grouped by training tag
- Period comparison = Current period metrics - Previous period metrics

