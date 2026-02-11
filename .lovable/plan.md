

# Zrychleni a modernizace karty treningu a dokoncovani

## Analyza soucasneho stavu

### Co trener dnes musi udelat pro dokonceni:
1. Otevrit kartu treningu ze rozvrhu
2. Scrollovat pres "Priprava" sekci (zbytecne pri dokoncovani)
3. Scrollovat ke "Klasifikace" (tagy, RPE)
4. Scrollovat ke "Cviky" 
5. Scrollovat ke "Rychle akce" (uplne dole!)
6. Klik "DOKONCIT TRENINK" → otevre dialog
7. V dialogu: zkontrolovat/doplnit tagy (pokud chybi)
8. V dialogu: zkontrolovat platby
9. Volitelne: pridat poznamky
10. Klik "Dokoncit"

### Identifikovane problemy:

**A) Prilis mnoho scrollovani**
- "Rychle akce" (hlavni CTA) je az pod cviky, casto mimo obrazovku
- Trener musi scrollovat nahoru i dolu aby nasel co potrebuje
- Na mobilu je to 3-5 screenu obsahu

**B) Duplicita v completion dialogu**
- Tagy se edituji na karte I v dialogu
- Popis "Zkontrolujte tagy a platby" ale tagy uz mohou byt vyplnene z karty
- Dialog opakuje informace ktere uz trener videl

**C) Platebni sekce je tezkopadna**
- 5 platebnih tlacitiek na jeden radek = male tlacitka, tezke trefit na mobilu
- Animated pill indikator pridava vizualni "noise" bez praktickeho vyznamu
- Input pro cenu neni dobre viditelny

**D) QuickActions a ActionBar jsou oddelene**
- `QuickActionsSection` je v hlavnim obsahu (scrollovatelny)
- `TrainingActionBar` (sticky bottom) neni vyuzivan v TrainingDetail
- Hlavni akce neni vzdy viditelna

**E) Prilis mnoho sekcí naraz**
- PrepSection, Participants, PRs, Tags, Exercises, QuickSale, QuickActions
- Vsechno je na jedne dlouhe strance
- Chybi vizualni hierarchie "co je dulezite NYNI"

---

## Navrhovane zmeny

### 1. Sticky bottom action bar (KRITICKE)

Pridat fixni spodni listu se stavem treningu a hlavni akci, aby "Dokoncit" bylo vzdy dostupne bez scrollovani.

```
┌─────────────────────────────────┐
│  ✓ Tagy OK  │  900 Kč  │  RPE 7│
│  ═══════════════════════════════│
│  [DOKONCIT TRENINK]             │
└─────────────────────────────────┘
```

- Zobrazuje stav pripravenosti (tagy ✓/✗, RPE, cena)
- Hlavni tlacitko je VZDY viditelne
- Kliknuti otevre zjednoduseny completion sheet
- Na mobilu: `safe-area-bottom` pro iPhone notch

### 2. Zjednoduseny completion flow (Bottom Sheet misto Dialog)

Nahradit `Dialog` za `Sheet` (bottom sheet na mobilu), ktery obsahuje POUZE to, co trener jeste nevyplnil:

**Krok 1 - Smart completion sheet:**
- Pokud tagy CHYBI → zobrazit CompactTagSelector
- Pokud tagy OK → preskocit, jen zobrazit shrnuti
- Platebni metoda: vetsi tlacitka (3 sloupce misto 5)
- RPE: pokud chybi, zobrazit inline
- Poznamky: collapsible, ne vzdy viditelne

**Krok 2 - Jednim klikem:**
- Tlacitko "Dokoncit" s animovanym loading state
- Summary overlay se zobrazi po uspesnem dokonceni

### 3. Preusporadani karty treningu

Nova hierarchie sekcí:

```
1. HeroHeader (beze zmeny - kompaktni, OK)
2. TAGS + RPE (presunout NAD cviky, je to meta-info)
   → Kompaktnější: 1 radek typ + partie, RPE vedle
3. EXERCISES (hlavni obsah - dominantni)
4. PREP SECTION (ve výchozím stavu SBALENE)
   → Otevira se klepnutim, ne automaticky
5. PARTICIPANTS (zobrazit jen pokud > 1)
6. QUICK SALE (beze zmeny)
7. [STICKY BOTTOM BAR - Dokončit]
```

### 4. Vylepšeni ParticipantPaymentCard

- Zvetsit platebni tlacitka na 3 sloupce (Kredit, Hotove, Jine)
- "Jine" rozbali dropdown s Karta/Banka/Pozdeji
- Odstranit animovany pill - nahradit jednoduchym aktivnim stavem
- Zobrazit kreditovy zustatek vyrazneji
- Editace ceny: vetsi input, jasnejsi design

```
┌─────────────────────────────────┐
│ 👤 Jan Novak          900 Kč   │
│ Kredit: 4 200 → 3 300 Kč      │
│ ┌─────────┬─────────┬────────┐ │
│ │💰KREDIT │💵HOTOVĚ │  JINÉ  │ │
│ └─────────┴─────────┴────────┘ │
└─────────────────────────────────┘
```

### 5. Smart defaults a auto-completion

- Pokud klient ma `payment_mode = 'credit'` a dostatek kreditu → automaticky vybrat kredit, netrebovat potvrzeni
- Pokud vsechny tagy uz jsou vyplnene a RPE nastaveno → skip tag sekci v dialogu kompletne
- Pokud 1 ucastnik, kredit staci → "Quick complete" - jedno kliknuti dokoncí vše

### 6. Vizualni vylepseni

- **Tags sekce**: kompaktnejsi, jednorádkovy layout pro typ + partie
- **RPE**: integrovany primo do tag řádku (ne samostatna sekce)
- **Completion sheet**: gradient header s ikonami stavu
- **Platební tlačítka**: vetsi touch target (min 48px vyska)
- **Prep sekce**: defaultne sbalena s badge poctu upozorneni

---

## Technicke zmeny

### Soubory k uprave:

| Soubor | Zmena |
|--------|-------|
| `TrainingDetailView.tsx` | Preusporadat sekce, prep defaultne sbalena |
| `TrainingDetail.tsx` | Nahradit Dialog za Sheet, pridat sticky bar |
| `ParticipantPaymentCard.tsx` | 3-sloupcovy layout, vetsi tlacitka, bez pill animace |
| `CompactTagGridSelector.tsx` | Kompaktnejsi layout, RPE inline |
| `QuickActionsSection.tsx` | Zjednodusit, presunout do sticky baru |
| `InlineRPESelector.tsx` | Vetsi touch targets, vizualni upgrade |

### Nové komponenty:

| Komponenta | Popis |
|------------|-------|
| `TrainingStatusBar.tsx` | Sticky spodni lista s pripravenosti a CTA |
| `SmartCompletionSheet.tsx` | Bottom sheet ktery zobrazuje jen co chybi |

### Logika Smart Completion:

```typescript
// Urcit co jeste chybi
const completionState = {
  tagsReady: tagValidation.isValid,
  rpeSet: coachRPE !== null,
  paymentsSet: true, // auto-filled z defaults
  canQuickComplete: tagValidation.isValid && coachRPE !== null 
    && participantPayments.every(p => p.payment_method === 'credit'),
};

// Pokud vse pripraveno → quick complete bez sheetu
// Pokud neco chybi → sheet s chybejicimi sekcemi
```

---

## Ocekavany vysledek

- **Pred**: 7-10 klepnuti, 3-5 screenu scrollovani
- **Po**: 2-4 klepnuti, 0 scrollovani (sticky bar vzdy viditelny)
- Trener dokoncí 90% treninkl jedním klepnutím (smart defaults)
- Platebni sekce je prehlednejsi a snazsi na dotek
- Karta treningu je vizuálne cistejsi s jasnou hierarchii

