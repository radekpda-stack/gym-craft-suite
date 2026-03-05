

# Modernizace sekce Výkonnost (Performance Hub)

## Analýza současného stavu

Sekce má solidní datovou vrstvu, ale UI je vizuálně těžkopádné a na mobilu zabírá hodně prostoru. Hlavní problémy:

1. **Hero header** je příliš velký (gradient + ikona + search + CTA = ~200px na mobilu)
2. **KPI bar** a **CategoryCards** jsou vizuálně duplicitní (obě zobrazují počty cviků s progress bary)
3. **6 tabů** na mobilu se špatně čte (text "Testy" a "Výzvy" je hidden na mobilu)
4. **Overview tab** má lineární seznam 5 sekcí pod sebou bez vizuální hierarchie
5. **Leaderboard** zabírá hodně místa s opakujícím se UI vzorem

## Plán modernizace

### 1. Kompaktní Hero Header
- Zmenšit hero na 1 řádek: ikona + "Výkonnost" + datum na jednom řádku
- Search bar zůstane, ale bez CTA tlačítka "Zapsat výkon klientovi" (to je v FAB)
- Odstranit duplicitní CTA button — FAB již obsahuje "Zapsat výkon"
- Úspora: ~80px vertikálního prostoru na mobilu

### 2. Sloučit KPI bar do CategoryCards
- Nahradit samostatný KPI bar a CategoryCards jedním kompaktním widgetem
- 3 karty (Síla/Kardio/Plyo) s integrovanými čísly: počet cviků + záznamy tento měsíc + PR tento měsíc
- Každá karta má mini progress ring místo horizontálního baru
- Celkové PRs a záznamy se zobrazí jako sumární řádek nad kartami

### 3. Modernizace Overview tab layoutu
- **Aktivita dnes**: Kompaktnější — max 3 záznamy s "Zobrazit vše" odkazem
- **Leaderboard**: Zobrazit jen top 3 klienty s horizontálním layoutem (avatary vedle sebe) místo vertikálního seznamu 5 klientů
- **Nedávné PR**: Horizontální scroll strip místo vertikálního seznamu
- **Nedávno použité cviky**: Zachovat chipy, ale přesunout pod search jako "rychlý přístup"

### 4. Vylepšení tab navigace
- Přepnout na scrollovatelný pill-style tab strip místo rovnoměrně rozloženého gridu
- Všechny taby mají viditelný text i na mobilu (menší font + horizontální scroll)

### 5. Vylepšení ExerciseListItem v Deníku
- Přidat mini sparkline (3-4 body) trendu vedle hlavní hodnoty
- Zvýraznit aktivní PR badge animací (pulse)

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/pages/PerformanceHub.tsx` | Kompaktní hero, sloučení KPI+Categories, nový tab strip, omezení "Aktivita dnes" na 3 záznamy |
| `src/components/performance/PerformanceKPIBar.tsx` | Sloučit s CategoryCards do nové `PerformanceQuickStats` komponenty |
| `src/components/performance/CategoryCards.tsx` | Integrovat do PerformanceQuickStats |
| `src/components/performance/ClientProgressLeaderboard.tsx` | Kompaktní horizontální layout pro top 3 |
| `src/components/performance/RecentPRsCompact.tsx` | Horizontální scroll strip |
| `src/components/performance/RecentExercisesChips.tsx` | Přesunout pod search v hero |

Žádné DB změny. Čistě UI/UX modernizace.

