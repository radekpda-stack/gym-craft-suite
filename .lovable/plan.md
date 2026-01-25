

# Modernizace Žebříčku - Premium UX s Pozitivním Framingem

## Cíl
Kompletní redesign žebříčku v klientském portálu pro:
- Moderní, vizuálně atraktivní zobrazení dat
- Jasné a čitelné informace o výkonu
- Pozitivní framing pro všechny pozice (nikdy negativní pocit)
- Plynulé, moderní animace a přechody

---

## Klíčové principy redesignu

### 1. Pozitivní Framing - Nikdy negativní
| Aktuální | Nový přístup |
|----------|--------------|
| "Pod průměrem" | "Na startu cesty" |
| Červené/varující barvy pro nízké pozice | Neutrální, povzbuzující tóny (sky-blue) |
| Zobrazení pořadí #15 z 20 | Fokus na osobní pokrok a zlepšení |

### 2. Vizuální hierarchie
- **Hlavní metriky**: Velké, čitelné čísla s animovaným počítadlem
- **Sekundární info**: Kontextové, ne hodnotící
- **Akce**: Jasné další kroky, ne kritika

---

## Vizuální návrh karet

```text
┌────────────────────────────────────────────┐
│  🏋️  Bench Press                    ⭐ Top 10% │
│  ─────────────────────────────────────────  │
│                                              │
│     ╭─────────────────────────────────╮     │
│     │    ████████████████░░░░  82%    │     │  ← Animovaný gauge
│     ╰─────────────────────────────────╯     │
│                                              │
│   💪 Tvůj max: 85 kg                        │
│                                              │
│   ─────────────────────────────────────     │
│   📈 +12% od minulého měsíce                │  ← Osobní trend (ne srovnání)
│   🎯 Další cíl: 90 kg (+5 kg)               │  ← Konstruktivní cíl
└────────────────────────────────────────────┘
```

Pro nižší percentily:
```text
┌────────────────────────────────────────────┐
│  🏋️  Deadlift                       🚀 Roste! │
│  ─────────────────────────────────────────  │
│                                              │
│     ╭─────────────────────────────────╮     │
│     │    ████░░░░░░░░░░░░░░  18%      │     │  ← Sky-blue, ne červená
│     ╰─────────────────────────────────╯     │
│                                              │
│   💪 Tvůj max: 60 kg                        │
│                                              │
│   ─────────────────────────────────────     │
│   🌱 Tvůj první záznam! Skvělý start.       │  ← Povzbuzení
│   📊 Sleduj svůj pokrok v čase              │  ← Fokus na vlastní cestu
└────────────────────────────────────────────┘
```

---

## Komponenty k úpravě

### 1. LeaderboardPreviewCard (Dashboard karta)
**Změny:**
- Přidat mikroanimaci při hover (scale + glow efekt)
- Animovaný gradient border při otevření
- Smooth spring transition při otevírání sheet

**Nová vizuální podoba:**
```text
┌─────────────────────────────────────────┐
│ 🏆 Žebříček                        →    │
│                                          │
│ ┌─────┐ ┌─────┐ ┌─────┐                 │
│ │💪12 │ │⚡ 5 │ │❤️ 8 │   ← Pill badges  │
│ │Síla │ │Plyo │ │Kard│      s počty     │
│ └─────┘ └─────┘ └─────┘                 │
│                                          │
│ ✨ Tvá nejsilnější: Bench Press         │  ← Rychlý highlight
└─────────────────────────────────────────┘
```

### 2. OverallPositionHero (Hlavní hero sekce)
**Změny:**
- Animovaný kruhový progress gauge místo lineárního baru
- Počítadlo animace pro percentil (0 → 82%)
- Pulse efekt na ikonách pro vysoké pozice
- Jemný parallax efekt na pozadí

**Nové labely pro nízké percentily:**
| Percentil | Label | Ikona | Barva |
|-----------|-------|-------|-------|
| 0-25% | "Na startu cesty" | 🌱 | Sky blue |
| 25-50% | "Stavíš základy" | 🧱 | Amber/warm |
| 50-75% | "Nad průměrem" | 📈 | Green |
| 75-90% | "Mezi nejlepšími" | ⭐ | Primary |
| 90-100% | "Absolutní špička" | 🏆 | Gold glow |

### 3. ExerciseCard (Karty jednotlivých cviků)
**Změny:**
- Staggered animation při načítání (postupné zobrazení)
- Layout shift při expanzi s spring physics
- Floating effect na top performer kartách
- Micro-interactions: 
  - Hover: subtle scale (1.02) + shadow lift
  - Click: haptic feedback + ripple efekt
  - Expand: smooth height transition s fade-in obsahu

**Nový PercentileGauge design:**
- Kruhový gauge s animovaným vyplněním
- Gradient podle zóny
- Počítadlo animace čísla
- Bez "špatných" labelů

### 4. LeaderboardRow (Řádky v žebříčku)
**Změny:**
- Highlight aktuálního uživatele s glow efektem
- Staggered entrance animation
- Pozice zobrazena jako "X z Y" ne jako rank
- Pro nízké pozice: skrýt přesné číslo, ukázat jen trend

### 5. Sheet otevírání
**Změny:**
- Spring-based animation s bounce
- Backdrop blur fade-in
- Content stagger při otevření
- Swipe-to-close s velocity-based close

---

## Nové animační utilities

### Framer Motion presets
```javascript
// Staggered grid entrance
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 }
  }
};

// Gauge fill animation
const gaugeVariants = {
  initial: { pathLength: 0 },
  animate: { 
    pathLength: percentile / 100,
    transition: { duration: 1.2, ease: "easeOut" }
  }
};

// Number counter animation
const CountUp = ({ value }) => {
  const [count, setCount] = useState(0);
  // Animate from 0 to value over 1s
};
```

### Haptic feedback integration
```javascript
// Při otevření karty
haptic('light');

// Při dosažení top pozice
haptic('success');
fireConfetti('celebration');
```

---

## Pozitivní messaging tabulka

| Situace | Aktuální text | Nový text |
|---------|---------------|-----------|
| 0-25% | "Prostor ke zlepšení" | "Tvá cesta právě začíná 🌱" |
| Poslední místo | "#15 z 15" | "Každý krok se počítá" |
| Nejslabší cvik | "Nejslabší: XY" | "Příležitost k růstu: XY" |
| Žádná data | "Bez dat" | "Připrav se na start!" |
| First entry | - | "Tvůj první záznam! 🎉" |

---

## Technická implementace

### Soubory k úpravě

| Soubor | Změny |
|--------|-------|
| `LeaderboardPreviewCard.tsx` | Hover animace, glow efekt, rychlý highlight |
| `OverallPositionHero.tsx` | Kruhový gauge, nové labely, parallax |
| `ExerciseComparisonGrid.tsx` | Stagger animace, container variants |
| `ExerciseCard` (inline) | Micro-interactions, spring expand |
| `PercentileGauge.tsx` | Kruhový SVG gauge, počítadlo, nové barvy |
| `GamificationSection.tsx` | Lepší animace kolaps/expand |
| `sheet.tsx` | Spring physics, velocity close |

### Nové komponenty

| Komponenta | Účel |
|------------|------|
| `CircularPercentileGauge.tsx` | Kruhový animovaný gauge |
| `AnimatedCounter.tsx` | Počítadlo s animací |
| `GlowCard.tsx` | Karta s hover glow efektem |

---

## Příklad výsledného UX flow

1. **Klient otevře dashboard** → vidí LeaderboardPreviewCard s jemným shimmer
2. **Klikne na kartu** → haptic + spring sheet otevření
3. **Vidí OverallPositionHero** → kruhový gauge se animuje, číslo se počítá
4. **Scrolluje ke cvikům** → karty se postupně animují (stagger)
5. **Klikne na cvik** → smooth expand s spring physics
6. **Vidí svou pozici** → pozitivní framing bez ohledu na rank
7. **Zavře sheet** → velocity-aware swipe + smooth close

---

## Výhody nového designu

- **Pro začátečníky**: Nikdy se necítí "špatně" - fokus na osobní cestu
- **Pro pokročilé**: Uznání jejich pozice s premium vizuály
- **Pro všechny**: Moderní, plynulé animace = profesionální dojem
- **Čitelnost**: Jasná vizuální hierarchie, velká čísla, méně textu

