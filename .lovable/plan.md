
# Komplexní vylepšení sekce Výkonnost – Tréninkový deník pro trenéra

## Analýza aktuálního stavu

Po důkladném prozkoumání kódu jsem identifikoval konkrétní nedostatky a příležitosti pro zlepšení:

### Co funguje dobře (zachovat):
- Záložky (Přehled, Deník, Cviky, Analytika) jsou přejmenované
- Blok "Aktivita dnes" existuje v Přehledu
- CTA tlačítko "Zapsat výkon klientovi" je přítomno
- Barevné indikátory aktivity v ClientList (zelená/žlutá/červená dot)
- ExerciseDetailView s grafem progrese
- JournalView s filtry (Síla/Kardio/Plyo)

### Co chybí nebo je slabé (vylepšit):

**1. Záložka Přehled – slabá hierarchie informací**
- Blok "Aktivita dnes" je esteticky chudý – pouze textový seznam bez vizuální hierarchie
- "Nedávno použité cviky" jsou pouhé chipy bez kontextu – kliknutí jde na detail, ale neotevírá zápis
- Sekundarita RecentPRsCompact je skrytá dole – PR jsou motivační prvek, patří výš
- KPI bar je první věc po CTA, ale neobsahuje žádná "dnešní" čísla

**2. Záložka Deník (ClientList) – chybí klíčové informace**
- Avatar je jen iniciála bez barvy vztažné k aktivitě
- Nevidíme počet cviků / posledních 30 dní u klienta
- Žádné rychlé akce z listu klientů (přidat záznam přímo z listu)

**3. ExerciseSearchCommand – naviguje na detail cviku, NE na zápis**
- Trenér hledá cvik → chce ZAPSAT, ne si ho prohlédnout
- Potřebujeme rychlou volbu: "Zapsat" nebo "Detail"

**4. Záložka Cviky – kategorie accordion je pomalá pro mobilního uživatele**
- Kategorie jsou sbalené → dva kliky pro dosažení cviku
- Pro trenéra v terénu je to zbytečná friction

**5. RecentExercisesChips – naviguje na detail, místo zápisu**
- Hlavní účel trenéra při opakovaném cviku = ZAPSAT, ne prohlédnout

---

## Navrhované změny

### A. Přehled – přepracování "Aktivita dnes" bloku na bohatý Journal Feed
**Soubor:** `src/pages/PerformanceHub.tsx` (Today's Activity section)

Místo jednoduchého textového listu:
- Každý záznam zobrazí: typ-ikona (barva), jméno cviku, klient (tučně), klíčová hodnota (kg/čas/reps) prominentně, čas záznamu
- Prázdný stav je větší a motivující s animovanou ikonou
- Přidat tlačítko "Zobrazit vše" pokud je záznamů více než 5

### B. Přehled – PR jako primární motivační widget
**Soubor:** `src/components/performance/RecentPRsCompact.tsx`

PR přesunout nad leaderboard, přidat "konfeti efekt" - vizuální zvýraznění nejnovějšího PR. Přidat počet PR za dnešní den prominentně v záhlaví.

### C. ExerciseSearchCommand – přidat možnost přímého zápisu ze search
**Soubor:** `src/components/performance/ExerciseSearchCommand.tsx`

Rozšíření props o `onQuickLog` callback. Při výběru cviku se zobrazí mini-akcní menu:
- "Zapsat výkon" → otevře QuickLogDialog s předvyplněným exerciseId
- "Zobrazit detail" → naviguje na /exercises/:id

### D. RecentExercisesChips – přidat inline "+" tlačítko
**Soubor:** `src/components/performance/RecentExercisesChips.tsx`

Každý chip bude mít dvě části:
- Kliknutí na název → navigace na detail (stávající chování)
- Kliknutí na "+" ikonu → okamžitý zápis (QuickLogDialog s exerciseId)

Přejmenovat komponentu na "Oblíbené / Nedávné cviky" a přidat callback `onQuickLog`.

### E. ClientList – výrazné vylepšení karet klientů
**Soubor:** `src/components/performance/ClientProgressView.tsx` (ClientList sekce)

Aktuální karty klientů mají pouze iniciálu a jméno. Nový design:
- **Avatar s plnou barvou** podle statusu aktivity (zelená/žlutá/červená tint)
- **"Naposledy aktivní"** zobrazeno jako prominentní text, ne jen badge
- **Počet záznamů za poslední měsíc** jako mini-stat
- **Inline "+" tlačítko** pro rychlý zápis přímo z listu (bez nutnosti vstoupit do deníku)
- Klienti jsou seřazeni: nejdříve ti s červeným statusem (potřebují pozornost)

### F. JournalView – přidání týdenního přehledu při vstupu do deníku klienta
**Soubor:** `src/components/performance/ClientProgressView.tsx` (JournalView)

Po výběru klienta zobrazit kompaktní "week strip" – malý horizontální pás s posledními 7 dny (den + počet záznamů jako tečky). Trenér okamžitě vidí, kdy byl klient naposledy aktivní.

### G. QuickLogDialog přes ExerciseSearchCommand
**Soubor:** `src/pages/PerformanceHub.tsx`

Předat `setShowQuickLog` a `setQuickLogExerciseId` do ExerciseSearchCommand, aby mohl otevřít dialog přímo ze search. Přidat stav `quickLogExerciseId` do PerformanceHub.

---

## Pořadí implementace

1. **ClientList vylepšení** – největší dopad na operativní flow (inline zápis + sorting)
2. **RecentExercisesChips inline "+" tlačítko** – okamžitá akce z Přehledu
3. **ExerciseSearchCommand → Quick Log** – search jako vstupní bod pro zápis
4. **Today Activity blok** – bohatší vizuální prezentace záznamů
5. **JournalView week strip** – kontextový přehled aktivity klienta

---

## Technické soubory ke změně

| Soubor | Změna |
|---|---|
| `src/pages/PerformanceHub.tsx` | Stav pro quickLogExerciseId, předání callbacků do child komponent, bohatší Today Activity |
| `src/components/performance/ClientProgressView.tsx` | Výrazné přepracování ClientList (avatar barvy, inline +, sorting) + JournalView week strip |
| `src/components/performance/RecentExercisesChips.tsx` | Přidání inline "+" tlačítka, onQuickLog prop |
| `src/components/performance/ExerciseSearchCommand.tsx` | Přidání onQuickLog prop, dual-action výběr |
