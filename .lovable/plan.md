

# Další zjednodušení aplikace – Fáze 4

---

## 1) Smazat 10 osiřelých hooků

Tyto soubory **nejsou importovány v žádné .tsx komponentě** (max. barrel re-exporty):

- `useGoalTracker.ts`
- `useFeatureFlags.ts`
- `useStatEvents.ts` (330 řádků)
- `useAnimatedTransition.ts`
- `useMobilityEntries.ts`
- `useSkillEntries.ts`
- `useCapacityAlerts.ts`
- `useCapacityTrend.ts`
- `useCareerStats.ts`
- `useDemoData.ts` (215 řádků – nikde importován po předchozím čištění)

Odstraníme i re-exporty z barrel souborů (`hooks/exercises/index.ts`, `hooks/analytics/index.ts`).

---

## 2) Zjednodušit ClientPortalProfile redirect

`ClientPortalProfile.tsx` je jen `<Navigate to="/client/settings" replace />`. Místo lazy-loadování celé stránky jen kvůli redirectu, nahradíme přímo v `App.tsx` inline `<Navigate>` a smažeme soubor.

---

## 3) Odstranit hardcoded owner check v Settings

`Settings.tsx` obsahuje `const isOwner = user?.email === 'radek.pda@gmail.com'` – hardcoded email v kódu. Nahradíme kontrolou `isAdmin`, čímž zjednodušíme logiku a odstraníme bezpečnostní anti-pattern.

---

## 4) Zjednodušit Settings page – sloučit kategorii "System" do "App"

Kategorie "Systém" v nastavení obsahuje jen 2-3 položky (refresh, PDF report, usage stats). To je málo na samostatnou kategorii. Sloučíme ji do "Aplikace", čímž zredukujeme počet kategorií z 7 na 6 a zjednodušíme navigaci.

---

## Technické detaily

### Soubory ke smazání (11)
- `src/hooks/useGoalTracker.ts`
- `src/hooks/useFeatureFlags.ts`
- `src/hooks/useStatEvents.ts`
- `src/hooks/useAnimatedTransition.ts`
- `src/hooks/useMobilityEntries.ts`
- `src/hooks/useSkillEntries.ts`
- `src/hooks/useCapacityAlerts.ts`
- `src/hooks/useCapacityTrend.ts`
- `src/hooks/useCareerStats.ts`
- `src/hooks/useDemoData.ts`
- `src/pages/client-portal/ClientPortalProfile.tsx`

### Soubory k úpravě
- `src/hooks/exercises/index.ts` – odebrat re-exporty `useMobilityEntries`, `useSkillEntries`
- `src/hooks/analytics/index.ts` – odebrat re-exporty `useCapacityTrend`
- `src/App.tsx` – nahradit lazy `ClientPortalProfile` inline `<Navigate>`
- `src/pages/Settings.tsx` – sloučit "Systém" do "Aplikace", nahradit `isOwner` za `isAdmin`

