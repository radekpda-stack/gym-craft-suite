
# Komplexni optimalizace mobilniho UI -- profesionalni mobilni aplikace

## Prehled identifikovanych problemu

Po duklednem auditu vsech hlavnich stranek a komponent jsem identifikoval nasledujici oblasti, ktere potrebuji zlepseni pro profesionalni mobilni zazitek:

### A. Rozvrh (SchedulePage) -- pretekajici hlavicka
**Problem**: Header na mobilu obsahuje 6-7 tlacitek v jednom radku (`Pridat`, `Treninkovy rezim`, `Zrusene`, `Nastaveni`, `Dnes`, `Datum picker`). Na 375px se nevejdou a pretekaji nebo se tisknou.

**Reseni**: 
- Sekundarni akce (`Zrusene treninky`, `Nastaveni kalendare`) presunout do overflow `DropdownMenu` (3 tecky)
- Na mobilu zobrazit pouze: `+ Pridat` (ikona), `Dnes`, `Datum picker`, `Overflow menu`
- Tlacitko "Treninkovy rezim" schovat do overflow na mobilu

### B. Karta klienta -- ClientSummaryStrip 3 sloupce
**Problem**: `grid-cols-3` s metrikami (Tento mesic, Celkova hodnota, Prumer/mesic) -- na mobilu se castky jako "12.400 Kc" orizavaji, labely "CELKOVA HODNOTA" jsou prilis uzke.

**Reseni**:
- Zmena na horizontalni scroll `flex overflow-x-auto snap-x` na mobilu
- Kazda karta `min-w-[150px] flex-shrink-0`
- Na desktopu zustane `sm:grid sm:grid-cols-3`

### C. Karta klienta -- ClientDetailTabs
**Problem**: 6 zalozek (Profil, Treninky, Finance, Vykon, Zdravi, Zpravy) -- sice maji horizontalni scroll, ale `w-max` zpusobuje, ze se na uzkem displeji nezobrazuji vsechny najednou a uzivatel nevi, ze muze scrollovat.

**Reseni**:
- Pridat vizualni hint (gradient fade) na prave strane, kdyz jsou dalsi taby mimo viewport
- Zmensit padding zalozek na mobilu z `px-2.5` na `px-2`
- Labely zkratit na mobilu: "Zpravy" -> ikona only pod `sm:`

### D. Dashboard -- metriky grid 3 sloupce
**Problem**: `DashboardHeader` grid `grid-cols-3` s kartami Kapacita/Klienti/Prijem -- na iPhone SE (320px) jsou karty stesnene, text "Klientu dnes" a "Dnesni prijem" se orizavaji.

**Reseni**:
- Zmena na horizontalni scroll na telefonech pod 375px
- `flex overflow-x-auto snap-x` s `min-w-[120px]` per karta
- Na `sm:` zustanou `grid-cols-3`

### E. Prodeje -- hero header a tipy
**Problem**: Smart tips v hero headeru (`tip.text` + `tip.subtext`) se na mobilu mohou nescrolovat a preteci. Badge chipy se zalamoji na dalsi radek.

**Reseni**:
- Omezit pocet zobrazenych tipu na mobilu na max 2
- Smart tips radek: `line-clamp-1` na mobilu aby nepretekaly

### F. Seznam klientu -- View Mode toggle
**Problem**: 4 tlacitka v jednom radku (Dnes, Tyden, Vsichni, Archiv) s badge -- na iPhone SE se texty nezobrazuji (hidden sm:inline), ale i tak muze byt stesnene s badges.

**Reseni**: Tento je relativne OK diky `hidden sm:inline`, ale pridat `gap-0.5` misto `gap-1` pro tesnejsi rozlozeni.

### G. Agenda Item (kalendar) -- akce pretekaji
**Problem**: `AgendaItem` ma tlacitka (Dokoncit w-10, Smazat w-8) + link sipku -- dohromady zabiraji ~80px, coz na uzkem displeji muze stisnit obsah.

**Reseni**:
- Zmensi akce tlacitka na `w-8 h-8` a `w-7 h-7`
- Skryt Smazat tlacitko na mobilu (pristupne pres context menu)

### H. MobileNav -- bottom offset
**Problem**: `bottom-6` (24px) muze byt prilis vysoko na nekterych telefonech a zabirat prostor obsahu.

**Reseni**: Zmensit na `bottom-4` (16px) pro lepsi vyuziti prostoru, nebo pridat `safe-area-inset-bottom` fallback.

### I. Globalni -- touch target konzistence
**Problem**: Nektere interaktivni prvky (badge, male tlacitka) nemaji dostatecne touch targety (min 44x44px).

**Reseni**: Audit a pridani `min-h-[44px] min-w-[44px]` na kriticke interaktivni prvky.

## Technicke detaily

| Soubor | Zmena |
|--------|-------|
| `src/pages/SchedulePage.tsx` | Presunuti sekundarnich akci do overflow menu na mobilu |
| `src/components/clients/ClientSummaryStrip.tsx` | Horizontalni scroll na mobilu misto grid-cols-3 |
| `src/components/clients/ClientDetailTabs.tsx` | Gradient hint pro scrollovatelnost, mensi padding |
| `src/components/dashboard/DashboardHeader.tsx` | Horizontalni scroll metrik na < sm |
| `src/pages/Sales.tsx` | Limit tipu na mobilu, line-clamp |
| `src/pages/Clients.tsx` | Tesnejsi view mode toggle |
| `src/components/calendar/AgendaItem.tsx` | Mensi akce, skryti sekundarnich na mobilu |
| `src/components/layout/MobileNav.tsx` | Jemne upravy pozicovani |
| `src/components/dashboard/TodayTimelineCompact.tsx` | Lepsi truncate pro dlouha jmena a badges |

### Vizualni styl
- Zachovame stavajici premiovni estetiku (glassmorphismus, backdrop-blur)
- Vsechny zmeny jsou ciste responzivni (mobilni breakpoint = pod `sm:`)
- Touch targety minimalne 44x44px
- Cesky jazyk ve vsech popiscich

### Priorita
1. SchedulePage header (nejvic viditelny problem)
2. ClientSummaryStrip (castka se orizava)
3. DashboardHeader metriky (prvni vec kterou uzivatel vidi)
4. Ostatni optimalizace
