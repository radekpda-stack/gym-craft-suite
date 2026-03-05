

# Plán: AI Agent – přístup ke všem datům aplikace

## Současný stav

Agent aktuálně vidí:
- Klienty (základní info, zdravotní omezení, cíle)
- Kreditní zůstatky (vw_client_ledger_balances, vw_group_ledger_balances)
- Transakce (credit_transactions)
- Tréninky (training_sessions) – tento měsíc, minulý měsíc, celý rok
- Prodeje produktů (product_sales) + dnešní prodeje
- Produkty na skladě
- Náklady (business_expenses)
- Feedbacky (training_feedback) + feedback_requests
- Cvičební záznamy (exercise_entries) – PR a objemy
- Tréninkové plány (training_plans)
- Rozvrh dnes/zítra

## Chybějící data (přidáme)

| Oblast | Tabulky | Co agent získá |
|--------|---------|---------------|
| **Měření** | `measurements` | Tělesné rozměry klientů, trendy váhy/obvodu |
| **Diagnostiky** | `diagnostics` | Diagnostická zjištění, problémové oblasti |
| **Balíčky** | `client_packages` | Aktivní balíčky, zbývající tréninky, expirace |
| **XP & Gamifikace** | `client_xp`, `loyalty_balance` | Levely klientů, body věrnosti |
| **Výzvy** | `challenges`, `challenge_submissions` | Aktivní výzvy, účast, výsledky |
| **Výživa** | `nutrition_log_sessions`, `nutrition_food_entries` | Stravovací návyky klientů |
| **Skladu pohyby** | `stock_movements` | Naskladnění, inventura, trendy |
| **Testy** | `test_definitions`, `test_sessions` | Výkonnostní testy, výsledky, PR |
| **Domácí tréninky** | `client_assigned_workouts` | Zadané workouty, plnění |
| **Pre-session checkin** | `pre_session_checkins` | Stav klientů před tréninkem |
| **Odznaky** | `client_badges`, `badge_definitions` | Earned achievements |
| **Ceníky** | `price_lists`, `price_items` | Aktuální ceníky |
| **Opakující se rozvrh** | `client_recurring_schedules` | Pravidelné termíny klientů |

## Implementace

### Soubor: `supabase/functions/ai-business-analyst/index.ts`

1. **Rozšířit Promise.all** o ~15 nových dotazů (všechny filtrovány na `userId`, s rozumnými limity)
2. **Přidat nové sekce do `contextData`**:
   - `### Měření klientů` – poslední měření, trendy váhy
   - `### Diagnostiky` – nálezy podle klientů
   - `### Balíčky` – aktivní, zbývající tréninky, blížící se expirace
   - `### Gamifikace` – XP levely, věrnostní body
   - `### Výzvy` – aktivní, účast, výsledky
   - `### Výživa` – počet logů, frekvence per klient
   - `### Skladové pohyby` – restock/sale/inventura souhrn
   - `### Výkonnostní testy` – definice, poslední výsledky
   - `### Domácí tréninky` – zadané vs dokončené
   - `### Pre-session checkins` – souhrn posledních check-inů
   - `### Odznaky` – nejčastější, nedávno udělené
   - `### Ceníky` – aktivní ceník
   - `### Opakující se rozvrh` – pravidelné termíny
3. **Aktualizovat system prompt** – rozšířit pravidla o nové analytické schopnosti (měření, diagnostiky, gamifikace, výživa, testy)
4. **Optimalizace**: Všechny dotazy agregovat/limitovat aby kontext nepřekročil rozumnou velikost (~15-20k tokenů)

### Omezení velikosti kontextu
- Měření: jen poslední per klient (ne celá historie)
- Výživa: jen souhrn posledních 30 dní (počet logů, průměr)
- Testy: jen poslední výsledek per test per klient
- Odznaky: jen počet a posledních 10 udělených
- Stock movements: jen souhrn za 30 dní

