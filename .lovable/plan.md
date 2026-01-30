
# Rozšíření tréninkového deníku o kardio stroje a švihadlo

## Přehled změn

Přidáme nové typy aktivit do klientského dialogu pro zápis tréninků se specifickými metrikami pro každý typ stroje.

## Nové typy aktivit

| Aktivita | Ikona | Klíčové metriky |
|----------|-------|-----------------|
| **Běžecký pás (motor)** | 🏃 | Čas, vzdálenost, rychlost (km/h), sklon (%) |
| **Běžecký pás (curved)** | 🏃 | Čas, vzdálenost, tempo (min/km), kalorie |
| **Veslovací trenažér** | 🚣 | Čas, vzdálenost (m), pace/500m, watty, tempo tahů |
| **SkiErg** | ⛷️ | Čas, vzdálenost (m), pace/500m, watty |
| **Švihadlo** | ⭕ | Čas, počet přeskoků, dvojité přeskoky |

---

## Vizuální návrh - Rozšířený dialog

### Nový grid typů aktivit (12 typů):
```text
┌──────────────────────────────────────────────────────────────┐
│ 💪 Co jsi dělal/a?                                          │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│ │  💪    │ │  🏃    │ │  🚴    │ │  🚶    │                 │
│ │Posilovna│ │  Běh   │ │ Kolo   │ │ Chůze  │                │
│ └────────┘ └────────┘ └────────┘ └────────┘                 │
│                                                              │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│ │  🏊    │ │  🧘    │ │  🚣    │ │  ⛷️    │                 │
│ │Plavání │ │Protažení│ │ Veslo  │ │ SkiErg │                │
│ └────────┘ └────────┘ └────────┘ └────────┘                 │
│                                                              │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                 │
│ │  🏃‍♂️   │ │  🏃‍♀️   │ │  ⭕    │ │  ✨    │                 │
│ │Pás motor│ │Pás curved│ │Švihadlo│ │  Jiné  │               │
│ └────────┘ └────────┘ └────────┘ └────────┘                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Metriky pro Veslo/SkiErg:
```text
┌──────────────────────────────────────────────────────────────┐
│ 🚣 Veslovací trenažér                                       │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ ┌─────────────────┐  ┌─────────────────┐                    │
│ │ Vzdálenost (m)  │  │ Čas             │                    │
│ │ [  2000       ] │  │ [ 8:15        ] │                    │
│ └─────────────────┘  └─────────────────┘                    │
│                                                              │
│ ┌─────────────────┐  ┌─────────────────┐                    │
│ │ Pace/500m       │  │ Průměr wattů    │                    │
│ │ [ 2:04.5      ] │  │ [   185       ] │                    │
│ └─────────────────┘  └─────────────────┘                    │
│                                                              │
│ ┌─────────────────┐                                         │
│ │ Tempo tahů/min  │                                         │
│ │ [   24        ] │                                         │
│ └─────────────────┘                                         │
└──────────────────────────────────────────────────────────────┘
```

### Metriky pro Běžecký pás (motorový):
```text
┌──────────────────────────────────────────────────────────────┐
│ 🏃 Běžecký pás (motorový)                                   │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ ┌─────────────────┐  ┌─────────────────┐                    │
│ │ Vzdálenost (km) │  │ Čas (min)       │                    │
│ │ [  5.0        ] │  │ [   30        ] │                    │
│ └─────────────────┘  └─────────────────┘                    │
│                                                              │
│ ┌─────────────────┐  ┌─────────────────┐                    │
│ │ Rychlost (km/h) │  │ Sklon (%)       │                    │
│ │ [  10.0       ] │  │ [   2         ] │                    │
│ └─────────────────┘  └─────────────────┘                    │
└──────────────────────────────────────────────────────────────┘
```

### Metriky pro Švihadlo:
```text
┌──────────────────────────────────────────────────────────────┐
│ ⭕ Švihadlo                                                  │
│ ────────────────────────────────────────────────────────────│
│                                                              │
│ ┌─────────────────┐  ┌─────────────────┐                    │
│ │ Čas (min)       │  │ Počet přeskoků  │                    │
│ │ [   10        ] │  │ [   500       ] │                    │
│ └─────────────────┘  └─────────────────┘                    │
│                                                              │
│ ☐ Dvojité přeskoky (double unders)                          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Technická implementace

### Rozšíření typů aktivit v SimpleAddWorkoutDialog.tsx

```typescript
const SIMPLE_WORKOUT_TYPES = [
  // Stávající typy
  { value: 'strength', label: 'Posilovna', icon: Dumbbell, color: 'text-warning bg-warning/10', isCardio: false },
  { value: 'run', label: 'Běh', icon: Footprints, color: 'text-success bg-success/10', isCardio: true },
  { value: 'cycling', label: 'Kolo', icon: Bike, color: 'text-accent bg-accent/10', isCardio: true },
  { value: 'walk', label: 'Chůze', icon: PersonStanding, color: 'text-accent bg-accent/10', isCardio: true },
  { value: 'swimming', label: 'Plavání', icon: Waves, color: 'text-accent bg-accent/10', isCardio: true },
  { value: 'mobility', label: 'Protažení', icon: MoveHorizontal, color: 'text-primary bg-primary/10', isCardio: false },
  
  // NOVÉ typy
  { value: 'rowing', label: 'Veslo', icon: Ship, color: 'text-accent bg-accent/10', isCardio: true, machineType: 'erg' },
  { value: 'skierg', label: 'SkiErg', icon: Mountain, color: 'text-accent bg-accent/10', isCardio: true, machineType: 'erg' },
  { value: 'treadmill_motor', label: 'Pás motor', icon: Zap, color: 'text-success bg-success/10', isCardio: true, machineType: 'treadmill' },
  { value: 'treadmill_curved', label: 'Pás curved', icon: Activity, color: 'text-success bg-success/10', isCardio: true, machineType: 'treadmill' },
  { value: 'jumprope', label: 'Švihadlo', icon: Circle, color: 'text-warning bg-warning/10', isCardio: true, machineType: 'jumprope' },
  
  { value: 'other', label: 'Jiné', icon: Sparkles, color: 'text-primary bg-primary/10', isCardio: false },
];
```

### Nová komponenta pro dynamické metriky

Vytvoříme komponentu `MachineMetricsInput.tsx` která zobrazí správné vstupy podle typu stroje:

```typescript
interface MachineMetricsInputProps {
  workoutType: string;
  metrics: MachineMetrics;
  onChange: (metrics: MachineMetrics) => void;
}

interface MachineMetrics {
  distance_meters?: number;
  duration_seconds?: number;
  pace_per_500m?: string;      // Pro veslo/skierg (mm:ss.cc)
  avg_watts?: number;          // Pro veslo/skierg
  cadence?: number;            // Tempo tahů
  avg_speed_kmh?: number;      // Pro běžecký pás
  incline_percent?: number;    // Sklon pásu
  jump_count?: number;         // Počet přeskoků
  is_double_unders?: boolean;  // Dvojité přeskoky
}
```

### Ukládání rozšířených metrik

Rozšíříme `handleSaveWorkout` v `ClientPortalWorkoutDiary.tsx`:

```typescript
const handleSaveWorkout = async (data: {
  // ... stávající pole
  machineMetrics?: {
    distance_meters?: number;
    pace_per_500m?: string;
    avg_watts?: number;
    cadence?: number;
    avg_speed_kmh?: number;
    incline_percent?: number;
    jump_count?: number;
    is_double_unders?: boolean;
  };
}) => {
  // Přidat metriky do poznámek pro trenéra
  let fullNotes = data.notes || '';
  if (data.machineMetrics) {
    const metricsInfo = formatMachineMetrics(data.workoutType, data.machineMetrics);
    fullNotes = metricsInfo + (fullNotes ? `\n${fullNotes}` : '');
  }
  
  // Uložit
  await createLog.mutateAsync({
    // ... stávající data
    notes: fullNotes,
    // Metriky se uloží jako strukturovaná data do metrics_json
    distance_meters: data.machineMetrics?.distance_meters,
    // atd.
  });
};
```

---

## Soubory k úpravě

| Soubor | Změny |
|--------|-------|
| `src/components/client-portal/workout-diary/SimpleAddWorkoutDialog.tsx` | Rozšířit typy aktivit, přidat dynamické metriky |
| `src/components/client-portal/workout-diary/MachineMetricsInput.tsx` | NOVÝ - Komponenta pro metriky strojů |
| `src/pages/client-portal/ClientPortalWorkoutDiary.tsx` | Rozšířit ukládání o nové metriky |
| `src/components/client-portal/workout-diary/SimpleWorkoutCard.tsx` | Zobrazit metriky strojů v kartě |

---

## Shrnutí nových aktivit

| Typ | Hodnota DB | Metriky |
|-----|------------|---------|
| Veslo | `rowing` | vzdálenost (m), čas, pace/500m, watty, tempo tahů |
| SkiErg | `skierg` | vzdálenost (m), čas, pace/500m, watty |
| Běžecký pás motor | `treadmill_motor` | vzdálenost (km), čas, rychlost (km/h), sklon (%) |
| Běžecký pás curved | `treadmill_curved` | vzdálenost (km), čas, tempo (min/km), kalorie |
| Švihadlo | `jumprope` | čas, počet přeskoků, dvojité přeskoky |
