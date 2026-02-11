
# Chytrejsi, hezci a intuitivnejsi aplikace pro trenera

## Analyza soucasneho stavu

Aplikace ma solidni zaklad: dashboard s Morning Briefing, Action Center, Smart Alerts, Coaching Tips, Client Readiness scoring a Insights system. Nicmene mnoho z techto "chytrych" funkci je roztrousenych, reaktivnich (zobrazuji az kdyz je problem) a chybi jim proaktivni charakter - tzn. aplikace ti nerekne "co delat dal" sama od sebe.

---

## Oblast 1: Proaktivni denni plan ("Co delat dnes")

### Problem
Dashboard ukazuje timeline treningu a akce k vyrizeni, ale nerekne trenérovi: "Zacni timhle, potom udelej tohle." Trener musi sam premyslet, co je dulezite.

### Reseni: Smart Daily Planner Card
Nova komponenta na dashboardu, ktera generuje serazeny seznam dnesních ukolu podle priority:

1. **Pripravit se na dalsi trenink** - Jmeno klienta, readiness skore, coaching tip (z existujicich hooku `useClientReadiness` + `useLastTraining`)
2. **Vyresit financni akce** - Neuhrazene treninky, nizkych kredity
3. **Zkontrolovat feedbacky** - Nevyhodnocene feedbacky z vcera
4. **Odeslat follow-upy** - Pripomenuti klientum

```
┌─────────────────────────────────────┐
│  🧠 Tvuj plan na dnes              │
│                                     │
│  1. 09:00 Jan Novak                 │
│     ⚠️ Hlasil bolest kolene (7/10)  │
│     💡 Zeptej se na aktualni stav   │
│                                     │
│  2. 10:30 Petra Svobodova           │
│     ✅ Readiness 85% - muzes pridat │
│                                     │
│  3. 💰 3 neuhrazene treninky        │
│     → Pripomen platbu               │
│                                     │
│  4. 📋 2 feedbacky k vyhodnoceni    │
│     → Otevrit                       │
└─────────────────────────────────────┘
```

### Technicke zmeny
- Nova komponenta `SmartDailyPlanCard.tsx`
- Pouziva existujici hooky: `useDashboardViewModel`, `useClientReadiness`, `useLastTraining`, `usePendingFeedbackTrainings`
- Pridat do `Index.tsx` jako prvni sekci po DashboardHeader

---

## Oblast 2: Kontextove informace o klientovi v rozvrhu

### Problem
Rozvrh (`SchedulePage`) ukazuje jen jmeno klienta a cas. Trener nevi, jaky je stav klienta, nez na trenink klikne.

### Reseni: Obohacene karty v rozvrhu
Pridat do `AgendaItem` micro-indikatory:

- **Readiness dot** (zelena/zluta/cervena) vedle jmena
- **Posledni feedback summary** - jednoradkovy text pod casem
- **Coaching tip badge** - pokud existuje varování z posledniho treninku
- **Kredit indikator** - maly badge s aktualnim zustatkem

```
┌───────────────────────────────────────┐
│  09:00  🟢 Jan Novak         900 Kč  │
│         Posledne: silovy, nohy       │
│         RPE 7, bez problemu          │
├───────────────────────────────────────┤
│  10:30  🟡 Petra Svobodova   1200 Kč │
│         ⚠️ Hlasila bolest zad (5/10) │
│         Zvaz upravit objem           │
└───────────────────────────────────────┘
```

### Technicke zmeny
- Upravit `AgendaItem.tsx` - pridat hook `useLastTraining` a `useClientReadiness`
- Pridat kompaktni sub-row s kontextem
- Data se cachuji, nebude to spomalovat

---

## Oblast 3: AI-powered shruti klienta

### Problem
Karta klienta ma mnoho tabu a dat. Trener musi klikat, aby ziskal celkovy obraz.

### Reseni: Client AI Summary
Pridat na kartu klienta "Quick Summary" - 2-3 vety generovane z dostupnych dat pomoci Lovable AI:

```
"Jan trenuje 2x tydne, posledni 3 mesice stabilne. Jeho bench press 
rostl o 15% za mesic. Posledne hlasil mirnou bolest kolene - sleduj."
```

### Technicke zmeny
- Nova edge funkce `generate-client-summary` pouzivajici Lovable AI (gemini-2.5-flash)
- Vstup: posledni treninky, feedbacky, PR trend, readiness score
- Cachovat vysledek na 24h v databazi (nova tabulka `client_ai_summaries`)
- Zobrazit na karte klienta v "Prehled" tabu

---

## Oblast 4: Chytre navrhy pri vytvareni treninku

### Problem
Pri tvorbe noveho treninku trener zacina od nuly - vybira klienta, cas, typ. Aplikace nenapovi.

### Reseni: Smart Suggestions v CreateTrainingSheet
1. **Auto-suggest cas** - podle nejcastejsiho casu klienta
2. **Doporuceny typ treninku** - rotovat parti (pokud posledne byly nohy, navrhnout horni telo)
3. **Navrhnout delku** - podle historie
4. **Upozornit na kolize** - "Tento klient ma jiz trenink ve 14:00"

### Technicke zmeny
- Novy hook `useTrainingSuggestions(clientId)` ktery analyzuje historii
- Integrace do `CreateTrainingSheet.tsx` a `TrainingForm.tsx`

---

## Oblast 5: Vizualni modernizace dashboardu

### Problem
Dashboard ma 6+ karet pod sebou - dlouhy scroll, kazda karta vypada jinak.

### Reseni: Vizualni konsolidace

1. **Spojit WeeklyQuickStats + FinanceSummaryCard** do jednoho "Prehled tydne" s horizontalnim scrollem na mobilu
2. **Insights integrovany primo do karet** misto samostatne sekce - napriklad insight o prijmech rovnou v Finance karte
3. **Cashflow Forecast** presunout do Finance karty jako collapsible sekci
4. **Pridat animovane prechody mezi sekcemi** - staggered fade-in
5. **Zjednodusit prazdne stavy** - misto velke prazdne ikony jen jednoradkovy text

### Technicke zmeny
- Refactor `Index.tsx` - mene sekcí, vice konsolidace
- Nova `WeekOverviewCard.tsx` ktera kombinuje stats + finance
- Presunout CashflowForecast do FinanceSummaryCard

---

## Oblast 6: Chytra navigace a zkratky

### Problem
Trener musi navigovat pres menu do konkretnich sekci. Zadna kontextova navigace.

### Reseni: Kontextove akce na dashboardu

1. **Quick Actions integrovane do karet** - "Dokoncit" tlacitko primo na Timeline karte uz existuje, pridat "Vytvorit" na prazdny den
2. **Command Palette vylepseni** - pridat prikazy jako "Ukaz mi dnesni klienty", "Kdo ma nizky kredit?", "Dalsi trenink s Janem"
3. **Swipe gesta v timeline** - swipe doprava na trenink = rychle dokonceni (jako v klientech)

### Technicke zmeny
- Rozsirit `CommandPalette.tsx` o smart commands
- Pridat swipe do `TodayTimelineCompact.tsx`

---

## Oblast 7: Lepsi mobilni UX

### Problem
Na mobilu jsou nektere karty prilis velke a vyzaduji hodne scrollovani.

### Reseni
1. **Collapsible sekce** - Insights, Finance, Cashflow defaultne sbalene na mobilu
2. **Horizontalni scroll pro metriky** - misto grid 3x1 pouzit horizontalni posun
3. **Bottom sheet pro detail** - kliknuti na metriku na dashboardu otevre sheet zdola misto navigace
4. **Vetsi touch targets** - minimalne 44px pro vsechny interaktivni elementy

### Technicke zmeny
- Pridat responsive logiku (media query / `useIsMobile`) do dashboard karet
- Implementovat `useMediaQuery` pro podminene sbaleni sekcí

---

## Prioritizace implementace

| Priorita | Oblast | Dopad | Slozitost |
|----------|--------|-------|-----------|
| 1 | Smart Daily Planner Card | Vysoky - trener vi co delat | Stredni |
| 2 | Kontextove info v rozvrhu | Vysoky - mene klikani | Nizka |
| 3 | Vizualni konsolidace dashboardu | Stredni - cistejsi UI | Stredni |
| 4 | Chytre navrhy pri tvorbe treninku | Stredni - rychlejsi prace | Stredni |
| 5 | Lepsi mobilni UX | Stredni - pohodlnejsi | Nizka |
| 6 | Chytra navigace | Nizky - power users | Nizka |
| 7 | AI summary klienta | Vysoky - ale vyzaduje edge fn | Vysoka |

---

## Soubory k uprave

| Soubor | Zmena |
|--------|-------|
| `src/pages/Index.tsx` | Pridat SmartDailyPlanCard, konsolidovat sekce |
| `src/components/dashboard/SmartDailyPlanCard.tsx` | NOVA - proaktivni denni plan |
| `src/components/dashboard/WeekOverviewCard.tsx` | NOVA - spojeni stats + finance |
| `src/components/calendar/AgendaItem.tsx` | Pridat readiness dot + coaching context |
| `src/hooks/useSmartDailyPlan.ts` | NOVY - agregace denniho planu |
| `src/hooks/useTrainingSuggestions.ts` | NOVY - navrhy pro novy trenink |
| `src/components/trainings/CreateTrainingSheet.tsx` | Integrace suggestions |
| `src/components/dashboard/TodayTimelineCompact.tsx` | Swipe gesta, readiness dot |
| `src/components/dashboard/FinanceSummaryCard.tsx` | Integrace cashflow forecast |
| `src/components/search/CommandPalette.tsx` | Smart commands |

---

## Ocekavany vysledek

- Trener rano otevre aplikaci a OKAMZITE vi, co ma delat
- Kazdy trenink v rozvrhu ukazuje kontext klienta BEZ klikani
- Dashboard je kompaktnejsi, mene scrollovani
- Pri tvorbe treninku aplikace navrhovne optimalni parametry
- Na mobilu je aplikace pohodlnejsi s mensim scrollovanim
- Celkovy dojem: "Aplikace mi pomaha, ne jen ukazuje data"
