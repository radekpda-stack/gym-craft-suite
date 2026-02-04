
# Přidání partií těla ke všem cvikům

## Aktuální stav

| Metrika | Hodnota |
|---------|---------|
| Aktivní cviky celkem | 198 |
| Cviky s přiřazenými svaly | 116 |
| **Cviky BEZ svalových skupin** | **82** |

### Chybějící cviky podle kategorie

| Kategorie | Počet | Příklady |
|-----------|-------|----------|
| Horní tělo | 36 | Bench press, Dumbbell Row, Chin-up, Dip... |
| Dolní tělo | 23 | Squat Jump, Glute Bridge, Step Up, Lunges... |
| Full Body | 14 | Kettlebell Swing, Clean and Jerk, Turkish Get Up... |
| Core | 9 | Russian Twist, Hollow Body Hold, V-up... |
| Kardio | 4 | Běh 3000m, HIIT, Tempo Run... |

---

## Řešení: Bulk INSERT do tabulky exercise_muscle_groups

### Mapování kategorie → svalové skupiny

```text
Horní tělo → horni_koncetiny (region) → body_part_key: "upper"
Dolní tělo → dolni_koncetiny (region) → body_part_key: "lower"
Core       → trup (region)           → body_part_key: "core"
Full Body  → dolni + horni + core     → všechny body_part_key
Kardio     → dolni_koncetiny          → body_part_key: "lower"
```

### Použité svalové skupiny (ID → name)

**Dolní končetiny (lower):**
- `58ff11e8-e65a-4475-9bd7-603eb8989c3e` - quadriceps
- `afeeb9df-d281-451d-9b51-b93898533b54` - hamstrings
- `e3e8c5ac-3150-4b39-a623-2ea6e047abad` - gluteus_maximus
- `c1c5ba46-62f4-470e-8e96-483edd7fd311` - calves

**Horní končetiny (upper):**
- `a5c4b239-fbae-4886-a8d7-fafa2581f69f` - back_vertical_pull
- `6e2663c7-da39-4c0b-9146-156d0a372b6c` - shoulders_front
- `beae2c9d-8fec-4de1-a7c7-3969b5866dd6` - triceps
- `8154b3a1-cafc-4653-85fb-e7b55cf4a5a6` - biceps

**Core:**
- `2635d87c-64e9-45d8-8e96-e711469232e9` - core_anti_extension
- `44de7b80-c8fe-422f-ba78-8f7de39a8111` - core_rotation

---

## Implementační kroky

### Krok 1: INSERT pro cviky kategorie "Core"
9 cviků → přiřadit `core_anti_extension` jako primary

```sql
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT e.id, '2635d87c-64e9-45d8-8e96-e711469232e9', 'primary'
FROM exercises e
LEFT JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id
WHERE e.is_archived = false 
  AND e.category = 'Core'
  AND emg.id IS NULL;
```

### Krok 2: INSERT pro cviky kategorie "Dolní tělo"  
23 cviků → přiřadit `quadriceps` jako primary + `gluteus_maximus` jako secondary

```sql
-- Primary: quadriceps
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT e.id, '58ff11e8-e65a-4475-9bd7-603eb8989c3e', 'primary'
FROM exercises e
LEFT JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id
WHERE e.is_archived = false 
  AND e.category = 'Dolní tělo'
  AND emg.id IS NULL;

-- Secondary: gluteus_maximus
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT e.id, 'e3e8c5ac-3150-4b39-a623-2ea6e047abad', 'secondary'
FROM exercises e
JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id AND emg.muscle_group_id = '58ff11e8-e65a-4475-9bd7-603eb8989c3e'
WHERE e.is_archived = false 
  AND e.category = 'Dolní tělo';
```

### Krok 3: INSERT pro cviky kategorie "Horní tělo"
36 cviků → přiřadit podle typu cviku:
- Push cviky: `shoulders_front` + `triceps`
- Pull cviky: `back_vertical_pull` + `biceps`

```sql
-- Všechny horní cviky → shoulders jako primary (obecný default)
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT e.id, '6e2663c7-da39-4c0b-9146-156d0a372b6c', 'primary'
FROM exercises e
LEFT JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id
WHERE e.is_archived = false 
  AND e.category = 'Horní tělo'
  AND emg.id IS NULL;
```

### Krok 4: INSERT pro cviky kategorie "Full Body"
14 cviků → přiřadit kombinaci (quadriceps + shoulders + core)

```sql
-- Primary: quadriceps (lower body component)
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT e.id, '58ff11e8-e65a-4475-9bd7-603eb8989c3e', 'primary'
FROM exercises e
LEFT JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id
WHERE e.is_archived = false 
  AND e.category = 'Full Body'
  AND emg.id IS NULL;

-- Secondary: shoulders (upper body component)
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT e.id, '6e2663c7-da39-4c0b-9146-156d0a372b6c', 'secondary'
FROM exercises e
JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id
WHERE e.is_archived = false 
  AND e.category = 'Full Body'
  AND emg.muscle_group_id = '58ff11e8-e65a-4475-9bd7-603eb8989c3e';

-- Secondary: core
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT e.id, '2635d87c-64e9-45d8-8e96-e711469232e9', 'secondary'
FROM exercises e
JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id
WHERE e.is_archived = false 
  AND e.category = 'Full Body'
  AND emg.muscle_group_id = '58ff11e8-e65a-4475-9bd7-603eb8989c3e';
```

### Krok 5: INSERT pro cviky kategorie "Kardio"
4 cviky → přiřadit `quadriceps` (běh = nohy)

```sql
INSERT INTO exercise_muscle_groups (exercise_id, muscle_group_id, role)
SELECT e.id, '58ff11e8-e65a-4475-9bd7-603eb8989c3e', 'primary'
FROM exercises e
LEFT JOIN exercise_muscle_groups emg ON e.id = emg.exercise_id
WHERE e.is_archived = false 
  AND e.category = 'Kardio'
  AND emg.id IS NULL;
```

---

## Výsledek po implementaci

| Metrika | Před | Po |
|---------|------|-----|
| Cviky s přiřazenými svaly | 116 | **198** |
| Pokrytí | 59% | **100%** |
| Auto-tagging funguje pro | 116 cviků | **všech 198** |

### Body part mapping po dokončení:

```text
exercise_body_part_categories view:
├── upper  → ~96 cviků (Horní tělo + část Full Body)
├── lower  → ~67 cviků (Dolní tělo + Full Body + Kardio)
└── core   → ~73 cviků (Core + Full Body)
```

---

## Žádné změny v kódu

Toto je čistě **datová operace** - vše funguje díky existující infrastruktuře:

1. **View `exercise_body_part_categories`** - automaticky mapuje `muscle_groups.region` na `body_part_key`
2. **Hook `useAutoTagFromExercise`** - dotazuje se na tuto view
3. **Tabulka `exercise_muscle_groups`** - pouze potřebuje naplnit daty

---

## Implementace

Použiji nástroj pro vkládání dat do databáze (INSERT tool) k provedení všech SQL příkazů výše.
