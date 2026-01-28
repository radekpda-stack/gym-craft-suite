
# Plán: Redesign kreditové historie s exportem

## Přehled změn

Navrhujeme kompletní přepracování sekce Finance v kartě klienta, které přinese:
- **Sjednocený timeline přehled** všech finančních událostí (tréninky + produkty + dobití) chronologicky
- **Export do XLSX** s kompletní historií včetně dat a popisů
- **Přehlednější design** s lepší vizuální hierarchií
- **Podpora skupin** - pro sdílené rozpočty zobrazí všechny členy

## Nový design

### Vizuální struktura

```text
┌─────────────────────────────────────────────────────────┐
│  💳 Finanční přehled                        [⬇ Export]  │
├─────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Zůstatek │ │ Čerpáno  │ │ Dobito   │ │ Nákupy   │   │
│  │ 4 800 Kč │ │ 12 400   │ │ 15 000   │ │ 3 ks     │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
├─────────────────────────────────────────────────────────┤
│  [Vše] [Tréninky] [Produkty] [Dobití] [Korekce]         │
│                                                         │
│  ═══════════════════════════════════════════════════    │
│  📅 LEDEN 2026                                          │
│  ───────────────────────────────────────────────────    │
│  │ 28.1. │ 🏋️ Solo trénink      │ −900 Kč  │ 4800 Kč │ │
│  │       │    60 min, kredit                           │ │
│  │ 25.1. │ 🏋️ Duo trénink       │ −550 Kč  │ 5700 Kč │ │
│  │       │    60 min, kredit                           │ │
│  │ 20.1. │ 📦 Whey protein      │ −850 Kč  │ 6250 Kč │ │
│  │       │    1 ks, hotově                             │ │
│  │ 15.1. │ 💳 Dobití kreditu    │ +5000 Kč │ 7100 Kč │ │
│  │       │    převodem                                 │ │
│  ═══════════════════════════════════════════════════    │
│  📅 PROSINEC 2025                                       │
│  ───────────────────────────────────────────────────    │
│  │ 22.12.│ 🏋️ Solo trénink      │ −900 Kč  │ 2100 Kč │ │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

### Export XLSX

Vygeneruje soubor s kompletní historií:

| Datum | Čas | Typ | Popis | Částka | Zůstatek |
|-------|-----|-----|-------|--------|----------|
| 28.1.2026 | 10:00 | Trénink | Solo trénink (60 min) | -900 | 4800 |
| 25.1.2026 | 14:30 | Trénink | Duo trénink s Janem N. | -550 | 5700 |
| 20.1.2026 | 11:15 | Produkt | Whey protein 1kg | -850 | 6250 |
| 15.1.2026 | — | Dobití | Převodem | +5000 | 7100 |

## Technická implementace

### 1. Nová komponenta `ClientFinanceLedger.tsx`

Nahradí stávající oddělené komponenty `ClientCreditHistory` a část `ClientTrainingFinanceCard`. Klíčové vlastnosti:
- **Sloučení dat** z `credit_transactions` a `training_sessions`
- **Seskupování podle měsíců** pro lepší orientaci
- **Kliknutelné řádky** → odkaz na detail tréninku/produktu
- **Running balance** (průběžný zůstatek) v každém řádku

### 2. Nový export modul `src/lib/clientLedgerExport.ts`

```typescript
// Struktura exportovaných dat
interface LedgerExportRow {
  date: string;
  time: string;
  type: 'Trénink' | 'Produkt' | 'Dobití' | 'Korekce';
  description: string;
  amount: number;
  balance: number;
  paymentMethod?: string;
  notes?: string;
}
```

Export bude:
- Podporovat **XLSX formát** (přehlednější, sloupce s šířkou)
- Zahrnovat **období výběru** (podobně jako PDF export)
- Pro skupiny označovat, **kdo čerpal**

### 3. Úprava `ClientDetailTabs.tsx`

V tab "Tréninky" nahradíme `ClientTrainingFinanceCard` za:
- `ClientFinanceLedger` (nový sjednocený přehled)
- Zachováme `ClientPeriodizationCard` nahoře

### 4. Úprava pro skupinové rozpočty

Pro klienty ve sdíleném rozpočtu:
- Toggle "Pouze tento klient" / "Celá skupina"
- V exportu sloupec "Čerpal" s jménem člena skupiny
- Zůstatek vždy skupinový (sdílený)

## Soubory k úpravě

| Soubor | Akce |
|--------|------|
| `src/components/clients/ClientFinanceLedger.tsx` | **Nový** - hlavní komponenta |
| `src/lib/clientLedgerExport.ts` | **Nový** - export do XLSX |
| `src/components/clients/ClientDetailTabs.tsx` | Úprava - použít novou komponentu |
| `src/components/clients/ClientTrainingFinanceCard.tsx` | Ponechat jako fallback, případně odstranit |

## Změny v uživatelském rozhraní

### Před
- Dva oddělené taby (Tréninky / Finance)
- Finance zobrazuje pouze kreditové transakce
- Export pouze do PDF (kreditový výpis)

### Po
- Jeden sjednocený chronologický přehled
- Všechny finanční události včetně tréninků
- Export do XLSX s plnou historií
- Vizuálně čitelnější s měsíčním seskupením

## Časový odhad
- Nová komponenta `ClientFinanceLedger`: 45 minut
- Export modul: 20 minut
- Integrace a testování: 15 minut
