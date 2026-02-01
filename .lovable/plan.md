
# Oprava cen tréninků - Aktualizace na nový ceník (900/1100/1300 Kč)

## Identifikovaný problém

Od 1.2.2026 platí nový ceník tréninků:
- **1 osoba**: 900 Kč (místo 800 Kč)
- **2 osoby**: 1100 Kč (místo 1000 Kč)  
- **3+ osob**: 1300 Kč (místo 1200 Kč)

**Příčina problému**: V kódu je na mnoha místech hardcodovaná **stará cena 800/1000/1200 Kč** jako fallback, když se data z databáze nestihnou načíst. Barbora Vopavová nemá fixovanou cenu (`use_legacy_pricing = false`, `grandfathered_credit = null`), takže by měla platit nové ceny, ale aplikace zobrazuje staré.

### Ověřeno v databázi

| Nastavení | Hodnota v DB |
|-----------|--------------|
| `training_prices` | `{"1": 900, "2": 1100, "3": 1300}` ✅ |
| `legacy_training_prices` | `{"1": 800, "2": 1000, "3": 1200}` ✅ |

| Klient | `use_legacy_pricing` | `grandfathered_credit` |
|--------|---------------------|------------------------|
| Barbora Vopavová | `false` | `null` |

→ Klientka by měla platit nové ceny (900 Kč), ale kód spadne na fallback se starou cenou.

---

## Nalezené problémové soubory

### 1. Hlavní zdroj fallbacku

| Soubor | Řádek | Problém |
|--------|-------|---------|
| `src/hooks/useAppSettings.ts` | 44 | `defaultPrices = { "1": 800, "2": 1000, "3": 1200 }` |

### 2. Další hardcodované fallbacky

| Soubor | Řádek | Aktuální hodnota |
|--------|-------|------------------|
| `src/pages/CalendarPage.tsx` | 96 | `{ '1': 800, '2': 1000, '3': 1200 }` |
| `src/pages/SchedulePage.tsx` | 109 | `{ '1': 800, '2': 1000, '3': 1200 }` |
| `src/components/calendar/QuickPaymentDialog.tsx` | 72 | `{ '1': 800, '2': 1000, '3': 1200 }` |
| `src/components/trainings/TrainingDetailView.tsx` | 184 | `{ "1": 800, "2": 1000, "3": 1200 }` |
| `src/components/settings/TrainingPricesSettings.tsx` | 31 | `{ "1": 800, "2": 1000, "3": 1200 }` |
| `src/components/settings/PriceListSettings.tsx` | 44-47 | `PT_1: 800, PT_2: 1000, PT_3P: 1200` |

### 3. Backend (Edge Functions)

| Soubor | Řádek | Problém |
|--------|-------|---------|
| `supabase/functions/ai-operator/index.ts` | 192-195 | Hardcodované `800/1000/1200` |
| `supabase/functions/api-v1/index.ts` | 1055-1060 | Hardcodované `800/1000/1200` |

---

## Navrhované řešení

### Krok 1: Aktualizace centrálního fallbacku

**Soubor**: `src/hooks/useAppSettings.ts`

```typescript
// PŘED (řádek 44):
const defaultPrices: TrainingPrices = { "1": 800, "2": 1000, "3": 1200, "first_training": 1000 };

// PO:
const defaultPrices: TrainingPrices = { "1": 900, "2": 1100, "3": 1300, "first_training": 1000 };
```

### Krok 2: Aktualizace všech lokálních fallbacků

Všechny soubory s hardcodovanou starou cenou budou aktualizovány:

| Soubor | Změna |
|--------|-------|
| `CalendarPage.tsx` | `800/1000/1200` → `900/1100/1300` |
| `SchedulePage.tsx` | `800/1000/1200` → `900/1100/1300` |
| `QuickPaymentDialog.tsx` | `800/1000/1200` → `900/1100/1300` |
| `TrainingDetailView.tsx` | `800/1000/1200` → `900/1100/1300` |
| `TrainingPricesSettings.tsx` | `800/1000/1200` → `900/1100/1300` |
| `PriceListSettings.tsx` | `800/1000/1200` → `900/1100/1300` |

### Krok 3: Aktualizace Edge Functions

**AI Operator** (`supabase/functions/ai-operator/index.ts`):
```typescript
// PŘED:
function getTrainingPrice(participantCount: number): number {
  if (participantCount === 1) return 800;
  if (participantCount === 2) return 1000;
  return 1200;
}

// PO:
function getTrainingPrice(participantCount: number): number {
  if (participantCount === 1) return 900;
  if (participantCount === 2) return 1100;
  return 1300;
}
```

**API v1** (`supabase/functions/api-v1/index.ts`):
```typescript
// PŘED:
const priceMap: Record<string, number> = {
  "1": 800,
  "2": 1000,
  "3+": 1200,
  ...
};

// PO:
const priceMap: Record<string, number> = {
  "1": 900,
  "2": 1100,
  "3+": 1300,
  ...
};
```

---

## Soubory k úpravě (10 souborů)

### Frontend (8 souborů)
1. `src/hooks/useAppSettings.ts` - centrální fallback
2. `src/pages/CalendarPage.tsx` - kalendář
3. `src/pages/SchedulePage.tsx` - rozvrh
4. `src/components/calendar/QuickPaymentDialog.tsx` - rychlá platba
5. `src/components/trainings/TrainingDetailView.tsx` - detail tréninku
6. `src/components/settings/TrainingPricesSettings.tsx` - nastavení cen
7. `src/components/settings/PriceListSettings.tsx` - ceník nastavení

### Backend (2 edge funkce)
8. `supabase/functions/ai-operator/index.ts` - AI asistent
9. `supabase/functions/api-v1/index.ts` - API

---

## Očekávaný výsledek

| Scénář | Před | Po |
|--------|------|-----|
| Barbora Vopavová (bez fixace) | 800 Kč | 900 Kč ✅ |
| Nový klient | 800 Kč | 900 Kč ✅ |
| Klient s fixací (`use_legacy_pricing=true`) | 800 Kč | 800 Kč (správně) |
| Duo trénink | 1000 Kč | 1100 Kč ✅ |
| Skupinový trénink (3+) | 1200 Kč | 1300 Kč ✅ |

---

## Poznámka k fixaci cen

Systém fixace cen zůstane funkční:
- Klienti s `use_legacy_pricing = true` a `grandfathered_credit > 0` budou i nadále platit staré ceny (800/1000/1200)
- Jakmile vyčerpají fixovaný kredit, automaticky přejdou na nové ceny
- Toto chování je správné a bude zachováno
