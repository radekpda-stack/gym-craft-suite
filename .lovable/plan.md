
# Plán: Vylepšení kreditní karty v klientském centru

## Shrnutí požadavků

1. **Kreditní karta rozkliknutelná** - zobrazí krátkou historii transakcí přímo v rozbalené kartě
2. **Barevné rozlišení stavu:**
   - Záporný kredit (dluh) → **červeně**
   - Nula → **neutrální** (šedá/bílá)
   - Kladný kredit → **zeleně**
3. **Odstranit kartu "Série"** z dashboardu
4. **Zmenšit tréninkový kalendář**

---

## Klíčový problém

Petra Bobáková má:
- Ledger balance: **0 Kč**
- Nezaplacené tréninky: **1000 Kč**
- **Skutečný stav: -1000 Kč (dluh)**

Aktuálně dashboard zobrazuje pouze ledger balance (0 Kč), ale nezohledňuje nezaplacené tréninky. Klient by měl vidět **efektivní stav včetně dluhu**.

---

## Technické změny

### 1. Rozšíření `HeroStatsRow.tsx` - kreditní karta s barvami a rozkliknutím

**Změny:**
- Přidat hook pro nezaplacené tréninky klienta
- Vypočítat **effectiveBalance = balance - unpaidAmount**
- Barevné rozlišení podle effectiveBalance:
  - `< 0` → červená (destructive)
  - `= 0` → neutrální (šedá)
  - `> 0` → zelená (success)
- Přidat collapsible sekci s posledními 3-5 transakcemi

```typescript
// Nový výpočet
const effectiveBalance = (creditStats?.balance ?? 0) - unpaidAmount;

// Barevné třídy
const balanceColor = effectiveBalance < 0 
  ? 'text-destructive' 
  : effectiveBalance === 0 
  ? 'text-muted-foreground' 
  : 'text-success';

const cardBg = effectiveBalance < 0
  ? 'from-destructive/15 via-destructive/10 to-destructive/5 border-destructive/30'
  : effectiveBalance === 0
  ? 'from-muted/20 via-muted/10 to-transparent border-border'
  : 'from-success/15 via-success/10 to-success/5 border-success/30';
```

**Rozbalovací historie:**
```typescript
<Sheet>
  <SheetTrigger asChild>
    <Card className={...}>
      {/* Stávající obsah + indikátor rozkliknutí */}
    </Card>
  </SheetTrigger>
  <SheetContent side="bottom">
    <SheetHeader>
      <SheetTitle>Přehled kreditu</SheetTitle>
    </SheetHeader>
    {/* Balance, unpaid info, posledních 5 transakcí */}
  </SheetContent>
</Sheet>
```

### 2. Přidání hooku pro nezaplacené tréninky klienta

**Soubor:** `src/hooks/useClientPortalStats.ts`

```typescript
export function useClientUnpaidTrainings(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-portal-unpaid', clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from('training_sessions')
        .select('id, date, final_price')
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .eq('payment_status', 'pending');
      
      const count = data?.length ?? 0;
      const amount = data?.reduce((sum, t) => sum + (t.final_price || 0), 0) ?? 0;
      return { count, amount, sessions: data ?? [] };
    },
    enabled: !!clientId,
  });
}
```

### 3. Odstranění karty "Série" z dashboardu

**Soubor:** `src/components/client-portal/dashboard/HeroStatsRow.tsx`

Změnit grid z 3 sloupců na 2:
```typescript
// Před:
className="grid grid-cols-3 gap-2"

// Po:
className="grid grid-cols-2 gap-2"
```

Odstranit celou sekci "Streak Card" (řádky 89-115).

### 4. Zmenšení tréninkového kalendáře

**Soubor:** `src/components/client-portal/calendar/TrainingCalendar.tsx`

Změny:
- Zmenšit padding a mezery
- Kompaktnější header
- Menší buňky kalendáře
- Skrýt legendu nebo ji zmenšit

```typescript
// Kompaktnější CardContent
<CardContent className="p-3 pt-0">

// Menší buňky
className="aspect-square rounded-md flex flex-col items-center justify-center text-[11px]"

// Menší header
<CardTitle className="text-sm">Kalendář</CardTitle>

// Skrýt XP badge, nechat pouze počet tréninků
```

---

## Vizuální ukázka nové kreditní karty

### Stav: DLUH (-1000 Kč)
```text
┌─────────────────────────────┐
│  💰  Kredit                 │
│  ┌───────────────────────┐  │
│  │ -1 000 Kč             │  │  ← Červeně
│  │ Dluh za 1 trénink     │  │  ← Upozornění
│  └───────────────────────┘  │
│  Klikni pro detail    ▼     │
└─────────────────────────────┘
```

### Stav: NULA (0 Kč)
```text
┌─────────────────────────────┐
│  💰  Kredit                 │
│  ┌───────────────────────┐  │
│  │ 0 Kč                  │  │  ← Neutrální
│  └───────────────────────┘  │
│  Klikni pro detail    ▼     │
└─────────────────────────────┘
```

### Stav: KLADNÝ (5000 Kč)
```text
┌─────────────────────────────┐
│  💰  Kredit                 │
│  ┌───────────────────────┐  │
│  │ 5 000 Kč              │  │  ← Zeleně
│  └───────────────────────┘  │
│  Klikni pro detail    ▼     │
└─────────────────────────────┘
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useClientPortalStats.ts` | Přidat `useClientUnpaidTrainings` hook |
| `src/components/client-portal/dashboard/HeroStatsRow.tsx` | Barevné rozlišení, Sheet s historií, odstranit Série |
| `src/components/client-portal/calendar/TrainingCalendar.tsx` | Zmenšit velikost |
| `src/pages/client-portal/ClientPortalOverview.tsx` | Případné úpravy layoutu |

---

## Výsledek

1. **Klient vidí skutečný stav** včetně nezaplacených tréninků
2. **Červená barva** upozorní na dluh - motivace zaplatit
3. **Méně karet** = čistší dashboard (bez Série)
4. **Kompaktnější kalendář** = více prostoru pro důležité informace
5. **Rozkliknutí** = rychlý přehled bez přechodu na jinou stránku
