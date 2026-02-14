

# Audit a oprava navigace -- inline detail místo přesměrování na kartu klienta

## Identifikované problémy

Po prohledání celé aplikace jsem identifikoval **5 konkrétních oblastí**, kde kliknutí na data/graf zbytečně naviguje uživatele pryč z kontextu, místo aby zobrazilo relevantní detail na místě.

---

### 1. Analytika Výkonnost -- StagnationAlertCard
**Soubor:** `src/components/exercises/analytics/StagnationAlertCard.tsx`
**Problém:** Klik na stagnujícího klienta naviguje na `/clients/{id}?tab=progress` -- trenér opustí analytiku
**Řešení:** Zobrazit inline detail: název cviku, aktuální hodnotu, kolik týdnů stagnuje, mini-graf posledních hodnot. Bez navigace pryč.

### 2. Analytika Výkonnost -- ClientAttentionCard
**Soubor:** `src/components/exercises/analytics/ClientAttentionCard.tsx`
**Problém:** Klik na klienta vyžadujícího pozornost naviguje na `/clients/{id}` -- stejný problém
**Řešení:** Rozbalit inline detail s důvody pozornosti (žádné PR, klesající frekvence, vysoké RPE) a posledními daty klienta. Přidat volitelný odkaz "Otevřít kartu" jako sekundární akci.

### 3. Analytika Výkonnost -- UnusedExercisesCard
**Soubor:** `src/components/exercises/analytics/UnusedExercisesCard.tsx`
**Problém:** Klik na nepoužívaný cvik naviguje na `/performance/{id}` -- ta route ani neexistuje jako dedikovaná stránka!
**Řešení:** Zobrazit inline detail cviku: kdy byl naposledy použit, u kterých klientů, kategorie. Odstranit nefunkční navigaci.

### 4. Analytika Výkonnost -- TopExercisesCard
**Soubor:** `src/components/exercises/analytics/TopExercisesCard.tsx`
**Problém:** Klik na top cvik naviguje na `/exercises/{id}` -- opuštění analytiky pro detail cviku
**Řešení:** Rozbalit inline detail: rozložení použití mezi klienty, trend objemu, průměrné hodnoty.

### 5. Notifikace -- váha a diagnostika
**Soubor:** `src/components/notifications/NotificationCenter.tsx`
**Problém:** Klik na notifikaci o váze/diagnostice naviguje na kartu klienta (`/clients/{id}?tab=progress` resp. `?tab=profile`), místo aby ukázal samotný záznam
**Řešení:** Otevřít detail dialog (podobně jako už funguje `WorkoutLogDetailDialog` a `ProfileUpdateDetailDialog`) s konkrétním záznamem váhy/diagnostiky přímo v notifikačním centru.

---

## Co zůstane beze změny (oprávněná navigace)

Tyto navigace jsou **v pořádku**, protože fungují jako explicitní akce uživatele:
- `ClientQuickMenu` -- kontextové menu s akcemi "Přidat měření", "Přidat progres" (záměrný přechod)
- Tlačítko "Karta klienta" v `ClientProgressView` (explicitní odkaz s ikonou ExternalLink)
- `ClientMeasurementsCard` / `ClientMediaGallery` -- tlačítka "Zobrazit vše" (záměrný přechod do záznamů)
- Dashboard ActionCenter -- navigace na seznam klientů (filtry, ne detail)

---

## Technické detaily

| Soubor | Změna |
|--------|-------|
| `src/components/exercises/analytics/StagnationAlertCard.tsx` | Nahradit `navigate()` za inline rozbalení detailu stagnace (accordion/expand pattern) |
| `src/components/exercises/analytics/ClientAttentionCard.tsx` | Nahradit `navigate()` za inline rozbalení důvodů pozornosti s daty |
| `src/components/exercises/analytics/UnusedExercisesCard.tsx` | Odstranit nefunkční navigaci na `/performance/{id}`, zobrazit inline info o cviku |
| `src/components/exercises/analytics/TopExercisesCard.tsx` | Nahradit `navigate()` za inline rozbalení statistik cviku |
| `src/components/notifications/NotificationCenter.tsx` | Pro váhovou a diagnostickou notifikaci otevřít detail dialog místo navigace na kartu klienta |

### Vzor implementace (platí pro analytics karty)

Každá karta dostane lokální stav `expandedItem`:
- Klik na řádek = toggle expand/collapse
- Rozbalený řádek zobrazí relevantní data (mini-graf, historie, kontext)
- Sekundární odkaz "Otevřít kartu klienta" / "Detail cviku" zůstane jako volitelná akce
- Bez navigace pryč ze stránky

### Vzor implementace (notifikace)

Pro váhové a diagnostické notifikace:
- Vytvořit `WeightDetailDialog` a `DiagnosticDetailDialog` (analogicky k existujícímu `WorkoutLogDetailDialog`)
- Dialogy zobrazí konkrétní záznam + kontext (předchozí hodnoty, trend)
- Sekundární tlačítko "Zobrazit v kartě klienta" pro přechod, pokud je potřeba

