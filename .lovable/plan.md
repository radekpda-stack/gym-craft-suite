
# Připomínka měření klienta

## Přehled

Když zadáte měření klienta, aplikace vám automaticky připomene zvážit klienta při prvním tréninku po zadaném intervalu. Například:
- Zadáte měření **27.1.** s intervalem **1 měsíc**
- První trénink po **27.2.** zobrazí upozornění: **"Zvážit klienta"**

---

## Jak to bude fungovat

### Při zadávání měření

```text
┌─────────────────────────────────────────────────┐
│  Nové měření                                    │
├─────────────────────────────────────────────────┤
│  Klient: [Jan Novák ▼]                          │
│  Datum:  [27.1.2026]                            │
│  Váha:   [85.5] kg                              │
│  ...                                            │
├─────────────────────────────────────────────────┤
│  ⏰ Připomenout další měření                    │
│  ┌───────────────────────────────────────────┐  │
│  │ [✓] Připomenout zvážení                   │  │
│  │     za: [▼ 1 měsíc  ]                     │  │
│  │         • 2 týdny                         │  │
│  │         • 1 měsíc  ← nejčastější          │  │
│  │         • 6 týdnů                         │  │
│  │         • 2 měsíce                        │  │
│  │         • 3 měsíce                        │  │
│  └───────────────────────────────────────────┘  │
├─────────────────────────────────────────────────┤
│                          [Zrušit] [Uložit]      │
└─────────────────────────────────────────────────┘
```

### Na kartě tréninku

Když přijde první trénink po datu připomínky, zobrazí se upozornění:

```text
┌─────────────────────────────────────────────────┐
│  🔔 Připomenutí                                 │
├─────────────────────────────────────────────────┤
│  ⚖️ Zvážit klienta                              │
│     Poslední měření: 27.1.2026 (před 32 dny)   │
│                              [✓ Hotovo]         │
└─────────────────────────────────────────────────┘
```

---

## Technický plán

### 1. Databázové změny

Přidám nový sloupec do tabulky `measurements`:

```sql
ALTER TABLE measurements 
ADD COLUMN next_measurement_date DATE;
```

Tento sloupec bude obsahovat datum, kdy má být připomenuto další měření.

### 2. Rozšíření formuláře měření

Upravím `MeasurementForm.tsx` a `CreateMeasurementSheet.tsx`:
- Přidám checkbox "Připomenout další měření"
- Přidám select s intervaly (2 týdny, 1 měsíc, 6 týdnů, 2 měsíce, 3 měsíce)
- Při uložení vypočítám `next_measurement_date = datum_měření + interval`

### 3. Vytvoření follow-up připomínky

Rozšířím existující systém `training_followups`:
- Přidám nový typ: `measurement` do `FollowupType`
- Při vytvoření měření s připomínkou automaticky vytvořím follow-up záznam
- Follow-up nebude vázán na konkrétní trénink (`training_session_id = null`)
- Bude mít nastavené `remind_after_date` pro aktivaci

### 4. Zobrazení na kartě tréninku

Rozšířím `PreviousFollowupAlert.tsx`:
- Přidám vizuální styl pro typ `measurement` (modrá ikona váhy)
- Zobrazím datum posledního měření a počet dní od měření
- Tlačítko "Hotovo" označí připomínku jako vyřešenou

### 5. Hook pro kontrolu připomínek měření

Vytvořím hook `useMeasurementReminders.ts`:
- Dotaz na nevyřešené measurement followupy pro daného klienta
- Filtr: `remind_after_date <= aktuální_datum` AND `is_resolved = false`
- Zobrazí se pouze pokud datum tréninku >= remind_after_date

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/measurements/MeasurementForm.tsx` | Přidat sekci pro připomínku intervalu |
| `src/components/measurements/CreateMeasurementSheet.tsx` | Předat interval do submission |
| `src/hooks/useMeasurements.ts` | Přidat `next_measurement_date` do create mutace |
| `src/hooks/useTrainingFollowups.ts` | Přidat typ `measurement`, rozšířit interface |
| `src/components/trainings/PreviousFollowupAlert.tsx` | Přidat vizuál pro measurement typ |
| `src/components/trainings/TrainingDetailView.tsx` | Integrovat measurement reminder |

---

## Uživatelský příběh

1. **Trenér zadá měření** (27.1.) a vybere interval "1 měsíc"
2. **Systém vypočítá** datum připomínky (27.2.)
3. **Systém vytvoří** follow-up záznám typu "measurement"
4. **Trenér trénuje s klientem** 15.2. - žádná připomínka (před datem)
5. **Trenér trénuje s klientem** 1.3. - zobrazí se připomínka "Zvážit klienta"
6. **Trenér klikne "Hotovo"** - připomínka se označí jako vyřešená
7. **Při dalším měření** se cyklus opakuje

---

## Výchozí nastavení

- Interval: **1 měsíc** (nejčastější volba)
- Checkbox: **zapnutý** (doporučené)
- Priorita připomínky: **medium**
