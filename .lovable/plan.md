
# Plán: Vylepšení karty tréninku v rozvrhu

## Identifikované problémy

### 1. Chybějící datumy u PR výsledků
**Aktuální stav**: V sekci "Výsledky účastníků" (ParticipantsPRsSection) se zobrazuje název cviku a PR hodnota, ale **není vidět datum**, kdy bylo PR dosaženo.

**Příčina**: Komponenta `PRItem` nezobrazuje `pr.achievedAt`, přestože tato data jsou dostupná v hooku.

### 2. Klasifikace se neresetuje správně při dokončení
**Aktuální stav**: Když vyplníte tagy v kartě tréninku a poté otevřete dialog "Dokončit trénink", někdy musíte tagy vyplňovat znovu.

**Příčina**: V `TrainingDetail.tsx` (řádek 128-133) je useEffect pro synchronizaci dialogTagIds:
```typescript
useEffect(() => {
  if (showCompleteDialog && training) {
    setDialogTagIds(currentTagIds);
    setDialogTrainingType(training.training_type || null);
  }
}, [showCompleteDialog, training?.id]); // ← CHYBÍ currentTagIds!
```
Dependency array chybí `currentTagIds`, takže když tagy měníte v hlavní kartě, dialog si to nepamatuje.

---

## Navrhované změny

### Změna 1: Zobrazit datum u PR výsledků
**Soubor**: `src/components/trainings/ParticipantsPRsSection.tsx`

Přidat datum vedle hodnoty PR:
```
┌─────────────────────────────────────────────┐
│ 🏋️ Bench Press      80 kg  •  15.1.2026 →  │
│ ⏱️ Plank            2:30   •  12.1.2026 →  │
│ 📏 Box Jump         65 cm  •  10.1.2026 →  │
└─────────────────────────────────────────────┘
```

Změna v komponentě `PRItem`:
- Přidat formátování data pomocí `format(new Date(pr.achievedAt), 'd.M.', { locale: cs })`
- Zobrazit vedle badge s hodnotou

### Změna 2: Opravit synchronizaci tagů do dialogu
**Soubor**: `src/pages/TrainingDetail.tsx`

Opravit dependency array v useEffect:
```typescript
useEffect(() => {
  if (showCompleteDialog && training) {
    setDialogTagIds(currentTagIds);
    setDialogTrainingType(training.training_type || null);
  }
}, [showCompleteDialog, training?.id, currentTagIds]); // ← PŘIDAT currentTagIds
```

Tím zajistíme, že když dialog otevřete, vždy se načtou aktuální tagy z karty tréninku.

### Změna 3: Zobrazovat aktuální tagy i když jsou validní
**Soubor**: `src/pages/TrainingDetail.tsx`

V dialogu dokončení (řádky 538-555) je aktuálně pouze zobrazení tagů bez možnosti editace, když je validace splněna. Přidat možnost editovat i validní tagy:
```
Před: [Tag1] [Tag2] (readonly)
Po:   [Klasifikace v pořádku ✓] [Upravit tagy]
```

---

## Vizuální náhled změn

### Sekce "Výsledky účastníků" - PŘED
```
│ 🏋️ Bench Press                    80 kg →  │
```

### Sekce "Výsledky účastníků" - PO
```
│ 🏋️ Bench Press            80 kg • 15.1. →  │
```

---

## Soubory k úpravě (shrnutí)

| Soubor | Změna |
|--------|-------|
| `src/components/trainings/ParticipantsPRsSection.tsx` | Přidat datum u PR výsledků |
| `src/pages/TrainingDetail.tsx` | Opravit sync tagů + volitelná editace validních tagů |

---

## Technické poznámky

### Proč tagy "zmizí" při dokončení
1. Trenér otevře kartu tréninku
2. Vyplní tagy → `updateTrainingTags.mutateAsync()` → `currentTagIds` se aktualizuje
3. Otevře dialog "Dokončit"
4. `useEffect` se spustí, ale `currentTagIds` není v dependency array
5. `dialogTagIds` zůstane prázdné nebo staré
6. Dialog ukazuje "Doplňte povinné tagy" i když byly vyplněné

### Jak to opravíme
Přidáním `currentTagIds` do dependency array se `dialogTagIds` vždy aktualizuje na nejnovější hodnotu z databáze.

---

## Očekávaný výsledek

| Problém | Stav po opravě |
|---------|----------------|
| Chybějící datumy u PR | Zobrazeno "80 kg • 15.1." ✅ |
| Tagy se nezachovávají | Automatická synchronizace při otevření dialogu ✅ |
| Nutnost vyplňovat tagy znovu | Tagy se načtou z karty tréninku ✅ |
