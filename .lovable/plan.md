

# Vylepšení Notifikačního centra - Kompletní redesign

## Identifikované problémy

### 1. UI problém - Překrývání tlačítek
V `SheetContent` (sheet.tsx) je křížek na pozici `right-4 top-4`, zatímco header v `NotificationCenter.tsx` má také tlačítko nastavení na pozici `right-4`. To způsobuje vizuální překrytí.

### 2. Fragmentované notifikační systémy
Aplikace má **tři oddělené** notifikační systémy:
- `NotificationCenter` - klasické notifikace z databáze
- `SmartAlerts` - analytické alerty generované na klientu
- `SmartAlertToast` - toast notifikace pro smart alerts

Tyto systémy nejsou propojené a duplikují funkcionalitu.

### 3. Chybějící funkce
- Žádné filtry/vyhledávání v notifikacích
- Chybí prioritizace (urgentní vs. informativní)
- Žádná možnost "odložit" notifikaci
- Chybí agregace podobných notifikací (5× nízký kredit = 1 souhrnná)

### 4. UI/UX nedostatky
- Příliš mnoho kategorií (7 kategorií může být overwhelming)
- Malé touch targety na mobilech
- Chybí prázdný stav s doporučeními
- Nastavení je v separátním dialogu místo inline

---

## Navrhované změny

### Krok 1: Opravit překrývání tlačítek v headeru

**Problém:** `SheetContent` automaticky přidává `X` křížek na `right-4 top-4`, ale header v `NotificationCenter` má vlastní tlačítka na stejné pozici.

**Řešení:** Upravit header tak, aby tlačítka měla dostatečný padding vpravo:

```tsx
// NotificationCenter.tsx - SheetHeader
<SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between shrink-0 pr-12">
  {/* pr-12 dává prostor pro X křížek */}
```

### Krok 2: Sjednotit notifikace a Smart Alerts

Vytvořit nový "Unified Inbox" pohled, který kombinuje:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 Notifikace                                        [✕]   │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔍 Hledat...                     [📊 Filtry] [⚙️]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ═══ VYŽADUJE AKCI (3) ════════════════════════════════════ │
│                                                              │
│ 🔴 5 klientů má záporný kredit                              │
│    Lenka, Petr, Jana a 2 další                [Zobrazit →] │
│                                                              │
│ 🟠 3 tréninky čekají na dokončení                          │
│    Dnes: 14:00, 16:00, 18:00                   [Dokončit →] │
│                                                              │
│ ═══ NOVÉ (12) ═══════════════════════════════════════════ │
│                                                              │
│ 💬 2 nové zprávy                                            │
│    Lenka Deák, Petr Novák                    [Otevřít chat] │
│                                                              │
│ 🏆 Nový osobní rekord!                                      │
│    Jana dosáhla PR: Squat 80kg × 5                          │
│                                                              │
│ ═══ DŘÍVĚJŠÍ ════════════════════════════════════════════ │
│                                                              │
│ 🎂 3 narozeniny tento měsíc                                │
│ 📈 Příjmy +15% oproti minulému měsíci                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Krok 3: Agregace podobných notifikací

Místo 5 separátních notifikací "nízký kredit" zobrazit jednu souhrnnou:

```tsx
// Nová funkce pro agregaci
function aggregateNotifications(notifications: Notification[]): AggregatedNotification[] {
  // Seskupit podle typu
  // Vytvořit summary pro skupiny > 2
}
```

Výsledek:
```
❌ Před: 5× "Nízký kredit: Lenka", "Nízký kredit: Petr"...
✅ Po:   1× "5 klientů má nízký kredit" [Zobrazit všechny]
```

### Krok 4: Prioritizace notifikací

Zavést 3 úrovně priority:

| Priorita | Barva | Příklady |
|----------|-------|----------|
| **Urgentní** | 🔴 Červená | Záporný kredit, Red flag feedback, Nedokončený trénink |
| **Důležité** | 🟠 Oranžová | Nízký kredit, Expirující balíček, Neaktivní klient |
| **Informativní** | 🔵 Modrá | PR, Narozeniny, Milníky, Chat |

### Krok 5: Inline Quick Actions

Přidat rychlé akce přímo do notifikací:

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Nová zpráva od Lenky Deák                               │
│ "Ahoj, mám dotaz ohledně..."              před 5 min       │
│                                                              │
│ [📝 Odpovědět]  [✓ Přečteno]  [🔕 Ztlumit]                 │
└─────────────────────────────────────────────────────────────┘
```

### Krok 6: Nastavení jako inline panel

Místo separátního dialogu přidat toggle pro nastavení:

```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Nastavení notifikací                         [Skrýt ▲]  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ 💬 Zprávy                                            [✓]   │
│ 💰 Finance & balíčky                                 [✓]   │
│ 🏆 Osobní rekordy                                    [✓]   │
│ 🎂 Narozeniny & výročí                               [○]   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Krok 7: Vylepšený prázdný stav

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│                    🎉                                        │
│                                                              │
│              Vše je vyřízeno!                               │
│                                                              │
│        Žádné nové notifikace. Super práce!                  │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │ 💡 Tip: Zapni upozornění na narozeniny klientů     │    │
│  │    a nikdy nezapomeň popřát!                        │    │
│  │                                    [Zapnout →]      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Technické kroky implementace

### Krok 1: Opravit překrývání headeru
```
Soubor: src/components/notifications/NotificationCenter.tsx
- Přidat pr-12 nebo pr-14 do SheetHeader pro prostor křížku
- Alternativně: přesunout X křížek do vlastní pozice v headeru
```

### Krok 2: Vytvořit UnifiedNotificationItem komponentu
```
Nový soubor: src/components/notifications/UnifiedNotificationItem.tsx
- Kombinuje vizuály z NotificationCenter a SmartAlertItem
- Podporuje inline akce
- Podporuje agregované notifikace (expandable)
```

### Krok 3: Přidat agregační logiku
```
Soubor: src/hooks/useNotifications.ts nebo nový useAggregatedNotifications.ts
- Funkce aggregateByType()
- Threshold pro agregaci: 3+ stejného typu
```

### Krok 4: Sjednotit SmartAlerts do NotificationCenter
```
Soubor: src/components/notifications/NotificationCenter.tsx
- Importovat useSmartAlerts
- Mergovat smart alerts s klasickými notifikacemi
- Řadit podle priority
```

### Krok 5: Přidat inline nastavení
```
Soubor: src/components/notifications/NotificationCenter.tsx
- Přidat Collapsible sekci pro nastavení
- Zjednodušit na 4-5 hlavních kategorií místo 7
```

### Krok 6: Vylepšit prázdný stav
```
Soubor: src/components/notifications/NotificationCenter.tsx
- Přidat EmptyState komponentu s tipem
- Dynamický tip podle vypnutých kategorií
```

### Krok 7: Přidat Swipe-to-dismiss na mobilu
```
Soubor: src/components/notifications/UnifiedNotificationItem.tsx
- Využít framer-motion drag gesture
- Swipe left = smazat, swipe right = označit přečtené
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/notifications/NotificationCenter.tsx` | Hlavní refaktoring - sjednocení, agregace, inline nastavení |
| `src/components/notifications/UnifiedNotificationItem.tsx` | Nová komponenta pro jednotnou notifikaci |
| `src/components/notifications/NotificationEmptyState.tsx` | Nová komponenta pro prázdný stav |
| `src/components/notifications/InlineNotificationSettings.tsx` | Nová komponenta pro inline nastavení |
| `src/hooks/useAggregatedNotifications.ts` | Nový hook pro agregaci |
| `src/components/ui/sheet.tsx` | Možná úprava pozice X křížku |

---

## Prioritizace implementace

**Fáze 1 - Kritické opravy (okamžitě):**
1. Opravit překrývání Settings a X křížku
2. Přidat pr-12/pr-14 do headeru

**Fáze 2 - UX vylepšení:**
3. Sjednotit SmartAlerts do NotificationCenter
4. Přidat prioritizaci (urgentní/důležité/informativní)
5. Vylepšit prázdný stav

**Fáze 3 - Pokročilé funkce:**
6. Agregace podobných notifikací
7. Inline quick actions
8. Inline nastavení místo dialogu
9. Swipe gestures na mobilu

---

## Výsledek změn

| Aspekt | Před | Po |
|--------|------|-----|
| Překrývání tlačítek | Ano | Opraveno |
| Notifikační systémy | 3 oddělené | 1 sjednocený |
| Podobné notifikace | 5× duplicitní | 1× agregovaná |
| Prioritizace | Žádná | 3 úrovně |
| Prázdný stav | Strohý | S tipem |
| Nastavení | Dialog | Inline collapsible |
| Mobile UX | Tap only | + Swipe gestures |

