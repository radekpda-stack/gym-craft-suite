# Přehled aplikace pro osobní trenéry

Kompletní dokumentace aplikace pro správu klientů, tréninků a financí osobního trenéra.

---

## 1. Přehled funkcí (Feature Overview)

### Hlavní moduly

| Modul | Popis | Klíčové funkce |
|-------|-------|----------------|
| **Správa klientů** | Evidence a správa klientů trenéra | CRUD operace, tagy, archivace, oblíbení, sdílené rozpočty |
| **Tréninky** | Plánování a evidence tréninkových jednotek | Vytváření, dokončování, rušení, opakované tréninky, více účastníků |
| **Kreditní systém** | Správa předplacených kreditů klientů | Dobíjení, odečítání, sdílené rozpočty, historie transakcí |
| **Měření** | Tělesná kompozice a obvody | Import z PDF/foto (OCR), manuální zadání, trendy, export |
| **Diagnostika** | Funkční diagnostika kloubů a svalů | Záznamy nálezů, multimédia, kategorizace |
| **Progres cvičení** | Sledování výkonu ve cvicích | PR detekce, grafy, stagnace detekce |
| **Kalendář** | Přehled naplánovaných tréninků | Denní/týdenní/měsíční zobrazení, sync s externími kalendáři |
| **Prodeje** | Prodej produktů a doplňků | Skladové hospodářství, různé platební metody |
| **Dashboard** | Přehled klíčových metrik | Statistiky, grafy, top klienti, finanční přehled |
| **AI Asistent** | Inteligentní pomocník | Analýza dat, doporučení, konverzační rozhraní |
| **Zpětná vazba** | Sběr feedback od klientů | Email formuláře, statistiky, automatické odesílání |

### Podpůrné funkce

| Funkce | Popis |
|--------|-------|
| **Autentizace** | Email/heslo přihlášení, chráněné routy |
| **Notifikace** | Upozornění na nedokončené tréninky, nízký kredit |
| **Tagy** | Kategorizace klientů a tréninků |
| **Export** | PDF, CSV, XLSX export dat |
| **Internacionalizace** | Čeština a angličtina |
| **Přizpůsobení UI** | Drag-and-drop sidebar a dashboard |
| **Klávesové zkratky** | Ctrl+K vyhledávání, ? nápověda |

---

## 2. Navigační struktura

### Hlavní obrazovky

| Route | Komponenta | Účel |
|-------|------------|------|
| `/` | `Index` → `Dashboard` | Hlavní přehled, statistiky, rychlé akce |
| `/auth` | `Auth` | Přihlášení a registrace |
| `/clients` | `Clients` | Seznam klientů, filtry, vyhledávání |
| `/clients/:id` | `ClientDetail` | Detail klienta, tréninky, měření, kredit |
| `/trainings` | `Trainings` | Seznam tréninků, filtry podle stavu |
| `/trainings/:id` | `TrainingDetail` | Detail tréninku, cviky, účastníci |
| `/calendar` | `CalendarPage` | Kalendářní zobrazení tréninků |
| `/canceled` | `CanceledTrainings` | Zrušené tréninky a pozdní zrušení |
| `/diagnostics` | `Diagnostics` | Seznam diagnostických záznamů |
| `/measurements` | `Measurements` | Přehled měření všech klientů |
| `/progress` | `Progress` | Progres cvičení a PR záznamy |
| `/sales` | `Sales` | Prodeje produktů, historie |
| `/settings` | `Settings` | Nastavení aplikace, tagy, produkty, ceny |
| `/ai-assistant` | `AIAssistant` | AI chat asistent |
| `/feedback/:token` | `FeedbackPage` | Veřejný formulář zpětné vazby (bez auth) |

### Navigační komponenty

- **Sidebar** (desktop): Hlavní navigace, přizpůsobitelné pořadí a viditelnost
- **MobileNav** (mobile): Spodní navigační lišta
- **MobileMenu**: Hamburger menu s kompletní navigací
- **CommandPalette**: Globální vyhledávání (Ctrl+K)

---

## 3. Databázová struktura

### Hlavní tabulky

#### `clients` - Klienti
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid | Primární klíč |
| `user_id` | uuid | Vlastník (trenér) |
| `name` | text | Jméno klienta |
| `email` | text | Email |
| `phone` | text | Telefon |
| `gender` | text | Pohlaví (male/female) |
| `birth_date` | date | Datum narození |
| `credit_balance` | numeric | Aktuální kredit |
| `training_goals` | text[] | Tréninkové cíle |
| `health_restrictions` | text | Zdravotní omezení |
| `notes` | text | Poznámky |
| `is_favorite` | boolean | Oblíbený klient |
| `is_archived` | boolean | Archivovaný |
| `created_at` | timestamptz | Vytvořeno |
| `updated_at` | timestamptz | Aktualizováno |

#### `training_sessions` - Tréninky
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid | Primární klíč |
| `user_id` | uuid | Vlastník (trenér) |
| `client_id` | uuid | Hlavní klient (FK → clients) |
| `date` | timestamptz | Datum a čas tréninku |
| `duration` | integer | Délka v minutách (default: 60) |
| `status` | text | Stav: scheduled/completed/canceled |
| `payment_status` | text | pending/paid_credit/paid_cash/paid_card/paid_bank |
| `payment_method` | text | Způsob platby |
| `final_price` | numeric | Konečná cena |
| `participant_count` | integer | Počet účastníků |
| `notes` | text | Poznámky |
| `subjective_rating` | integer | Subjektivní hodnocení (1-10) |
| `is_late_cancellation` | boolean | Pozdní zrušení (<24h) |
| `canceled_at` | timestamptz | Čas zrušení |
| `recurrence_type` | text | Typ opakování (weekly/monthly) |
| `recurrence_end_date` | date | Konec opakování |
| `parent_session_id` | uuid | Rodičovský trénink (FK → self) |
| `created_at` | timestamptz | Vytvořeno |
| `updated_at` | timestamptz | Aktualizováno |

#### `credit_transactions` - Kreditní transakce
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid | Primární klíč |
| `user_id` | uuid | Vlastník |
| `client_id` | uuid | Klient (FK → clients) |
| `group_id` | uuid | Skupina (FK → client_budget_groups) |
| `training_session_id` | uuid | Trénink (FK → training_sessions) |
| `product_id` | uuid | Produkt (FK → products) |
| `amount` | numeric | Částka (+ dobití, - odečet) |
| `type` | text | Typ: topup/deduction/adjustment/sale |
| `payment_method` | text | Způsob platby |
| `description` | text | Popis transakce |
| `created_at` | timestamptz | Vytvořeno |

#### `measurements` - Měření
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid | Primární klíč |
| `user_id` | uuid | Vlastník |
| `client_id` | uuid | Klient (FK → clients) |
| `date` | date | Datum měření |
| `weight` | numeric | Váha (kg) |
| `body_fat_percentage` | numeric | Tělesný tuk (%) |
| `muscle_mass` | numeric | Svalová hmota (kg) |
| `basal_metabolism` | integer | Bazální metabolismus (kcal) |
| `visceral_fat` | integer | Viscerální tuk |
| `chest` | numeric | Obvod hrudníku (cm) |
| `waist` | numeric | Obvod pasu (cm) |
| `hips` | numeric | Obvod boků (cm) |
| `bicep_left/right` | numeric | Obvod bicepsů (cm) |
| `thigh_left/right` | numeric | Obvod stehen (cm) |
| `calf_left/right` | numeric | Obvod lýtek (cm) |
| `mental_state` | integer | Mentální stav (1-10) |
| `notes` | text | Poznámky |
| `source_file_url` | text | URL zdrojového souboru |

#### `diagnostics` - Diagnostika
| Sloupec | Typ | Popis |
|---------|-----|-------|
| `id` | uuid | Primární klíč |
| `user_id` | uuid | Vlastník |
| `client_id` | uuid | Klient (FK → clients) |
| `date` | date | Datum vyšetření |
| `area_type` | text | Typ oblasti (joint/muscle) |
| `area_name` | text | Název oblasti |
| `findings` | text | Nálezy |
| `notes` | text | Poznámky |

### Pomocné tabulky

| Tabulka | Účel |
|---------|------|
| `training_participants` | Více účastníků na tréninku, rozdělení ceny |
| `training_session_tags` | Tagy přiřazené k tréninku |
| `client_tags` | Tagy přiřazené ke klientům |
| `tags` | Definice tagů (název, barva) |
| `client_budget_groups` | Sdílené rozpočty |
| `client_budget_members` | Členové sdílených rozpočtů |
| `client_media` | Fotky a audio záznamy klientů |
| `workout_entries` | Cviky v rámci tréninku |
| `exercise_entries` | Záznamy progrese cvičení |
| `exercises` | Databáze cvičení |
| `products` | Produkty k prodeji |
| `training_feedback` | Zpětná vazba od klientů |
| `feedback_requests` | Žádosti o zpětnou vazbu |
| `feedback_settings` | Nastavení zpětné vazby |
| `notifications` | Notifikace |
| `app_settings` | Uživatelská nastavení |
| `audit_log` | Audit změn |
| `client_training_phases` | Periodizace tréninku |
| `transaction_tags` | Tagy pro transakce |
| `feature_usage` | Statistiky použití funkcí |

### Vazby (Foreign Keys)

```
clients.user_id → auth.users.id
training_sessions.client_id → clients.id
training_sessions.parent_session_id → training_sessions.id
training_participants.training_session_id → training_sessions.id
training_participants.client_id → clients.id
credit_transactions.client_id → clients.id
credit_transactions.group_id → client_budget_groups.id
credit_transactions.training_session_id → training_sessions.id
credit_transactions.product_id → products.id
measurements.client_id → clients.id
diagnostics.client_id → clients.id
client_media.client_id → clients.id
client_media.diagnostic_id → diagnostics.id
workout_entries.training_session_id → training_sessions.id
workout_entries.exercise_id → exercises.id
exercise_entries.client_id → clients.id
exercise_entries.exercise_id → exercises.id
training_session_tags.training_session_id → training_sessions.id
training_session_tags.tag_id → tags.id
client_tags.client_id → clients.id
client_tags.tag_id → tags.id
client_budget_members.group_id → client_budget_groups.id
client_budget_members.client_id → clients.id
training_feedback.training_session_id → training_sessions.id
training_feedback.client_id → clients.id
feedback_requests.client_id → clients.id
feedback_requests.training_session_id → training_sessions.id
```

---

## 4. Workflow logika

### 4.1 Přidání klienta

```
1. Uživatel otevře CreateClientSheet (tlačítko + na /clients)
2. Vyplní formulář:
   - Jméno (povinné)
   - Email, telefon (volitelné)
   - Pohlaví (male/female)
   - Datum narození
   - Tréninkové cíle (multi-select)
   - Zdravotní omezení
   - Poznámky
3. Validace formuláře (Zod schema)
4. INSERT do tabulky clients s user_id = auth.uid()
5. Invalidace query cache ['clients']
6. Toast notifikace o úspěchu
7. Zavření sheetu
```

**Kód:** `src/hooks/useClients.ts` → `useCreateClient()`

### 4.2 Vytvoření tréninku

```
1. Uživatel otevře CreateTrainingSheet
2. Vyplní formulář:
   - Klient(i) - výběr z autocomplete
   - Datum a čas
   - Délka (default 60 min)
   - Poznámky
   - Tagy
   - Opakování (volitelné)
3. Výpočet ceny podle počtu účastníků:
   - 1 osoba: training_prices.solo (default 800 Kč)
   - 2 osoby: training_prices.duo (default 1000 Kč)
   - 3+ osob: training_prices.group (default 1200 Kč)
4. INSERT do training_sessions:
   - status = 'scheduled'
   - payment_status = 'pending'
   - final_price = vypočtená cena
5. Pokud více účastníků → INSERT do training_participants
6. Pokud opakování → vytvoření child sessions s parent_session_id
7. INSERT tagů do training_session_tags
8. Invalidace query cache
```

**Kód:** `src/hooks/useTrainingSessions.ts` → `useCreateTrainingSession()`

### 4.3 Dokončení tréninku

```
1. Uživatel klikne "Dokončit" na tréninku
2. Otevře se dialog s výběrem způsobu platby:
   - Z kreditu (paid_credit)
   - Hotově (paid_cash)
   - Kartou (paid_card)
   - Převodem (paid_bank)
   - Zaplatí později (pending)

3a. Pokud "Z kreditu":
   - Kontrola dostatečného kreditu
   - Pokud sdílený rozpočet → odečet z client_budget_groups.shared_balance
   - Pokud individuální → odečet z clients.credit_balance
   - INSERT do credit_transactions (type: 'deduction')
   - UPDATE training_sessions: status='completed', payment_status='paid_credit'

3b. Pokud hotově/kartou/převodem:
   - BEZ odečtu kreditu
   - UPDATE training_sessions: status='completed', payment_status='paid_*'

3c. Pokud "Zaplatí později":
   - UPDATE training_sessions: status='completed', payment_status='pending'
   - Trénink se zobrazí v "Nezaplaceno" statistice

4. Invalidace všech relevantních query cache
5. Toast notifikace
```

**Kód:** `src/hooks/useTrainingSessions.ts` → `useUpdateTrainingSession()`

### 4.4 Platby

#### Dobití kreditu
```
1. Otevření QuickCreditModal (sidebar) nebo CreditManagement (client detail)
2. Výběr klienta (pokud z modalu)
3. Zadání částky (kladná = dobití)
4. Výběr payment tagu (hotovost, účet 1, účet 2)
5. Volitelná poznámka
6. UPDATE clients.credit_balance += amount
   NEBO UPDATE client_budget_groups.shared_balance (pokud sdílený)
7. INSERT credit_transactions (type: 'topup')
8. Invalidace cache
```

#### Odložená platba (zaplacení později)
```
1. Trénink dokončen s payment_status = 'pending'
2. V seznamu nezaplacených tréninků (/trainings?filter=unpaid)
3. Uživatel vybere způsob platby
4. Pokud kredit → odečet + transaction
5. UPDATE payment_status na příslušnou hodnotu
```

### 4.5 Diagnostika

```
1. Otevření CreateDiagnosticSheet (z /diagnostics nebo client detail)
2. Vyplnění formuláře:
   - Klient (povinný)
   - Datum
   - Typ oblasti (kloub/sval)
   - Název oblasti (z předdefinovaného seznamu)
   - Nálezy (povinné)
   - Poznámky
3. INSERT do diagnostics
4. Volitelně: upload fotek/audio do client_media s diagnostic_id
5. Invalidace cache
```

**Oblasti:**
- Klouby: kotník, koleno, kyčel, pánev, SI skloubení, L-páteř, Th-páteř, C-páteř, rameno, loket, zápěstí
- Svaly: hlavní svalové skupiny

### 4.6 Měření a progres

#### Manuální zadání měření
```
1. Otevření CreateMeasurementSheet
2. Výběr klienta a data
3. Zadání hodnot:
   - Váha, tuk %, svalová hmota, bazální metabolismus, viscerální tuk
   - Obvody: hrudník, pas, boky, bicepsy, stehna, lýtka
   - Mentální stav (1-10)
4. Validace (kladné hodnoty, tuk max 100%)
5. INSERT do measurements
6. Automatický výpočet trendů vs předchozí měření
```

#### Import z PDF/foto (OCR)
```
1. Upload souboru (PDF, JPG, PNG, HEIC)
2. Volání Edge Function ocr-measurement
3. OCR extrakce hodnot pomocí AI
4. Zobrazení extrahovaných hodnot k úpravě
5. Kontrola duplicity (stejné datum)
   - Přepsat existující
   - Vytvořit nový
   - Sloučit hodnoty
6. Uložení do storage (measurement-files bucket)
7. INSERT do measurements s source_file_url
```

#### Progres cvičení
```
1. Výběr klienta a cvičení
2. Zadání: série, opakování, váha, čas, poznámky
3. Automatická detekce PR (nejvyšší váha)
4. INSERT do exercise_entries
5. Aktualizace grafu progrese
6. Detekce stagnace (bez progrese X týdnů)
```

---

## 5. Edge-case pravidla

### Validační pravidla

| Oblast | Pravidlo | Implementace |
|--------|----------|--------------|
| Klient | Jméno je povinné | Zod schema, form validation |
| Měření | Tuk max 100% | Zod schema `.max(100)` |
| Měření | Hodnoty musí být kladné | Zod schema `.positive()` |
| Měření | Poznámky max 500 znaků | Zod schema `.max(500)` |
| Trénink | Datum je povinné | Form validation |
| Trénink | Klient je povinný | Form validation |
| Kredit | Částka nesmí být 0 | Form validation |
| API | UUID validace | Zod schema, Edge Function |

### Automatizace

| Automatizace | Trigger | Akce |
|--------------|---------|------|
| Nedokončené tréninky | 12h po plánovaném čase | Notifikace trenérovi |
| Pozdní zrušení | Zrušení <24h před | Flag `is_late_cancellation = true` |
| Cena tréninku | Počet účastníků | Automatický výpočet podle ceníku |
| PR detekce | Nový záznam cvičení | Porovnání s max váhou |
| Stagnace detekce | Analýza progrese | Alert při absenci progrese |
| Kredit sync | Sdílený rozpočet | Synchronizace balance skupiny |

### Omezení

| Omezení | Popis |
|---------|-------|
| RLS | Všechna data filtrována podle `user_id = auth.uid()` |
| Single tenant | Aplikace pro jednoho trenéra, žádný klientský portál |
| Query limit | Supabase default 1000 řádků |
| Storage | Private buckety, přístup pouze přes RLS |
| Feedback | Token-based přístup pro veřejné formuláře |

### Business pravidla

| Pravidlo | Popis |
|----------|-------|
| Kredit vs hotovost | Hotovostní platba neodečítá kredit |
| Sdílený rozpočet | Všichni členové sdílí jeden balance |
| Archivace | Archivovaní klienti skryti v defaultním seznamu |
| Opakované tréninky | Child sessions linkované přes `parent_session_id` |
| Zpětná vazba | Pouze pro dokončené tréninky |

---

## 6. Návrhy optimalizace

### React best practices

| Oblast | Současný stav | Doporučení |
|--------|---------------|------------|
| Velké komponenty | Některé stránky 300+ řádků | Rozdělit na menší komponenty |
| State management | Mnoho `useState` | Zvážit `useReducer` pro komplexní state |
| Re-renders | Některé zbytečné | Přidat `useMemo`/`useCallback` |
| Error handling | Inconsistentní | Error boundaries, centrální error handling |
| Loading states | Mix spinner/skeleton | Unifikovat na skeleton loaders |

### Supabase optimalizace

| Oblast | Doporučení |
|--------|------------|
| Indexy | Přidat na `client_id`, `date`, `status`, `user_id` |
| Query efektivita | Používat `.select('id, name')` místo `*` |
| RPC funkce | `complete_training()` pro atomické operace |
| Realtime | Zapnout pro `notifications`, `training_sessions` |
| Edge Functions | Přidat rate limiting, lepší error handling |

### Architekturní změny

```typescript
// Příklad: RPC funkce pro atomické dokončení tréninku
CREATE OR REPLACE FUNCTION complete_training(
  p_session_id UUID,
  p_payment_method TEXT
) RETURNS VOID AS $$
DECLARE
  v_price NUMERIC;
  v_client_id UUID;
  v_group_id UUID;
BEGIN
  -- Získání dat tréninku
  SELECT final_price, client_id INTO v_price, v_client_id
  FROM training_sessions WHERE id = p_session_id;
  
  -- Kontrola sdíleného rozpočtu
  SELECT group_id INTO v_group_id
  FROM client_budget_members WHERE client_id = v_client_id;
  
  -- Atomická transakce
  IF p_payment_method = 'credit' THEN
    IF v_group_id IS NOT NULL THEN
      UPDATE client_budget_groups 
      SET shared_balance = shared_balance - v_price 
      WHERE id = v_group_id;
    ELSE
      UPDATE clients 
      SET credit_balance = credit_balance - v_price 
      WHERE id = v_client_id;
    END IF;
    
    INSERT INTO credit_transactions (client_id, amount, type, training_session_id)
    VALUES (v_client_id, -v_price, 'deduction', p_session_id);
  END IF;
  
  UPDATE training_sessions 
  SET status = 'completed', 
      payment_status = 'paid_' || p_payment_method
  WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Performance optimalizace

| Oblast | Doporučení |
|--------|------------|
| Bundle size | Lazy loading pro méně používané stránky |
| Query caching | Delší staleTime pro statická data |
| Optimistic updates | Pro rychlejší UX při CRUD operacích |
| Image optimization | Lazy loading, WebP formát |
| Code splitting | Dynamic imports pro velké komponenty |

### Validace

```typescript
// Centralizované Zod schéma
// src/lib/validations/training.ts
import { z } from 'zod';

export const trainingSchema = z.object({
  client_id: z.string().uuid(),
  date: z.string().datetime(),
  duration: z.number().min(15).max(240).default(60),
  notes: z.string().max(1000).optional(),
  participant_count: z.number().min(1).max(10).default(1),
});

export const completeTrainingSchema = z.object({
  session_id: z.string().uuid(),
  payment_method: z.enum(['credit', 'cash', 'card', 'bank', 'later']),
  rating: z.number().min(1).max(10).optional(),
});
```

---

## 7. API dokumentace

Viz [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) pro kompletní REST API dokumentaci.

---

## 8. Edge Functions

| Funkce | Účel | Trigger |
|--------|------|---------|
| `ai-assistant` | AI chat odpovědi | HTTP request |
| `api-v1` | REST API pro iOS | HTTP request |
| `check-incomplete-trainings` | Kontrola nedokončených | Cron (každou hodinu) |
| `get-feedback-form` | Získání feedback formuláře | HTTP request |
| `ocr-measurement` | OCR extrakce z fotek | HTTP request |
| `send-feedback-email` | Odeslání feedback emailu | HTTP request |
| `submit-feedback` | Uložení feedback odpovědi | HTTP request |

---

## 9. Bezpečnost

### Row Level Security (RLS)

Všechny tabulky mají aktivní RLS s politikami:
- `SELECT`: `auth.uid() = user_id`
- `INSERT`: `auth.uid() = user_id` (WITH CHECK)
- `UPDATE`: `auth.uid() = user_id`
- `DELETE`: `auth.uid() = user_id`

### Výjimky

- `exercises`: Sdílené pro všechny uživatele (SELECT)
- `products`: Sdílené produkty (user_id IS NULL)
- `feedback_requests`: Token-based přístup pro veřejné formuláře

### Storage

- `client-photos`: Private, RLS podle user_id
- `client-audio`: Private, RLS podle user_id
- `measurement-files`: Private, RLS podle user_id

---

*Dokumentace vygenerována: 2025-12-09*
