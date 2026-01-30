
# Seznam cviků s grafy pokroku pro klientský portál

## Přehled

Na stránku **Přehled** (ClientPortalOverview) pod kartu **Žebříček** přidáme novou interaktivní sekci s klikatelným seznamem cviků klienta. Po kliknutí na cvik se zobrazí moderní, snadno čitelný graf zobrazující vývoj výsledků v čase.

---

## Vizuální návrh

### Seznam cviků (kompaktní karty):
```text
┌──────────────────────────────────────────────────────────────────┐
│ 📊 Tvůj pokrok                                      Vše →      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌────────────────────┐ ┌────────────────────┐ ┌──────────────┐ │
│ │ 💪 Bench press     │ │ 🦵 Dřep           │ │ 🏃 Běžec. pás│ │
│ │ 85 kg              │ │ 120 kg            │ │ 5:42         │ │
│ │ ▲ +15%  ~~~╱~~     │ │ ▲ +8%   ~~╱~~~   │ │ ▼ -12% ~~╲~~ │ │
│ │ (zlepšuješ se!)    │ │ (stoupá!)         │ │ (rychlejší!) │ │
│ └────────────────────┘ └────────────────────┘ └──────────────┘ │
│                                                                  │
│ ┌────────────────────┐ ┌────────────────────┐                   │
│ │ ⚡ Skok do dálky   │ │ 🚣 Veslo          │                   │
│ │ 2.35 m             │ │ 8:15/2000m        │                   │
│ │ ▲ +5%   ~~╱~~~    │ │ ▼ -10% ~~╲~~      │                   │
│ └────────────────────┘ └────────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

### Detail cviku (po kliknutí - Sheet):
```text
┌──────────────────────────────────────────────────────────────────┐
│                                                              ✕   │
│ 💪 Bench press                                                   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ AKTUÁLNÍ       │ MAXIMUM        │ TREND                     │ │
│ │ 85 kg          │ 90 kg 🏆       │ ▲ +15% za 30 dní         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│         TVŮJ POKROK ZA POSLEDNÍCH 6 MĚSÍCŮ                      │
│                                                                  │
│  90 ┤                                        ●←──────── 🏆 PR    │
│     │                                    ●───┘                   │
│  80 ┤                          ●─────●───┘                       │
│     │                    ●─────┘                                 │
│  70 ┤          ●─────●───┘                                       │
│     │    ●─────┘                                                 │
│  60 ┤────┘                                                       │
│     └────┼────┼────┼────┼────┼────┼────                         │
│         Zář  Říj  Lis  Pro  Led  Úno                            │
│                                                                  │
│ ─────────────────────────────────────────────────────────────── │
│                                                                  │
│ 📈 Analýza trendu:                                              │
│ • Stoupající trend (+2.5 kg/měsíc)                              │
│ • Konzistentní zlepšování                                       │
│ • Doporučeno: pokračovat v aktuálním tempu                      │
└──────────────────────────────────────────────────────────────────┘
```

### Kardio cviky (klesající = lepší):
```text
┌──────────────────────────────────────────────────────────────────┐
│ 🏃 Běžecký pás (5 km)                                       ✕   │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ AKTUÁLNÍ       │ NEJLEPŠÍ       │ TREND                     │ │
│ │ 25:30          │ 24:15 🏆       │ ▼ -12% (rychlejší!)       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│         TVŮJ POKROK (NIŽŠÍ = LEPŠÍ)                             │
│                                                                  │
│  30:00 ┤────●                                                    │
│        │      ╲                                                  │
│  28:00 ┤        ●───●                                           │
│        │              ╲                                          │
│  26:00 ┤                ●───●                                   │
│        │                      ╲                                  │
│  24:00 ┤                        ●───●←──── 🏆 Nejlepší čas      │
│        └────┼────┼────┼────┼────┼────┼                          │
│            Zář  Říj  Lis  Pro  Led  Úno                         │
│                                                                  │
│ 📈 Analýza trendu:                                              │
│ • Klesající trend (zrychlení o 1:30/měsíc)                      │
│ • Výborný pokrok!                                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## Technická implementace

### Nové komponenty

| Komponenta | Účel |
|------------|------|
| `MyExercisesWidget.tsx` | Hlavní widget na dashboardu s horizontálním seznamem cviků |
| `ExerciseProgressSheet.tsx` | Spodní sheet s detailním grafem po kliknutí na cvik |
| `ExerciseSparklineItem.tsx` | Jednotlivá karta cviku s mini-grafem a trendem |

### Rozšíření existujících hooků

| Hook | Změna |
|------|-------|
| `useClientAllExercises.ts` | Již obsahuje vše potřebné (exerciseType, isTimeBased, data) |

### Klíčová logika trendů

Pro správné zobrazení trendu (zda je klient lepší nebo horší):

```typescript
// Síla/plyometrie: vyšší = lepší
if (exerciseType === 'strength' || exerciseType === 'skill') {
  trendPositive = change > 0;
  trendColor = trendPositive ? 'success' : 'destructive';
}

// Kardio: nižší čas = lepší (rychlejší)
if (exerciseType === 'cardio') {
  trendPositive = change < 0; // Záporná změna = zlepšení
  trendColor = trendPositive ? 'success' : 'destructive';
}
```

### Graf s obrácenou osou pro kardio

Pro kardio cviky bude Y-osa obrácená, takže graf vizuálně "stoupá" i když hodnoty klesají:

```typescript
<YAxis 
  reversed={isCardio} // Obrátit osu pro kardio
  tickFormatter={(v) => formatTime(v)}
/>
```

---

## Integrační bod

Widget bude přidán do `ClientPortalOverview.tsx`:

```typescript
// src/pages/client-portal/ClientPortalOverview.tsx

<LeaderboardPreviewCard />

{/* NOVÉ: 8. Tvůj pokrok - seznam cviků s grafy */}
<MyExercisesWidget />

<ActiveChallengeWidget />
```

---

## Soubory k vytvoření/úpravě

| Soubor | Akce |
|--------|------|
| `src/components/client-portal/dashboard/MyExercisesWidget.tsx` | Nový - hlavní widget |
| `src/components/client-portal/dashboard/ExerciseProgressSheet.tsx` | Nový - detail s grafem |
| `src/components/client-portal/dashboard/ExerciseSparklineItem.tsx` | Nový - mini karta cviku |
| `src/pages/client-portal/ClientPortalOverview.tsx` | Úprava - přidat MyExercisesWidget |

---

## Shrnutí UX

| Aspekt | Implementace |
|--------|-------------|
| **Jednoduchost** | Kompaktní karty s jasným číslem a trendem |
| **Moderní design** | Sparkline grafy, gradient pozadí, Framer Motion animace |
| **Čitelnost trendů** | Zelená šipka ↑ = zlepšení, bez ohledu na typ cviku |
| **Kardio logika** | Graf "stoupá" vizuálně, i když časy klesají |
| **Mobile-first** | Horizontální scroll, touch-friendly velikosti |
| **Okamžitá zpětná vazba** | Haptic feedback při interakci |
