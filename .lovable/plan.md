

# Plán: Prioritizace navigace a chytré zkratky na dashboard

## Shrnutí požadavků

1. **Posunout soutěže/gamifikaci** dále v navigaci (méně důležité)
2. **Prioritizovat**: Přehled, Deník, Pokrok, Chat, Kredit
3. **Chytré zkratky na dashboard** - pokud klient začne používat jídlo nebo vlastní tréninky, zobrazit rychlé tlačítko přímo na dashboardu

---

## Technické změny

### 1. Reorganizace navigace - Desktop sidebar

**Soubor:** `src/components/client-portal/ClientPortalLayout.tsx`

Změna pořadí položek v `buildBaseNavItems`:

```typescript
// PŘED:
[Přehled, Deník, Pokrok, Chat, Žebříček, Výzvy, Odznaky]

// PO - prioritizované:
[Přehled, Deník, Pokrok, Chat, Žebříček, Výzvy, Odznaky]
// ↑ První 4 zůstávají
// ↓ Soutěže (Žebříček, Výzvy, Odznaky) přesunuty na konec před Nákupy/Nastavení
```

**Nové pořadí:**
1. Přehled
2. Deník  
3. Pokrok
4. Chat (s indikátorem)
5. --- oddělovač ---
6. Žebříček
7. Výzvy
8. Odznaky
9. Nákupy
10. Nastavení

### 2. Mobile navigace - Zjednodušení

**Soubor:** `src/components/client-portal/ClientPortalLayout.tsx`

Změna `buildMobileNavItems`:

```typescript
// PŘED:
[Přehled, Deník, Chat, Nákupy, Více]

// PO - prioritizované:
[Přehled, Deník, Pokrok, Chat, Více]
// Nákupy přesunout do "Více" (Nastavení)
```

### 3. Chytré zkratky na dashboard - KLÍČOVÁ FUNKCE

**Nový hook:** `src/hooks/useClientActivityPreferences.ts`

```typescript
export function useClientActivityPreferences(clientId: string | undefined) {
  return useQuery({
    queryKey: ['client-activity-preferences', clientId],
    queryFn: async () => {
      if (!clientId) return { hasOwnWorkouts: false, hasNutritionEntries: false };

      // Zkontrolovat vlastní tréninky (ne od trenéra)
      const { count: ownWorkoutsCount } = await supabase
        .from('client_workout_logs')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('source', 'client_manual')
        .limit(1);

      // Zkontrolovat záznamy o jídle
      const { count: foodCount } = await supabase
        .from('nutrition_food_entries')
        .select('id', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .limit(1);

      return {
        hasOwnWorkouts: (ownWorkoutsCount ?? 0) > 0,
        hasNutritionEntries: (foodCount ?? 0) > 0,
      };
    },
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000,
  });
}
```

**Soubor:** `src/components/client-portal/dashboard/ClientQuickActions.tsx`

Přidat dynamické zkratky:

```typescript
export function ClientQuickActions() {
  const { clientId } = useClientPortal();
  const { data: prefs } = useClientActivityPreferences(clientId);
  const location = useLocation();
  const basePath = location.pathname.startsWith('/zona') ? '/zona' : '/client';

  // Základní akce (vždy viditelné)
  const baseActions = [
    { id: 'diary', label: 'Deník', icon: <BookOpen />, path: '/diary', ... },
    { id: 'chat', label: 'S trenérem', icon: <MessageCircle />, path: '/chat', ... },
    { id: 'progress', label: 'Pokrok', icon: <Scale />, path: '/progress', ... },
  ];

  // Chytré zkratky (zobrazí se jen pokud klient už funkci používá)
  const smartActions = [];
  
  if (prefs?.hasOwnWorkouts) {
    smartActions.push({
      id: 'add-workout',
      label: '+ Trénink',
      icon: <Dumbbell />,
      path: '/diary?action=add-workout',
      color: 'text-primary',
      bgColor: 'bg-primary/10 hover:bg-primary/20',
    });
  }
  
  if (prefs?.hasNutritionEntries) {
    smartActions.push({
      id: 'add-food',
      label: '+ Strava',
      icon: <Apple />,
      path: '/diary?tab=nutrition&action=add-food',
      color: 'text-success',
      bgColor: 'bg-success/10 hover:bg-success/20',
    });
  }

  const allActions = [...baseActions, ...smartActions];
  
  // Dynamický grid - 3 sloupce (nebo 4 pokud jsou chytré zkratky)
  const gridCols = allActions.length <= 3 ? 'grid-cols-3' : 'grid-cols-4';

  return (
    <motion.div className={cn("grid gap-2", gridCols)}>
      {allActions.map(...)}
    </motion.div>
  );
}
```

### 4. Podpora pro URL parametry v Deníku

**Soubor:** `src/pages/client-portal/ClientPortalWorkoutDiary.tsx`

Přidat zpracování `?action=add-workout`:

```typescript
useEffect(() => {
  const action = searchParams.get('action');
  if (action === 'add-workout') {
    setDialogOpen(true);
    // Vyčistit URL parametr
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('action');
    window.history.replaceState({}, '', `${window.location.pathname}?${newParams}`);
  }
}, [searchParams]);
```

**Soubor:** `src/pages/client-portal/ClientPortalNutritionTab.tsx`

Přidat zpracování `?action=add-food`:

```typescript
useEffect(() => {
  const action = searchParams.get('action');
  if (action === 'add-food') {
    setShowAddForm(true);
    // Vyčistit URL parametr
  }
}, [searchParams]);
```

### 5. Odstranění zbytečných sekcí z dashboardu

**Soubor:** `src/pages/client-portal/ClientPortalOverview.tsx`

Na základě předchozího auditu:

```typescript
// ODSTRANIT:
- OverallPerformanceCard (duplikát s Žebříčkem)
- Recent Activity (nikdo nerozklikává)
- ClientInsightsCard (přesunout na stránku Pokrok)

// PONECHAT:
1. Header s pozdravem
2. ClientActionRequired (úkoly)
3. HeroStatsRow (kredit + další trénink)
4. ClientQuickActions (s chytrými zkratkami)
5. TrainingCalendar
6. ActiveChallengeWidget (pouze pokud je aktivní)
```

---

## Vizuální ukázka

### Dashboard Quick Actions - Dynamické zobrazení

**Nový klient (nic nezapisoval):**
```text
┌─────────┐ ┌─────────┐ ┌─────────┐
│  Deník  │ │S trenér.│ │ Pokrok  │
│ 📓      │ │ 💬      │ │ 📊      │
└─────────┘ └─────────┘ └─────────┘
```

**Klient zapisuje vlastní tréninky:**
```text
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Deník │ │Chat  │ │Pokrok│ │+Trén.│  ← Nová zkratka!
│ 📓   │ │ 💬   │ │ 📊   │ │ 🏋️   │
└──────┘ └──────┘ └──────┘ └──────┘
```

**Klient zapisuje tréninky + jídlo:**
```text
┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐
│Deník│ │Chat │ │Pokr.│ │+Trén│ │+Jídl│  ← Obě zkratky!
│ 📓  │ │ 💬  │ │ 📊  │ │ 🏋️  │ │ 🍎  │
└─────┘ └─────┘ └─────┘ └─────┘ └─────┘
```

### Nová mobile navigace:
```text
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│Přehl.│ │Deník │ │Pokrok│ │ Chat │ │ Více │
│ 🏠   │ │ 📓   │ │ 📊   │ │ 💬   │ │ ⚙️   │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘
```

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/hooks/useClientActivityPreferences.ts` | **NOVÝ** - hook pro detekci preferencí klienta |
| `src/components/client-portal/dashboard/ClientQuickActions.tsx` | Přidat dynamické chytré zkratky |
| `src/components/client-portal/ClientPortalLayout.tsx` | Reorganizovat navigaci, priority |
| `src/pages/client-portal/ClientPortalOverview.tsx` | Odstranit zbytečné sekce |
| `src/pages/client-portal/ClientPortalWorkoutDiary.tsx` | Podpora `?action=add-workout` |
| `src/pages/client-portal/ClientPortalNutritionTab.tsx` | Podpora `?action=add-food` |

---

## Výsledek

1. **Jasná priorita** - Deník, Pokrok, Chat jsou první
2. **Soutěže odsunout** - Žebříček/Výzvy/Odznaky až na konec
3. **Chytré zkratky** - klient vidí rychlé tlačítko jen když už funkci používá
4. **Méně překlikávání** - jedno kliknutí = přímá akce
5. **Čistší dashboard** - bez duplicit a zbytečných karet

