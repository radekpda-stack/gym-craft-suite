

## Plán: Přidat export kardio a skill/plyo dat do Nastavení

Aktuálně sekce "Export dat" v Nastavení exportuje pouze `exercise_entries` (síla). Chybí data z tabulek `cardio_entries` a `skill_entries`.

### Změny v `DataExportSettings.tsx`

**1. Přidat dvě nové záložky** — rozšířit `ExportTab` na `'clients' | 'performance' | 'cardio' | 'skills'`

**2. Nová funkce `loadCardio`** — dávkově načte `cardio_entries` s joinem na `clients(name)`:
- Sloupce CSV: `Klient;Datum;Cvik;Doba (s);Vzdálenost (m);Průměrná rychlost;Průměrný tep;Max tep;Průměrné watty;Max watty;RPE;PR;Poznámky`

**3. Nová funkce `loadSkills`** — dávkově načte `skill_entries` s joinem na `clients(name)`:
- Sloupce CSV: `Klient;Datum;Cvik;Doba (s);Pokusy;Úspěšné;RPE;Technika;Průlom;Poznámky`

**4. UI** — TabsList se 4 záložkami (Klienti, Výkonnost, Kardio, Dovednosti) s příslušnými ikonami a popisky. Stejná logika kopírování/stahování CSV.

Obě nové funkce použijí stejný batching pattern (po 1000 záznamech) jako stávající `loadPerformance`.

