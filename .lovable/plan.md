

# Audit aplikace – Zrychlení a zjednodušení (Fáze 6)

Po důkladné analýze kódu jsem identifikoval 5 konkrétních problémů, které zpomalují aplikaci nebo zbytečně zatěžují uživatele.

---

## 1) Odstranit InteractionTracker – zbytečná zátěž na každé akci

`InteractionTracker` v `App.tsx` zachytává **každý klik, scroll, hover a focus** a zapisuje je do databáze v reálném čase. To znamená:
- Každé kliknutí na tlačítko = 1 DB write
- Každý scroll = opakované DB inserty (každou sekundu)
- Každý hover na element s `data-track-id` = DB write po 2s

Tento tracker generuje **desítky až stovky zbytečných DB požadavků** za minutu. Data z tabulek `interaction_events`, `scroll_analytics` a `rage_clicks` nejsou nikde v UI aktivně zobrazována (pouze v admin exportu). Tracker navíc zabírá event listenery na `click`, `scroll`, `mouseenter`, `mouseleave`, `focusin`, `focusout` globálně.

**Řešení:** Odebrat `InteractionTracker` z `App.tsx`. Ponechat soubor pro případné budoucí zapnutí, ale nedávat ho do komponentového stromu.

---

## 2) Odstranit apiInterceptor – zbytečný fetch wrapper

`apiInterceptor.ts` obaluje globální `window.fetch` a na **každý Supabase request** volá `trackApiLatency` a `trackNetworkFailure`, což spouští další DB inserty. Interceptor se inicializuje v `useSessionTracking`.

V produkci to znamená, že každý API požadavek má overhead z trackingu + generuje další API požadavek na záznam výkonu. Klasický "observer effect" – měření zpomaluje to, co měří.

**Řešení:** Odstranit volání `initApiInterceptor()` z `useSessionTracking.ts`.

---

## 3) Zjednodušit SessionTrackingProvider

`SessionTrackingProvider` inicializuje `SessionManager` (tabulka `user_sessions`), API interceptor a performance tracking. Po odstranění interceptoru zbude jen session manager, který je legitimní (tracking návštěv). Ale celý wrapper `SessionTrackingProvider.tsx` je zbytečná komponenta – stačí volat `useSessionTracking` přímo v `Layout.tsx`.

**Řešení:** Přesunout `useSessionTracking()` přímo do `Layout.tsx` a smazat `SessionTrackingProvider.tsx`. V `App.tsx` odebrat wrapper.

---

## 4) Dashboard: NextMonthForecastCard dělá 5 nezávislých DB queries

`useRevenueForecast` hook vykonává **5 paralelních DB queries** (credit_transactions, training_sessions 2×, business_expenses, clients) při každém načtení dashboardu. Tento hook má `staleTime` jen 2 minuty (default), takže se refetchuje často.

**Řešení:** Zvýšit `staleTime` na 10 minut – predikce se nemusí aktualizovat při každém návratu na dashboard. Přidat `refetchOnMount: false`.

---

## 5) Dashboard: useLifetimeStats dělá 6 DB queries

`useLifetimeStats` vykonává 6 paralelních queries bez limitu (stahuje **všechny** completed tréninky, **všechny** credit transakce). U aktivního trenéra s 500+ tréninky a 1000+ transakcemi to znamená stahování velkého množství dat.

**Řešení:** Zvýšit `staleTime` z 5 minut na 30 minut – lifetime stats se mění minimálně. Přidat `refetchOnMount: false`.

---

## Technické detaily

### Soubory k úpravě
- `src/App.tsx` – odebrat `InteractionTracker` wrapper a `SessionTrackingProvider`
- `src/components/layout/Layout.tsx` – přidat `useSessionTracking()` volání
- `src/hooks/useSessionTracking.ts` – odebrat `initApiInterceptor()` volání
- `src/hooks/useRevenueForecast.ts` – zvýšit staleTime na 10 min
- `src/hooks/useLifetimeStats.ts` – zvýšit staleTime na 30 min

### Soubory ke smazání
- `src/components/SessionTrackingProvider.tsx`

### Očekávaný dopad
- **Eliminace desítek DB požadavků za minutu** z interaction trackingu
- **Odstranění fetch wrapperu** = čistší network waterfall
- **Dashboard se načte rychleji** díky méně agresivnímu refetchování forecast a lifetime dat
- Žádná ztráta funkcionality pro uživatele – odstraněna pouze interní telemetrie

