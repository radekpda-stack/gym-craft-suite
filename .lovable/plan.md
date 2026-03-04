

# Další zjednodušení aplikace – Fáze 5

---

## 1) Smazat nepoužívané barrel indexy (3 soubory)

Tyto barrel index soubory **nikdo nikde neimportuje** — všechny hooky jsou importovány přímo:

- `src/hooks/clients/index.ts` — 0 importů
- `src/hooks/finance/index.ts` — 0 importů
- `src/hooks/portal/index.ts` — 0 importů
- `src/hooks/analytics/index.ts` — 0 importů

---

## 2) Smazat nepoužívané analytics hooky (3 soubory)

V `src/lib/analytics/interaction/` jsou 3 hooky, které nikdo neimportuje mimo barrel:

- `useFeatureTime.ts`
- `useJourney.ts`
- `usePerformance.ts`

Vyčistíme i re-exporty z `src/lib/analytics/interaction/index.ts` a `src/lib/analytics/index.ts`.

---

## 3) Smazat osiřelé dev nástroje (2 soubory)

- `src/components/dev/StressTestIndicator.tsx` — nikde importován
- `src/components/analytics/AnalyticsDebugPanel.tsx` — nikde importován

Tyto dev panely nejsou zapojené do žádné stránky.

---

## 4) Smazat nepoužívaný `useClientHub.ts` (172 řádků)

Hook `useClientHub` měl být centrální hub pro klientská data, ale **žádná komponenta ho nepoužívá**. Je importován pouze v `src/hooks/clients/index.ts` (který také nikdo neimportuje). Mrtvý kód.

---

## 5) Zjednodušit DemoContext — odstranit hardcoded admin email

`DemoContext.tsx` obsahuje `DEMO_ADMIN_EMAIL = 'radek.pda@gmail.com'` — stejný anti-pattern, který jsme opravili v Settings. Buď ho odstraníme, nebo nahradíme `isAdmin` checkem tam, kde se používá.

---

## Technické detaily

### Soubory ke smazání (10)
- `src/hooks/clients/index.ts`
- `src/hooks/finance/index.ts`
- `src/hooks/portal/index.ts`
- `src/hooks/analytics/index.ts`
- `src/lib/analytics/interaction/useFeatureTime.ts`
- `src/lib/analytics/interaction/useJourney.ts`
- `src/lib/analytics/interaction/usePerformance.ts`
- `src/components/dev/StressTestIndicator.tsx`
- `src/components/analytics/AnalyticsDebugPanel.tsx`
- `src/hooks/useClientHub.ts`

### Soubory k úpravě
- `src/lib/analytics/interaction/index.ts` — ponechat jen `InteractionTracker`
- `src/lib/analytics/index.ts` — odebrat re-exporty smazaných hooků
- `src/contexts/DemoContext.tsx` — nahradit `DEMO_ADMIN_EMAIL` za `isAdmin` check nebo odstranit

