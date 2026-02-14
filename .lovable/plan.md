

# Oprava mobilniho UI na karte Vykonnost

## Identifikovane problemy (z obrazovky)

1. **KPI Bar (3 karty nahore)**: Na mobilu se texty orizavaji ("CVIKU V KNIHO...", "ZAZNA... TENTO MESIC...") protoze 3 sloupce jsou prilis uzke
2. **Zalozky (TabsList)**: Nazvy se neveji a zobrazuji jen prvni pismeno ("K", "K", "A", "T", "V") -- nerozpoznatelne
3. **Kategorie cviku**: 3 sloupce na mobilu jsou sticene, ale jeste citelne

## Reseni

### 1. KPI Bar -- horizontalni scroll na mobilu

Zmena gridu z `grid-cols-3` na horizontalne posuvny seznam na mobilu. Kazda karta bude mit fixni sirku `min-w-[140px]` aby se text neorizaval. Na desktopu zustane grid.

**Soubor:** `src/components/performance/PerformanceKPIBar.tsx`
- Kontejner: `flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible`
- Karty: `min-w-[140px] sm:min-w-0 snap-start flex-shrink-0 sm:flex-shrink`

### 2. Zalozky -- ikony only na mobilu, text od sm+

Texty v `TabsTrigger` budou skryte na mobilu (< sm) a zobrazene od `sm:` breakpointu. Ikony zustanou vzdy viditelne.

**Soubor:** `src/pages/PerformanceHub.tsx`
- `<span className="text-xs truncate">` zmenit na `<span className="hidden sm:inline text-xs truncate">`
- Na mobilu se zobrazi jen ikony (Zap, Users, List, BarChart3, atd.) -- rozpoznatelne bez textu

### 3. Kategorie cviku -- 2 sloupce na mobilu, 3 od sm+

Zmena `grid-cols-3` na `grid-cols-2 sm:grid-cols-3` aby karty meli vice prostoru. Treti karta (Plyometrie) bude na druhem radku.

**Soubor:** `src/components/performance/CategoryCards.tsx`
- Grid: `grid-cols-2 sm:grid-cols-3`
- Zmensi padding na mobilu: `p-3 sm:p-4`

## Technicke detaily

| Soubor | Zmena |
|--------|-------|
| `src/components/performance/PerformanceKPIBar.tsx` | Horizontalni scroll na mobilu misto 3-col gridu |
| `src/pages/PerformanceHub.tsx` | Skryti textu zalozek na mobilu (hidden sm:inline) |
| `src/components/performance/CategoryCards.tsx` | Grid 2 sloupce na mobilu, 3 od sm |

