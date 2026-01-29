
# Zobrazení detailu změn profilu klienta v novém okně

## Přehled řešení

Při kliknutí na notifikaci "Klient aktualizoval profil" se otevře dialog s detailem změn - jaká pole klient změnil a jaké jsou nové hodnoty.

---

## Aktuální stav

```text
Notifikace: "Jana Nováková upravil(a): email, zdravotní omezení"
      ↓ Klik
Navigace na: /clients/xxx?tab=profile (celá stránka profilu)
```

**Problém:** Trenér musí sám hledat, co přesně se změnilo.

---

## Navrhované řešení

```text
Notifikace: "Jana Nováková upravil(a): email, zdravotní omezení"
      ↓ Klik
Dialog: 
┌────────────────────────────────────────┐
│  📝 Aktualizace profilu                │
│  Jana Nováková • před 2 hodinami       │
├────────────────────────────────────────┤
│                                        │
│  ZMĚNĚNÁ POLE                          │
│                                        │
│  📧 Email                              │
│  → jana.novakova@email.cz              │
│                                        │
│  🏥 Zdravotní omezení                  │
│  → "Bolest pravého kolena po..."       │
│                                        │
│  ────────────────────────────────────  │
│                                        │
│  [Zobrazit celý profil]  [Zavřít]      │
└────────────────────────────────────────┘
```

---

## Technická implementace

### 1. Databázová změna

Přidat sloupec `metadata` do tabulky `notifications`:

```sql
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT NULL;
```

### 2. Ukládání změn do notifikace

Upravit `useClientPortalProfile.ts` - při ukládání změn uložit nové hodnoty do metadata:

```typescript
// Před
await supabase.from("notifications").insert({
  type: "client_profile_updated",
  message: "Jana upravil(a): email, telefon",
  // ... bez metadat
});

// Po
await supabase.from("notifications").insert({
  type: "client_profile_updated",
  message: "Jana upravil(a): email, telefon",
  metadata: {
    changes: {
      email: { value: "novy@email.cz" },
      telefon: { value: "+420 777 888 999" }
    }
  }
});
```

### 3. Nová komponenta - ProfileUpdateDetailDialog

Dialog podobný FeedbackDetailDialog:

| Prvek | Popis |
|-------|-------|
| Header | Jméno klienta + čas změny |
| Změny | Seznam polí s novými hodnotami (ikona + label + hodnota) |
| Akce | Tlačítko "Zobrazit celý profil" → navigace na profil |

### 4. Úprava NotificationCenter

Při kliknutí na `client_profile_updated`:
- Otevřít dialog s detailem změn
- Předat notification data do dialogu
- Při kliknutí na "Zobrazit celý profil" navigovat na profil

---

## Změny v souborech

| Soubor | Změna |
|--------|-------|
| `notifications` (DB) | Přidat `metadata` JSONB sloupec |
| `useClientPortalProfile.ts` | Ukládat změněné hodnoty do metadata |
| `ProfileUpdateDetailDialog.tsx` | **Nový** - dialog pro zobrazení změn |
| `NotificationCenter.tsx` | Otevírat dialog místo navigace |
| `useAggregatedNotifications.ts` | Přidat `metadata` do typu `UnifiedNotification` |
| `useNotifications.ts` | Přidat `metadata` do selectu |

---

## UI detailu změn

```text
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  📝 Aktualizace profilu                              [✕]   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Jana Nováková             před 2 hodinami            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ZMĚNĚNÉ ÚDAJE                                             │
│  ───────────────────────────────────────────────────────   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📧 Email                                             │  │
│  │ jana.novakova@email.cz                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 📞 Telefon                                           │  │
│  │ +420 777 888 999                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🏥 Zdravotní omezení                                 │  │
│  │ Bolest pravého kolena po operaci meniskusu,         │  │
│  │ nutno se vyhnout hlubokým dřepům.                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🎯 Tréninkové cíle                                   │  │
│  │ Síla, Zdraví                                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ───────────────────────────────────────────────────────   │
│                                                            │
│            [👤 Zobrazit celý profil]        [Zavřít]       │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Mapování polí na ikony a labely

| Klíč | Ikona | Label CZ |
|------|-------|----------|
| `email` | 📧 Mail | Email |
| `telefon` | 📞 Phone | Telefon |
| `datum narození` | 📅 Calendar | Datum narození |
| `pohlaví` | 👤 User | Pohlaví |
| `dominantní ruka` | ✋ Hand | Dominantní ruka |
| `typ práce` | 💼 Briefcase | Typ práce |
| `hodiny vsedě` | 🪑 Armchair | Hodiny vsedě denně |
| `spánek` | 😴 Moon | Průměrný spánek |
| `úroveň stresu` | 😰 Brain | Úroveň stresu |
| `zdravotní omezení` | 🏥 Stethoscope | Zdravotní omezení |
| `sportovní historie` | 🏆 Trophy | Sportovní historie |
| `aktuální aktivity` | 🏃 Activity | Aktuální aktivity |
| `tréninkové cíle` | 🎯 Target | Tréninkové cíle |
| `doplňky stravy` | 💊 Pill | Doplňky stravy |
| `stravovací omezení` | 🥗 Salad | Stravovací omezení |

---

## Implementační kroky

### Krok 1: Databáze
- Přidat `metadata` sloupec do `notifications` tabulky

### Krok 2: Backend logika
- Upravit `useClientPortalProfile.ts` pro ukládání změn do metadata

### Krok 3: Typy
- Rozšířit `useNotifications.ts` o metadata
- Rozšířit `UnifiedNotification` typ

### Krok 4: Nová komponenta
- Vytvořit `ProfileUpdateDetailDialog.tsx`

### Krok 5: Integrace
- Upravit `NotificationCenter.tsx` pro otevření dialogu

---

## Výhody řešení

1. Trenér okamžitě vidí, co se změnilo
2. Nemusí scrollovat celým profilem
3. Může rychle pokračovat na profil, pokud potřebuje více detailů
4. Konzistentní UX s ostatními detailními dialogy (FeedbackDetailDialog)

---

## Časový odhad

| Úkol | Čas |
|------|-----|
| Databázová migrace | 5 min |
| Úprava useClientPortalProfile | 15 min |
| Úprava typů | 10 min |
| ProfileUpdateDetailDialog | 30 min |
| Integrace do NotificationCenter | 15 min |
| **Celkem** | **~1.5 hodiny** |
