
# Vylepšení sekce "Příprava na trénink" - Profesionální trenérský pohled

## Cíl
Rozšířit sekci přípravy na trénink o klíčové informace z předchozího tréninku, které profesionální trenér potřebuje pro plánování následující jednotky:
- **Typ tréninku** (silový, plyometrický, kardio, atd.)
- **Trénované partie těla** (z tagů body_part)
- **Zpětná vazba od klienta** (svalovka, energie, bolest, jak mu seděl trénink)

---

## Návrh nového UI

```text
┌─────────────────────────────────────────────────────────────────┐
│ 📋 Příprava na trénink                              [▼ sbalit] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ⚠️ UPOZORNĚNÍ                                                  │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ Bolest v koleni - netlačit hluboké dřepy                   ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ 🎯 Cíl: Nabrat svalovou hmotu                                  │
│                                                                 │
│ 🔔 Z MINULA (2)                                                │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ • Zkontrolovat koleno po přidání zátěže                     ││
│ │ • Přeměřit obvody paží                                      ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐│
│ │ 📊 PŘEDCHOZÍ TRÉNINK • 27.1. • Silový              [▼ více] ││
│ ├─────────────────────────────────────────────────────────────┤│
│ │                                                             ││
│ │ 🏋️ Partie:  [Nohy] [Zadek] [Core]                          ││
│ │                                                             ││
│ │ 📈 Cviky (4):                                              ││
│ │   • Dřepy 4× • Mrtvý tah 3× • Výpady 3× • Plank 3×         ││
│ │                                                             ││
│ │ ─────────────────────────────────────────────────────────  ││
│ │                                                             ││
│ │ 💬 FEEDBACK OD KLIENTA (D+1)                               ││
│ │ ┌─────────────────────────────────────────────────────────┐││
│ │ │ Svalovka:     ████████░░  8/10  Výrazná                │││
│ │ │ Energie:      ██████████  10/10 Plný energie           │││
│ │ │ Bolest:       ██░░░░░░░░  2/10  Minimální              │││
│ │ │ Seděl mu:     ████████░░  8/10  Velmi dobře            │││
│ │ └─────────────────────────────────────────────────────────┘││
│ │                                                             ││
│ │ 💡 TIP: Klient měl silnou svalovku na nohou.               ││
│ │    Zvažte začít horní partií nebo snížit objem na nohy.    ││
│ │                                                             ││
│ └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technické změny

### 1. Rozšíření hooku `useLastTraining.ts`

**Nová data k načtení:**

| Pole | Zdroj | Popis |
|------|-------|-------|
| `training_type` | `training_sessions.training_type` | Typ tréninku (silový, kardio, atd.) |
| `rpe` | `training_sessions.rpe` | RPE hodnocení od trenéra |
| `bodyPartTags` | `training_session_tags` + `tags` (kde `tag_type = 'body_part'`) | Trénované partie |
| `feedback` | `training_feedback` | Zpětná vazba od klienta |

**Nový interface:**

```typescript
export interface LastTrainingData {
  id: string;
  date: string;
  duration: number;
  notes: string | null;
  subjective_rating: number | null;
  training_type: string | null;         // NOVÉ
  rpe: number | null;                   // NOVÉ
  tags: Tag[];                          // Všechny tagy
  bodyPartTags: Tag[];                  // NOVÉ - filtrované body_part tagy
  exercises: GroupedWorkoutEntry[];
  feedback: LastTrainingFeedback | null; // NOVÉ
}

export interface LastTrainingFeedback {
  soreness: number | null;        // Svalovka (1-10)
  energy_rating: number | null;   // Energie (1-10)
  body_feel: number | null;       // Pocit v těle (1-10)
  pain: number | null;            // Bolest (1-10)
  session_fit: number | null;     // Jak seděl trénink (1-10)
  difficulty: number | null;      // Client RPE (1-10)
  comment: string | null;         // Komentář klienta
  muscle_soreness: string[];      // Které svaly bolí
}
```

**Rozšířený query:**

```typescript
// 1. Rozšířit select o training_type a rpe
.select("id, date, duration, notes, subjective_rating, training_type, rpe")

// 2. Načíst tagy s tag_type pro filtrování
.select(`
  tag_id,
  tags:tag_id (id, name, color, tag_type)
`)

// 3. Nový query pro feedback
const { data: feedbackData } = await supabase
  .from('training_feedback')
  .select('soreness, energy_rating, body_feel, pain, session_fit, difficulty, comment, muscle_soreness')
  .eq('training_session_id', session.id)
  .maybeSingle();
```

---

### 2. Nová komponenta `PreviousTrainingFeedbackCard.tsx`

Zobrazuje zpětnou vazbu od klienta ve vizuálně přehledné podobě:

```typescript
interface PreviousTrainingFeedbackCardProps {
  feedback: LastTrainingFeedback;
}
```

**Klíčové prvky:**
- Barevné progress bary pro každou metriku (1-10)
- Invertované barvy pro negativní metriky (svalovka, bolest)
- Stručné textové popisky (Minimální, Střední, Výrazná, Extrémní)
- Zvýraznění problémových hodnot (bolest ≥7, svalovka ≥8)

---

### 3. Nová komponenta `TrainingCoachingTip.tsx`

Automatické návrhy na základě dat:

```typescript
function generateCoachingTips(lastTraining: LastTrainingData): string[] {
  const tips: string[] = [];
  
  // Vysoká svalovka → zvážit jiné partie
  if (lastTraining.feedback?.soreness >= 7) {
    const bodyParts = lastTraining.bodyPartTags.map(t => t.name).join(', ');
    tips.push(`Klient měl silnou svalovku na ${bodyParts}. Zvažte začít jinou partií.`);
  }
  
  // Nízká energie → kratší trénink
  if (lastTraining.feedback?.energy_rating <= 4) {
    tips.push(`Klient hlásil nízkou energii. Zvažte kratší nebo méně intenzivní trénink.`);
  }
  
  // Bolest → pozor na partie
  if (lastTraining.feedback?.pain >= 5) {
    tips.push(`Klient hlásil bolest (${lastTraining.feedback.pain}/10). Zeptejte se na aktuální stav.`);
  }
  
  // Trénink mu neseděl
  if (lastTraining.feedback?.session_fit <= 4) {
    tips.push(`Minulý trénink klientovi příliš neseděl. Diskutujte o úpravě programu.`);
  }
  
  return tips;
}
```

---

### 4. Aktualizace `TrainingPrepSection.tsx`

**Změny:**
- Import rozšířeného `useLastTraining` hooku
- Zobrazení typu tréninku vedle data
- Badges pro trénované partie (body_part tagy)
- Nová sekce s feedback kartou
- Koučovací tipy na základě feedbacku

**Struktura:**

```tsx
{/* Předchozí trénink - rozšířené */}
<Collapsible>
  <CollapsibleTrigger>
    <div className="flex items-center gap-2">
      <FileText />
      <span>Předchozí trénink</span>
      <span>• {format(date, 'd.M.')}</span>
      {/* NOVÉ: Typ tréninku */}
      {lastTraining.training_type && (
        <Badge variant="secondary">{lastTraining.training_type}</Badge>
      )}
    </div>
  </CollapsibleTrigger>
  
  <CollapsibleContent>
    {/* NOVÉ: Body part tagy */}
    {lastTraining.bodyPartTags.length > 0 && (
      <div className="flex items-center gap-2">
        <Dumbbell className="w-4 h-4" />
        <span>Partie:</span>
        <div className="flex flex-wrap gap-1">
          {lastTraining.bodyPartTags.map(tag => (
            <Badge key={tag.id} style={{ backgroundColor: tag.color }}>
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>
    )}
    
    {/* Existující: Cviky */}
    {/* ... */}
    
    {/* NOVÉ: Feedback sekce */}
    {lastTraining.feedback && (
      <PreviousTrainingFeedbackCard feedback={lastTraining.feedback} />
    )}
    
    {/* NOVÉ: Koučovací tipy */}
    <TrainingCoachingTip lastTraining={lastTraining} />
  </CollapsibleContent>
</Collapsible>
```

---

## Soubory k úpravě

| Soubor | Typ | Změna |
|--------|-----|-------|
| `src/hooks/useLastTraining.ts` | Úprava | Rozšíření o training_type, rpe, bodyPartTags, feedback |
| `src/components/trainings/TrainingPrepSection.tsx` | Úprava | Zobrazení nových dat, integrace nových komponent |
| `src/components/trainings/PreviousTrainingFeedbackCard.tsx` | **Nový** | Vizualizace feedbacku |
| `src/components/trainings/TrainingCoachingTip.tsx` | **Nový** | Automatické koučovací tipy |

---

## Přínos pro trenéra

1. **Rychlý přehled** - na první pohled vidím, co jsme dělali minule (typ, partie, cviky)

2. **Kontextuální feedback** - vím, jak klient reagoval na minulý trénink

3. **Automatické návrhy** - systém mi připomene, na co si dát pozor

4. **Lepší plánování** - mohu navázat nebo střídat partie podle reakce klienta

5. **Prevence přetrénování** - vidím svalovku a bolest, mohu upravit intenzitu

---

## Příklad workflow trenéra

1. Otevřu kartu naplánovaného tréninku
2. V sekci "Příprava" vidím:
   - ⚠️ Upozornění na omezení klienta
   - 🔔 Úkoly z minula
   - 📊 **Minulý trénink: Silový, Nohy + Core**
3. Rozbalím minulý trénink a vidím:
   - Klient měl svalovku 8/10 na nohy
   - Energie 6/10
   - 💡 Tip: "Zvažte začít horní partií"
4. Na základě těchto dat plánu dnešní trénink

Tímto způsobem mám jako trenér všechny informace na jednom místě bez nutnosti přecházet mezi různými obrazovkami.
