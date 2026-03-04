

# Pokračování ve zlepšení a zjednodušení aplikace

---

## 1) Smazat další osiřelé hooky (3 soubory)

Následující hooky **nejsou importovány v žádné komponentě** (jen v barrel exportech nebo demo wrapperech, které taky nikdo nepoužívá):

- `src/hooks/useDashboardStats.ts` – nikde importován v `.tsx`
- `src/hooks/useDashboardKPIs.ts` – nikde importován v `.tsx`
- `src/hooks/useSmartDailyPlan.ts` – nikde importován v `.tsx`
- `src/hooks/useYearOverYearStats.ts` – nikde importován v `.tsx` (jen barrel re-export)

Před smazáním odstraníme i re-exporty z `src/hooks/analytics/index.ts` a případné reference v `useDemoData.ts`.

---

## 2) Lazy-load DashboardActions – přesunout data hooky dovnitř sheetu

`DashboardActions` dnes **eager-loaduje** `useClients()` a `useCreateTrainingSession()` i když uživatel tréninkový sheet neotevře (většina návštěv dashboardu). 

Řešení: `CreateTrainingSheet` si bude hooky volat sám – přidáme do něj vlastní `useClients()` a `useCreateTrainingSession()`, a `DashboardActions` je přestane načítat. Interface sheetu se zjednoduší (nebude potřebovat `clients` prop ani `onSubmit`).

---

## 3) Přidat rok-over-rok trend do DashboardLifetimeStats

Místo samostatného (a nepoužívaného) `useYearOverYearStats`, rozšíříme stávající `useLifetimeStats` o dvě nová pole: `thisYearTrainings` a `lastYearTrainings` (případně i income). Data už stejně načítáme – stačí filtrovat dle roku.

V `DashboardLifetimeStats` u klíčových metrik (tréninky, finance) zobrazíme malý trend badge „letos vs loni" (šipka + %).

---

## 4) Vyčistit `useDemoData.ts` od mrtvých referencí

`useDemoData.ts` importuje a re-exportuje `useDashboardStats`, který jsme v kroku 1 smazali. Odstraníme tyto mrtvé reference.

---

## Soubory
- **Smazat:** `useDashboardStats.ts`, `useDashboardKPIs.ts`, `useSmartDailyPlan.ts`, `useYearOverYearStats.ts`
- **Edit:** `src/hooks/analytics/index.ts` (odebrat re-exporty)
- **Edit:** `src/hooks/useDemoData.ts` (odebrat mrtvé importy)
- **Edit:** `src/components/dashboard/DashboardActions.tsx` (odebrat eager hooky)
- **Edit:** `src/components/trainings/CreateTrainingSheet.tsx` (přidat vlastní data hooky)
- **Edit:** `src/hooks/useLifetimeStats.ts` (přidat this/last year data)
- **Edit:** `src/components/dashboard/DashboardLifetimeStats.tsx` (zobrazit YoY trendy)

