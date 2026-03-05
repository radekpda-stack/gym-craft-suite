

# Plán: Oprava chybných dotazů AI agenta

Provedl jsem audit všech nových dotazů v edge funkci `ai-business-analyst` oproti skutečnému databázovému schématu. Našel jsem **10 kritických chyb** v názvech sloupců, které způsobují tiché selhání (dotazy vrací prázdná data nebo chyby).

## Nalezené chyby

| Tabulka | Dotaz používá | Skutečný sloupec |
|---------|--------------|-----------------|
| `measurements` | `height`, `body_fat_pct` | **není `height`**, `body_fat_percentage` |
| `diagnostics` | `category` | `area_type` + `area_name` |
| `client_xp` | `current_xp`, `streak_days` | `total_xp`, `level_xp` (není `streak_days`) |
| `loyalty_balance` | žádný filtr na user | **nemá `user_id`** – potřeba joinovat přes clients |
| `nutrition_log_sessions` | `date`, `meal_type` | `start_date`, `end_date` (není `meal_type`) |
| `pre_session_checkins` | `stress_level`, `sleep_quality`, `pain_areas` | `pain_area`, `pain_notes` (není `stress_level`/`sleep_quality`) |
| `client_recurring_schedules` | `duration_minutes`, `training_type` | `duration` (není `training_type`) |
| `price_lists` | `valid_from`, `valid_to` | `effective_from` (není `valid_to`) |
| `price_items` | `name`, `price`, `session_count`, `validity_days` | `service_id`, `unit_price_czk` (zcela jiná struktura) |
| `stock_movements` | žádný filtr na user | **má `user_id`** – chybí `.eq("user_id", userId)` |

## Implementace

### Soubor: `supabase/functions/ai-business-analyst/index.ts`

1. **Opravit SELECT sloupce** ve všech dotazech dle skutečného schématu
2. **Opravit kontextové sekce** které referencují neexistující sloupce
3. **Přidat chybějící filtry** (`user_id` na `stock_movements`, join pro `loyalty_balance`)
4. **Přizpůsobit `price_items`** – joinovat přes `service_id` nebo zobrazit `unit_price_czk`
5. **Opravit `measurements`** – přidat `body_fat_percentage`, `muscle_mass`, `waist`, `chest`, `hips` místo neexistujících sloupců
6. **Opravit `pre_session_checkins`** – použít `energy_level`, `pain_area`, `pain_notes` (bez `stress_level`/`sleep_quality`)
7. **Opravit `nutrition_log_sessions`** – použít `start_date` místo `date`
8. **Re-deploy** edge funkci a ověřit logy

