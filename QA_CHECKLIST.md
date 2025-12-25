# QA Checklist - Pre-release audit

## 1. UI Audit - Responzivita a overflow

### Test zařízení
- [ ] iPhone SE (320px)
- [ ] iPhone 14 (390px)
- [ ] iPad Mini (768px)
- [ ] Desktop (1920px)
- [ ] Landscape mode na mobilu

### Test scénáře pro každou stránku
- [ ] Dlouhé texty (150-300 znaků)
- [ ] Dlouhá slova bez mezer (UUID/token)
- [ ] Prázdná data
- [ ] Hodně dat (50+ položek)
- [ ] Zvětšené písmo (accessibility)

### Kritická pravidla
- [ ] Žádný horizontální scroll celé stránky
- [ ] Všechny texty mají definované chování (truncate/wrap)
- [ ] Modály: max 90vh, vnitřní scroll
- [ ] Tabulky na mobilu: card layout nebo scroll uvnitř

### Utility třídy k použití (viz index.css)
```css
.text-truncate       /* single line truncate */
.text-truncate-2     /* 2 lines max */
.text-truncate-3     /* 3 lines max */
.text-safe           /* break-word pro dlouhé texty */
.text-break-all      /* break-all pro UUID/tokeny */
.overflow-safe       /* overflow-hidden + min-w-0 */
.flex-truncate       /* min-w-0 + truncate pro flex items */
.scroll-x-mobile     /* horizontal scroll jen na mobilu */
.card-content-safe   /* container pro bezpečný obsah */
```

---

## 2. Funkční audit - Tlačítka a akce

### Pro každou stránku
- [ ] Všechny primární CTA fungují
- [ ] Sekundární akce fungují
- [ ] Create/Edit/Delete funguje
- [ ] Navigace tam a zpět funguje
- [ ] Reload stránky zachová stav
- [ ] Toast notifikace se zobrazují správně

### Error handling
- [ ] Validační chyby se zobrazují
- [ ] Network chyby se zobrazují
- [ ] Loading stavy jsou viditelné
- [ ] Disabled stavy na tlačítkách během operací

---

## 3. Data audit - Grafy a počty

### Pro každý graf ověřit
- [ ] Součet hodnot sedí s detailním pohledem
- [ ] Správné filtry (od-do, klient, status)
- [ ] Správné agregace (den/týden/měsíc)
- [ ] Žádné dvojí započítání
- [ ] Null/empty hodnoty nepočítány jako 0

### Typické kontroly
- [ ] Timezone posuny - den se neposune
- [ ] "Posledních 7 dní" vs "týden od pondělí"
- [ ] Počet záznamů vs počet unikátních klientů
- [ ] Completed vs scheduled vs canceled filtry

### Klíčové grafy k auditování
| Graf | Zdroj dat | Výpočet |
|------|-----------|---------|
| MonthlyProgressCard | training_sessions (completed), credit_transactions (>0) | Měsíční agregace |
| RevenueBreakdownCard | credit_transactions (>0) | Podle payment_method |
| ClientRetentionCard | training_sessions (completed), clients (!archived) | 14/30 dní pravidlo |
| TopPayingClientsCard | credit_transactions (debit) | Per-client suma |

---

## 4. Duplicity check

### Hooky - jednoznačné zodpovědnosti
- `useAnnualStats` - roční souhrny, PRs, top cviky
- `useBusinessAnalytics` - retence, churn, predikce
- `useFinancialStats` - příjmy, produkty, profit
- `useDashboardStats` - základní countery
- `useDashboardViewModel` - unified dashboard view

### Komponenty - žádné duplicity
- Každá stránka má jeden primární flow
- Sdílené komponenty v `/components/ui`

---

## 5. Bezpečnostní kontroly

- [ ] RLS policies na všech tabulkách
- [ ] No direct supabase calls without user check
- [ ] Sensitive data not exposed in console
- [ ] Proper auth redirects

---

## Auditní shrnutí - Naposledy provedeno: 2024-12-25

### Nalezené a opravené problémy
1. **EditClientDialog** - useState() místo useEffect() pro inicializaci polí (OPRAVENO)

### Stav aplikace
- ✅ UI - overflow handling implementován (114+ souborů s min-w-0, 29 míst s overflow-x-auto)
- ✅ Funkce - tlačítka mají správný disabled handling (1241 matches)
- ✅ Duplicity - hooky mají jednoznačné zodpovědnosti
- ✅ Grafy - správná logika výpočtu s infoDescription/infoCalculation
