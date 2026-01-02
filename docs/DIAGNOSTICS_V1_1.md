# Diagnostics v1.1 - Retention & Sampling Documentation

## Retention Policy

| Tabulka | Retence | Důvod |
|---------|---------|-------|
| `app_events` | 60 dní | Běžné eventy, dostatečné pro analýzu trendů |
| `app_errors` | 90 dní | Delší retence pro error tracking a debugging |

### Automatický úklid
- **Cron job**: `cleanup-diagnostics-daily` běží každý den v 3:00 UTC
- **Edge function**: `cleanup-diagnostics` volá DB funkci `cleanup_old_diagnostics()`
- **Audit log**: Každý běh je zaznamenán v `audit_log` s počtem smazaných záznamů

## Sampling

### Kritické eventy (100% - nikdy se nesamplují)
- `credit_*` - všechny finanční operace
- `training_*` - potvrzení/dokončení tréninků
- `badge_awarded`, `xp_awarded` - gamifikace
- `login`, `logout`, `signup` - autentizace
- `error_*` - všechny chyby

### Samplované eventy
| Event pattern | Sample rate |
|---------------|-------------|
| `page_view`, `page_leave` | 10% |
| `button_click`, `tab_change`, `modal_*` | 25% |
| `search`, `filter_applied` | 50% |
| Ostatní | 100% |

## Error Throttling

Stejná chyba (message + screen) se loguje max 1x za 60 sekund.
- Duplicitní chyby jsou počítány v poli `duplicateCount`
- Globální throttle: max 1 event / 10s per session

## Agregované Views

| View | Popis |
|------|-------|
| `vw_daily_error_counts` | Denní počty chyb za posledních 30 dní |
| `vw_top_errors_24h` | Top 20 chyb za 24h |
| `vw_top_errors_7d` | Top 50 chyb za 7 dní |

## Test Checklist v1.1

| Test ID | Scenario | Validace | Status |
|---------|----------|----------|--------|
| DIAG-001 | Retention job běh | Spustit `cleanup_old_diagnostics()`, ověřit audit_log | 🔲 TODO |
| DIAG-002 | Retention - eventy | Vložit event starší 61 dní, spustit cleanup, ověřit smazání | 🔲 TODO |
| DIAG-003 | Retention - errory | Vložit error starší 91 dní, spustit cleanup, ověřit smazání | 🔲 TODO |
| DIAG-004 | Sampling - page_view | Odeslat 100 page_view, ověřit ~10 v DB | 🔲 TODO |
| DIAG-005 | Sampling - critical | Odeslat credit_deducted, ověřit 100% záznam | 🔲 TODO |
| DIAG-006 | Error throttle | Odeslat stejnou chybu 5x do 60s, ověřit jen 1 záznam | 🔲 TODO |
| DIAG-007 | Agregace - daily | Ověřit `vw_daily_error_counts` vrací správné počty | 🔲 TODO |
| DIAG-008 | Agregace - top errors | Ověřit `vw_top_errors_24h` řazení dle occurrence_count | 🔲 TODO |
| DIAG-009 | Cron schedule | Ověřit `cron.job` obsahuje `cleanup-diagnostics-daily` | 🔲 TODO |

## Manuální test příkazy

```sql
-- Ověření cron jobu
SELECT * FROM cron.job WHERE jobname = 'cleanup-diagnostics-daily';

-- Test cleanup funkce
SELECT cleanup_old_diagnostics();

-- Ověření views
SELECT * FROM vw_daily_error_counts LIMIT 10;
SELECT * FROM vw_top_errors_24h;
```

## Debug API (browser console)

```javascript
// Zobrazit sampling konfiguraci
window.__analytics.getSamplingConfig()

// Zobrazit stav fronty
window.__analytics.getQueueStatus()
```
