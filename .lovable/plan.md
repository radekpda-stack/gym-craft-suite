
# Kliknutelné notifikace o stravě s detailem záznamů

## Přehled problému

Při kliknutí na agregovanou notifikaci "18 záznamů stravy" se rozklikne seznam položek, ale:
1. Jednotlivé položky nejsou klikatelné
2. Zobrazují pouze "Klient zapisuje stravu" + datum
3. Trenér nevidí, co klient zapsal

## Navrhované řešení

Vytvořit nový dialog `NutritionEntryDetailDialog`, který:
- Zobrazí záznamy stravy pro konkrétní den
- Načte data z `nutrition_food_entries`, `nutrition_drink_entries`, `nutrition_coffee_entries`
- Umožní přímou navigaci na celý deník klienta

```text
AKTUÁLNÍ STAV:
┌─────────────────────────────────────────┐
│ 18 záznamů stravy                       │
│ └─ Klient zapisuje stravu    Včera      │ ← Neklikatelné
│ └─ Klient zapisuje stravu    Před 2 dny │ ← Nic neukáže
└─────────────────────────────────────────┘

NOVÝ STAV:
┌─────────────────────────────────────────┐
│ 18 záznamů stravy                       │
│ └─ Jana Nováková             Včera  [>] │ ← Kliknutí otevře dialog
│ └─ Petr Svoboda         Před 2 dny  [>] │
└─────────────────────────────────────────┘

DIALOG PO KLIKNUTÍ:
┌─────────────────────────────────────────────┐
│ 🍎 Strava klienta                      [✕] │
│ Jana Nováková • Úterý 28.1.2025            │
├─────────────────────────────────────────────┤
│                                             │
│ JÍDLA                                       │
│ ┌─────────────────────────────────────────┐ │
│ │ 🍳 Snídaně (08:30)                      │ │
│ │ Ovesná kaše s ovocem, med               │ │
│ │ Porce: střední                          │ │
│ └─────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────┐ │
│ │ 🥗 Oběd (12:15)                         │ │
│ │ Kuřecí salát s quinoou                  │ │
│ │ Porce: velká                            │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ NÁPOJE                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ 💧 Voda (10:00) - 500ml                 │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ KOFEIN                                      │
│ ┌─────────────────────────────────────────┐ │
│ │ ☕ Espresso (07:45)                      │ │
│ └─────────────────────────────────────────┘ │
│                                             │
├─────────────────────────────────────────────┤
│ [Zobrazit celý deník]           [Zavřít]   │
└─────────────────────────────────────────────┘
```

## Technická implementace

### 1. Data dostupná v notifikaci

Notifikace `nutrition_entry_added` obsahuje:
- `client_id` - ID klienta
- `entity_type: 'nutrition_session'`
- `entity_id` - ID session
- `created_at` - Datum vytvoření (= den zápisu)

### 2. Nová komponenta - NutritionEntryDetailDialog

```typescript
interface NutritionEntryDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: UnifiedNotification | null;
}
```

Dialog:
1. Extrahuje `client_id` a datum z `notification.created_at`
2. Načte záznamy z DB pro daný den
3. Zobrazí jídla, nápoje a kávu v přehledné formě
4. Tlačítko pro navigaci na celý deník

### 3. Úprava UnifiedNotificationItem

Aktuálně agregované položky volají pouze `onClick?.()` bez předání konkrétní položky:

```typescript
// PŘED (řádek 250-253)
onClick={(e) => {
  e.stopPropagation();
  onClick?.();  // ← Volá handler pro celou agregaci
}}
```

Potřeba:
- Přidat nový callback `onItemClick?: (item: UnifiedNotification) => void`
- Volat s konkrétní položkou

### 4. Úprava NotificationCenter

- Přidat stav pro vybranou nutrition notifikaci
- Přidat `NutritionEntryDetailDialog`
- Předat `onItemClick` do `UnifiedNotificationItem`

## Změny v souborech

| Soubor | Změna |
|--------|-------|
| `NutritionEntryDetailDialog.tsx` | **Nový** - Dialog pro zobrazení denních záznamů |
| `UnifiedNotificationItem.tsx` | Přidat `onItemClick` callback pro agregované položky |
| `NotificationCenter.tsx` | Integrovat dialog a handler |

## Detailní design dialogu

### Sekce JÍDLA
Pro každý záznam z `nutrition_food_entries`:
- Ikona podle `meal_type` (snídaně 🍳, oběd 🥗, večeře 🍽️, svačina 🍎)
- Čas (`entry_time`)
- Popis (`description`)
- Porce (`portion_size`)
- Volitelně: kvalita, sytost

### Sekce NÁPOJE
Pro každý záznam z `nutrition_drink_entries`:
- Ikona podle typu (voda 💧, slazený 🥤, alkohol 🍺)
- Čas + objem

### Sekce KOFEIN
Pro každý záznam z `nutrition_coffee_entries`:
- Ikona ☕
- Typ (espresso, čaj, energy)
- Čas

### Prázdný stav
Pokud pro daný den nejsou žádné záznamy:
- "Pro tento den nebyly nalezeny záznamy"
- Nabídnout přechod na celý deník

## Implementační kroky

### Krok 1: NutritionEntryDetailDialog (nový soubor)
- Vytvoření komponenty s fetch logikou
- UI pro zobrazení jídel/nápojů/kávy
- Navigace na celý deník

### Krok 2: UnifiedNotificationItem
- Přidat prop `onItemClick?: (item: UnifiedNotification) => void`
- Upravit onClick v rozbalených položkách

### Krok 3: NotificationCenter
- Přidat stav `selectedNutritionNotification`
- Přidat stav `nutritionDialogOpen`
- Přidat handler `handleNutritionItemClick`
- Předat `onItemClick` do `UnifiedNotificationItem`
- Přidat `NutritionEntryDetailDialog`

## Pořadí implementace

1. **NutritionEntryDetailDialog.tsx** - nová komponenta
2. **UnifiedNotificationItem.tsx** - přidat onItemClick
3. **NotificationCenter.tsx** - integrace

## Časový odhad

| Úkol | Čas |
|------|-----|
| NutritionEntryDetailDialog | 40 min |
| UnifiedNotificationItem úprava | 10 min |
| NotificationCenter integrace | 15 min |
| **Celkem** | **~1 hodina** |
