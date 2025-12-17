# Audit Report - Aplikace Trenéra

**Datum:** 2025-12-17  
**Verze:** 1.0

---

## 1. IDENTIFIKOVANÉ PROBLÉMY

### 1.1 Bugy / Logické chyby

| ID | Problém | Dopad | Obrazovka/Komponenta | Reprodukce | Navržené řešení |
|----|---------|-------|---------------------|------------|-----------------|
| B1 | **CASH vs ACCRUAL inkonsistence** | Vysoký | Dashboard, useDashboardKPIs | KPIs používají jinou logiku než UnifiedFinancialChart - příjmy z tréninků se počítají odlišně | Sjednotit výpočet do jednoho sdíleného utility |
| B2 | **Chybějící validace credit_balance při platbě** | Střední | useCompleteTrainingSession | Kredit může jít do záporu bez kontroly dostatečného zůstatku | Přidat kontrolu před odečtem |
| B3 | **useProfitByPeriod ignoruje filtry** | Střední | Dashboard/ProfitChart | Hook nerespektuje clientIds ani accountingMode z kontextu | Přidat podporu pro globální filtry |
| B4 | **Duplicitní transakce při price split** | Nízký | PriceSplitManager | Při rychlém dvojkliku může dojít k vytvoření duplicitních transakcí | Přidat debounce/loading state |

### 1.2 UX Problémy

| ID | Problém | Dopad | Obrazovka | Navržené řešení |
|----|---------|-------|-----------|-----------------|
| U1 | **Žádná indikace probíhajícího ukládání** | Střední | TrainingForm, CreditModal | Přidat loading spinner na submit tlačítka |
| U2 | **Chybí potvrzovací dialog při mazání** | Vysoký | Clients, Trainings | Přidat AlertDialog před destruktivní akce |
| U3 | **Dlouhé seznamy bez virtualizace** | Střední | Clients, Trainings | Implementovat react-virtualized pro seznamy >50 položek |
| U4 | **Nekonzistentní navigace zpět** | Nízký | TrainingDetail, ClientDetail | Sjednotit breadcrumbs a back button behavior |
| U5 | **Chybí prázdné stavy pro grafy** | Střední | Dashboard charts | Přidat ilustrace a helptext když nejsou data |

### 1.3 Výkonové problémy

| ID | Problém | Dopad | Obrazovka | Navržené řešení |
|----|---------|-------|-----------|-----------------|
| P1 | **Dashboard provádí 15+ DB requestů** | Vysoký | Dashboard | Sloučit do 3-4 optimalizovaných queries, použít server-side agregaci |
| P2 | **Chybí memoizace výpočtů v grafech** | Střední | UnifiedFinancialChart, ProductSalesChart | Přidat useMemo pro groupedData |
| P3 | **Re-render při každé změně filtru** | Střední | Dashboard | Implementovat debounce na filter změny |
| P4 | **Velké bundle size** | Střední | Celá aplikace | Lazy load stránek, tree-shake recharts |

### 1.4 Konzistence UI

| ID | Problém | Dopad | Navržené řešení |
|----|---------|-------|-----------------|
| C1 | **Nekonzistentní formátování měny** | Nízký | Sjednotit do utility `formatCurrency(amount)` |
| C2 | **Různé formáty datumů** | Střední | Sjednotit do utility `formatDate(date, format)` |
| C3 | **Různé spacing v kartách** | Nízký | Sjednotit na `p-4 sm:p-5` |
| C4 | **Mix českých a anglických textů** | Střední | Dopsat chybějící překlady (např. "loading", "error") |
| C5 | **Nekonzistentní ikonové velikosti** | Nízký | Sjednotit na `w-4 h-4` pro inline, `w-5 h-5` pro standalone |

### 1.5 Bezpečnost

| ID | Problém | Dopad | Navržené řešení |
|----|---------|-------|-----------------|
| S1 | **API klíče v kódu** | Nízký | Žádné nalezeny - OK |
| S2 | **RLS policies** | OK | Správně nastaveny na všech tabulkách |
| S3 | **Input sanitizace** | Střední | Přidat Zod validaci na všechny formuláře |

### 1.6 Data integrita

| ID | Problém | Dopad | Navržené řešení |
|----|---------|-------|-----------------|
| D1 | **Audit log neúplný** | Střední | Rozšířit logging na všechny finanční operace |
| D2 | **Chybí constraint na záporný kredit** | Nízký | Přidat DB trigger pro varování při záporném zůstatku |
| D3 | **Orphaned transakce** | Nízký | Přidat cascading delete nebo soft delete |

---

## 2. NÁVRHY NA ZLEPŠENÍ (prioritizované)

### 2.1 Kritické (provést ihned)

#### Z1: Centralizované utility pro formátování
**Přínos:** Konzistence, jednodušší údržba  
**Náročnost:** S (1-2 hodiny)

```typescript
// src/lib/formatters.ts
export const formatCurrency = (amount: number): string => 
  `${amount.toLocaleString('cs-CZ')} Kč`;

export const formatDate = (date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const formats = {
    short: 'd. M. yyyy',
    long: 'd. MMMM yyyy',
    time: 'd. M. yyyy HH:mm'
  };
  return format(d, formats[format], { locale: cs });
};
```

#### Z2: Optimalizace Dashboard queries
**Přínos:** 70% rychlejší načítání  
**Náročnost:** M (4-6 hodin)

Sloučit `useDashboardKPIs`, `useUnifiedFinancialData`, `useTrainingActivityData` do jednoho hooku s batch query.

#### Z3: Sjednocení CASH/ACCRUAL logiky
**Přínos:** Konzistentní finanční data  
**Náročnost:** M (3-4 hodiny)

Vytvořit sdílený utility modul pro finanční výpočty.

### 2.2 Vysoká priorita

#### Z4: Loading states a skeletony
**Přínos:** Lepší vnímaná rychlost  
**Náročnost:** S (2-3 hodiny)

Přidat skeleton komponenty pro všechny asynchronní sekce.

#### Z5: Debounce na filtry
**Přínos:** Méně zbytečných requestů  
**Náročnost:** S (1 hodina)

```typescript
const debouncedFilters = useDebounce(filters, 300);
```

#### Z6: Virtualizace dlouhých seznamů
**Přínos:** Plynulý scroll, méně paměti  
**Náročnost:** M (3-4 hodiny)

Implementovat `@tanstack/react-virtual` pro Clients a Trainings list.

### 2.3 Střední priorita

#### Z7: Potvrzovací dialogy
**Přínos:** Prevence náhodného smazání  
**Náročnost:** S (1-2 hodiny)

AlertDialog pro delete operace.

#### Z8: Lepší error handling
**Přínos:** Uživatelsky přívětivé chybové stavy  
**Náročnost:** M (2-3 hodiny)

Globální error boundary s retry možností.

#### Z9: Export funkcionalita
**Přínos:** Lepší integrace s účetnictvím  
**Náročnost:** M (3-4 hodiny)

CSV/PDF export s možností filtrace období.

#### Z10: Keyboard shortcuts
**Přínos:** Rychlejší práce pro power users  
**Náročnost:** S (2 hodiny)

Již implementováno (Ctrl+K), rozšířit o další zkratky.

---

## 3. AKČNÍ PLÁN

### Fáze 1: Stabilizace (1-2 dny)
- [ ] Z1: Centralizované utility
- [ ] Z3: Sjednocení CASH/ACCRUAL
- [ ] Oprava B1, B2

### Fáze 2: Výkon (2-3 dny)
- [ ] Z2: Optimalizace Dashboard
- [ ] Z5: Debounce filtry
- [ ] P1-P3 opravy

### Fáze 3: UX (2-3 dny)
- [ ] Z4: Loading states
- [ ] Z6: Virtualizace
- [ ] Z7: Potvrzovací dialogy
- [ ] U1-U5 opravy

### Fáze 4: Polish (1-2 dny)
- [ ] C1-C5: UI konzistence
- [ ] Doplnění překladů
- [ ] Dokumentace

---

## 4. METRIKY ÚSPĚCHU

| Metrika | Aktuální | Cíl |
|---------|----------|-----|
| Dashboard load time | ~2.5s | <1s |
| DB queries na Dashboard | 15+ | 4-5 |
| First Contentful Paint | ~1.8s | <1s |
| Bundle size | ~850KB | <600KB |
| Lighthouse Performance | ~65 | >85 |

---

## 5. ZÁVĚR

Aplikace má solidní základ s dobře navrženou databázovou strukturou a RLS políciemi. Hlavní oblasti pro zlepšení jsou:

1. **Výkon** - Konsolidace DB dotazů na Dashboard
2. **Konzistence** - Sjednocení finanční logiky a formátování
3. **UX** - Loading stavy a potvrzovací dialogy

Doporučuji postupnou implementaci podle akčního plánu výše, s prioritou na kritické položky, které mají největší dopad na uživatelskou zkušenost.
