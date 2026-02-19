
# Redesign sekce Výkonnost – Tréninkový deník pro trenéra

## Co aktuálně existuje (fungující základ)

Sekce Výkonnost má tyto záložky:
- **Přehled** – Hero header, KPI bar (90 cviků / 597 záz. / 399 PR), kategorie cviků, leaderboard klientů, nedávné PR
- **Klienti** – Deník (seznam klientů → seznam cviků → detail cviku s grafem), Porovnání, Benchmark
- **Knihovna** – Seznam cviků s filtry a řazením
- **Analytika** – Síla / Kardio / Skill analytika

## Zjištěné problémy

**1. Chybí primární akce pro zápis výkonu na přehledu**
- Trenér musí navigovat přes FAB nebo přes Knihovnu. Na Přehledu není žádné prominentní "Zapsat výkon" tlačítko s výběrem klienta.

**2. Tab lišta je přeplněná a labely jsou ořezané**
- Na mobilu (390px) se zobrazuje 5 záložek (P..., K..., A..., a dvě ikony bez textu). Labely jsou ořezané zkratkou.

**3. Přehled tab – špatná hierarchie pro deník**
- KPI bar ukazuje globální statistiky, ale trenér potřebuje vidět *co bylo naposledy zapsáno* a *kdo potřebuje pozornost dnes*.
- Chybí sekce "Dnes / Nedávno" – co bylo zapsáno za posledních 24 hodin.
- "Nedávno použité cviky" jsou linky do detail cviku, ale nenabídnou rychlý zápis.

**4. Klienti tab – dobrý základ, ale chybí kontext**
- Seznam klientů nezobrazuje, kdy byl klient naposledy aktivní vizuálně (jen text). Chybí barevné indikátory aktivity.
- Deník klienta po výběru nevykazuje „tréninkový deník" feeling – spíše seznam cviků.

**5. Knihovna – funguje, ale chybí rychlý zápis z karty cviku**
- Kliknutí na cvik v Knihovně přejde na `/exercises/:id`, ale nenabídne ihned dialog pro zápis výkonu s výběrem klienta.

---

## Navrhované změny

### A. Záložka „Přehled" – přidání sekce „Dnes"

Přidat nad leaderboard nový blok **„Aktivita dnes"** který zobrazí:
- Počet zápisů za dnešní den (z `exercise_entries` + `cardio_entries` kde `date = today`)
- Seznam posledních 3–5 zápisů dnes (klient, cvik, hodnota) jako mini-feed
- Prázdný stav s CTA „Zapsat první výkon dnes"

**Technicky:** Nový jednoduchý hook `useTodayActivity` dotazující `exercise_entries`, `cardio_entries`, `skill_entries` kde `date = today` a `user_id = current`.

### B. Záložka „Přehled" – prominentní „Zapsat výkon" tlačítko

Přidat přímo pod Hero header velké tlačítko nebo banner:
```
[ + Zapsat výkon klientovi  ▶ ]
```
které otevře `QuickLogDialog` (already exists). Tím se zkrátí tok z 3 kroků na 1 klik.

### C. Tab lišta – zkrácení na 4 záložky s jasnými ikonami

Přejmenovat záložky pro lepší mobilní čitelnost:
- **Přehled** → „Přehled" (Zap ikona)
- **Klienti** → „Deník" (BookOpen ikona) – pojmenování reflektuje účel
- **Knihovna** → „Cviky" (Dumbbell ikona)  
- **Analytika** → „Analytika" (BarChart3 ikona)

### D. Záložka „Deník" (dříve Klienti) – vylepšení karet klientů

V `ClientList` komponentě přidat vizuální indikátor aktivity:
- **Zelený bod** – aktivní za posledních 7 dní
- **Žlutý bod** – aktivní za 8–30 dní
- **Červený bod** – neaktivní 30+ dní

Přidat datum posledního tréninku více prominentně (ne jen text, ale badge s barvou).

### E. Záložka „Cviky" (Knihovna) – přidání rychlého zápisu

Na kartě cviku v `ExerciseListView` přidat ikonu „+" která přímo otevře `QuickLogDialog` s předvyplněným `exerciseId`. Tím trenér může z Knihovny jedním tahem zapsat výkon bez nutnosti navigace.

### F. Hero sekce – vylepšení textu a search baru

- Přidat aktuální datum pod nadpis „Výkonnost" (jako v Apple Fitness)
- Search bar zvýraznit více – přidat placeholder „Vyhledat klienta nebo cvik..."

---

## Technické soubory ke změně

| Soubor | Změna |
|---|---|
| `src/pages/PerformanceHub.tsx` | Přejmenování záložek, přidání QuickLogDialog state, prominentní CTA tlačítko |
| `src/components/performance/ClientProgressView.tsx` | Barevné indikátory aktivity klientů v ClientList |
| `src/components/exercises/ExerciseListView.tsx` | Ikona „+" na kartě cviku pro rychlý zápis |
| `src/pages/PerformanceHub.tsx` | Nový blok „Aktivita dnes" v Přehled tab |

### Nové hooky
- `src/hooks/useTodayActivity.ts` – fetch záznamů za dnešní den

---

## Pořadí implementace

1. Tab přejmenování + prominentní CTA „Zapsat výkon" (rychlý win, viditelný dopad)
2. Barevné indikátory aktivity v seznamu klientů
3. Blok „Aktivita dnes" v Přehledu
4. Rychlý zápis ikona v Knihovně cviků
