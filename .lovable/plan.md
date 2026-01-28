
# Redesign sekce tagů na kartě tréninku

## 1. Analýza současného stavu

### Aktuální struktura (z obrázku)
```text
┌─────────────────────────────────────────────────────────────┐
│  [badge: 💪 Silový]                                         │
├─────────────────────────────────────────────────────────────┤
│  TYP TRÉNINKU                                               │
│  [✓ 💪 Silový] [🔥 HIIT] [❤️ Kardio] [⚡ Funkční]           │
│  [🧘 Mobilita] [🌿 Regenerace] [📊 Diagnostický]            │
├─────────────────────────────────────────────────────────────┤
│  ZAMĚŘENÍ                                                   │
│  [Core] [Flexibilita] [Hypertrofie] [Max síla]             │
│  [Plyometrie] [Síla] [Stabilita] [Technika]                │
├─────────────────────────────────────────────────────────────┤
│  INTENZITA                                                  │
│  [Lehký] [Střední] [Těžký]                                 │
├─────────────────────────────────────────────────────────────┤
│  PARTIE TĚLA                                                │
│  [Celé tělo] [Horní část ▾] [Dolní část ▾] [Břicho ▾]      │
├─────────────────────────────────────────────────────────────┤
│  RPE TRENÉRA                                                │
│  [1][2][3][4][5][6][7][8][9][10]                            │
└─────────────────────────────────────────────────────────────┘
```

### Identifikované problémy

| Problém | Dopad | Priorita |
|---------|-------|----------|
| **Příliš mnoho kliknutí** | Každý tag vyžaduje samostatný klik (7 typů + 8 zaměření + 3 intenzity + 4 partie) | Vysoká |
| **Špatná vizuální hierarchie** | Všechny sekce vypadají stejně důležitě | Vysoká |
| **Dlouhé scrollování** | Tag sekce zabírá ~40% obrazovky | Střední |
| **Intenzita se používá méně** | Ale zabírá stejně místa jako důležitější sekce | Nízká |
| **Chybí rychlé kombinace** | TrainingPresetSelector existuje, ale není integrován na detailu | Střední |

---

## 2. Navrhovaný redesign

### 2.1 Nová vizuální hierarchie - "Smart Tag Grid"

Místo 5 oddělených sekcí pod sebou → **kompaktní 2-řádková mřížka** s nejčastějšími kombinacemi:

```text
┌─────────────────────────────────────────────────────────────┐
│  KLASIFIKACE TRÉNINKU                        [⚙️ Více]     │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐
│  │ [💪 Silový ▾] [Hypertrofie ▾] [Střední ▾] [Horní ▾]    │
│  │      TYP         ZAMĚŘENÍ       INTENZITA   PARTIE      │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
│  RPE: [1][2][3][4][5][6][7][8][9][10]    ← jen čísla       │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Hlavní změny

#### A) Inline Dropdown Selectors místo chip gridu

Každá kategorie jako kompaktní dropdown:

```text
┌──────────────────┐
│ 💪 Silový      ▾ │  ← 1 tap otevře dropdown se všemi typy
└──────────────────┘
```

**Výhody:**
- Snížení vizuálního přetížení (7 chipů → 1 dropdown)
- Jasná hierarchie (vybraná hodnota je vidět ihned)
- Rychlejší výběr (1 tap + 1 tap místo skenování)

#### B) Horizontální layout pro 4 hlavní kategorie

```text
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 💪 Síla ▾│ │Hypertro▾ │ │ Střední▾ │ │ Horní ▾  │
│   TYP    │ │ ZAMĚŘENÍ │ │INTENZITA │ │  PARTIE  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```

#### C) Inteligentní výchozí hodnoty

Na základě typu tréninku automaticky předvyplnit:
- **Silový** → Intenzita: Střední (nejčastější)
- **HIIT/Kardio** → Partie: Celé tělo (už funguje)
- **Mobilita** → Skrýt Zaměření i Intenzitu (už funguje)

#### D) Kompaktnější RPE

Místo 10 velkých tlačítek → menší inline verze:

```text
RPE  [1][2][3][4][5][6][7][8][9][10]  Střední
      ↑ kompaktnější, bez legendy pod nimi
```

### 2.3 Rozšířený režim (modal)

Tlačítko "⚙️ Více" otevře modal s plným editorem:
- Vícenásobný výběr zaměření (multi-select grid)
- Detailní partie těla (hierarchie svalů)
- Uložení jako preset

---

## 3. Wireframe nového designu

### Výchozí stav (kompaktní)
```text
┌─────────────────────────────────────────────────────────────┐
│  KLASIFIKACE                                    [⚙️ Více]  │
│                                                             │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌────────────┐ │
│  │ 💪 Silový │ │ Hypertrofie│ │ Střední  │ │ Horní část │ │
│  │     ▾      │ │     ▾      │ │    ▾     │ │     ▾      │ │
│  └────────────┘ └────────────┘ └──────────┘ └────────────┘ │
│                                                             │
│  RPE  ●●●●○○○○○○  [5]                   Středně náročné    │
│       1 2 3 4 5 6 7 8 9 10                                  │
└─────────────────────────────────────────────────────────────┘
```

### Dropdown otevřený (Typ tréninku)
```text
┌────────────────────┐
│ 💪 Silový       ✓ │
│ 🔥 HIIT           │
│ ❤️ Kardio         │
│ ⚡ Funkční        │
│ 🧘 Mobilita       │
│ 🌿 Regenerace     │
│ 📊 Diagnostický   │
└────────────────────┘
```

### Rozšířený režim (modal)
```text
┌─────────────────────────────────────────────────────────────┐
│  Detailní nastavení tréninku                          [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  TYP TRÉNINKU                                               │
│  [✓ 💪 Silový] [🔥 HIIT] [❤️ Kardio] [⚡ Funkční]          │
│  [🧘 Mobilita] [🌿 Regenerace] [📊 Diagnostický]           │
│                                                             │
│  ZAMĚŘENÍ (vyberte více)                                    │
│  [✓ Hypertrofie] [✓ Síla] [Core] [Flexibilita]             │
│  [Max síla] [Plyometrie] [Stabilita] [Technika]            │
│                                                             │
│  INTENZITA                                                  │
│  [Lehký] [✓ Střední] [Těžký]                               │
│                                                             │
│  PARTIE TĚLA                                                │
│  [Celé tělo] [✓ Horní část ▾] [Dolní část ▾] [Břicho ▾]   │
│     └── [✓ Hrudník] [Ramena] [Záda] [Triceps] [Biceps]     │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  [💾 Uložit jako preset]              [Zavřít]  [Použít]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Technická implementace

### Nové komponenty

| Komponenta | Účel |
|------------|------|
| `CompactTagSelector.tsx` | Hlavní kompaktní 4-dropdown layout |
| `TagDropdownSelect.tsx` | Jednotlivý dropdown pro kategorii tagů |
| `ExpandedTagModal.tsx` | Modal pro detailní multi-select nastavení |
| `InlineRPESelector.tsx` | Kompaktnější verze RPE vstupu |

### Změny v existujících souborech

| Soubor | Změna |
|--------|-------|
| `TrainingDetailView.tsx` | Nahradit `TrainingTagStepper` za `CompactTagSelector` |
| `TrainingTagStepper.tsx` | Refaktorovat jako "expanded" verze v modalu |
| `RPEInputField.tsx` | Přidat variantu `compact` s menšími tlačítky |

### Datový tok

```text
CompactTagSelector
├── TagDropdownSelect (typ)      → onTrainingTypeChange
├── TagDropdownSelect (zaměření) → onFocusTagsChange (primary selection)
├── TagDropdownSelect (intenzita) → onIntensityTagChange  
├── TagDropdownSelect (partie)   → onBodyPartTagsChange (primary selection)
├── InlineRPESelector            → onCoachRPEChange
└── [Více] → ExpandedTagModal    → full multi-select pro všechny kategorie
```

---

## 5. Srovnání: Před vs Po

| Metrika | Před | Po |
|---------|------|-----|
| Počet kliknutí pro základní klasifikaci | 4-5 (scan + click × 4) | 4 (tap dropdown × 4) |
| Vertikální prostor | ~350px | ~120px |
| Vizuální komplexita | 20+ viditelných chipů | 4 dropdowny + RPE slider |
| Čas na orientaci | 5-8 sekund | 2-3 sekundy |
| Multi-select zaměření/partie | Vždy viditelný | Skryt v "Více" modalu |
| RPE vstup | Velká sekce | Kompaktní inline |

---

## 6. Alternativní návrh (jednodušší verze)

Pokud kompletní redesign je příliš velká změna, lze začít postupně:

### Fáze 1: Zmenšit a zjednodušit
- Menší chip tlačítka (výška 32px místo 40px)
- Skrýt Intenzitu pod rozbalovací sekci
- Kompaktnější RPE bez legendy

### Fáze 2: Collapsible sekce
- Typ tréninku vždy viditelný
- Zaměření/Intenzita/Partie v collapsible accordion
- Indikátor počtu vybraných tagů v hlavičce

### Fáze 3: Smart defaults
- Předvyplnit intenzitu "Střední" automaticky
- Zapamatovat poslední výběr pro daného klienta

---

## 7. Doporučení

**Doporučuji implementovat hlavní návrh (Compact Tag Grid s dropdowny)**, protože:

1. Řeší oba hlavní problémy (mnoho kliknutí + přehlednost)
2. Zachovává plnou funkcionalitu v modalu "Více"
3. Snižuje kognitivní zátěž na první pohled
4. Lépe využívá horizontální prostor na mobilu
5. Sjednocuje UX s běžnými formuláři (dropdown pattern je známý)

**Časový odhad implementace:**
- Kompletní redesign: ~3-4 hodiny
- Jednodušší verze (fáze 1+2): ~1.5 hodiny
