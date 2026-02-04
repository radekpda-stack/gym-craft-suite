
# Audit funkce tagování na kartě tréninku - IMPLEMENTOVÁNO ✅

## Provedené změny

### Fáze 1: Oprava kritického bugu HIIT/Cardio ✅
- **useTrainingTagValidation.ts**: Přidáno `hiit` a `cardio` do `TYPES_WITHOUT_BODY_PART`
- Validace nyní nevyžaduje body_part pro HIIT/Cardio (UI automaticky nastavuje "Celé tělo")

### Fáze 2: Odstranění intenzity (zjednodušení) ✅
- **useTrainingTagValidation.ts**: Všechny typy tréninků jsou v `TYPES_WITHOUT_INTENSITY` - validace intensity kompletně odstraněna
- **CompactTagSelector.tsx**: Odstraněn intensity dropdown, presety bez intensity
- **CompactTagGridSelector.tsx**: Změněn na 3-sloupcový grid (Typ, Zaměření, Partie)
- **TrainingTagStepper.tsx**: Odstraněna sekce Intenzita
- **ExpandedTagModal.tsx**: Odstraněna sekce Intenzita
- **TrainingDetailView.tsx**: Odstraněny intensity props
- **TrainingForm.tsx**: Odstraněny intensity props
- **TrainingModeCard.tsx**: Odstraněny intensity props

### Fáze 3: RPE derivace pro analytiku ✅
- **useClientTagAnalytics.ts**: Přidána funkce `getIntensityFromRPE(rpe)`:
  - RPE 1-3 → "Lehký"
  - RPE 4-6 → "Střední"
  - RPE 7-10 → "Těžký"

---

## Výsledek

| Metrika | Před | Po |
|---------|------|-----|
| Počet povinných polí pro dokončení | 6 | 3-4 |
| Chyba "nelze vybrat partie" pro HIIT | ANO | NE |
| Duplikace dat (intensity + RPE) | ANO | NE |
| Historické intensity tagy | Zachovány | Zachovány |

---

## Zpětná kompatibilita

- Historické tréninky s intensity tagem zůstávají beze změny
- Analytika může používat:
  1. Existující intensity tag (pokud je)
  2. Derivovanou hodnotu z RPE pomocí `getIntensityFromRPE()`
