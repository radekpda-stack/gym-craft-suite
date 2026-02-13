
# Hloubkový audit klientského portálu

Po důkladné analýze kódu, hooků, navigace a komponent klientského portálu jsem identifikoval tyto problémy.

---

## CHYBY K OPRAVĚ

### 1. HARDCODED NAVIGACE -- Akce klienta vedou na /client/ místo dynamického basePath
V `useClientPendingActions.ts` (řádky 45 a 92) jsou hardcoded linky:
- `link: '/client/feedback'`
- `link: '/client/settings'`

Klienti přistupující přes `/zona/` prefix budou přesměrováni na nesprávnou cestu. Komponenta `ClientActionRequired` tyto linky přímo používá v `<Link to={action.link}>`.

**Stejný problém v `ClientQuickStats.tsx`** (řádky 78, 86) a `MyExercisesWidget.tsx` (řádek 41), kde `navigate('/zona/...')` je hardcoded -- nefunguje pro klienty na `/client/` prefixu.

**Oprava:** Přesunout logiku basePath do hooku nebo předávat basePath jako parametr. Ideálně vytvořit helper `usePortalBasePath()`.

---

### 2. BUG: `useClientCredit` čte z tabulky clients -- nesynchronizovaný zdroj dat
Hook `useClientCredit` v `useClientPortalData.ts` (řádek 15-19) čte `credit_balance` přímo z tabulky `clients` pomocí `.single()`. Tento zdroj dat je potenciálně zastaralý oproti ledger views (`vw_client_ledger_balances`), které byly právě implementovány jako "source of truth" v dashboardu trenéra.

HeroStatsRow na dashboardu portálu správně používá `useClientCreditStats` (který čte z ledger), ale `useClientCredit` je stále importován a mohl by být použit jinde.

**Oprava:** Deprecovat `useClientCredit` a nahradit všechny jeho výskyty za `useClientCreditStats`.

---

### 3. BUG: `useClientConsistency` v useClientPortalData.ts -- streak počítání je nefunkční
Funkce `useClientConsistency` (řádky 199-241) obsahuje nefunkční logiku pro výpočet streak:
- Cyklus na řádku 222-227 vždy okamžitě provede `break` po první iteraci
- Proměnná `checkDate` se nikdy nepoužije k porovnání s `completedDates`
- `weeklyData` se nikdy nenaplní (prázdný array)
- Výsledný `streak` je ve skutečnosti jen `completedDates.size` (celkový počet dokončených tréninků), ne skutečný streak

**Oprava:** Implementovat skutečný výpočet streak na základě po sobě jdoucích týdnů s alespoň jedním tréninkem.

---

### 4. BUG: `.single()` v READ dotazech portálu mohou selhat
Několik hooků používaných klientským portálem obsahuje `.single()` v SELECT dotazech, kde by chybějící data mohla způsobit crash:

| Soubor | Řádek | Riziko |
|---|---|---|
| `useClientPortalAuth.ts` | 68 | Crash pokud klient neexistuje v clients |
| `useClientPortalProfile.ts` | 45 | Crash pokud klient neexistuje |
| `useClientOnboardingStatus.ts` | 34 | Crash pokud klient neexistuje |
| `useClientPortalBenchmarks.ts` | 172 | Crash pokud klient neexistuje |
| `useClientPortalData.ts` | 19 | Crash pokud klient neexistuje |
| `useClientDashboardMetrics.ts` | 91, 171 | Crash pokud klient neexistuje |

**Oprava:** Nahradit `.single()` za `.maybeSingle()` ve všech SELECT dotazech, kde klient nemusí existovat. Ponechat `.single()` u INSERT/UPDATE `.select().single()` vzorů (ty jsou v pořádku).

---

### 5. BUG: OverallPerformanceCard používá evaluační barvy
Komponenta `OverallPerformanceCard.tsx` (řádky 14-35) klasifikuje výkon klientů jako "Pod průměrem" (červená), "Průměr", "Nad průměr" a "Top X%" (zelená). Toto **porušuje analytickou filozofii** projektu, která zakazuje evaluační prvky (zelená/červená hodnocení, procentuální indikátory, hodnotící text).

**Oprava:** Změnit na neutrální, srovnávací prezentaci bez hodnotícího framingu. Místo "Pod průměrem" zobrazit "25. percentil" apod.

---

### 6. RESPONSIVITA: Čeština v plurálu -- gramaticky chybné texty
V `ClientActionRequired.tsx` (řádek 125):
```
{count === 1 ? 'Máš úkol k vyřízení' : `Máš ${count} úkoly k vyřízení`}
```
Pro 5+ je správný tvar "úkolů", ne "úkoly". Stejný problém v `PendingHomeworkWidget.tsx` (řádek 29).

**Oprava:** Použít správnou českou pluralizaci (1 = úkol, 2-4 = úkoly, 5+ = úkolů).

---

### 7. NAVIGACE: `ClientPortalLayout` -- tooltip bez z-index
Desktopové sidebaru tooltipy (řádek 259) nemají explicitní z-index:
```tsx
<span className="absolute left-full ml-2 ... opacity-0 group-hover:opacity-100">
```
Toto může kolidovat s ostatními překryvnými prvky. Podle paměti projektu by Tooltip měl mít `z-[60]`.

---

## CHYBĚJÍCÍ FUNKCE

### 8. Dashboard: useClientCredit je redundantní s useClientCreditStats
Existují dva odlišné hooky pro kredit klienta v portálu -- `useClientCredit` (čte z clients tabulky) a `useClientCreditStats` (čte z ledger views). To vytváří riziko nekonzistence dat mezi různými stránkami portálu.

---

## PLÁN IMPLEMENTACE

### Fáze 1: Kritické opravy navigace a dat
1. Vytvořit helper `usePortalBasePath()` a nahradit všechny hardcoded `/client/` a `/zona/` cesty
2. Nahradit `.single()` za `.maybeSingle()` ve všech SELECT dotazech portálu (6 souborů)
3. Deprecovat `useClientCredit` ve prospěch `useClientCreditStats`

### Fáze 2: Logické opravy
4. Přepsat `useClientConsistency` streak logiku
5. Opravit českou pluralizaci v `ClientActionRequired` a `PendingHomeworkWidget`
6. Odstranit evaluační barvy/texty z `OverallPerformanceCard`

### Fáze 3: UI/Responsivita
7. Přidat z-index na sidebar tooltipy

---

## Technické detaily

| # | Soubor | Typ | Priorita |
|---|--------|-----|----------|
| 1 | `useClientPendingActions.ts` | Hardcoded navigace | Vysoká |
| 1 | `ClientQuickStats.tsx` | Hardcoded navigace | Vysoká |
| 1 | `MyExercisesWidget.tsx` | Hardcoded navigace | Vysoká |
| 2 | `useClientPortalData.ts` | Zastaralý zdroj dat | Vysoká |
| 3 | `useClientPortalData.ts:199-241` | Nefunkční streak | Střední |
| 4 | 6 souborů | .single() crash risk | Střední |
| 5 | `OverallPerformanceCard.tsx` | Porušení design rules | Nízká |
| 6 | `ClientActionRequired.tsx`, `PendingHomeworkWidget.tsx` | Pluralizace | Nízká |
| 7 | `ClientPortalLayout.tsx:259` | Z-index tooltip | Nízká |
