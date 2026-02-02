
# Plán: Vylepšení karty "Vyžaduje pozornost" - přímý přístup k neuhrazeným tréninkům

## Shrnutí požadavků

1. **1 neuhrazený trénink** → kliknout = otevřít přímo kartu tréninku
2. **Více neuhrazených** → kliknout = otevřít dialog se seznamem všech neuhrazených
3. V dialogu zobrazit: klient, datum, částka, tlačítko na zaplacení
4. Možnost prokliknout na historii konkrétního tréninku

---

## Současný stav

| Akce | Výsledek |
|------|----------|
| Klik na "Nezaplaceno" | Naviguje na `/clients/{clientId}` - obecná stránka klienta |
| Žádný přímý přístup | Trenér musí manuálně hledat neuhrazené tréninky |

---

## Navrhované řešení

### Změna 1: Rozšířit data v PriorityTask

V hooku `useDashboardTasks.ts` přidat do `meta` pole `trainingId`:

```typescript
meta: { 
  amount: t.final_price, 
  daysOld,
  trainingId: t.id  // NOVÉ
}
```

### Změna 2: Nová komponenta UnpaidTrainingsDialog

Vytvoření nového dialogu `src/components/dashboard/UnpaidTrainingsDialog.tsx`:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Neuhrazené tréninky                       [X]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ PM  Palzová Martina                         │   │
│  │ 15. ledna 2026, 10:00            900 Kč  →  │   │
│  │ [Z kreditu ▾]  [✓ Uhradit]      [Historie]  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │ VV  Velát Václav                            │   │
│  │ 12. ledna 2026, 14:30            800 Kč  →  │   │
│  │ [Z kreditu ▾]  [✓ Uhradit]      [Historie]  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ─────────────────────────────────────────────────  │
│  Celkem: 1 700 Kč                                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Funkce dialogu:
- Seznam všech neuhrazených tréninků (všichni klienti)
- U každého: jméno klienta, datum+čas, částka
- Výběr platební metody (kredit/hotovost/karta/převod)
- Tlačítko "Uhradit" - okamžitá platba
- Tlačítko "Historie" - navigace na `/trainings/{id}`
- Celková suma dole

### Změna 3: Upravit logiku kliknutí v PriorityTasksSection

V `PriorityTasksSection.tsx` změnit onClick handler pro typ `unpaid`:

```typescript
onClick={() => {
  if (task.type === 'unpaid') {
    // Zjistit počet neuhrazených
    const unpaidTasks = priorityTasks.filter(t => t.type === 'unpaid');
    
    if (unpaidTasks.length === 1 && task.meta?.trainingId) {
      // Jeden trénink → navigovat přímo
      navigate(`/trainings/${task.meta.trainingId}`);
    } else {
      // Více tréninků → otevřít dialog
      setShowUnpaidDialog(true);
    }
  } else if (task.clientId) {
    navigate(`/clients/${task.clientId}`);
  }
}}
```

---

## Vizuální flow

### Scénář A: 1 neuhrazený trénink
```
[Dashboard] → klik → [Karta tréninku /trainings/xyz]
```

### Scénář B: 3+ neuhrazené tréninky
```
[Dashboard] → klik → [Dialog se seznamem]
                         ↓
                    [Uhradit] nebo [Historie →]
```

---

## Soubory k úpravě/vytvoření

| Soubor | Akce |
|--------|------|
| `src/hooks/dashboard/useDashboardTasks.ts` | Přidat `trainingId` do meta |
| `src/components/dashboard/UnpaidTrainingsDialog.tsx` | **NOVÝ** - dialog se seznamem |
| `src/components/dashboard/PriorityTasksSection.tsx` | Upravit onClick logiku + přidat dialog |

---

## Technické detaily

### Data pro dialog
Použijeme existující hook `useUnpaidTrainings()` bez parametru clientId - vrátí všechny neuhrazené tréninky.

### Platební funkce
Využijeme existující `usePayTraining()` mutaci z `useUnpaidTrainings.ts`.

### UI komponenty
Znovupoužijeme strukturu z `EnhancedUnpaidList.tsx` - už má Select pro platební metodu a tlačítko Uhradit.

---

## Očekávaný výsledek

| Situace | Před | Po |
|---------|------|-----|
| 1 neuhrazený | Jde na stránku klienta | Jde přímo na trénink |
| 3 neuhrazené | Jde na stránku klienta | Otevře dialog se všemi |
| Dialog | Neexistuje | Seznam s platbou + historií |

