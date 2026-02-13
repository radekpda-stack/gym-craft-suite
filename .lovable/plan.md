

# Oprava: Naskladneni zbozi se nepripise do nakladu

## Nalezeny problem

Po analyze kodu jsem identifikoval **hlavni pricinu** a doprovodne chyby:

### Hlavni bug: Chybejici invalidace cache `['period-expenses']`

Kdyz trenér naskladni zbozi (pres fakturu nebo rucne), naklad se **zapise do databaze spravne**, ale karta **"Zisk za obdobi" (ProfitLossCard)** se neaktualizuje, protoze pouziva vlastni query key `['period-expenses']`, ktery **neni v seznamu invalidovanych klicu** po vytvoreni nakladu.

Hook `useCreateExpense` invaliduje:
- `['business-expenses']` -- OK
- `['expense-stats']` -- OK (OperatingExpensesCard)
- `['profit-by-period']` -- OK
- `['annual-stats']` -- OK

**Chybi**: `['period-expenses']` -- pouziva ProfitLossCard

Vysledek: trenér naskladni zbozi, vidi toast "Naklad zaznamenan", ale v karte Zisk za obdobi se castka nezmeni. Vypada to, ze se naklad nepripsal.

### Doprovodny bug: Financni graf nezahrnuje business_expenses

Hook `useUnifiedFinancialData` (trend graf na dashboardu) pocita naklady **pouze z `products.purchase_price` per prodejni transakce**, nikoli z tabulky `business_expenses`. To znamena, ze naskladneni zbozi (ktere vytvori zaznam v `business_expenses`) se v grafu nakladu **vubec neobjevi**.

---

## Plan opravy

### 1. Pridat `['period-expenses']` do invalidace v `useBusinessExpenses.ts`

Ve vsech trech mutacich (create, update, delete) pridat:
```
queryClient.invalidateQueries({ queryKey: ['period-expenses'] });
```

**Soubor:** `src/hooks/useBusinessExpenses.ts` (radky 157-160, 196-199, 232-235)

### 2. Zahrnout `business_expenses` do `useUnifiedFinancialData.ts`

Doplnit dotaz na `business_expenses` a pricist jejich castky do sloupce `costs` v kazdem obdobi. Tim se naklady za naskladneni zbozi (a vsechny ostatni provozni naklady) objevi v trendovem grafu.

**Soubor:** `src/hooks/useUnifiedFinancialData.ts`

---

## Technicke detaily

| Soubor | Zmena | Radky |
|--------|-------|-------|
| `useBusinessExpenses.ts` | Pridat invalidaci `['period-expenses']` do create/update/delete | 157-160, 196-199, 232-235 |
| `useUnifiedFinancialData.ts` | Pridat fetch `business_expenses` a zahrnout do costs | oba mody (cash i accrual) |

Oprava je minimalni a cílena -- zadne nove komponenty, zadne zmeny v UI.

