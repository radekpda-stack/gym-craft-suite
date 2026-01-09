# Training Tag Workflow Upgrade - Dokumentace

## Přehled změn

Tento upgrade přináší nový workflow pro zadávání tagů a RPE u tréninků, optimalizovaný pro mobil a tablet.

## Databázové změny

### Nové sloupce v `training_sessions`
- `client_rpe` (INT 1-10) - RPE z pohledu klienta (denormalizováno z feedbacku)
- `training_load` (INT) - automaticky počítáno jako `duration * COALESCE(client_rpe, rpe)`

### Nová tabulka `training_presets`
Ukládá rychlé sady pro předvyplnění tréninků:
- `name` - název sady
- `icon` - ikona (emoji)
- `training_type` - typ tréninku
- `focus_tag_ids` - tagy zaměření
- `intensity_tag_id` - tag intenzity
- `body_part_tag_ids` - tagy partií těla
- `default_rpe` - výchozí RPE

### Triggery
1. `trg_calculate_training_load` - automaticky přepočítá training_load při změně duration/rpe/client_rpe
2. `trg_sync_client_rpe` - synchronizuje client_rpe z training_feedback při změně difficulty

## Nové komponenty

### `TrainingTagStepper`
5-krokový wizard pro výběr:
1. Typ tréninku (single-select)
2. Zaměření (multi-select)
3. Intenzita (single-select)
4. Partie těla (multi-select)
5. RPE trenéra (1-10)

### `RPEInputField`
10 tlačítek pro rychlé zadání RPE s barevným rozlišením a popisky.

### `TrainingPresetSelector`
Horizontální scroll s rychlými sadami. Možnost vytvoření nové sady z aktuálního stavu.

### `ClientTrainingLoadCard`
Karta na profilu klienta zobrazující:
- Průměrné RPE (coach/client) za 7 a 28 dní
- Celkový training load
- Graf trendu RPE v čase
- Rozdíl mezi coach a client RPE
- Rozpad podle typu tréninku

## Nové hooky

### `useTrainingPresets`
CRUD operace pro rychlé sady.

### `useTrainingLoadStats`
Statistiky RPE a training load pro klienta.

---

## Test Checklist

### Regresní testy (nerozbít existující)
- [ ] Filtry dle tagů fungují stejně jako před upgradem
- [ ] Statistiky tagů vrací správná data
- [ ] Stávající tréninky se zobrazují správně (i bez RPE)
- [ ] Historické tréninky bez nových polí se zobrazí bez chyby

### Nové funkce - TrainingTagStepper
- [ ] Typ tréninku se uloží při výběru
- [ ] Zaměření (multi-select) funguje správně
- [ ] Intenzita (single-select) - opětovný klik odznačí
- [ ] Partie těla (multi-select) s badges "Vybrané"
- [ ] RPE tlačítka 1-10 s barevným rozlišením
- [ ] Shrnutí nahoře zobrazuje všechny vybrané hodnoty

### Rychlé sady
- [ ] Načtení existujících sad
- [ ] Aplikace sady předvyplní všechny hodnoty
- [ ] Po aplikaci lze hodnoty upravit
- [ ] Vytvoření nové sady z aktuálního stavu
- [ ] Smazání sady s potvrzením

### RPE a Training Load
- [ ] Coach RPE se ukládá do training_sessions.rpe
- [ ] Client RPE se denormalizuje z training_feedback.difficulty
- [ ] Training Load = duration × COALESCE(client_rpe, rpe)
- [ ] Zobrazení rozdílu coach vs client RPE
- [ ] Varování při velkém rozdílu (≥3)

### ClientTrainingLoadCard
- [ ] Zobrazení průměrů 7d a 28d
- [ ] Graf trendu RPE
- [ ] Trend load (increasing/stable/decreasing)
- [ ] Rozpad podle typu tréninku

### Mobile/Tablet UX
- [ ] Chips mají dostatečnou velikost pro dotyk (min 44px)
- [ ] Kompletní vyplnění do 5-7 tapů
- [ ] Collapsible sekce fungují
- [ ] Horizontální scroll u rychlých sad

### Edge cases
- [ ] Trénink bez tagů - uloží se bez chyby
- [ ] Trénink s canceled statusem - RPE se nevyžaduje
- [ ] Historická data bez client_rpe - zobrazí se null/"-"
- [ ] Prázdný seznam rychlých sad - zobrazí pouze tlačítko "Nová sada"

---

## Zpětná kompatibilita

- Všechny existující tagy a jejich relace zůstávají beze změny
- Staré UI komponenty (TrainingTagsSelector, TrainingTypeSelector) jsou stále dostupné
- Migrace existujících dat proběhla automaticky při spuštění DB migrace
- Historické tréninky bez RPE se zobrazují správně (null hodnoty)
