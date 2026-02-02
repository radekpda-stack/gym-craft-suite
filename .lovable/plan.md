
# Plán: Přehlednější finanční karta klienta + textový export

## Problémy k řešení

1. **"Osobní dluh" (-599 Kč)** - zobrazuje se u sdíleného budgetu jako `(skutečný stav: ...)` - odstraníme
2. **Finance jsou v záložce "Tréninky"** - nelogické umístění
3. **Chybí jednoduchý textový export** - trenér potřebuje kopírovatelný výpis
4. **Nedostatečná přehlednost pro audit** - trenér potřebuje snadno zkontrolovat správnost

---

## Změny

### 1. Odstranění "osobního dluhu" z ClientBudgetGroupCard

**Soubor:** `src/components/clients/ClientBudgetGroupCard.tsx`

Odstraním řádky 370-374:
```tsx
// ODSTRANIT:
{isExhausted && actualBalance < 0 && (
  <p className="text-xs text-muted-foreground mt-1">
    (skutečný stav: {actualBalance.toLocaleString('cs-CZ')} Kč)
  </p>
)}
```

---

### 2. Přesunutí financí do samostatné záložky

**Soubor:** `src/components/clients/ClientDetailTabs.tsx`

| Před | Po |
|------|-----|
| Tréninky obsahují finance | Finance mají vlastní záložku |

Nová záložka "Finance" (ikona Wallet) mezi "Tréninky" a "Výkon":
- ClientFinanceLedger přesunut sem
- Záložka "Tréninky" zůstane pouze s periodizací a self-workouts

---

### 3. Přidání textového exportu

**Soubor:** `src/lib/clientLedgerExport.ts`

Nová funkce `exportLedgerToTXT`:
```text
════════════════════════════════════════════════════════
FINANČNÍ PŘEHLED: Jana Nováková
Období: 1.1.2024 - 2.2.2025
════════════════════════════════════════════════════════

SOUHRN
------
Aktuální zůstatek:    7 700 Kč
Celkem dobito:       45 000 Kč
Celkem čerpáno:      37 300 Kč
Počet transakcí:          89

════════════════════════════════════════════════════════
DETAILNÍ VÝPIS
════════════════════════════════════════════════════════

LEDEN 2025
----------
15.01. 10:30  Solo trénink         -800 Kč  →  7 700 Kč
12.01. 14:00  Dobití (hotově)    +5 000 Kč  →  8 500 Kč
08.01. 09:15  Solo trénink         -800 Kč  →  3 500 Kč

PROSINEC 2024
-------------
28.12. 11:00  Duo trénink          -600 Kč  →  4 300 Kč
...

════════════════════════════════════════════════════════
Vygenerováno: 2.2.2025 14:32
════════════════════════════════════════════════════════
```

---

### 4. Vylepšení UI finančního ledgeru

**Soubor:** `src/components/clients/ClientFinanceLedger.tsx`

| Změna | Popis |
|-------|-------|
| Dropdown export | Dva tlačítka: "Excel (XLSX)" a "Text (TXT)" |
| Audit banner | Kontrola: "Vypočtený zůstatek souhlasí s evidencí" nebo varování při nesouladu |
| Filtr období | Možnost vybrat časové období (posledních 30 dní, 3 měsíce, rok, vše) |
| Lepší popisky | "Solo trénink" → "Solo trénink (z kreditu)" |

---

## Vizuální náhled

```text
┌─────────────────────────────────────────────────────────┐
│ 💰 Finanční přehled                    [▼ Export]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ ┌──────────┬──────────┬──────────┬──────────┐          │
│ │ Zůstatek │ Čerpáno  │  Dobito  │  Nákupy  │          │
│ │ 7 700 Kč │ 37 300 Kč│ 45 000 Kč│   12 ks  │          │
│ └──────────┴──────────┴──────────┴──────────┘          │
│                                                         │
│ ✓ Zůstatek souhlasí s evidencí                         │
│                                                         │
│ [Vše] [Tréninky] [Dobití] [Produkty] [Korekce]         │
│ [Období: Vše ▼]                                         │
│                                                         │
│ ─────── LEDEN 2025 ───────                              │
│ 🏋️ 15.1. 10:30  Solo trénink      -800 Kč   → 7 700 Kč │
│ 💳 12.1. 14:00  Dobití           +5 000 Kč   → 8 500 Kč │
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

---

## Soubory k úpravě

| Soubor | Akce |
|--------|------|
| `src/components/clients/ClientBudgetGroupCard.tsx` | Odstranit "osobní dluh" |
| `src/components/clients/ClientDetailTabs.tsx` | Přidat záložku "Finance" |
| `src/components/clients/ClientFinanceLedger.tsx` | Přidat TXT export, audit banner, filtr období |
| `src/lib/clientLedgerExport.ts` | Nová funkce `exportLedgerToTXT` |

---

## Technické detaily

### Funkce exportLedgerToTXT

```typescript
export function exportLedgerToTXT(
  entries: LedgerEntry[],
  clientName: string,
  currentBalance: number,
  stats: { totalTopUp: number; totalSpent: number; productCount: number },
  isGroup: boolean = false
): void {
  // Generuje formátovaný textový soubor
  // Stahuje jako .txt
}
```

### Audit kontrola

```typescript
// V ClientFinanceLedger:
const calculatedBalance = ledgerEntries.reduce((sum, e) => sum + e.amount, 0);
const balanceMatches = Math.abs(calculatedBalance - currentBalance) < 1;
```

Pokud `!balanceMatches`, zobrazí varování:
```
⚠️ Pozor: Vypočtený zůstatek (7 650 Kč) nesouhlasí s evidencí (7 700 Kč)
```
