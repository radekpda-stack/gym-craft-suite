
# Kompletní údržba databáze cviků

## Shrnutí aktuálního stavu

| Metrika | Hodnota |
|---------|---------|
| Celkem cviků | 196 |
| Aktivních | 193 |
| Archivovaných | 3 |
| Chybí equipment | 83 |
| Chybí movement_pattern | 70 |
| Cviků s využitím | 34 |

## Fáze 1: Oprava duplicit

Nalezeno **5 duplicitních párů**:

| Cvik | Varianta 1 | Varianta 2 | Akce |
|------|------------|------------|------|
| Plank | `e70e202b` (0 použití) | `f07f9128` (0 použití) | Smazat jeden |
| Lat Pulldown | `25c7282f` - "Přítah horní kladky" | `c647ac2e` - "Lat Pulldown" | Sloučit, ponechat CZ název |
| Chin-up | `95861643` - "Shyb podhmatem" | `cb080864` - "Shyby nadhmatem" | Opravit - jsou to různé cviky! |
| Thruster | `dd1c6829` (0 použití) | `ea4fad10` (0 použití) | Smazat jeden |
| Zapažování na kladce | `5a01395c` - Tricep Kickback | `da322d40` - Rear Delt Fly | Opravit názvy - jsou to různé cviky! |

**Důležité**: Chin-up (podhmat) a Pull-up (nadhmat) jsou různé cviky - toto není duplicita, ale chyba v názvu.

## Fáze 2: Sjednocení kategorií

Přesun cviků z nestandardních kategorií do standardních:

| Původní kategorie | Počet | Nová kategorie |
|-------------------|-------|----------------|
| Nohy | 2 | Dolní tělo |
| Záda | 2 | Horní tělo |
| Paže | 2 | Horní tělo |
| Ramena | 1 | Horní tělo |
| Hrudník | 1 (archivováno) | - ponechat |
| Síla | 6 | Full Body nebo Horní/Dolní tělo |
| plyometrics | 11 | Dolní tělo (+ přidat tag "plyometrie") |
| conditioning | 1 | Kardio |

## Fáze 3: Doplnění equipment tagů

83 cviků nemá equipment. Přidám podle typu:

| Kategorie equipment | Cviky k aktualizaci |
|--------------------|---------------------|
| kettlebell | Kettlebell Swing, Turkish Get Up, Goblet dřep (opravit) |
| barbell | Bench press, Dřep, Mrtvý tah, Přední dřep, Přítahy v předklonu |
| dumbbells | Arnold Press, Bicepsové zdvihy, Rozpažování, Bench press na šikmé |
| bodyweight | Burpee, Kliky, Shyby, Dipy, Výpady, Výstupy |
| pull-up bar | Muscle-up, Shyby (všechny varianty), Přednožování ve visu |
| dip bars | Dipy na bradlech, Tricepsové kliky |
| bench | Bench press varianty, Hip Thrust |

## Fáze 4: Přidání chybějících cviků

Na základě vybavení (hrazda, bradla, bodyweight, běžecký pás, veslo, skierg, činky, kettlebelly):

### Kettlebell (chybí většina)
- Kettlebell Clean
- Kettlebell Snatch  
- Kettlebell Windmill
- Kettlebell Halo
- Kettlebell Press
- Kettlebell Row
- Kettlebell Lunge

### Hrazda/Bradla (rozšíření)
- Australian Pull-ups (horizontální přítahy)
- Dead Hang (vis)
- Scapular Pull-ups (aktivace lopatek)
- Toes to Bar
- Knee Raises

### Jednoručky (doplnění)
- Dumbbell Pullover
- Renegade Row
- Dumbbell Snatch
- Farmer Walk / Farmer's Carry

### Bodyweight (doplnění)
- Bear Crawl (medvědí chůze)
- Mountain Climbers (horolezci)
- Hollow Body Hold
- Superman Hold
- Glute Bridge

### Kardio - rozšíření běžeckého pásu
- Běh - 400m sprint
- Běh - 3000m
- Běh - Tempo run

## Fáze 5: Oprava movement_pattern

70 cviků nemá movement_pattern. Přiřadím:

| Movement Pattern | Příklady cviků |
|-----------------|----------------|
| push_horizontal | Bench press, Kliky, Dips |
| push_vertical | Tlak nad hlavu, Pike Push-up |
| pull_horizontal | Přítahy v předklonu, Cable Row |
| pull_vertical | Shyby, Lat Pulldown |
| squat | Dřepy, Goblet squat |
| hinge | Mrtvý tah, RDL, Kettlebell Swing |
| lunge | Výpady, Bulharský dřep |
| carry | Farmer Walk, Suitcase Carry |
| core_anti_extension | Plank, Dead Bug |
| core_anti_rotation | Pallof Press |
| conditioning | Burpee, Kardio cviky |

## Bezpečnostní pravidla

1. **NIKDY nesmazat** cviky s `usage_count > 0` (34 cviků má záznamy)
2. Duplicity řešit **archivací**, ne mazáním
3. Při sloučení přesunout všechny `workout_entries` na primární cvik
4. Zálohovat ID původních cviků pro audit

## Technické kroky implementace

### Krok 1: Databázové migrace
```text
1. UPDATE exercises - sjednocení kategorií
2. UPDATE exercises - doplnění equipment arrays
3. UPDATE exercises - doplnění movement_pattern
4. INSERT exercises - nové cviky pro kettlebell, bodyweight, atd.
5. UPDATE exercises - archivace duplicit (is_archived = true)
```

### Krok 2: Standardizace equipment hodnot
Sjednotit na anglické hodnoty:
- "Činka" → "barbell"
- "Jednoručky" → "dumbbells"  
- "Hrazda" → "pull-up bar"
- "Bradla" → "dip bars"
- "Vlastní váha" → "bodyweight"

### Krok 3: Přidání nových cviků
Celkem cca **25 nových cviků** pro pokrytí vybavení:
- 7 kettlebell cviků
- 5 hrazda/bradla cviků
- 4 jednoručkové cviky
- 5 bodyweight cviků
- 3 běžecký pás varianty

## Výsledek po údržbě

| Metrika | Před | Po |
|---------|------|-----|
| Aktivních cviků | 193 | ~215 |
| S equipment | 110 | ~215 |
| S movement_pattern | 126 | ~215 |
| Duplicit | 5 | 0 |
| Nestandardních kategorií | 25 | 0 |
