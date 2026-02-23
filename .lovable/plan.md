

# Verejna statisticka vizitka trenera

## Co vznikne
Nova verejna stranka (napr. `/stats/:userId` nebo `/vizitka/:slug`), ktera bude fungovat jako atraktivni "dashboard vizitka" trenera. Stranka nebude vyzadovat prihlaseni a bude ji mozne sdilet jako odkaz nebo vlozit na web.

## Zobrazene udaje

### Hlavni metriky (CircularGauge / cifernikove ukazatele)
- **Pocet aktivnich klientu** - gauge s maximem napr. 30
- **Kapacitni vytizeni** - procento (kolik slotu je obsazeno vs. maximum)
- **Celkovy pocet odtrenrovanych hodin** (od zacatku pouzivani aplikace)
- **Pocet treninku tento mesic** - s trendem vs. prumer

### Top osobni rekordy klientu (PRs showcase)
- Bench Press - nejlepsi PR napric vsemi klienty
- Drep (Squat) - nejlepsi PR
- Mrtvy tah (Deadlift) - nejlepsi PR
- Dalsi top cviky podle dat v databazi

### Treninkova aktivita
- Sparkline graf mesicniho poctu treninku (posledni rok)
- Celkovy pocet unikatnich cviku v knihovne
- Prumerne RPE treninku

### Trenerskska kariéra
- "Trenér od" - datum prvniho treninku v systemu
- Celkovy pocet treninku
- Celkovy pocet klientu (vcetne archivovanych = celkem provedenych)

## Vizualni styl
- Tmave tema, glassmorphismus, konzistentni s existujicim designem (Apple Fitness / Whoop estetika)
- Pouziti existujicich komponent: `CircularGauge` (cifernikove ukazatele), `GaugeCard`, `SparklineCard`, `AnimatedCounter`
- Hero sekce s jmenem trenera a logem
- Responzivni grid - na mobilu 2 sloupce, na desktopu 3-4
- Animovane pocitadla pri nacteni (framer-motion)
- Bez interaktivnich prvku - ciste nahledy

## Technicke reseni

### Nova edge funkce: `public-trainer-stats`
- Prijima `userId` jako parametr
- Nemuze byt volana jen tak - overuje, ze uzivatel ma v nastaveni povolenou verejnou vizitku
- Agreguje data z tabulek: `clients`, `training_sessions`, `exercise_entries`, `exercises`
- Vraci JSON s predpocitanymi metrikami (zadne citlive udaje)

### Nove nastaveni v databazi
- Sloupec `public_stats_enabled` (boolean, default false) v tabulce `profiles`
- Sloupec `public_stats_slug` (unique text) pro hezke URL

### Nova stranka: `src/pages/PublicTrainerStats.tsx`
- Verejna (bez `ProtectedRoute`)
- Route: `/trenér/:slug`
- Nacita data z edge funkce
- Zobrazuje metriky pomoci existujicich chart komponent

### Nova komponenta: `src/components/public-stats/TrainerStatsShowcase.tsx`
- Hlavni layout s hero sekcí, gauge gridem, PR tabulkou a sparkline grafy

### Nove nastaveni v Settings
- Toggle pro zapnuti/vypnuti verejne vizitky
- Pole pro nastaveni slug (URL)
- Nahled odkazu ke sdileni

### Routing
- Pridani nove public route v `App.tsx` vedle existujicich public routes (`/feedback`, `/challenge/:slug`)

## Souhrn souboru k vytvoreni/upraveni
1. **Nova** edge funkce `supabase/functions/public-trainer-stats/index.ts`
2. **Nova** stranka `src/pages/PublicTrainerStats.tsx`
3. **Nove** komponenty v `src/components/public-stats/`
4. **Migrace** - pridani sloupcu do `profiles`
5. **Uprava** `src/App.tsx` - nova route
6. **Uprava** Settings - toggle pro verejnou vizitku

