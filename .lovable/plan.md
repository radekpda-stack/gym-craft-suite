
# Audit statistik: Nalezené chyby a chybějící data

Po důkladné analýze hooků, komponent a databázových logů jsem identifikoval tyto problémy a chybějící funkce.

---

## CHYBY K OPRAVĚ

### 1. KRITICKÁ: `payment_amount` chyba stále v DB logech
Ačkoliv kód v `usePrefetchTrainingDetail.ts` byl opraven, databázové logy ukazují, že chyba `column training_participants.payment_amount does not exist` se stále opakuje (10+ výskytů v posledních logech). Je třeba prohledat VŠECHNY soubory, které dotazují `training_participants`, a ověřit, že žádný jiný hook/komponenta nemá starý SELECT.

**Soubory k prověření:** Všechny hooky pracující s `training_participants`.

---

### 2. BUG: `useAnnualStats` používá `.single()` bez ochrany (řádek 111)
Při režimu `'all'` se dotazuje na nejstarší trénink pomocí `.single()`. Pokud trenér nemá žádné tréninky, dotaz selže místo graceful fallbacku.

**Oprava:** Nahradit `.single()` za `.maybeSingle()`.

---

### 3. BUG: `useAnnualStats` -- `training_participants` JOIN nevrací data
Na řádku 307-311 se dotazuje `training_participants` s JOIN na `training_sessions!inner`, ale výsledek se filtruje jako `p.training_session_id === t.id` (řádek 323), přičemž pole `training_session_id` NENÍ v SELECT dotazu. Tím pádem `trainingParticipants` je vždy prázdný array a multi-participant tréninky se nikdy nezapočítají správně do `clientTrainingCounts` a `clientSpent`.

**Dopad:** Statistiky "Top klienti podle tréninků" a "Top klienti podle útraty" jsou CHYBNÉ pro skupinové tréninky -- nezapočítávají se účastníci, pouze `client_id` ze session.

**Oprava:** Přidat `training_session_id` do SELECT nebo použít správný přístup k JOIN datům.

---

### 4. BUG: `useCardioStatsNew` -- dvojité počítání kardio dat
Hook sbírá data z `cardio_entries` A `exercise_entries` s kardio metrikami. Pokud je stejná aktivita zaznamenána v obou tabulkách (což je možné), dojde k duplicitnímu započítání vzdálenosti, času a tepové frekvence.

**Oprava:** Přidat deduplikaci nebo jasné oddělení zdrojů dat.

---

### 5. BUG: `useFinancialStats` -- `totalCredit` nesprávný výpočet
Na řádku 98-100 se `totalCredit` počítá jako `payments - |trainings| - |products|`. Toto není credit balance, ale přibližný odhad, který nebere v úvahu refundy, manuální transakce a skupinové rozpočty. Pro souhrnnou statistiku by měl výpočet zahrnovat VŠECHNY typy transakcí.

---

### 6. BUG: `useCancellationStats` -- hardcoded DEFAULT_TRAINING_PRICE = 800 Kč
Na řádku 123 je výchozí cena za pozdní zrušení 800 Kč, ale od února 2026 platí nový ceník (900 Kč za 1 osobu). Toto by mělo být aktualizováno na 900 Kč.

---

### 7. BUG: `useGlobalTrainingTagStats` -- nepřesný avgPerWeek pro `'all'`
Na řádku 101-102 se pro režim `'all'` předpokládá 365 dní. Ve skutečnosti by se měl vypočítat skutečný počet dní od nejstaršího tréninku.

---

### 8. BUG: `useBusinessAnalytics` -- N+1 dotazů na DB
Hook provádí 6 sekvenčních dotazů v `for` smyčce (řádky 202-220 a 245-278) pro trend příjmů a retenci -- celkem 12 extra DB dotazů. Toto výrazně zpomaluje načítání statistik.

**Oprava:** Načíst data jedním dotazem a seskupit na frontendu.

---

## CHYBĚJÍCÍ STATISTIKY

### 9. Cvičební statistiky: Chybí periodový filtr
`ExerciseStatsSection` nemá `periodRange` prop -- vždy zobrazuje data za celý rok (`useAnnualStats('year')`), zatímco Finance a Tréninky respektují globální periodový selektor.

**Oprava:** Přidat `periodRange` prop a předat jej do hooků.

---

### 10. Finance: `useProfitByPeriod` počítá POUZE produktový zisk
Hook na řádcích 22-27 filtruje jen `type === 'product'`. Profit & Loss graf nezahrnuje příjmy z tréninků ani provozní náklady z `business_expenses`. Výsledný "zisk" je tedy jen marže na produktech, NE celkový zisk trenéra.

**Oprava:** Do výpočtu přidat i tréninkové příjmy a odečíst business_expenses.

---

### 11. Finance: `useIncomeByPeriod` nezahrnuje produktové příjmy
Na řádcích 53-54 je `products: 0` -- produktové příjmy se NIKDY nenaplní, ačkoliv interface `IncomeDataPoint` pole `products` definuje. Grafy tedy ukazují pouze přijaté platby (dobití kreditu), ne skutečné příjmy.

---

### 12. Chybí: Hodinová sazba v čase (trend)
`HourlyRateTrendCard` existuje v komponentách, ale není jasné, zda se zobrazuje v `FinanceStatsSection`. Hodinová sazba (příjem/hodiny) je klíčová metrika pro trenéra OSVČ.

---

### 13. Chybí: Kapacitní vytíženost jako součást statistik
`useCapacityUtilization` existuje, ale v statistikách tréninků chybí vizualizace -- kolik % kapacity trenér využívá (skutečné vs. maximální tréninky).

---

## PLÁN IMPLEMENTACE

### Fáze 1: Kritické opravy (priorita)
1. Prohledat a opravit VŠECHNY výskyty `payment_amount` v celé codebase
2. Opravit `.single()` na `.maybeSingle()` v `useAnnualStats`
3. Opravit chybějící `training_session_id` v `useAnnualStats` participant query
4. Aktualizovat DEFAULT_TRAINING_PRICE na 900 Kč v `useCancellationStats`

### Fáze 2: Datová přesnost
5. Opravit `useGlobalTrainingTagStats` -- správný výpočet dní pro `'all'`
6. Opravit `useIncomeByPeriod` -- doplnit produktové příjmy
7. Opravit `useProfitByPeriod` -- zahrnout tréninkové příjmy a náklady
8. Přidat `periodRange` do `ExerciseStatsSection`

### Fáze 3: Výkonnost
9. Optimalizovat `useBusinessAnalytics` -- eliminovat N+1 dotazy

---

## Technické detaily

| # | Soubor | Typ | Dopad |
|---|--------|-----|-------|
| 1 | Celá codebase | Bug fix | Odstranění DB chyb |
| 2 | `useAnnualStats.ts:111` | Bug fix | Crash prevence |
| 3 | `useAnnualStats.ts:307-337` | Bug fix | Chybné top klienti |
| 4 | `useCancellationStats.ts:123` | Bug fix | Špatná cena |
| 5 | `useGlobalTrainingTagStats.ts:101` | Bug fix | Nepřesný průměr |
| 6 | `useIncomeByPeriod.ts` | Missing data | Chybí produkty v grafu |
| 7 | `useProfitByPeriod.ts` | Missing data | Neúplný P&L |
| 8 | `ExerciseStatsSection.tsx` | Missing feature | Chybí filtr období |
| 9 | `useBusinessAnalytics.ts` | Performance | 12 zbytečných DB dotazů |
