

# Plan: Rozšíření AI Business Analytika

## Co agent umí teď
- Finanční přehled (kredity, dluhy, příjmy, náklady)
- Tréninkové statistiky (tento/minulý měsíc, roční trend, typy)
- Prodejové metriky (tržby, marže, nízké zásoby)
- Export: kopírování textu, stažení .txt

## Co chybí a co doplníme

### 1. Rozšíření datového kontextu (edge function)
Přidáme do funkce `ai-business-analyst` načítání dalších dat:

- **Feedbacky klientů** — z `training_feedback` (body_feel, pain, energy, red flags za posledních 90 dní) pro analýzu spokojenosti a health-rizik
- **Účastníci tréninků** — z `training_participants` pro přesné počty duo/group tréninků a vytížení klientů
- **Skupinové rozpočty** — z `vw_group_ledger_balances` pro přehled skupinových kreditů
- **Hodinová sazba** — výpočet skutečné hodinové sazby z `duration` a `final_price`
- **Top klienti** — seřazení dle počtu tréninků a útraty za rok
- **Storno statistiky** — míra zrušení, storno poplatky
- **Denní rozvrh** — dnešní a zítřejší naplánované tréninky

### 2. Rozšíření suggested prompts
Přidáme nové rychlé dotazy:
- "Jaká je moje hodinová sazba?"
- "Kteří klienti mají bolesti nebo red flagy?"
- "Top 10 klientů podle tržeb"
- "Statistika storen za posledních 30 dní"
- "Co mám dnes a zítra v rozvrhu?"
- "Shrň feedbacky klientů za týden"
- "Připrav PDF report"

### 3. PDF export
Přidáme tlačítko "Stáhnout PDF" vedle existujícího "Stáhnout .txt" — využije `jspdf` (už nainstalovaný) pro vytvoření formátovaného PDF reportu z AI odpovědi.

### 4. Markdown rendering
Nahradíme plain-text rendering za `react-markdown` pro správné zobrazení tabulek, odrážek a formátování z AI odpovědí. Bude potřeba přidat závislost `react-markdown`.

### 5. Vylepšení system promptu
Rozšíříme instrukce pro AI:
- Proaktivní doporučení a varování
- Možnost generovat strukturované reporty pro PDF
- Analýza trendů a srovnání období
- Schopnost identifikovat rizikové klienty (neaktivní, bolesti, dluhy)

## Soubory k úpravě
1. **`supabase/functions/ai-business-analyst/index.ts`** — rozšíření datových dotazů + system prompt
2. **`src/components/ai/BusinessAnalystChat.tsx`** — markdown rendering, PDF export, nové suggested prompts
3. Instalace balíčku `react-markdown`

