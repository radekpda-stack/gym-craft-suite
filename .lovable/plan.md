

# Vylepšení finančního reportu v Nastavení

## Nalezené problémy s daty

1. **Celkové příjmy nezahrnují příjmy z produktů v měsíčním přehledu** -- měsíční tabulka počítá příjmy pouze z `payment + manual` transakcí, prodeje produktů chybí
2. **Rozdíl "odtrénováno vs zaplaceno" je špatně počítán** -- porovnává hodnotu tréninků s CELKOVOU sumou plateb (včetně manuálních dobití), místo jen s platbami za tréninky
3. **"Přímé platby (kredit)" v sekci Úhrady** -- zobrazuje součet VŠECH payment+manual transakcí, ne pouze přímé kreditové platby
4. **Chybí provozní náklady** -- business_expenses tabulka existuje ale report ji ignoruje, takže chybí čistý zisk
5. **Chybí rozpad podle platební metody** -- hotovost / karta / převod / kredit
6. **Týdenní přehled neobsahuje příjmy** -- jen počty tréninků

## Plánované změny

### 1. Oprava dat v `useFinancialReportData.ts`
- Měsíční přehled: přidat příjmy z prodejů produktů do měsíčních sum
- Opravit `trainedNotPaidDiff`: porovnávat s `trainingPayments` místo `paymentIncome`
- Opravit `paymentsSummary.directPayments`: odečíst training payments od celkových plateb
- Přidat týdenní příjmy do `WeeklyReportData`
- Přidat rozpad podle platebních metod (cash/card/transfer/credit)

### 2. Přidat provozní náklady a čistý zisk
- Načíst data z tabulky `business_expenses`
- Přidat do summary: `totalExpenses`, `netProfit`
- Zobrazit v PDF v sekci Souhrn období

### 3. Rozšířit náhled dat v nastavení (`FinancialReportSettings.tsx`)
- Přidat: provozní náklady, čistý zisk, rozpad platebních metod, hodinovou sazbu
- Vizuálně vylepšit náhled -- přehlednější grid s barvami

### 4. Aktualizovat PDF generátor (`financialReportPdf.ts`)
- Opravit sekci Úhrady -- správné hodnoty
- Přidat řádek s provozními náklady a čistým ziskem do Souhrnu
- Přidat rozpad platebních metod do měsíčního přehledu nebo vlastní sekce
- Přidat příjmy do týdenního přehledu

## Technické detaily

### Nové datové struktury v `useFinancialReportData.ts`
```typescript
// Rozpad platebních metod
interface PaymentMethodBreakdown {
  cash: number;
  card: number;
  bank_transfer: number;
  credit: number;
}

// Rozšířené summary
summary: {
  ...existing,
  totalExpenses: number;
  netProfit: number;
  paymentMethodBreakdown: PaymentMethodBreakdown;
}

// Rozšířené WeeklyReportData
interface WeeklyReportData {
  ...existing,
  income: number;
}
```

### Nový dotaz na business_expenses
```typescript
supabase
  .from('business_expenses')
  .select('amount, category, date')
  .gte('date', startStr)
  .lte('date', endStr)
```

### Oprava paymentsSummary
```typescript
paymentsSummary: {
  totalPayments: paymentIncome + productIncome,
  trainingPayments: paidTrainingValue,
  directPayments: paymentIncome - paidTrainingValue, // OPRAVA
  productPayments: productIncome,
  paymentTransactionCount: transactions.length,
}
```

### Oprava validation
```typescript
validation: {
  ...existing,
  trainedNotPaidDiff: trainedTotal - paidTrainingValue, // OPRAVA: porovnat s training payments
}
```

### Soubory k úpravě
- `src/hooks/useFinancialReportData.ts` -- opravy dat, nové dotazy, rozšíření typů
- `src/components/settings/FinancialReportSettings.tsx` -- rozšířený náhled
- `src/lib/financialReportPdf.ts` -- aktualizace PDF výstupu
- `src/hooks/useFinancialReportSettings.ts` -- nová sekce v nastavení pro platební metody

