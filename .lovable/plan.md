
## Cíl
Přejmenovat navigační položku „Šablony" na „Workouty" a do stránky přidat třetí záložku „Výzvy" s funkcionalitou pro správu klientských challenge.

---

## Změny

### 1. Přejmenování navigace: "Šablony" → "Workouty"

**Soubory:**
- `src/components/layout/Sidebar.tsx` (řádek ~149)
- `src/components/layout/MobileMenu.tsx` (řádek ~65)

Změna label z `'Šablony'` na `'Workouty'`.

---

### 2. Aktualizace nadpisu stránky TrainingTemplates

**Soubor:** `src/pages/TrainingTemplates.tsx`

- Nadpis: `"Šablony & RX Workouty"` → `"Workouty"`
- Popis: aktualizovat na obecnější text

---

### 3. Přidání záložky "Výzvy" do TrainingTemplates

**Soubor:** `src/pages/TrainingTemplates.tsx`

Přidám třetí záložku `challenges` vedle stávajících `templates` a `rx`:

```text
┌──────────────────────────────────────────────────────┐
│  [Šablony]  [RX Workouty]  [Výzvy]                   │
├──────────────────────────────────────────────────────┤
│                                                      │
│   (obsah podle aktivní záložky)                      │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Záložka "Výzvy" bude obsahovat:**
- Import komponenty `ChallengesContent` z `src/components/performance/ChallengesContent.tsx`
- Tato komponenta již obsahuje plnou funkcionalitu:
  - Seznam aktivních/konceptů/archivovaných výzev
  - Vytvoření nové výzvy
  - Editor výzvy (`ChallengeEditor`)
  - Správa výsledků a vítězů
  - Veřejné nastavení pro sdílení

---

### 4. Přidání ikony Trophy k záložce

Do importů přidám `Trophy` z `lucide-react` a použiji ji u záložky "Výzvy".

---

## Technické detaily

### Změny v `TrainingTemplates.tsx`:

```tsx
// Přidám import
import { ChallengesContent } from '@/components/performance/ChallengesContent';
import { Trophy } from 'lucide-react';

// V TabsList přidám třetí záložku
<TabsTrigger value="challenges" className="gap-2">
  <Trophy className="h-4 w-4" />
  <span>Výzvy</span>
</TabsTrigger>

// Přidám TabsContent
<TabsContent value="challenges" className="mt-6">
  <ChallengesContent />
</TabsContent>
```

### Změny v `Sidebar.tsx`:
```tsx
// Řádek ~149: změna label
{ id: 'training-templates', to: '/training-templates', icon: LayoutTemplate, label: 'Workouty' }
```

### Změny v `MobileMenu.tsx`:
```tsx
// Řádek ~65: změna label
{ to: '/training-templates', icon: LayoutTemplate, label: 'Workouty' }
```

---

## Výsledek

Po implementaci:
1. V navigaci bude položka **"Workouty"** (místo "Šablony")
2. Po kliknutí se otevře stránka se třemi záložkami:
   - **Šablony** – tréninkové šablony (stávající)
   - **RX Workouty** – benchmarky s leaderboardy (stávající)
   - **Výzvy** – správa challenge pro klienty (nové)

---

## Soubory k úpravě

| Soubor | Typ změny |
|--------|-----------|
| `src/components/layout/Sidebar.tsx` | Přejmenovat label |
| `src/components/layout/MobileMenu.tsx` | Přejmenovat label |
| `src/pages/TrainingTemplates.tsx` | Přidat záložku Výzvy, aktualizovat nadpis |
