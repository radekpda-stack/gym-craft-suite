

# Plán: Kompaktnější a přehlednější karta tréninku

## Problémy
1. Příliš velké mezery mezi sekcemi (`space-y-4`) a uvnitř karet (`p-4`, `space-y-3`)
2. Každá sekce je samostatná karta s bordery, stíny a blur — vizuální šum
3. Hero header, Tags a Notes jsou 3 oddělené karty — zbytečně roztažené
4. RPE selector zabírá plnou šířku s velkými tlačítky
5. Poznámky mají zbytečně velký padding a vlastní kartu

## Navrhované změny

### 1. Sloučit Hero + Tags do jedné karty
Místo dvou oddělených karet (Hero header + Klasifikace) je sloučit do jednoho bloku. Odstraní se duplicitní bordery, padding a vizuální mezera.

### 2. Zmenšit mezery v celém layoutu
- `TrainingDetailView`: `space-y-4` → `space-y-2`
- Karty: `p-4` → `p-3`
- `CompactTagGridSelector`: `space-y-3` → `space-y-2`

### 3. Kompaktnější RPE selector
- Zmenšit tlačítka z `w-8 h-8 sm:w-9 sm:h-9` na `w-7 h-7 sm:w-8 sm:h-8`
- Přesunout label inline vedle tlačítek (ne nad nimi)

### 4. Poznámky integrovat přímo pod cviky bez samostatné karty
- Místo vlastní karty s `rounded-2xl bg-card border shadow p-4` zobrazit poznámky jako jednoduchý inline blok uvnitř sekce cviků, nebo minimálně bez vizuálně těžké karty — jen lehký background.

### 5. PreviousTrainingSummary — kompaktnější header
- Zmenšit padding, sloučit date do header řádku místo subline

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `TrainingDetailView.tsx` | Sloučit Hero + Tags do jedné karty; `space-y-4` → `space-y-2`; zjednodušit notes wrapper |
| `TrainingHeroHeader.tsx` | Odebrat vnější kartu wrapper (bude součástí merged karty) |
| `CompactTagGridSelector.tsx` | `space-y-3` → `space-y-2` |
| `InlineRPESelector.tsx` | Menší RPE tlačítka |
| `PreviousTrainingSummary.tsx` | Tighter padding |

Žádné DB změny — čistě vizuální úpravy spacingu a sloučení karet.

