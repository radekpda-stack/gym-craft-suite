## Porovnání klientů (Cohort benchmarks)

**Stav:** ✅ Implementováno

**Co bylo přidáno:**

- Nová záložka "Porovnání" v Performance Hub (top-level tab)
- Benchmark karty: výběr klienta → srovnání jeho výkonů vs průměr všech klientů v klíčových cvicích
- Vizuální indikátory (nad/na/pod průměrem) s procentuálním rozdílem
- Existující `MultiClientComparison` (2-4 klienti, křivky progresu vedle sebe) integrován pod benchmarky
- Hook `useCohortBenchmarks` pro výpočet srovnání klient vs průměr
- Komponenta `CohortBenchmarkView` kombinuje benchmark karty + multi-client porovnání
