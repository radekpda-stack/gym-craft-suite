
# Vylepšení klientského jídelního deníku + Notifikace pro trenérské akce

## Analýza současného stavu

### Co funguje dobře:
- **Přehledný WeekStrip** pro navigaci mezi dny
- **Rychlé tlačítka** pro snídani/oběd/večeři/svačinu
- **Widgety** pro vodu a kofein s progress indikátory
- **Timeline záznamů** chronologicky seřazená
- **Možnost odpovědět trenérovi** na komentář

### Identifikované problémy:

| Problém | Popis |
|---------|-------|
| **Chybějící notifikace při "Zkontrolováno"** | Když trenér klikne na tlačítko Zkontrolováno, klient se to nedozví |
| **Chybějící notifikace při komentáři** | Když trenér komentuje jídlo nebo den, klient neobdrží notifikaci |
| **Žádný vizuální indikátor kontroly** | Klient nevidí, že den byl zkontrolován trenérem |
| **Poznámka dne není prominentní** | Poznámka od trenéra by měla být viditelnější |
| **Dlouhé formuláře** | Příliš mnoho scrollování při přidávání jídla |

---

## Navrhované změny

### 1. Notifikace pro klienta

#### 1.1 Notifikace při "Zkontrolováno"
Když trenér označí den jako zkontrolovaný:

```text
┌──────────────────────────────────────────┐
│ 🔔 Notifikace pro klienta               │
├──────────────────────────────────────────┤
│ ✅ Jídelníček zkontrolován              │
│ Trenér zkontroloval váš jídelníček      │
│ pro 28.01.2026                          │
│                                          │
│ [Zobrazit v deníku]                     │
└──────────────────────────────────────────┘
```

#### 1.2 Notifikace při komentáři k jídlu
Když trenér přidá komentář nebo hodnocení:

```text
┌──────────────────────────────────────────┐
│ 💬 Nový komentář od trenéra             │
├──────────────────────────────────────────┤
│ Trenér okomentoval váš oběd:            │
│ "Výborná volba bílkovin..."             │
│                                          │
│ [Zobrazit a odpovědět]                  │
└──────────────────────────────────────────┘
```

#### 1.3 Notifikace při poznámce k celému dni
```text
┌──────────────────────────────────────────┐
│ 📝 Trenér přidal poznámku ke dni        │
├──────────────────────────────────────────┤
│ "Dobrá práce, jen přidej víc zeleniny"  │
│                                          │
│ [Zobrazit v deníku]                     │
└──────────────────────────────────────────┘
```

---

### 2. Vizuální vylepšení klientského deníku

#### 2.1 Banner "Zkontrolováno trenérem"
Na vrchu dne, který trenér zkontroloval:

```text
┌───────────────────────────────────────────────────────┐
│ ✅ Zkontrolováno trenérem • 28.01. v 14:32           │
└───────────────────────────────────────────────────────┘
```

#### 2.2 Prominentní zobrazení poznámky trenéra
```text
┌───────────────────────────────────────────────────────┐
│ 💬 TRENÉR                                             │
│ ┌─────────────────────────────────────────────────┐  │
│ │ Dobrá práce dnes! Příště zkus přidat víc       │  │
│ │ bílkovin k obědu. 👍                           │  │
│ └─────────────────────────────────────────────────┘  │
│ [Odpovědět...]                                       │
└───────────────────────────────────────────────────────┘
```

#### 2.3 Nová struktura stránky
```text
┌─────────────────────────────────────────────────────────┐
│ Nutriční deník                                          │
│ Jednoduché sledování stravy                             │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ [ Po | Út | St | Čt | Pá | So | Ne ]  ← WeekStrip      │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ ✅ Den zkontrolován trenérem • 28.01. 14:32        ││ ← NOVÉ
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 💬 Poznámka od trenéra                             ││ ← VYLEPŠENÉ
│ │ "Výborně, dnes perfektní!"                         ││
│ │ [Odpovědět]                                        ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌─────────────────┐ ┌─────────────────┐                │
│ │ 💧 Voda: 1.5L  │ │ ☕ Káva: 2× OK │  ← Widgety     │
│ │ ████████░░ 75% │ │ ✓ Před 14:00   │                │
│ └─────────────────┘ └─────────────────┘                │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │  📊  Dnešní záznamy: 3 jídel, 1.5L, 2☕            ││ ← ZJEDNODUŠENÉ
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ ┌──────────────────────────────────────────┐           │
│ │ + Přidat jídlo nebo nápoj               │ ← Hlavní  │
│ └──────────────────────────────────────────┘   tlačítko│
│                                                         │
│ ZÁZNAMY                                                 │
│ ┌─────────────────────────────────────────────────────┐│
│ │ 🌅 7:30 • Snídaně                                  ││
│ │ Ovesná kaše s ovocem                               ││
│ │ ┌────────────────────────────────┐                 ││
│ │ │ ⭐ 8/10 • 💬 "Výborná volba!" │ ← Trenér        ││
│ │ │ [Odpovědět]                    │                 ││
│ │ └────────────────────────────────┘                 ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Technické změny

### Soubory k úpravě

| Soubor | Změny |
|--------|-------|
| `src/hooks/useNutritionFeedback.ts` | Přidat vytváření notifikace pro klienta při komentáři |
| `src/hooks/useNutritionDayNotes.ts` | Přidat notifikaci při isChecked=true a při trainerNote |
| `src/pages/client-portal/ClientPortalNutrition.tsx` | Přidat banner "Zkontrolováno" a vylepšit zobrazení poznámky |
| `src/components/client-portal/nutrition/TodayEntries.tsx` | Vylepšit zobrazení trenérských komentářů |
| `src/components/client-portal/ClientNotificationCenter.tsx` | Přidat nové typy notifikací |

### Nové typy notifikací pro klienta

```typescript
// Nové typy v client_portal_notifications:
'nutrition_day_checked'     // Trenér zkontroloval den
'nutrition_entry_comment'   // Trenér komentoval jídlo/nápoj
'nutrition_day_note'        // Trenér přidal poznámku ke dni
```

### Implementace notifikací

#### V `useUpsertDayNote`:
```typescript
// Při isChecked = true (nově zaškrtnuto):
await supabase.from('client_portal_notifications').insert({
  client_id: clientId,
  type: 'nutrition_day_checked',
  title: '✅ Jídelníček zkontrolován',
  message: `Trenér zkontroloval váš jídelníček pro ${formattedDate}`,
  action_url: '/client/nutrition',
  metadata: { date: dateStr },
});

// Při trainerNote (nová poznámka):
await supabase.from('client_portal_notifications').insert({
  client_id: clientId,
  type: 'nutrition_day_note',
  title: '📝 Nová poznámka od trenéra',
  message: trainerNote.substring(0, 100) + (trainerNote.length > 100 ? '...' : ''),
  action_url: '/client/nutrition',
  metadata: { date: dateStr },
});
```

#### V `useTrainerFeedback`:
```typescript
// Při komentáři k jídlu/nápoji:
if (comment) {
  // Získat client_id z entry
  const { data: entry } = await supabase
    .from(table)
    .select('client_id, description, entry_date')
    .eq('id', entryId)
    .single();
    
  await supabase.from('client_portal_notifications').insert({
    client_id: entry.client_id,
    type: 'nutrition_entry_comment',
    title: '💬 Nový komentář od trenéra',
    message: `Trenér okomentoval: ${entry.description?.substring(0, 50)}...`,
    action_url: '/client/nutrition',
    metadata: { entry_date: entry.entry_date },
  });
}
```

---

## Vylepšení UI klientského deníku

### Nová komponenta: `TrainerReviewBanner`

```typescript
interface TrainerReviewBannerProps {
  isChecked: boolean;
  checkedAt: string | null;
  trainerNote: string | null;
  onReply?: () => void;
}
```

Zobrazí:
- Zelený banner pokud je den zkontrolován
- Prominentní sekci s poznámkou trenéra
- Tlačítko pro odpověď

### Vylepšená `TodayEntries`

- Jasnější vizuální odlišení trenérských komentářů
- Animace při novém komentáři
- Rychlá odpověď inline (ne v dialogu)

---

## Shrnutí klíčových změn

1. **Notifikace fungují obousměrně** - trenér vidí aktivitu klienta, klient vidí reakce trenéra

2. **Vizuální potvrzení kontroly** - klient jasně vidí, že trenér zkontroloval jeho jídelníček

3. **Prominentní poznámky trenéra** - komentáře nejsou schované, ale jsou hlavním prvkem

4. **Rychlá komunikace** - možnost odpovědět přímo z notifikace i z deníku

5. **Akční URL** - kliknutí na notifikaci přenese klienta na správný den v deníku
