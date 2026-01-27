
# Vylepšení RX Workout systému

## Přehled

Rozšíření stávajícího RX Workout systému o 5 klíčových funkcí, které zlepší uživatelskou zkušenost a umožní pokročilou analýzu výsledků.

---

## 1. Time Cap / CAP výsledky

Umožní zaznamenat výsledky workoutů, které klient nedokončil v časovém limitu.

### Jak to bude fungovat

```text
┌─────────────────────────────────────────────────────┐
│ Zápis výsledku: Cindy (20 min cap)                  │
├─────────────────────────────────────────────────────┤
│ Klient: [Jan Novák ▼]                               │
│                                                     │
│ [●] Dokončeno v čase   [○] CAP (nedokončeno)        │
│                                                     │
│ Pokud dokončeno:                                    │
│ Čas: [18] min [23] sec                              │
│                                                     │
│ Pokud CAP:                                          │
│ Počet kol: [18] kol  Zbývající opakování: [12]      │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### V leaderboardu

```text
🥇 Jan Novák       18:23
🥈 Petra Svobodová 19:45
🥉 Martin Černý    CAP + 18+12
```

---

## 2. Editace RX Workoutu

Možnost upravit parametry existujícího workoutu bez nutnosti mazat a importovat znovu.

### UI pro editaci

```text
┌─────────────────────────────────────────────────────┐
│ ✏️ Upravit workout: Engine Circuit           [X]    │
├─────────────────────────────────────────────────────┤
│ Název: [Engine + Strength Circuit          ]        │
│ Popis: [Hybridní workout kombinující...    ]        │
│                                                     │
│ Typ:    [▼ For Time]    Time Cap: [20] min         │
│ Kola:   [3]                                         │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ Cviky:                                              │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 1. Treadmill                           [↑][↓][🗑]│ │
│ │    Vzdálenost: [500] m  Sklon: [15] %           │ │
│ ├─────────────────────────────────────────────────┤ │
│ │ 2. Dumbbell Thruster                   [↑][↓][🗑]│ │
│ │    Reps: [20]  Váha: [2x8] kg                   │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [+ Přidat cvik]                                     │
├─────────────────────────────────────────────────────┤
│                               [Zrušit] [Uložit]     │
└─────────────────────────────────────────────────────┘
```

---

## 3. Historie pokusů klienta

Zobrazení všech pokusů konkrétního klienta na daném workoutu s grafem progrese.

### UI komponenty

```text
┌─────────────────────────────────────────────────────┐
│ 📊 Historie: Cindy - Jan Novák                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Čas ▲                                              │
│  22 │                                               │
│  21 │ ●                                             │
│  20 │   ●                                           │
│  19 │       ●                                       │
│  18 │           ●   ●  ← PR!                        │
│     └────────────────────────► Datum                │
│       Jan   Feb   Mar   Apr                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│ Všechny pokusy:                                     │
│ 15.4.2026  18:23  🏆 PR                             │
│ 01.4.2026  18:45                                    │
│ 15.3.2026  19:12                                    │
│ 01.3.2026  20:34                                    │
│ 15.2.2026  21:05                                    │
└─────────────────────────────────────────────────────┘
```

---

## 4. PR notifikace a označení

Automatická detekce osobních rekordů při zápisu výsledku.

### Vizuální feedback

```text
┌─────────────────────────────────────────────────────┐
│  🎉 NOVÉ OSOBNÍ MAXIMUM!                            │
│                                                     │
│  Jan Novák právě překonal své PR na Cindy!         │
│                                                     │
│  Nový čas: 18:23                                    │
│  Předchozí: 18:45 (o 22 sekund lepší!)             │
│                                                     │
│                                        [Super!]     │
└─────────────────────────────────────────────────────┘
```

### V leaderboardu

```text
🥇 Jan Novák       18:23  🔥 PR
🥈 Petra Svobodová 19:45
```

---

## 5. Detail workoutu (Sheet)

Kompletní přehled workoutu s cviky, pravidly a všemi výsledky.

### UI komponenty

```text
┌─────────────────────────────────────────────────────┐
│ Engine + Strength Circuit                    [✏️][🗑]│
├─────────────────────────────────────────────────────┤
│ [For Time] [3 kola] [20 min cap]                    │
│                                                     │
│ Popis:                                              │
│ Hybridní workout kombinující kardio a sílu.         │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ CVIKY:                                              │
│                                                     │
│ 🏃 500m Treadmill                                   │
│    • Sklon: 15%                                     │
│    • Rychlost: individuální                         │
│                                                     │
│ 💪 20x Dumbbell Thruster                            │
│    • Váha: 2x8 kg (muži) / 2x5 kg (ženy)           │
│                                                     │
│ 🚣 400m Row Erg                                     │
│    • Damper: 7                                      │
│                                                     │
│ ─────────────────────────────────────────────────── │
│ VÝSLEDKY: (25 celkem)                               │
│                                                     │
│ [Všichni ▼] [Muži] [Ženy]        [📥 Export CSV]   │
│                                                     │
│ 🥇 Jan Novák (M)       18:23  27.1.2026  🔥 PR      │
│ 🥈 Petra Svobodová (Ž) 19:45  25.1.2026            │
│ ...                                                 │
│                                                     │
│ [+ Zapsat výsledek]                                 │
└─────────────────────────────────────────────────────┘
```

---

## Databázové změny

### Nové sloupce v `rx_workout_results`

```sql
ALTER TABLE rx_workout_results
ADD COLUMN is_capped BOOLEAN DEFAULT FALSE,
ADD COLUMN capped_rounds INTEGER,
ADD COLUMN capped_reps INTEGER,
ADD COLUMN is_personal_record BOOLEAN DEFAULT FALSE;
```

---

## Soubory k vytvoření

| Soubor | Popis |
|--------|-------|
| `src/components/rx/RxWorkoutDetailSheet.tsx` | Detail workoutu s cviky a výsledky |
| `src/components/rx/RxWorkoutEditDialog.tsx` | Dialog pro editaci workoutu |
| `src/components/rx/RxClientHistoryDialog.tsx` | Historie pokusů klienta |
| `src/components/rx/RxPRCelebration.tsx` | Animovaná oslava PR |
| `src/hooks/useRxClientHistory.ts` | Hook pro historii klienta na workoutu |
| `src/lib/rxPRDetection.ts` | Logika pro detekci PR |

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/rx/RxResultEntryDialog.tsx` | Přidat CAP možnost, PR detekci |
| `src/components/rx/RxWorkoutLeaderboard.tsx` | Zobrazit PR badge, CAP formátování |
| `src/components/rx/RxWorkoutCard.tsx` | Přidat tlačítko editace, odkaz na detail |
| `src/hooks/useRxWorkoutResults.ts` | Přidat CAP a PR pole |
| `src/hooks/useRxWorkouts.ts` | Přidat update mutaci |

---

## Implementační pořadí

1. **Databázová migrace** - přidat nové sloupce
2. **CAP výsledky** - rozšířit dialog a formátování
3. **PR detekce** - logika + notifikace
4. **Detail sheet** - kompletní přehled
5. **Editace workoutu** - úprava parametrů
6. **Historie klienta** - graf progrese

---

## Bonus: Export CSV

```text
Workout: Cindy
Exportováno: 27.1.2026

Pořadí,Jméno,Pohlaví,Výsledek,Datum,PR
1,Jan Novák,M,18:23,27.1.2026,Ano
2,Petra Svobodová,Ž,19:45,25.1.2026,Ne
3,Martin Černý,M,CAP+18+12,24.1.2026,Ne
```
