
# Plán: Oprava editace ceny při dokončení tréninku

## Zjištěný problém

### Proč nevidíte editovatelnou cenu?

1. **Změna v kódu byla provedena** - v souboru `CompleteTrainingDialog.tsx` jsem změnil `allowPriceEdit` z `participantPayments.length > 1` na `true`

2. **Změna nebyla publikována** - Pracuji s preview verzí (lovableproject.com), ale vy používáte ostrou verzi (justmoveasistent.lovable.app), která stále běží na starém kódu

3. **Na ostré verzi platí**: `allowPriceEdit={participantPayments.length > 1}`, což znamená, že u tréninku s 1 účastníkem (Martina Parezová) je cena needitovatelná

### Aktuální stav v kódu

| Verze | Hodnota `allowPriceEdit` |
|-------|--------------------------|
| Preview (nová) | `true` ✅ |
| Ostrá (stará) | `participantPayments.length > 1` ❌ |

---

## Řešení

### Krok 1: Publikovat změny do ostré verze

Klikněte na tlačítko **"Update"** v Publish dialogu (vpravo nahoře), aby se změny nasadily do ostré verze.

### Krok 2: Ověření funkčnosti

Po publikaci by měl dialog "Dokončit trénink" zobrazovat:
- **Editovatelné input pole** s cenou místo statického textu "900 Kč"
- Možnost změnit cenu na 800 Kč pro fixované klienty

---

## Vizuální změna (před/po)

### PŘED (aktuální ostrá verze)
```
┌──────────────────────────────────┐
│ PM  Parezová Martina    900 Kč  │  ← statický text
│ Kredit: 5 600 Kč → 4 700 Kč     │
│ [Kredit] [Hotově] [Kartou] ...  │
└──────────────────────────────────┘
```

### PO (po publikaci)
```
┌──────────────────────────────────┐
│ PM  Parezová Martina   [800] Kč │  ← editovatelné pole
│ Kredit: 5 600 Kč → 4 800 Kč     │
│ [Kredit] [Hotově] [Kartou] ...  │
└──────────────────────────────────┘
```

---

## Technické detaily

### Změna v kódu (již provedena)

**Soubor**: `src/components/trainings/CompleteTrainingDialog.tsx`

```diff
<ParticipantPaymentCard
  key={participant.client_id}
  participant={participant}
  onChange={handleParticipantPaymentChange}
  onPriceChange={handleParticipantPriceChange}
  disabled={isLoading}
- allowPriceEdit={participantPayments.length > 1}
+ allowPriceEdit={true}
/>
```

### Jak to funguje

V komponentě `ParticipantPaymentCard.tsx` (řádky 77-91):

```typescript
{allowPriceEdit && onPriceChange && !disabled ? (
  <Input type="number" value={price_share} ... />  // editovatelné pole
) : (
  <span>{formatCurrency(price_share)}</span>       // statický text
)}
```

---

## Další vylepšení (volitelně)

Pro lepší UX u fixovaných klientů bych mohl přidat:

1. **Vizuální indikátor fixované ceny** - štítek "Fixovaná cena: 800 Kč" u klientů s `use_legacy_pricing = true`

2. **Automatické předvyplnění** - Při otevření dialogu automaticky nastavit 800 Kč pro fixované klienty místo 900 Kč

---

## Akce k provedení

1. **Publikovat změny** - klikněte na "Update" v ostré verzi
2. **Otestovat** - Otevřete dialog "Dokončit trénink" u Martiny Parezové a ověřte, že můžete změnit cenu na 800 Kč

**Změny kódu již byly provedeny**, pouze je třeba publikovat do ostré verze.
