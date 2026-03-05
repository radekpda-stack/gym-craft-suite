

# Plán: Redesign mobilního UI kategorie Prodej (Pokladna)

## Problém

Na mobilu je pokladna nepřehledná — uživatel musí scrollovat přes 5+ sekcí (klient, návrhy, poslední prodeje, oblíbené, filtry) než se dostane k produktům. Košík je zcela mimo viewport. Celkově to není "app-like" cashier zážitek.

## Řešení: Kompaktní mobilní pokladna

### 1. Sbalení sekcí nad produkty (pouze mobil)

Na mobilu **sbalit** sekundární sekce do horizontálních chipů/accordion:
- **"Obvykle kupuje"** → horizontální scroll chipů (už tak funguje, OK)
- **"Poslední prodeje"** → sbalit do `Collapsible`, defaultně zavřený na mobilu
- **"Top produkty"** → sbalit do `Collapsible`, defaultně zavřený na mobilu
- **Výběr klienta** — ponechat viditelný, ale kompaktnější (menší padding)

### 2. Sticky vyhledávání

Na mobilu **fixovat search bar** pod hlavičkou, aby byl vždy dostupný. Uživatel nemusí scrollovat zpět nahoru.

### 3. Kompaktnější produktové karty na mobilu

Aktuálně mají karty velký padding a zbytečný prostor:
- Zmenšit padding na mobilu (`p-2` místo `p-3`)
- Zmenšit font ceny (`text-base` místo `text-lg`)
- Skrýt type badge ikonu na mobilu (šetří řádek)
- Výsledek: více produktů viditelných najednou

### 4. Vylepšený MobileCartBar

Aktuální bar ukazuje jen počet a celkem. Rozšířit o:
- Název posledního přidaného produktu (fade-in animace)
- Vizuální feedback při přidání (pulse efekt)

### 5. Mobilní checkout jako Sheet (bottom drawer)

Místo scrollování ke CartPanelu na mobilu — při kliknutí na MobileCartBar otevřít **bottom sheet** (vaul `Drawer`) s kompletním košíkem, platební metodou a tlačítkem "Dokončit prodej".

```text
┌─────────────────────────┐
│ [Klient: Jan]           │  ← kompaktní
│ [🔍 Hledat produkt...] │  ← sticky
│ ─ Obvykle kupuje ─────  │  ← chips horizontálně
│ ┌───┐ ┌───┐ ┌───┐ ┌──┐ │
│ │Pro│ │Pro│ │Pro│ │Pr│ │  ← 2-col grid, kompaktní
│ │35 │ │45 │ │25 │ │30│ │
│ └───┘ └───┘ └───┘ └──┘ │
│ ┌───┐ ┌───┐ ┌───┐      │
│ │   │ │   │ │   │      │
│ └───┘ └───┘ └───┘      │
│                         │
│ ┌─[🛒 2] ── 155 Kč ─[Zaplatit]─┐ ← sticky bar
│ └───────────────────────────────┘
└─────────────────────────┘

        Klik na bar → Sheet:
┌─────────────────────────┐
│ ═══════                 │  ← drag handle
│ Košík (2 položky)       │
│ ├ Protein bar  1× 35Kč │
│ ├ BCAA         1× 120Kč│
│ Platba: [Hotově][Kredit]│
│ Celkem:        155 Kč   │
│ [══ Dokončit prodej ══] │
└─────────────────────────┘
```

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `SalesRegister.tsx` | Obalit RecentSales a FavoriteProducts do Collapsible na mobilu; sticky search wrapper; skrýt CartPanel na mobilu (nahrazeno Drawer) |
| `ProductCard` (v SalesRegister) | Kompaktnější padding a font na mobilu |
| `MobileCartBar.tsx` | Klik na košík otevře Drawer místo scrollu; přidat animaci při přidání |
| Nový: `MobileCartDrawer.tsx` | Bottom sheet (vaul Drawer) s CartPanel obsahem pro mobil |
| `RecentSales.tsx` | Přidat `collapsible` prop, defaultně sbalený na mobilu |
| `FavoriteProducts.tsx` | Přidat `collapsible` prop, defaultně sbalený na mobilu |
| `ProductSearchAndFilters.tsx` | Menší category chips na mobilu |

## Bezpečnost
Žádné změny v datové vrstvě — čistě UI refactor.

