
# Sjednocení UI: Feedbacky, Strava, Klientský portál

## Analýza současného stavu

Po důkladné analýze jsem identifikoval tyto klíčové **rozdíly a nekonzistence**:

### 1. Rozdílné struktury layoutu

| Sekce | Aktuální layout |
|-------|-----------------|
| **Feedbacky** | 3-sloupcový grid (Inbox vlevo, Tabs vpravo), 5 status karet nahoře |
| **Strava** | Jednoduchý vertikální layout, 4 KPI karty + 2 rozšiřující karty |
| **Klientský portál** | Taby (Přehled/Klienti/Deníky/Nastavení), 5 KPI karet |

### 2. Rozdílný design seznamů klientů

| Sekce | Komponenta | Design |
|-------|------------|--------|
| **Feedbacky** | `FeedbackAttentionInbox` | ScrollArea s border-left indikátorem |
| **Strava** | `NutritionClientRow` | Kliknutelné karty s 2-řádkovým layoutem |
| **Portál** | `ClientAccessList` | Tabulka (desktop) / karty (mobile) |
| **Portál deníky** | `ClientWorkoutLogsOverview` | Rozbalitelné karty s akcemi |

### 3. Chybějící jednotná "Activity Timeline"
- Feedbacky: má `FeedbackActivityTimeline` + `FeedbackAttentionInbox`
- Strava: **CHYBÍ** - žádná timeline nedávné aktivity
- Portál: má `PortalRecentActivity`, ale jiný design

---

## Navrhované sjednocené UI

```text
JEDNOTNÝ LAYOUT PRO VŠECHNY TŘI SEKCE:
┌─────────────────────────────────────────────────────────────┐
│ HEADER: Název sekce + popis + hlavní akce                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ KPI KARTY (4 jednotné) - kliknutelné pro filtraci          │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                │
│ │ Aktivní│ │ Dnes  │ │Týden   │ │Pozornost│               │
│ │   12   │ │   5   │ │  28   │ │   3    │                │
│ └────────┘ └────────┘ └────────┘ └────────┘                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ DVA SLOUPCE (lg:2/3 + lg:1/3)                              │
│ ┌──────────────────────────┐ ┌────────────────────────────┐│
│ │ HLAVNÍ OBSAH             │ │ SIDEBAR                    ││
│ │                          │ │                            ││
│ │ [Hledat klienta...]      │ │ Nedávná aktivita           ││
│ │                          │ │ ┌──────────────────────┐   ││
│ │ FILTRY: Vše | Aktivní |  │ │ │ ○ Jana - zapsala     │   ││
│ │         Pozornost        │ │ │   stravu (před 5min) │   ││
│ │                          │ │ │ ○ Petr - vyplnil     │   ││
│ │ ┌──────────────────────┐ │ │ │   feedback (1h)      │   ││
│ │ │ [Avatar] Jana Nová   │ │ │ │ ○ Eva - přihlášena   │   ││
│ │ │ Dnes • 3 záz. • OK   │ │ │ │   (2h)               │   ││
│ │ └──────────────────────┘ │ │ └──────────────────────┘   ││
│ │ ┌──────────────────────┐ │ │                            ││
│ │ │ [Avatar] Petr Sv. ⚠️ │ │ │ Vyžaduje pozornost        ││
│ │ │ Včera • 1 záznam     │ │ │ ┌──────────────────────┐   ││
│ │ └──────────────────────┘ │ │ │ 3 klienti čekají     │   ││
│ │                          │ │ │ [Zobrazit]           │   ││
│ │ ...                      │ │ └──────────────────────┘   ││
│ └──────────────────────────┘ └────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Konkrétní změny

### Krok 1: Vytvoření sdílených komponent

#### 1.1 `UnifiedKPICards` - Jednotné KPI karty
```typescript
// Nová komponenta: src/components/shared/UnifiedKPICards.tsx
// Použije stejný design jako PortalUsageStats

interface KPICard {
  id: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: 'success' | 'primary' | 'warning' | 'destructive' | 'muted';
  subLabel?: string;
  onClick?: () => void;
}
```

**Jednotný design karty:**
- Grid: `grid-cols-2 lg:grid-cols-4` (4 karty)
- Ikona v kruhu 40x40px vlevo
- Hodnota 2xl font-bold
- Popisek text-xs text-muted-foreground
- Hover efekt pro kliknutelné karty

#### 1.2 `UnifiedClientRow` - Jednotný řádek klienta
```typescript
// Nová komponenta: src/components/shared/UnifiedClientRow.tsx
// Sloučí NutritionClientRow + položky z Attention Inbox

interface UnifiedClientRowProps {
  client: {
    id: string;
    name: string;
    photo_url?: string;
  };
  status: 'active' | 'warning' | 'inactive';
  primaryText: string;       // "Dnes • 3 záznamy"
  secondaryText?: string;    // "Poslední feedback: včera"
  badges?: Badge[];
  onClick?: () => void;
}
```

**Jednotný design:**
- Avatar 36x36px
- Jméno font-medium
- Status badge (warning = destructive/10)
- ChevronRight na hover
- Border-left-4 pro warning stavy

#### 1.3 `UnifiedActivityTimeline` - Jednotná timeline
```typescript
// Nová komponenta: src/components/shared/UnifiedActivityTimeline.tsx
// Kombinuje FeedbackActivityTimeline + PortalRecentActivity

interface ActivityItem {
  id: string;
  clientId: string;
  clientName: string;
  type: string;
  label: string;
  timestamp: string;
  icon: LucideIcon;
  color: 'success' | 'warning' | 'destructive' | 'primary' | 'muted';
  detail?: string;
}
```

### Krok 2: Refaktoring Feedbacky

**Změny:**
1. Zredukovat 5 KPI karet na 4 (sloučit "Expirováno" do "Čekající")
2. Přesunout timeline doprava (sidebar)
3. Hlavní obsah = seznam klientů s filtry
4. Odstranit taby - vše na jedné stránce s filtry

**Nová struktura:**
```text
┌─ KPI: K odeslání | Čekající | Vyplněno | Red Flags ──┐
├─ 2 sloupce ───────────────────────────────────────────┤
│ HLAVNÍ:                    │ SIDEBAR:                 │
│ - Search + Filtry          │ - Nedávná aktivita       │
│ - Seznam klientů           │ - Potřebuje pozornost    │
│   (UnifiedClientRow)       │   (top 5 urgentních)     │
│ - Klik = detail feedbacku  │                          │
└────────────────────────────┴──────────────────────────┘
```

### Krok 3: Refaktoring Strava

**Změny:**
1. Přidat `UnifiedActivityTimeline` do sidebaru
2. Použít `UnifiedClientRow` místo `NutritionClientRow`
3. Sjednotit KPI karty s ostatními sekcemi
4. Přidat sidebar s nedávnou aktivitou

**Nová struktura:**
```text
┌─ KPI: Aktivně zapisuje | Dnes | Týden | Pozornost ───┐
├─ 2 sloupce ───────────────────────────────────────────┤
│ HLAVNÍ:                    │ SIDEBAR:                 │
│ - Search + Filtry          │ - Nedávná aktivita       │
│ - Seznam klientů           │   (jídlo, pití, kofein)  │
│   (UnifiedClientRow)       │ - Klienti k pozornosti   │
│ - Klik = detail nutrice    │                          │
└────────────────────────────┴──────────────────────────┘
```

### Krok 4: Refaktoring Klientský portál

**Změny:**
1. Zjednodušit taby (odstranit Deníky - přesunout do hlavního přehledu)
2. Sjednotit KPI karty design
3. Použít `UnifiedClientRow` pro seznam klientů
4. Přidat sekci "Nedávné tréninky klientů" přímo do přehledu

**Nová struktura:**
```text
┌─ KPI: Klientů | Dnes aktivní | Týden | Pozornost ────┐
├─ Taby: Přehled | Klienti | Nastavení ─────────────────┤
│                                                       │
│ PŘEHLED (2 sloupce):                                  │
│ - Nedávné tréninky         │ - Nedávná aktivita       │
│   (top 5 + Zobrazit vše)   │   (timeline)             │
│ - Rychlé vyhledávání       │ - Potřebuje pozornost    │
│                            │                          │
└───────────────────────────────────────────────────────┘
```

---

## Technické detaily implementace

### Nové soubory
| Soubor | Účel |
|--------|------|
| `src/components/shared/UnifiedKPICard.tsx` | Jedna KPI karta |
| `src/components/shared/UnifiedKPICards.tsx` | Grid KPI karet |
| `src/components/shared/UnifiedClientRow.tsx` | Řádek klienta |
| `src/components/shared/UnifiedActivityTimeline.tsx` | Timeline aktivity |
| `src/components/shared/AttentionInbox.tsx` | Sidebar "Pozornost" |

### Upravené soubory
| Soubor | Změny |
|--------|-------|
| `FeedbackOverview.tsx` | Nový layout bez tabů, 2-sloupcový grid |
| `NutritionPage.tsx` | Přidán sidebar, použití sdílených komponent |
| `ClientPortalAdmin.tsx` | Zjednodušené taby, integrované deníky |

### Design tokeny (konzistentní barvy)
```typescript
const STATUS_COLORS = {
  active: { bg: 'bg-success/10', text: 'text-success' },
  warning: { bg: 'bg-warning/10', text: 'text-warning' },
  danger: { bg: 'bg-destructive/10', text: 'text-destructive' },
  neutral: { bg: 'bg-muted', text: 'text-muted-foreground' },
  primary: { bg: 'bg-primary/10', text: 'text-primary' },
};
```

---

## Klíčové principy sjednocení

1. **Konzistentní layout**: Header -> KPI karty -> 2 sloupce (hlavní + sidebar)
2. **Jednotný design klientských řádků**: Avatar + jméno + status + detail + akce
3. **Aktivita vpravo**: Sidebar vždy ukazuje "co se děje" v reálném čase
4. **Pozornost nahoře**: Klienti vyžadující akci jsou vždy viditelní
5. **Kliknutelné KPI**: Každá karta filtruje seznam pod sebou
6. **Mobile-first**: Na mobilu sidebar skryt nebo pod hlavním obsahem

---

## Očekávaný výsledek

Trenér uvidí ve všech třech sekcích:
- **Rychlý přehled** (4 KPI karty) - kolik klientů je aktivních, kolik potřebuje pozornost
- **Seznam klientů** - jednotný design, jasné indikátory stavu
- **Nedávná aktivita** - timeline co klienti právě dělají
- **Prioritní úkoly** - sidebar s urgentními položkami

Jednotné ovládání:
- Stejné filtry (Vše | Aktivní | Pozornost)
- Stejné vyhledávání
- Stejné akce (klik na klienta = detail)
