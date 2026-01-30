
# Audit Tréninkového režimu - Návrh vylepšení

## Současný stav

### Co funguje dobře
| Oblast | Popis |
|--------|-------|
| **Struktura** | 3 záložky (Rozvrh, Prodej, PRs) - logické rozdělení |
| **Offline infrastruktura** | IndexedDB schema pro trainings, clients, exercises, PRs, sync queue |
| **Swipe gesta** | Rychlé dokončení/zrušení tréninku |
| **PR kopírování** | Kliknutím zkopírovat hodnotu do schránky |
| **Pull-to-refresh** | Aktualizace dat tahem dolů |
| **Online/Offline indikátor** | V hlavičce zobrazeno |

### Kritické nedostatky

| Problém | Dopad | Priorita |
|---------|-------|----------|
| **Offline není aktivně využíváno** | Při vstupu do režimu se data NE-prefetchují do IndexedDB | KRITICKÁ |
| **Chybí karta klienta** | Trenér nevidí základní info o klientovi bez opuštění režimu | VYSOKÁ |
| **Prodej vyžaduje internet** | QuickSalePanel nemá offline fallback | STŘEDNÍ |
| **Příliš mnoho kroků pro zápis** | Cvik → výběr → formulář → uložení = 4 kroky | VYSOKÁ |
| **Chybí historie tréninků klienta** | V režimu nevidím předchozí tréninky klienta | STŘEDNÍ |
| **FAB menu je nadbytečné** | "Nový klient" není typická akce během tréninku | NÍZKÁ |
| **Záložka PRs zobrazuje dnešní klienty** | Zbytečný mezikrok, mělo by zobrazit PRs aktivního klienta | STŘEDNÍ |

---

## Navrhované změny

### 1. Skutečná offline podpora (KRITICKÁ)

Při vstupu do Tréninkového režimu prefetchovat všechna potřebná data:

```text
┌─────────────────────────────────────────────────────────────┐
│ VSTUP DO TRÉNINKOVÉHO REŽIMU                               │
│                                                             │
│ 1. Načti dnešní rozvrh → uložit do IndexedDB              │
│ 2. Načti klienty z rozvrhu → cacheClients()               │
│ 3. Načti cviky → cacheExercises()                          │
│ 4. Načti PRs klientů → cachePRs()                          │
│ 5. Načti produkty pro prodej → cacheProducts()            │
│ 6. Nastav sync listener pro reconnect                      │
└─────────────────────────────────────────────────────────────┘
```

**Technická implementace:**
- Vytvořit `useTrainingModePrefetch` hook
- Volat při `enterTrainingMode()` v `TrainingModePage.tsx`
- Přidat loading stav během prefetch ("Připravuji offline data...")
- Registrovat `scheduleSyncOnReconnect()` callback

### 2. Zjednodušená navigace - 2 záložky místo 3

Prodej a PRs sloučit do kontextových akcí na kartě tréninku:

```text
SOUČASNÉ ZÁLOŽKY:          →    NOVÉ ZÁLOŽKY:
[Rozvrh] [Prodej] [PRs]         [Rozvrh] [Klienti]

• Rozvrh = beze změny          • Rozvrh = beze změny + rychlý prodej
• Prodej = přesunout do FAB    • Klienti = seznam + karta + PRs + historie
• PRs = přesunout do karty     
```

### 3. Nová záložka "Klienti" - rychlý přístup

```text
┌──────────────────────────────────────────────────────────────┐
│ ZÁLOŽKA KLIENTI                                             │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ [Vyhledávání klienta...]                     [+ Nový]       │
│                                                              │
│ ━━━ Dnešní klienti ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 👤 Jan Novák                                   10:00    ││
│ │    Kredit: 5 tréninků • Poznámka: koleno                ││
│ │                                                          ││
│ │    [PRka] [Historie] [Prodej] [Kontakt]                 ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
│ ┌──────────────────────────────────────────────────────────┐│
│ │ 👤 Marie Svobodová                             11:00    ││
│ │    Kredit: 2 tréninky • Bez poznámky                    ││
│ └──────────────────────────────────────────────────────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4. Vylepšená karta tréninku - "Cockpit" design

Reorganizace TrainingModeCard pro rychlejší workflow:

```text
┌──────────────────────────────────────────────────────────────┐
│ 10:00  Jan Novák                        [650 Kč] [▼]        │
│ ═══════════════════════════════════════════════════════════ │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │  RYCHLÉ AKCE (vždy viditelné)                        │   │
│ │                                                       │   │
│ │  [+ Cvik]  [PRka]  [€ Prodej]  [📝 Poznámka]        │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ┌───────────────────────────────────────────────────────┐   │
│ │  ZAPSANÉ CVIKY (scrollable)                          │   │
│ │                                                       │   │
│ │  • Bench Press: 3×8 @ 80kg                           │   │
│ │  • Squat: 4×6 @ 100kg                                │   │
│ │                                                       │   │
│ └───────────────────────────────────────────────────────┘   │
│                                                              │
│ ═══════════════════════════════════════════════════════════ │
│           [✓ Dokončit]     [✗ Zrušit]                       │
└──────────────────────────────────────────────────────────────┘
```

### 5. Rychlejší zápis cviku - 2 kroky místo 4

Změna workflow pro QuickExerciseAdd:

```text
SOUČASNÝ WORKFLOW (4 kroky):
1. Otevřít sheet
2. Vyhledat/vybrat cvik
3. Vyplnit formulář
4. Uložit

NOVÝ WORKFLOW (2 kroky):
1. Vybrat cvik z gridu oblíbených/nedávných
2. Zadat hodnotu velkými tlačítky a uložit

┌──────────────────────────────────────────────────────────────┐
│ PŘIDAT CVIK                                     [Hledat 🔍] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ⭐ OBLÍBENÉ                                                  │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│ │ Bench  │ │ Squat  │ │ Dead-  │ │ OHP    │                 │
│ │ 80kg   │ │ 100kg  │ │ lift   │ │ 50kg   │                 │
│ │ PR     │ │ PR     │ │ 140kg  │ │        │                 │
│ └────────┘ └────────┘ └────────┘ └────────┘                 │
│                                                              │
│ ⏰ NEDÁVNÉ                                                   │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│ │ Rows   │ │ Lunges │ │ Plank  │ │ ...    │                 │
│ └────────┘ └────────┘ └────────┘ └────────┘                 │
└──────────────────────────────────────────────────────────────┘

Po vybrání cviku:
┌──────────────────────────────────────────────────────────────┐
│ ← Bench Press                           PR: 85kg × 6        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ VÁHA                                                        │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ 70  │ │ 75  │ │ 80  │ │ 85  │ │ 90  │ │ ...│            │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│                                                              │
│ OPAKOVÁNÍ                                                   │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │ 5  │ │ 6  │ │ 8  │ │ 10 │ │ 12 │ │ 15 │ │ 20 │          │
│ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘          │
│                                                              │
│ SÉRIE: [  1  ] [-] [+]                                      │
│                                                              │
│            [═══════ ULOŽIT 80kg × 8 × 3 ═══════]            │
└──────────────────────────────────────────────────────────────┘
```

### 6. Prodej jako rychlá akce

Přesunout prodej z hlavní záložky do:
- Kontextové tlačítko na kartě klienta
- FAB akce (ponechat)

```text
FAB AKCE (zjednodušené):
• + Prodej (primární)
• + Trénink (sekundární)

Odstranit:
• Nový klient (nepotřeba během tréninku)
```

---

## Technická implementace

### Nové soubory

| Soubor | Účel |
|--------|------|
| `src/hooks/useTrainingModePrefetch.ts` | Prefetch dat do IndexedDB při vstupu |
| `src/components/training-mode/ClientsTab.tsx` | Nová záložka Klienti |
| `src/components/training-mode/ClientQuickCard.tsx` | Karta klienta s rychlými akcemi |
| `src/components/training-mode/QuickExerciseGrid.tsx` | Mřížka oblíbených/nedávných cviků |
| `src/components/training-mode/ExerciseQuickInput.tsx` | Rychlý vstup s velkými tlačítky |
| `src/components/training-mode/SessionExerciseList.tsx` | Seznam zapsaných cviků v tréninku |

### Úpravy existujících souborů

| Soubor | Změna |
|--------|-------|
| `TrainingModePage.tsx` | 2 záložky, prefetch hook, zjednodušený FAB |
| `TrainingModeCard.tsx` | Cockpit design, inline rychlé akce |
| `TrainingModeLayout.tsx` | Loading stav pro prefetch |
| `TrainingModeContext.tsx` | Přidat `prefetchComplete` stav |
| `QuickExerciseAdd.tsx` | Přepracovat na grid + quick input |
| `database.ts` | Přidat `products` store pro offline prodej |

### Offline-first architektura

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ONLINE                           OFFLINE                       │
│  ──────                           ───────                       │
│                                                                 │
│  Supabase ◄──── Read ────► React Query ◄──── Read ────► UI    │
│     │                          │                                │
│     │                          ▼                                │
│     │                     IndexedDB                             │
│     │                          │                                │
│     │                          ▼                                │
│     ◄─────── Sync ─────── Sync Queue                           │
│                                                                 │
│  Při ONLINE:                                                    │
│  • Write → Supabase → invalidate cache → UI update             │
│                                                                 │
│  Při OFFLINE:                                                   │
│  • Write → IndexedDB → Sync Queue → UI update (optimistic)     │
│  • Při reconnect → processSyncQueue() → Supabase              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Prioritizace implementace

### Fáze 1: Offline základ (KRITICKÁ)
1. `useTrainingModePrefetch` - prefetch při vstupu
2. Rozšířit `database.ts` o products store
3. Loading stav v `TrainingModeLayout`
4. Aktivovat `scheduleSyncOnReconnect`

### Fáze 2: Zjednodušení UI
1. Sloučit záložky (2 místo 3)
2. Nová záložka Klienti s kartou a rychlými akcemi
3. Přepracovat FAB (odebrat "Nový klient")

### Fáze 3: Rychlý zápis cviků
1. `QuickExerciseGrid` - mřížka oblíbených/nedávných
2. `ExerciseQuickInput` - velká tlačítka pro hodnoty
3. `SessionExerciseList` - inline seznam v kartě

### Fáze 4: Vylepšení UX
1. Cockpit design pro TrainingModeCard
2. Inline prodej na kartě klienta
3. Historie tréninků v záložce Klienti

---

## Očekávané výsledky

| Metrika | Před | Po |
|---------|------|-----|
| **Kroky pro zápis cviku** | 4 | 2 |
| **Offline podpora** | Částečná (jen sync) | Plná (prefetch + sync) |
| **Přepínání záložek** | 3 záložky | 2 záložky |
| **Čas na dokončení tréninku** | ~15 kliknutí | ~8 kliknutí |
| **Stabilita offline** | Data se neukládají offline | Vše funguje offline |

---

## Shrnutí klíčových změn

1. **Skutečný offline režim** - prefetch všech dat při vstupu
2. **2 záložky místo 3** - Rozvrh + Klienti
3. **Karta klienta** - kredit, poznámky, rychlé akce
4. **Rychlý zápis cviků** - grid + velká tlačítka = 2 kroky
5. **Prodej jako kontextová akce** - ne jako hlavní záložka
6. **Zapsané cviky inline** - vidět co už je zapsáno
7. **FAB zjednodušen** - jen Prodej + Trénink
