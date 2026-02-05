
# Redesign Karty klienta: Kredit & Finanční historie jako priorita

## Cíl
Přepracovat UI karty klienta tak, aby **Kredit** a **Finanční/Tréninková historie** byly dominantními prvky - okamžitě viditelné a snadno dostupné bez navigace do záložek.

---

## Současný stav

Aktuální struktura stránky `/clients/:id`:

```text
┌─────────────────────────────────────────────────────────┐
│ ClientHeaderCompact (jméno, kontakty, badges)           │
├─────────────────────────────────────────────────────────┤
│ ClientHealthAlert (zdravotní upozornění)                │
├─────────────────────────────────────────────────────────┤
│ ClientSummaryStrip (kredit + 3 další metriky)           │  ← Kredit je zde, ale malý
├─────────────────────────────────────────────────────────┤
│ ClientDetailTabs (Profil | Média | Tréninky | Finance...) │
│   └─ Finance záložka obsahuje ClientFinanceLedger       │  ← Historie je schovaná
└─────────────────────────────────────────────────────────┘
```

**Problém:** Kredit je jen jedna z mnoha karet v SummaryStrip a finanční historie vyžaduje proklik na záložku "Finance".

---

## Navrhovaný redesign

### Princip: "Credit-First Hero Section"

```text
┌─────────────────────────────────────────────────────────┐
│ ClientHeaderCompact (zůstává - jméno, kontakty)         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│   ╔════════════════════════════════════════════════╗    │
│   ║  CREDIT HERO CARD                              ║    │  ← NOVÝ velký prvek
│   ║  ┌────────────┐  ┌────────────────────────────┐║    │
│   ║  │ 8 500 Kč   │  │ Posledních 5 pohybů:       │║    │
│   ║  │  ZŮSTATEK  │  │  • 5.2. Trénink  -900 Kč   │║    │
│   ║  │            │  │  • 3.2. Dobití +3000 Kč    │║    │
│   ║  │  [+Dobít]  │  │  • 1.2. Trénink  -900 Kč   │║    │
│   ║  │            │  │  • ...                     │║    │
│   ║  └────────────┘  │  [Celá historie →]         │║    │
│   ║                  └────────────────────────────┘║    │
│   ╚════════════════════════════════════════════════╝    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ Quick Stats Strip (tréninky měsíc, rok, LTV) - menší   │
├─────────────────────────────────────────────────────────┤
│ ClientDetailTabs (Profil | Média | Tréninky | Výkon...) │
│   └─ Finance záložka zůstává pro detailní ledger       │
└─────────────────────────────────────────────────────────┘
```

---

## Konkrétní změny

### 1. Nová komponenta: `ClientCreditHeroCard`

**Soubor:** `src/components/clients/ClientCreditHeroCard.tsx` (nový)

Velká, dominantní karta s glassmorphismem obsahující:

**Levá část (1/3):**
- Velký zůstatek kreditu (text-3xl font-bold)
- Barevná signalizace (zelená/žlutá/červená podle stavu)
- Badge pro sdílený rozpočet
- CTA tlačítko "Dobít kredit"

**Pravá část (2/3):**
- Nadpis "Poslední pohyby"
- Seznam posledních 5 transakcí (kompaktní řádky):
  - Datum | Popis | Částka (barevně +/-)
  - Ikony typu (trénink/dobití/produkt)
- Odkaz "Celá historie →" → přepne na záložku Finance

**Mobilní layout:**
- Stack vertikálně (kredit nahoře, historie dole)
- Sbalitelná historie (defaultně 3 položky, "Zobrazit více")

### 2. Úprava `ClientSummaryStrip`

**Soubor:** `src/components/clients/ClientSummaryStrip.tsx`

- **Odstranit** kredit kartu (přesunuta do CreditHeroCard)
- Zůstanou pouze:
  - Tréninky tento měsíc
  - LTV (celková hodnota)
  - Průměr/měsíc
- Zmenšit na kompaktnější strip (2-3 karty)

### 3. Úprava `ClientDetail.tsx`

**Soubor:** `src/pages/ClientDetail.tsx`

Změna pořadí sekcí:
1. ClientHeaderCompact (beze změny)
2. ClientHealthAlert (beze změny)
3. **ClientCreditHeroCard** (NOVÉ - nahrazuje část SummaryStrip)
4. ClientSummaryStrip (zmenšený - bez kreditu)
5. ClientDetailTabs (beze změny)

### 4. Vylepšení rychlé navigace do historie

**V ClientCreditHeroCard:**
- Kliknutí na "Celá historie" změní URL na `?tab=finance`
- ClientDetailTabs již podporuje `?tab=` parametr

---

## Vizuální specifikace

### CreditHeroCard design:

```css
/* Kontejner */
.credit-hero {
  background: glassmorphism (bg-card/80 backdrop-blur-lg);
  border: 2px solid (dynamicky podle stavu kreditu);
  border-radius: 1.5rem;
  padding: 1.5rem;
}

/* Kredit zůstatek */
.credit-balance {
  font-size: 2.5rem (text-4xl);
  font-weight: bold;
  font-variant-numeric: tabular-nums;
  color: zelená > 2000, žlutá 500-2000, červená < 500;
}

/* Historie timeline */
.history-item {
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.75rem;
  transition: hover lift effect;
}

/* Hover na položce historie */
.history-item:hover {
  background: secondary/50;
  transform: translateY(-1px);
}
```

### Barevná signalizace kreditu:

| Stav | Zůstatek | Barva borderu | Barva textu |
|------|----------|---------------|-------------|
| OK | > 2000 Kč | border-success/30 | text-success |
| Varování | 500-2000 Kč | border-warning/30 | text-warning |
| Kritický | < 500 Kč | border-destructive/30 | text-destructive |
| Dluh | < 0 nebo nezaplaceno | border-destructive + pulse | text-destructive + badge |

---

## Data pro CreditHeroCard

Hook `useClientCreditHeroData(clientId)` bude kombinovat:
- `useSharedBudgetBalance` → zůstatek
- `useCreditTransactions` → posledních 5 transakcí
- `useUnpaidTrainings` → počet nezaplacených

Nebo využít existující data z `ClientDetail.tsx` a předat jako props.

---

## Soubory k úpravě/vytvoření

| Soubor | Akce | Popis |
|--------|------|-------|
| `src/components/clients/ClientCreditHeroCard.tsx` | **Nový** | Hlavní hero karta s kreditem a historií |
| `src/components/clients/ClientSummaryStrip.tsx` | Upravit | Odstranit kredit, zmenšit na 2-3 metriky |
| `src/pages/ClientDetail.tsx` | Upravit | Přidat CreditHeroCard do layoutu |

---

## Přínosy

1. **Kredit je okamžitě viditelný** - dominantní pozice, velký font
2. **Historie bez klikání** - posledních 5 pohybů přímo na kartě
3. **Rychlá akce** - tlačítko "Dobít" přímo u zůstatku
4. **Zachovaná funkcionalita** - plný ledger stále v záložce Finance
5. **Konzistentní design** - využívá existující glassmorphism a instrumentální styl

---

## Technické poznámky

- Využít existující `LedgerEntry` typ z `ClientFinanceLedger`
- Znovupoužít ikony a formátování z existujících komponent
- Animace: Framer Motion pro micro-interactions (hover lift)
- Responsivita: Mobile-first s breakpointem na `sm:` pro desktop layout
