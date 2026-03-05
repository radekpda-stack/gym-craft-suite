

# Plan: Další vylepšení AI Business Analytika

## Co přidáme

### 1. Konverzační paměť (persistence v DB)
- Nová tabulka `ai_conversations` (id, user_id, messages JSONB, title, created_at, updated_at)
- Chat se automaticky ukládá po každé odpovědi
- Při otevření agenta se načte poslední konverzace
- Tlačítko "Nová konverzace" místo prostého smazání
- Agent vidí předchozí kontext a může navazovat

### 2. Tréninkové plány do kontextu
Agent zatím nevidí `training_plans`. Přidáme aktivní plány klientů (cíl, fáze, frekvence) — agent pak dokáže odpovídat: "Které plány jsou aktivní?", "Plníme tréninkové cíle dle plánu?"

### 3. Feedback requests + response rate
Agent vidí feedbacky, ale nevidí `feedback_requests` — nemá přehled o míře odpovědí. Přidáme: počet odeslaných vs. dokončených, response rate, průměrná doba odpovědi.

### 4. Klientská aktivita a retence
Přidáme analýzu neaktivních klientů — kdo neměl trénink 30+ dní, kdo je "at risk" (dříve aktivní, teď nechodí). Agent proaktivně varuje.

### 5. Kontextové follow-up suggestions
Po každé odpovědi agent nabídne 2-3 relevantní follow-up otázky (ne statické, ale generované AI na základě odpovědi).

### 6. Vylepšený PDF export
- Přidat tabulky do PDF (jspdf-autotable, už nainstalovaný)
- Detekce markdown tabulek → autotable v PDF
- Logo/branding header

## Soubory k úpravě

1. **DB migrace** — nová tabulka `ai_conversations` s RLS
2. **`supabase/functions/ai-business-analyst/index.ts`** — přidat training_plans, feedback_requests, neaktivní klienti, follow-up suggestions instrukce
3. **`src/components/ai/BusinessAnalystChat.tsx`** — persistence (save/load konverzací), follow-up UI, vylepšený PDF s autotable

## Pořadí
1. DB tabulka + konverzační paměť
2. Rozšíření dat (plány, feedback requests, retence)
3. Follow-up suggestions
4. Vylepšený PDF

