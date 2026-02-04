

# Přidání rychlého prodeje do karty tréninku

## Přehled řešení

Vytvořím novou komponentu `TrainingQuickSale`, která bude integrována přímo do karty tréninku. Komponenta umožní rychlý prodej produktů účastníkům tréninku bez nutnosti přecházet do modulu Prodej.

## Klíčové funkce

| Funkce | Popis |
|--------|-------|
| Výběr účastníka | Dropdown/pills s účastníky aktuálního tréninku |
| Rychlý prodej | Jednoduchý grid produktů s tlačítkem přidat |
| Košík | Kompaktní zobrazení s +/- tlačítky |
| Platební metody | Cash, karta, kredit, převod |
| Validace | Kontrola skladu, kreditu při platbě z kreditu |

## Architektura

```text
TrainingDetailView
├── TrainingHeroHeader
├── TrainingPrepSection (scheduled/in_progress)
├── TrainingParticipantsManager
├── ParticipantsPRsSection
├── CompactTagGridSelector (tags)
├── WorkoutExerciseManager (cviky)
├── TrainingQuickSale     ← NOVÁ SEKCE
│   ├── ParticipantSelector (pills/dropdown)
│   ├── ProductGrid (kompaktní)
│   ├── MiniCart
│   └── CheckoutButton
└── TrainingCloseSection (completed)
```

## Implementační detaily

### 1. Nová komponenta `TrainingQuickSale.tsx`

```typescript
interface TrainingQuickSaleProps {
  trainingId: string;
  participants: Array<{
    client_id: string;
    name: string;
  }>;
  primaryClientId: string;
}
```

**Chování:**
- Při 1 účastníkovi → automaticky předvybraný, bez výběru
- Při 2+ účastnících → pills nebo dropdown pro výběr komu prodávám
- Kompaktní grid produktů (pouze fyzické produkty + služby, bez credit_topup)
- Mini košík pod produkty
- Platební metody jako horizontální pills
- Tlačítko "Prodat" s validací

### 2. UI Design - Pills pro výběr účastníka

Při více účastnících se zobrazí horizontální pills:

```text
┌─────────────────────────────────────────────────┐
│ 📦 Rychlý prodej                               │
├─────────────────────────────────────────────────┤
│ Komu?  [● Zuzka] [○ Petr] [○ Jana]             │
├─────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐        │
│  │ Protein  │ │ Tyčinka  │ │ Bandáže  │        │
│  │ 450 Kč   │ │  35 Kč   │ │ 299 Kč   │        │
│  └──────────┘ └──────────┘ └──────────┘        │
├─────────────────────────────────────────────────┤
│ Košík: Protein ×1 = 450 Kč          [−][+][×] │
├─────────────────────────────────────────────────┤
│ [Hot.] [Kred.] [Kart.] [Přev.]                 │
│                                                 │
│        [  Prodat 450 Kč  ]                     │
└─────────────────────────────────────────────────┘
```

### 3. Změny v `TrainingDetailView.tsx`

Přidám sekci `TrainingQuickSale` mezi cviky a close section:

```tsx
{/* QUICK SALE - for scheduled/in_progress */}
{(isScheduled || isInProgress) && participants.length > 0 && (
  <TrainingQuickSale
    trainingId={training.id}
    participants={participants}
    primaryClientId={training.client_id}
  />
)}
```

### 4. Využití existujících hooků

Využiji existující logiku:
- `useSalesCartWithDiscount` - správa košíku
- `useProductsSortedBySales` - seznam produktů
- `processSaleWithDiscount` - zpracování transakce
- `useSharedBudgetBalance` - ověření kreditu

### 5. Collapsible design

Sekce bude ve výchozím stavu sbalená (collapsed) s ikonou 📦 a "Rychlý prodej". Po kliknutí se rozbalí:

**Sbalený stav:**
```text
┌─────────────────────────────────────────────────┐
│ 📦 Rychlý prodej                          [▼] │
└─────────────────────────────────────────────────┘
```

**Rozbalený stav:**
Plný UI s výběrem účastníka, produkty, košíkem a checkout.

## Soubory k vytvoření/úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `src/components/trainings/TrainingQuickSale.tsx` | NOVÝ | Hlavní komponenta rychlého prodeje |
| `src/components/trainings/TrainingDetailView.tsx` | UPRAVIT | Import a integrace TrainingQuickSale |

## Detailní struktura `TrainingQuickSale.tsx`

```tsx
// Stavy
- selectedParticipantId: string (účastník pro prodej)
- isExpanded: boolean (sbaleno/rozbaleno)
- paymentMethod: PaymentMethod
- isProcessing: boolean

// Hooks
- useSalesCartWithDiscount({ clientId: selectedParticipantId })
- useProductsSortedBySales(true)
- useSharedBudgetBalance(selectedParticipantId)

// Logika
- Při 1 účastníkovi: automaticky předvybrán
- Při více: pills s výběrem
- Filtrovat credit_topup produkty
- Po úspěšném prodeji: clear cart, toast, invalidate queries
```

## Responsivní chování

- **Desktop:** 4-5 produktů v řádku
- **Tablet:** 3 produkty v řádku
- **Mobil:** 2 produkty v řádku
- Košík vždy pod produkty
- Platební metody jako kompaktní pills

## Edge cases

1. **Žádní účastníci** → Sekce se nezobrazí
2. **Žádné produkty** → Zobrazí zprávu "Žádné produkty k prodeji"
3. **Vyprodáno** → Produkt disabled, vizuálně šedý
4. **Nedostatek kreditu** → Validační chyba při platbě z kreditu
5. **Shared budget** → Správně zobrazí sdílený zůstatek

## Výhody tohoto řešení

1. **Minimální přerušení workflow** - trenér nemusí opouštět kartu tréninku
2. **Kontext účastníků** - automaticky ví, komu prodává
3. **Rychlost** - 3-4 kliknutí pro kompletní prodej
4. **Collapsible** - nezabírá místo, když není potřeba
5. **Reuse** - využívá existující prodejní logiku a komponenty

