

# Modernizace karty tréninku (TrainingCard)

## Současný stav
Karta používá jednoduchý `glass` styl s border-left-4 a lineární layout: jméno → čas → metainfo → tagy → poznámka → akce. Vizuálně je plochá, bez hierarchie.

## Nový design

### Struktura karty

```text
┌─────────────────────────────────────┐
│  [Avatar] Jméno klienta    [Status] │
│           Pá 14:30 · 60min · RPE 7  │
│                                     │
│  [Typ]  [Tag1]  [Tag2]       900 Kč │
│                                     │
│  📝 Poznámka k tréninku...          │
│─────────────────────────────────────│
│              [Dokončit ✓]  [⋮]      │
└─────────────────────────────────────┘
```

### Změny v `TrainingCard.tsx`

1. **Avatar klienta** — přidat `ClientAvatar` (size `sm`) na levou stranu headeru místo pouhého textu
2. **Status badge vpravo nahoře** — zachovat `TrainingStatusBadge`, ale jen ikona bez textu na mobilu (kompaktnější)
3. **Meta řádek** — den+čas, délka, RPE/RIR na jednom řádku s tečkovými separátory místo mezer
4. **Cena** — zobrazit `final_price` nebo vypočítanou cenu na pravé straně tag řádku (dosud se nezobrazovala)
5. **Glassmorphism upgrade** — `bg-card/80 backdrop-blur-md` + subtilní `shadow-sm` místo plochého `glass`
6. **Border-left** — nahradit za tenký horní gradient pruh (2px) podle statusu — modernější vizuál
7. **Akční tlačítka** — kompaktnější: pill-style místo hranatých, ikona + text

### Změny v `SwipeableTrainingCard.tsx`
- Pouze drobné: zaoblení `rounded-2xl` místo `rounded-xl`

### Změny v `CompactTrainingRow.tsx`
- Přidat `ClientAvatar` (size `xs`) místo generic `AvatarFallback`
- Zarovnat vizuální styl se základní kartou

## Soubory

| Soubor | Změna |
|--------|-------|
| `TrainingCard.tsx` | Nový layout s avatarem, cenovou indikací, gradient border, glassmorphism |
| `SwipeableTrainingCard.tsx` | `rounded-2xl` |
| `CompactTrainingRow.tsx` | `ClientAvatar` místo generic avatar |

Čistě vizuální, žádné DB změny.

