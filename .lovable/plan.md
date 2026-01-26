
# Audit fixace ceny a přechodu na nový ceník (1.2.2026)

## Shrnutí stavu

Systém fixace ceny je **připraven z 70%**, ale obsahuje několik kritických mezer, které je nutné opravit před spuštěním nového ceníku.

---

## Nalezené problémy

### KRITICKÉ (musí být opraveno)

| # | Problém | Popis | Dopad |
|---|---------|-------|-------|
| 1 | **Chybí databázový trigger** | Funkce `check_and_disable_legacy_pricing` existuje, ale trigger `tr_check_legacy_pricing_exhausted` není vytvořen | Fixace se NIKDY automaticky nevypne po vyčerpání kreditu |
| 2 | **Špatné ceny v nastavení** | `training_prices` = 800/1000/1200 (staré ceny), chybí `legacy_training_prices` | Systém neví, jaké jsou nové vs. staré ceny |
| 3 | **Dialog nepoužívá fixaci** | `CompleteTrainingDialog` a `QuickCompleteDialog` používají `useTrainingPrices()` místo `useClientTrainingPrice()` | Klient s fixací platí stejné ceny jako ostatní |
| 4 | **Nekonzistentní data klientů** | Zuzka Kratochvílová: `use_legacy_pricing=true`, ale `grandfathered_credit=null` | Systém nemůže vypočítat zbývající fixovaný kredit |

### STŘEDNÍ PRIORITA

| # | Problém | Popis |
|---|---------|-------|
| 5 | **Chybí přehled klientů s fixací** | Není jednoduché vidět seznam všech klientů, u kterých je fixace aktivní |
| 6 | **Přepínač není dobře viditelný** | `LegacyPriceFixSection` je schovaný v rozbalovacím menu "Nastavení" |

---

## Aktuální stav komponent

### Co funguje ✅
- Sloupce v DB: `use_legacy_pricing`, `grandfathered_credit`, `grandfathered_at`
- Komponenta `LegacyPriceFixSection` pro ruční nastavení fixace
- Hook `useClientTrainingPrice` pro výpočet efektivní ceny
- Logika v `usePriceTransition.ts` pro přepínání starých/nových cen

### Co nefunguje ❌
- Trigger pro automatické vypnutí fixace
- Správné nastavení ceníků v `app_settings`
- Integrace fixace do procesu dokončení tréninku

---

## Plán oprav

### Krok 1: Vytvořit chybějící trigger (SQL migrace)
Přidat trigger na tabulku `credit_consumptions`, který spustí funkci `check_and_disable_legacy_pricing` po každém INSERT.

```sql
DROP TRIGGER IF EXISTS tr_check_legacy_pricing_exhausted ON credit_consumptions;
CREATE TRIGGER tr_check_legacy_pricing_exhausted
AFTER INSERT ON credit_consumptions
FOR EACH ROW
EXECUTE FUNCTION check_and_disable_legacy_pricing();
```

### Krok 2: Nastavit správné ceny (SQL migrace)
Aktualizovat `app_settings`:
- `training_prices` = **900/1100/1300** (nové ceny od 1.2.2026)
- `legacy_training_prices` = **800/1000/1200** (staré ceny pro fixované klienty)

```sql
-- Nové ceny (platí pro klienty BEZ fixace)
UPDATE app_settings SET value = '{"1": 900, "2": 1100, "3": 1300, "first_training": 1000}'
WHERE key = 'training_prices';

-- Staré ceny (platí pro klienty S fixací)
INSERT INTO app_settings (key, value, user_id)
VALUES ('legacy_training_prices', '{"1": 800, "2": 1000, "3": 1200}', '[USER_ID]')
ON CONFLICT (key, user_id) DO UPDATE SET value = '{"1": 800, "2": 1000, "3": 1200}';
```

### Krok 3: Opravit nekonzistentní data klientů
Opravit klienty, kteří mají `use_legacy_pricing=true` ale chybí `grandfathered_credit`:

```sql
-- Zuzka Kratochvílová - nastavit grandfathered_credit na aktuální zůstatek
UPDATE clients 
SET grandfathered_credit = credit_balance
WHERE id = '446748ff-adbd-482d-8a20-415ed808b51e' AND grandfathered_credit IS NULL;
```

### Krok 4: Integrovat fixaci do dokončení tréninku
Upravit `CompleteTrainingDialog.tsx` a `QuickCompleteDialog.tsx`:
- Použít `useClientTrainingPrice(clientId)` pro získání efektivní ceny
- Pokud klient má fixaci, použít `effectivePrices` (legacy), jinak nové ceny

**Soubory k úpravě:**
- `src/components/trainings/CompleteTrainingDialog.tsx`
- `src/components/trainings/QuickCompleteDialog.tsx`

### Krok 5: Vylepšit viditelnost přepínače fixace
Přesunout `LegacyPriceFixSection` výše v administraci klienta nebo přidat vizuální indikátor na kartě klienta.

---

## Testovací scénáře

Po implementaci je nutné otestovat:

1. **Nový klient bez fixace** → platí 900/1100/1300 Kč
2. **Klient s fixací a dostatečným kreditem** → platí 800/1000/1200 Kč
3. **Klient s fixací, zbývá < 800 Kč** → fixace se automaticky vypne, další trénink za 900 Kč
4. **Klient dochodí fixovaný kredit** → automatické přepnutí na nové ceny

---

## Ovlivněné soubory

| Soubor | Změna |
|--------|-------|
| Nová SQL migrace | Vytvořit trigger + nastavit ceny + opravit data |
| `src/components/trainings/CompleteTrainingDialog.tsx` | Použít `useClientTrainingPrice` |
| `src/components/trainings/QuickCompleteDialog.tsx` | Použít `useClientTrainingPrice` |

---

## Diagram logiky fixace

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    DOKONČENÍ TRÉNINKU                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Načti klienta                                                   │
│     ↓                                                               │
│  2. Má custom_training_price?                                       │
│     ├─ ANO → Použij custom cenu                                     │
│     └─ NE ↓                                                         │
│                                                                     │
│  3. Má use_legacy_pricing = true?                                   │
│     ├─ NE → Použij training_prices (900/1100/1300)                  │
│     └─ ANO ↓                                                        │
│                                                                     │
│  4. Má grandfathered_credit > 800 Kč?                               │
│     ├─ ANO → Použij legacy_training_prices (800/1000/1200)          │
│     └─ NE → Vypni fixaci, použij nové ceny                          │
│                                                                     │
│  5. Po dokončení tréninku:                                          │
│     → INSERT do credit_consumptions                                 │
│     → Trigger check_and_disable_legacy_pricing()                    │
│     → Pokud zbývá < 800 Kč → UPDATE use_legacy_pricing = false      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Časový odhad

| Krok | Čas |
|------|-----|
| SQL migrace (trigger + ceny + data) | 5 min |
| Úprava CompleteTrainingDialog | 10 min |
| Úprava QuickCompleteDialog | 5 min |
| **Celkem** | **~20 min** |
