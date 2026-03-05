

# Plán: Oprava zbývajících chyb + přidání zápisu dat AI agentem

## Nalezené chyby

### 1. `vw_client_ledger_balances` nemá sloupec `user_id`
Řádek 93: `.eq("user_id", userId)` **tiše vrací prázdná data**, protože view nemá `user_id`. View je postavený nad `clients` tabulkou, ale `user_id` neexponuje.

**Řešení:** Odebrat `.eq("user_id", userId)` z dotazu na view. Místo toho filtrovat výsledky v paměti přes `clientIds` (stejně jako u `client_xp` a `loyalty_balance`).

### 2. `c.balance` neexistuje (řádek 182-184)
View má `ledger_balance` a `stored_balance`, ale kód referencuje `c.balance`.

**Řešení:** Změnit na `c.ledger_balance`.

### 3. `vw_group_ledger_balances` — stejný problém?
Řádek 104 filtruje `.eq("user_id", userId)` — potřeba ověřit jestli má `user_id`. Pravděpodobně ano (skupiny mají `user_id`), ale stojí za kontrolu.

---

## Nová funkcionalita: AI agent umí zapisovat data

Aktuálně je agent **čistě read-only** — neumí provést žádnou akci. Přidáme **tool calling** (function calling), kde AI model rozhodne, že chce provést akci, a edge funkce ji vykoná.

### Podporované akce (tools):

| Akce | Tabulka | Popis |
|------|---------|-------|
| `record_pr` | `exercise_entries` | Zaznamenat PR klienta (cvik, váha, sety, repy) |
| `create_sale` | `sales_orders` + `sales_order_items` | Vytvořit prodej (produkt, množství, klient) |
| `add_measurement` | `measurements` | Přidat měření klienta (váha, tuk, obvody) |
| `add_note` | Poznámka do konverzace | Poznámka k budoucímu sledování |
| `schedule_training` | `training_sessions` | Naplánovat trénink |

### Implementace

#### A. Edge funkce (`ai-business-analyst/index.ts`)

1. **Přidat `tools` definice** do AI request body — každý tool má `name`, `description` a `parameters` (JSON Schema)
2. **Detekovat tool calls v odpovědi** — pokud AI vrátí `tool_calls` místo textu, vykonat akci přes Supabase
3. **Vrátit výsledek akce zpět AI** — AI pak odpoví uživateli s potvrzením
4. **Bezpečnost:** Validovat `client_id` patří trenérovi, validovat `product_id` existuje a má stock

#### B. Frontend (`BusinessAnalystChat.tsx`)

1. **Upravit streaming parser** — zpracovat případné multi-turn odpovědi (tool call → result → final response)
2. **Přidat vizuální indikátor** — "Provádím akci..." spinner když agent zapisuje

#### C. System prompt

Rozšířit pravidla:
- Agent smí zapisovat data pouze po explicitním pokynu uživatele
- Před zápisem vždy sumarizovat co udělá a požádat o potvrzení (v textu)
- Po zápisu potvrdit výsledek

### Opravy v jednom kroku:
1. Fix `vw_client_ledger_balances` query (odebrat neexistující filtr, opravit `balance` → `ledger_balance`)
2. Přidat tool calling infrastrukturu
3. Implementovat 3 základní tools: `record_pr`, `create_sale`, `add_measurement`
4. Aktualizovat frontend pro multi-turn streaming
5. Re-deploy

