

# Návrh rozšíření AI Business Analytika

## Co agent umí teď
- Finanční přehled (kredity, dluhy, příjmy, náklady, hodinová sazba)
- Tréninkové statistiky (tento/minulý měsíc, rok, typy, storna)
- Prodejové metriky (tržby, marže, nízké zásoby)
- Feedbacky klientů (bolesti, red flagy, RPE)
- Denní rozvrh (dnes, zítra)
- Top klienti, skupinové rozpočty
- Export: kopírování, .txt, PDF

## Navrhovaná vylepšení

### 1. Konverzační paměť a kontextové follow-upy
Teď se konverzace smaže po zavření panelu. Přidáme možnost uložit konverzaci do databáze, aby agent mohl navázat tam, kde se skončilo, i po restartu.

### 2. Plná stránka s AI asistentem
Kromě bočního panelu vytvořit plnou stránku `/ai-analyst` v menu — více prostoru pro dlouhé reporty, tabulky a grafy.

### 3. Výkonnostní data klientů (cviky, PR, objemy)
Agent zatím nevidí data o cvicích. Přidáme do edge function data z `exercise_entries` — agent pak dokáže odpovídat na:
- "Jaké jsou PR klienta XY?"
- "Kteří klienti mají nejvyšší objem za měsíc?"
- "Trend síly u klienta XY"

### 4. Automatické denní/týdenní shrnutí
Přidáme funkci, která při otevření agenta automaticky načte krátký briefing dne (rozvrh, úkoly, varování) bez nutnosti psát dotaz — jako "ranní dashboard".

### 5. Grafy přímo v chatu
Agent vrací pouze text. Přidáme detekci strukturovaných dat v odpovědi (tabulky/čísla) a vykreslíme je jako mini-grafy (Recharts) přímo v chatu — např. měsíční trend příjmů jako bar chart.

### 6. Hlasový vstup
Přidáme mikrofon tlačítko vedle textového vstupu. Použijeme Web Speech API (nativní v prohlížeči) pro speech-to-text — trenér může mluvit místo psaní.

### 7. Srovnání s předchozím obdobím jedním kliknutím
Přidáme quick-action tlačítka: "vs. minulý měsíc", "vs. minulý rok" — agent automaticky dostane kontext obou období a porovná.

### 8. Zdravotní profil klienta
Agent vidí feedbacky, ale nevidí `health_restrictions` a `training_goals` z tabulky klientů. Přidáme tato data, aby mohl odpovídat: "Kteří klienti mají zdravotní omezení?" nebo "Plníme tréninkové cíle?"

## Doporučené pořadí implementace

1. **Zdravotní profil klienta** — rychlé, jen přidat data do edge function
2. **Výkonnostní data** — rozšíření edge function o exercise_entries
3. **Plná stránka AI** — lepší UX pro reporty
4. **Automatický briefing** — ranní shrnutí při otevření
5. **Grafy v chatu** — vizualizace dat
6. **Konverzační paměť** — persistence
7. **Hlasový vstup** — kvalita života
8. **Srovnání období** — quick-actions

## Soubory k úpravě
1. `supabase/functions/ai-business-analyst/index.ts` — rozšíření dat (health, exercise_entries)
2. `src/components/ai/BusinessAnalystChat.tsx` — briefing, grafy, voice, UI
3. `src/pages/AIAnalyst.tsx` — nová plná stránka
4. Routing + navigace

