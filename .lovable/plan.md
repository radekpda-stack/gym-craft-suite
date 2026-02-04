
# Audit funkce tagování na kartě tréninku

## Shrnutí zjištěných problémů

### 1. Problém: Kardio/HIIT neumožňuje vybrat partie těla
**Příčina:** V `TAG_VISIBILITY_BY_TYPE` (CompactTagGridSelector.tsx a TrainingTagStepper.tsx) je pro HIIT a Cardio nastaven `bodyPartsMode: 'only-full-body'`, což automaticky nastavuje "Celé tělo" a neumožňuje manuální výběr. **ALE** validace v `useTrainingTagValidation.ts` stále vyžaduje body_part tag pro tyto typy (pouze `regeneration` je v `TYPES_WITHOUT_BODY_PART`).

**Klíčový rozpor:**
- UI skryje výběr partií pro HIIT/Cardio
- Validace ale stále vyžaduje body_part tag
- Auto-select "Celé tělo" se spouští v `useEffect` v TrainingTagStepper, ale v CompactTagSelector (dialog dokončení) se nepoužívá

### 2. Problém: Intenzita je redundantní s RPE
**Zjištění:** Existují 3 tagy intenzity (Lehký, Střední, Těžký), ale RPE 1-10 poskytuje přesnější informaci. Data ukazují, že všechny dokončené tréninky mají RPE i intenzitu tag - dvojí zadávání.

### 3. Problém: Pomalé dokončování
Trenér musí při dokončení:
1. Vybrat typ tréninku
2. Vybrat zaměření (focus)
3. Vybrat intenzitu
4. Vybrat partie těla
5. Zadat RPE
6. Vybrat platbu

---

## Navrhované změny

### Fáze 1: Oprava kritického bugu (HIIT/Cardio)

#### Změna 1.1: Synchronizace validace s UI logikou
```typescript
// useTrainingTagValidation.ts - AKTUALIZOVAT
// Přidat HIIT a Cardio do výjimek pro body_part, protože UI je nastavuje automaticky
const TYPES_WITHOUT_BODY_PART = ['regeneration', 'hiit', 'cardio'];
```

#### Změna 1.2: Auto-tag v CompactTagSelector pro HIIT/Cardio
Přidat automatické přidání "Celé tělo" tagu při detekci HIIT/Cardio typu:
- Při otevření dialogu dokončení pro HIIT/Cardio automaticky přidat "Celé tělo" tag

### Fáze 2: Odstranění intenzity (zjednodušení)

#### Změna 2.1: Odstranění pole intenzity z validace
```typescript
// useTrainingTagValidation.ts - SMAZAT validaci intensity
// RPE 1-10 plně nahrazuje: 1-3 = Lehký, 4-6 = Střední, 7-10 = Těžký
```

#### Změna 2.2: Odstranění z UI komponent
Upravit tyto komponenty:
- `CompactTagGridSelector.tsx` - odstranit dropdown Intenzita
- `CompactTagSelector.tsx` - odstranit dropdown Intenzita z 3-sloupcového gridu
- `TrainingTagStepper.tsx` - odstranit sekci Intenzita

#### Změna 2.3: Automatická derivace intenzity z RPE
Pro historická data a analytiku - přidat funkci, která mapuje RPE na intenzitu:
```typescript
function getIntensityFromRPE(rpe: number): 'Lehký' | 'Střední' | 'Těžký' {
  if (rpe <= 3) return 'Lehký';
  if (rpe <= 6) return 'Střední';
  return 'Těžký';
}
```

### Fáze 3: Zrychlení workflow

#### Změna 3.1: Inteligentní auto-tagging
Rozšířit `useAutoTagFromExercise` hook:
- Již nyní automaticky taguje partie těla
- Přidat automatické nastavení focus tagu na základě predominantního cviku

#### Změna 3.2: Zjednodušený completion flow
Nové schéma (3 kroky místo 6):
1. **Typ tréninku** - vybrat jedním klikem (presety)
2. **RPE** - numerická hodnota 1-10
3. **Platba** - potvrzení

Partie těla a zaměření jsou auto-detekované z cviků.

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useTrainingTagValidation.ts` | Přidat hiit/cardio do výjimek, odstranit validaci intensity |
| `src/components/trainings/CompactTagSelector.tsx` | Auto-set "Celé tělo" pro HIIT/Cardio, odstranit intensity dropdown |
| `src/components/trainings/CompactTagGridSelector.tsx` | Změnit 4-sloupcový grid na 3-sloupcový (bez intensity) |
| `src/components/trainings/TrainingTagStepper.tsx` | Odstranit sekci Intenzita |
| `src/components/trainings/TrainingDetailView.tsx` | Odstranit intensity handling |
| `src/hooks/useClientTagAnalytics.ts` | Přidat derivaci intenzity z RPE |

---

## Dopady na historická data

### Zachování zpětné kompatibility
- Historické tréninky s intensity tagem zůstanou beze změny
- Analytika bude používat:
  1. Existující intensity tag (pokud je)
  2. Derivovanou hodnotu z RPE (pokud tag chybí)

### Migrace není nutná
- Stávající tagy zůstávají v databázi
- Nové tréninky nebudou vyžadovat intensity tag
- Analytické komponenty budou rozšířeny o fallback na RPE

---

## Očekávaný výsledek

| Metrika | Před | Po |
|---------|------|-----|
| Počet povinných polí pro dokončení | 6 | 3 |
| Počet kliknutí pro dokončení | 8-12 | 4-6 |
| Chyba "nelze vybrat partie" pro HIIT | ANO | NE |
| Duplikace dat (intensity + RPE) | ANO | NE |

---

## Priorita implementace

1. **Kritická oprava** - Fix HIIT/Cardio body part bug (Fáze 1)
2. **Zjednodušení** - Odstranění intensity tagu (Fáze 2)  
3. **Optimalizace** - Zrychlení workflow (Fáze 3)
