
# Revize sekce Statistiky - Kompletní audit a úpravy

## Shrnutí aktuálního stavu

Sekce Statistiky obsahuje 4 záložky: **Kariéra**, **Finance**, **Tréninky**, **Klienti**. Po analýze jsem identifikoval následující problémy:

---

## Nalezené problémy

### 1. Duplicitní metriky napříč záložkami

| Metrika | Kariéra | Finance | Tréninky | Klienti |
|---------|---------|---------|----------|---------|
| Celkem tréninků | ✅ (lifetime) | — | ✅ (období) | — |
| Průměr za trénink | ✅ (hodinová sazba) | ✅ (skutečná cena) | — | — |
| Retence klientů | ✅ (v Insights) | — | — | ✅ (KPI + detaily) |
| Aktivní klienti | ✅ (30d) | — | — | ✅ (30d) |

**Problém**: Stejné metriky se zobrazují na více místech s různým kontextem, což může uživatele zmást.

### 2. Nerelevantní nebo nefunkční komponenty

| Komponenta | Problém |
|------------|---------|
| `FinanceModeToggle` (performed/received) | V kódu existuje, ale v `FinanceStatsSection` je natvrdo nastaveno `mode="received"` - toggle není zobrazen |
| `LifetimeFinanceStatsCard` | Zobrazuje se v záložce Finance, ale data jsou lifetime (ignoruje vybrané období) |
| `GlobalTagDistributionCard` | Zobrazuje tagy tréninků, ale ne všechny tréninky mají tagy - karta je často prázdná |
| `ClientAnalyticsCard` v sekci Klienti | Duplikuje logiku `ChurnRiskCard` (obě zobrazují "V ohrožení" klienty) |

### 3. Metriky bez kontextu porovnání

Dle paměťového záznamu `analytics-philosophy-comparative-non-evaluative` by každá metrika měla odpovídat na otázku "ve srovnání s čím?". Následující karty toto nesplňují:
- `ClientTenureCard` - délka spolupráce bez trendu
- `ClientAgeCard` - věk klientů bez kontextu (není jasné, k čemu je to užitečné)
- `TrainingDurationCard` - délka tréninků bez srovnání s cílem nebo trendem

### 4. Chybějící důležité metriky

| Chybí | Umístění | Popis |
|-------|----------|-------|
| Trend tréninků vs minulý měsíc | Tréninky | Graf nebo KPI ukazující, zda trénuji více/méně |
| Oblíbené hodiny/dny | Tréninky | Data existují v heatmapě, ale chybí sumarizace |
| Ziskovost jednotlivých klientů | Klienti | LTV existuje, ale chybí poměr cena/čas |
| Produktová analýza | Finance | Pouze základní příjem z produktů, chybí top produkty a trendy |

---

## Navrhované změny

### Fáze 1: Odstranění duplicit a nekonzistencí

**Záložka Kariéra** - ponechat pouze lifetime metriky:
- Odebrat `InsightsBlock` s retencí (ta patří do Klientů)
- Ponechat: Celkem tréninků, Celkem hodin, Unikátních klientů, Hodinová sazba
- Odebrat: Aktivní klienti (30d) a Vytíženost kapacity - ty patří na dashboard, ne do kariérních statistik

**Záložka Finance**:
- Odebrat `LifetimeFinanceStatsCard` - duplikuje data z Kariéry
- Přesunout `mode` toggle do UI, aby uživatel mohl přepínat mezi "Odtrénováno" a "Přijaté"
- Zjednodušit `FinanceHeroKPI` - ponechat pouze 4 KPI bez duplicitního "Průměr za trénink"

**Záložka Klienti**:
- Odebrat `ClientAnalyticsCard` - duplikuje `ChurnRiskCard`
- Přesunout `ClientAgeCard` do modalního okna (není hlavní metrika)

### Fáze 2: Zlepšení relevance dat

**Záložka Tréninky**:
- Přidat sumarizaci z heatmapy: "Nejčastější den: Pondělí (23%)", "Nejčastější hodina: 17:00"
- Přidat trend vs minulé období do `TrainingHeroKPI`
- Zkontrolovat, zda `GlobalTagDistributionCard` zobrazuje prázdnou kartu pokud nejsou tagy - přidat fallback

**Záložka Finance**:
- Přidat `TopProductsCard` se seznamem nejprodávanějších produktů
- Zobrazit margin (příjem - náklady) pokud jsou náklady sledovány

### Fáze 3: Přidání kontextu porovnání

Upravit komponenty, aby splňovaly princip "ve srovnání s čím":
- `ClientTenureCard`: přidat trend (průměrná délka se zvyšuje/snižuje)
- `TrainingDurationCard`: přidat srovnání s cílovou délkou nebo průměrem za období
- Všechny KPI: pokud je vybráno období, zobrazit srovnání s předchozím obdobím

---

## Technické kroky implementace

### Krok 1: Úprava CareerStatsSection.tsx
```text
- Odebrat KPICard "Aktivní klienti (30d)" (řádek 239-245)
- Odebrat KPICard "Vytíženost kapacity" (řádek 246-252)
- Odebrat InsightsBlock s retencí (přesunout do Klientů)
- Přidat nový KPI: "Průměrný příjem/měsíc" (relevantní pro kariéru)
```

### Krok 2: Úprava FinanceStatsSection.tsx
```text
- Odebrat <LifetimeFinanceStatsCard /> (řádek 146)
- Přidat FinanceModeToggle do UI (vrátit toggle zpět)
- Přidat TopProductsCard pod FinanceChartsSection
```

### Krok 3: Úprava ClientStatsSection.tsx
```text
- Odebrat <ClientAnalyticsCard /> (řádek 91) - duplikuje ChurnRiskCard
- Přesunout ClientAgeCard do modalu přístupného z ClientHeroKPI
- Zjednodušit grid na 3 karty místo 4
```

### Krok 4: Úprava TrainingStatsSection.tsx
```text
- Přidat trend vs minulé období do TrainingHeroKPI
- Přidat sumarizační řádek nad InteractiveHeatmapCard
- Opravit GlobalTagDistributionCard - zobrazit fallback pokud žádné tagy
```

### Krok 5: Validace dat v hooks
```text
- Ověřit useAnnualStats respektuje vybrané období konzistentně
- Sjednotit výpočet retence (useBusinessAnalytics vs useAnnualStats)
- Přidat null checks pro prázdná data
```

---

## Výsledek po úpravách

| Záložka | Před | Po |
|---------|------|-----|
| Kariéra | 6 KPI + Insights + Typy | 4 KPI (lifetime) + Typy |
| Finance | Hero KPI + Grafy + 4 karty + Lifetime | Hero KPI + Mode toggle + Grafy + 3 karty |
| Tréninky | Hero KPI + 2 grafy + Heatmapa + Tagy | Hero KPI s trendem + 2 grafy + Heatmapa se sumarizací |
| Klienti | Hero KPI + LTV + 2 retence karty + Analytika + 4 malé | Hero KPI + LTV + 2 retence karty + 3 malé |

---

## Bezpečnostní pravidla

1. Nemazat hooky - pouze upravit komponenty
2. Zachovat všechny modální okna a jejich funkcionalitu
3. Testovat s prázdnými daty - každá karta musí mít fallback stav
4. Respektovat filozofii "analytics-philosophy-comparative-non-evaluative" - žádné hodnotící barvy/texty
