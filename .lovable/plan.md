
# Opravy UI a grafiky -- nalezene problemy

## 1. Chybejici barvy `chart-2/3/4/5` v Tailwind konfiguraci (KRITICKE)

**Problem:** V `tailwind.config.ts` nejsou definovany barvy `chart-1` az `chart-5`, prestoze CSS promenne `--chart-1` az `--chart-5` existuji v `index.css`. Tailwind tedy **negeneruje** utility tridy jako `text-chart-2`, `bg-chart-2/10`, `border-chart-2/20` -- tyto tridy se potichu ignoruji a prvky nemaji zadnou barvu.

**Zasazena mista:**
- `SalesStatistics.tsx` -- 5. KPI karta "Prumer / den" (border, bg, text barvy chybi)
- `AppUsageStats.tsx` -- 3 KPI karty (chart-2, chart-3, chart-4 barvy chybi)

**Oprava:** Pridat do `tailwind.config.ts` sekce `colors`:

```text
chart: {
  1: "hsl(var(--chart-1))",
  2: "hsl(var(--chart-2))",
  3: "hsl(var(--chart-3))",
  4: "hsl(var(--chart-4))",
  5: "hsl(var(--chart-5))",
}
```

---

## 2. Hardcoded barvy `emerald-500/600` mimo temovy system (NIZKE RIZIKO)

**Problem:** V 33 souborech se pouzivaji primo barvy `emerald-500` a `emerald-600` misto temovych promennych (`success`, `status-ok`). V tmavem rezimu nekterych temat mohou tyto barvy spatne kontrastovat nebo vizualne neodpovidat zvolenemu schematu.

**Dopad:** Vizualni nekonzistence -- "Cisty zisk" karta v SalesStatistics pouziva `emerald-500` misto `success`, zatimco jine karty pouzivaji temove barvy.

**Oprava:** Nahradit v klicovych komponentach:
- `SalesStatistics.tsx` -- zisk karta: `emerald-500` nahradit za `success`, `emerald-600` za `success`
- `SalesStatistics.tsx` -- gradient: `from-emerald-500/20` nahradit za `from-success/20`

Poznamka: Kompletni nahrazeni ve vsech 33 souborech by bylo rozsirejsi refaktoring, ktery lze udelat postupne. Prioritou je `SalesStatistics.tsx`.

---

## 3. Nekonzistentni Tooltip stylovani v grafech (KOSMETICKE)

**Problem:** Nektere grafy pouzivaji `className="glass"` pro tooltip, jine `bg-popover border border-border`. Nove komponenty (`TopClientsChart`, `CategoryTrendChart`) pouzivaji `bg-popover`, zatimco puvodni grafy v `SalesStatistics` pouzivaji `glass`.

**Oprava:** Sjednotit na `bg-popover border border-border rounded-lg p-2 shadow-lg` (spolehlivejsi nez `glass` ktery muze byt pruhledny).

Zasazene soubory:
- `SalesStatistics.tsx` -- radek 725: tooltip pro "Trzby v case" pouziva `glass` -> zmenit na `bg-popover`

---

## 4. `SalesHeatmap` -- DOW index nesouhlasi s Postgres extract(dow)

**Problem:** Funkce `dowMondayFirst()` prevadi JS `getDay()` (0=nedele) na 0=pondeli. Ale pokud by se heatmap data generovala z Postgresu pres `extract(dow)`, tam je 0=nedele, 1=pondeli. Aktualne se data generuji na klientu z `getDay()`, takze to nyni funguje. Ale v `SalesHeatmap.tsx` radek 58 se pouziva `di` (index pole DAY_LABELS, 0-6) jako lookup klic, coz je spravne.

**Status:** V poradku, zadna oprava neni potreba.

---

## Souhrn oprav

| # | Soubor | Typ | Popis |
|---|--------|-----|-------|
| 1 | `tailwind.config.ts` | Bug fix | Pridat `chart` barvy do Tailwind |
| 2 | `SalesStatistics.tsx` | Vizualni | Nahradit `emerald-*` za `success` v zisk karte |
| 3 | `SalesStatistics.tsx` | Konzistence | Sjednotit tooltip na `bg-popover` |

Celkem 2 soubory k uprave, zadne nove soubory, zadne databazove zmeny.
