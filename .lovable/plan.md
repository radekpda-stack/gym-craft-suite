
# Redesign modulu "Feedbacky" - Perspektiva trenéra

## Analýza současného stavu

### Co funguje dobře:
- Přehledné status karty (K odeslání, Čekající, Vyplněno, Expirováno, Red Flags)
- Attention Inbox s prioritou položek
- Korelační grafy a trendy
- Detail feedbacku s vizuálními progress bary

### Co chybí z pohledu trenéra:

| Problém | Dopad na workflow |
|---------|-------------------|
| **Historie nemá rychlý pohled na metriky** | Musím klikat na každý feedback zvlášť |
| **Chybí filtr podle severity** | Nemohu rychle najít problémové feedbacky |
| **Nelze porovnat klienty mezi sebou** | Nevím, kdo potřebuje více pozornosti |
| **Žádné rychlé akce u vyplněných** | Nemohu okamžitě reagovat (poznámka, úprava programu) |
| **Statistiky jsou příliš obecné** | Chci vidět konkrétní čísla pro konkrétní klienty |

---

## Návrh nového layoutu

```text
┌─────────────────────────────────────────────────────────────────────────┐
│ 📊 Přehled zpětné vazby                                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                                │
│ │ 3   │ │ 5   │ │ 12  │ │ 2   │ │ 1   │  ← Status karty (bez změny)   │
│ │Send │ │Wait │ │Done │ │Exp. │ │Red  │                                │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                                │
│                                                                         │
│ ┌───────────────────────────────┐ ┌───────────────────────────────────┐│
│ │ 🔔 POTŘEBUJE POZORNOST        │ │  [K odeslání][Vyplněné][Statistiky]│
│ │ (Attention Inbox - beze změny)│ │                                   ││
│ │                               │ │                                   ││
│ │                               │ │  ← NOVÝ TAB: "Vyplněné"           ││
│ │                               │ │     s rozšířenými kartami         ││
│ │                               │ │                                   ││
│ └───────────────────────────────┘ └───────────────────────────────────┘│
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Klíčové změny

### 1. Nový tab "Vyplněné" s rozšířenými kartami feedbacků

Nahrazení starého "Historie" tabu novým "Vyplněné" tabem zaměřeným na práci s vyplněnými feedbacky.

**Nový design karty feedbacku:**

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🟢 Jana Nováková                  27.1.2025 • Silový           │
│                                                                 │
│ ┌────────────────────────────────────────────────────────────┐ │
│ │ Pocit 8/10 │ Energie 7/10 │ Svalovka 6/10 │ Bolest 2/10   │ │
│ │ ████████░░ │ ███████░░░  │ ██████░░░░   │ ██░░░░░░░░    │ │
│ └────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ 💬 "Cítím se super, jen lehká svalovka na nohou..."           │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ [📝 Poznámka] [📅 Naplánovat] [💬 Chat] [▼ Detail]        ││
│ └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**Klíčové prvky:**
- **Inline metriky** - bez nutnosti rozklikávání vidím všechny hodnoty
- **Mini progress bary** - vizuální indikace hodnot
- **Zkrácený komentář** - první věta s možností rozbalit
- **Rychlé akce** - poznámka, naplánování kontroly, otevření chatu
- **Barevné kódování** - zelená/žlutá/červená podle celkového stavu

---

### 2. Rozšířené filtry a třídění

Přidání pokročilých filtrů pro rychlejší práci:

```text
┌─────────────────────────────────────────────────────────────────┐
│ Filtry:                                                         │
│                                                                 │
│ [Období: 7d ▼] [Klient: Všichni ▼] [Severita: Vše ▼]          │
│                                                                 │
│ Řazení: [Datum ▼] [Pocit těla ▲] [Bolest ▼] [Red flags první] │
│                                                                 │
│ Rychlé filtry:                                                  │
│ [🔴 Bolest ≥6] [⚠️ Nízká energie] [💪 Vysoká svalovka] [📝 S komentářem]
└─────────────────────────────────────────────────────────────────┘
```

**Nové možnosti filtrování:**
- **Severita**: Kritické (bolest ≥7), Varování (bolest 4-6), OK (bolest ≤3)
- **Metrika**: Nejvyšší bolest, Nejnižší energie, Nejvyšší svalovka
- **Typ**: S komentářem, Bez komentáře, Red flags

---

### 3. "Client Leaderboard" - Přehled klientů

Nová sekce zobrazující agregované metriky za období:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 👥 Přehled klientů za posledních 30 dní                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Klient          │ Feedbacků │ Ø Pocit │ Ø Bolest │ Red Flags  │
│ ─────────────────────────────────────────────────────────────  │
│ 🟢 Jana N.      │    8      │   8.2   │   1.5    │    0       │
│ 🟡 Petr S.      │    6      │   6.5   │   4.2    │    1       │
│ 🔴 Martin K.    │    4      │   4.8   │   6.5    │    3       │
│ ⚪ Eva M.       │    2      │   7.0   │   2.0    │    0       │
│                                                                 │
│ [Řadit: Ø Pocit ▲] [Řadit: Ø Bolest ▼] [Řadit: Red Flags ▼]  │
└─────────────────────────────────────────────────────────────────┘
```

**Přínosy:**
- Na první pohled vidím, který klient potřebuje pozornost
- Barevné kódování podle celkového stavu
- Kliknutím na klienta se vyfiltrují jeho feedbacky

---

### 4. Rychlé akce u feedbacku

**Tlačítko "Poznámka"** - inline editor pro trenérskou reakci:
```text
┌─────────────────────────────────────────────────────────────────┐
│ 📝 Poznámka k feedbacku                                         │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Zeptat se na bolest v koleni, zvážit redukci dřepů...      ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ [Uložit poznámku]                      Privátní - klient nevidí│
└─────────────────────────────────────────────────────────────────┘
```

**Tlačítko "Naplánovat"** - rychlé vytvoření followupu:
- Otevře dialog pro vytvoření úkolu/připomínky
- Předvyplní kontext (klient, datum feedbacku, metrika)

**Tlačítko "Chat"** - otevře konverzaci s klientem:
- Rychlá reakce na feedback přímo z přehledu

---

### 5. Vylepšený detail feedbacku

Rozšíření dialogu o trenérské nástroje:

```text
┌─────────────────────────────────────────────────────────────────┐
│ 💬 Zpětná vazba                                        [✕]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [Přehled] [Historie klienta] [Korelace s tréninkem]           │
│                                                                 │
│ ─── Tab: Přehled (stávající obsah) ───────────────────────────│
│ Metriky, bolesti, komentář...                                  │
│                                                                 │
│ ─── Tab: Historie klienta ─────────────────────────────────────│
│ Mini graf posledních 10 feedbacků tohoto klienta               │
│ Porovnání aktuálního vs průměru                                │
│                                                                 │
│ ─── Tab: Korelace s tréninkem ─────────────────────────────────│
│ Typ tréninku: Silový                                           │
│ RPE: 7/10                                                      │
│ Objem: 24 setů                                                 │
│ Hlavní partie: Nohy, Záda                                      │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📝 Trenérská poznámka:                                      ││
│ │ ┌─────────────────────────────────────────────────────────┐ ││
│ │ │ [Prázdné - přidat poznámku]                             │ ││
│ │ └─────────────────────────────────────────────────────────┘ ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ [Přejít na trénink] [Otevřít profil klienta] [Naplánovat followup]
└─────────────────────────────────────────────────────────────────┘
```

---

## Technické změny

### Nové komponenty:

| Komponenta | Účel |
|------------|------|
| `FeedbackExpandedCard.tsx` | Rozšířená karta s inline metrikami a rychlými akcemi |
| `FeedbackQuickFilters.tsx` | Rychlé filtry podle severity a metrik |
| `ClientFeedbackLeaderboard.tsx` | Tabulka agregovaných metrik klientů |
| `FeedbackTrainerNote.tsx` | Inline editor pro trenérskou poznámku |
| `FeedbackDetailTabs.tsx` | Tabované zobrazení v detail dialogu |

### Úpravy existujících souborů:

| Soubor | Změna |
|--------|-------|
| `FeedbackOverview.tsx` | Nahradit tab "Historie" za "Vyplněné", přidat leaderboard sekci |
| `FeedbackDetailDialog.tsx` | Přidat taby pro historii a korelaci |
| `useTrainingFeedback.ts` | Přidat hook pro agregované metriky klientů |

### Databázové změny:

**Nový sloupec v `training_feedback`:**
```sql
ALTER TABLE training_feedback 
ADD COLUMN trainer_note TEXT;
```

---

## Workflow trenéra po implementaci

1. **Ráno**: Otevřu Feedbacky → vidím Attention Inbox s red flags
2. **Rychlý přehled**: Kliknu na "Vyplněné" → vidím všechny feedbacky s inline metrikami
3. **Identifikace problémů**: Použiju filtr "Bolest ≥6" → vidím klienty s bolestí
4. **Reakce**: U feedbacku kliknu "Poznámka" → zapíšu si co udělat
5. **Plánování**: Kliknu "Naplánovat" → vytvořím followup úkol
6. **Komunikace**: Kliknu "Chat" → pošlu klientovi zprávu
7. **Analýza**: V Client Leaderboard vidím, kdo má nejhorší průměr → zaměřím se na něj

---

## Shrnutí přínosů

1. **Méně klikání** - inline metriky bez nutnosti otevírat detail
2. **Rychlejší identifikace problémů** - filtry podle severity
3. **Lepší přehled o klientech** - agregovaná tabulka
4. **Okamžitá reakce** - rychlé akce přímo z přehledu
5. **Kontext v detailu** - historie klienta a korelace s tréninkem
6. **Trenérské poznámky** - možnost zapisovat si reakce

Tento návrh transformuje modul Feedbacky z pasivního přehledu na aktivní nástroj pro práci s klientskými daty.
