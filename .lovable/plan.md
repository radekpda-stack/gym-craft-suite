
# Plán: Přepracování notifikačního centra pro trenéra

## Shrnutí požadavků
Aktuální stav notifikačního centra má několik problémů:
- **Tréninky a cvičení** (PRka, milestony) jsou nahoře a trenéra nezajímají
- **Výživa** zobrazuje nežádoucí notifikace o neaktivitě klienta (24h bez zápisu)
- **Zpětná vazba** neprovádí konzistentně akce při kliknutí
- **Aktualizace profilu** neodkazuje na konkrétní změny

## Navrhované změny

### 1. Změna pořadí kategorií
Aktuálně: Training → Nutrition → Forms → Admin

Nové pořadí:
1. **Zprávy** (zůstává nahoře - nepřečtené konverzace)
2. **Výživa a zdraví** - vysoká priorita (klient zapisuje stravu)
3. **Formuláře a zpětná vazba** - střední priorita (feedback, diagnostika, profil)
4. **Administrativa** - skryto ve výchozím stavu
5. **Tréninky a cvičení** - přesunuto úplně dolů, ve výchozím stavu sbaleno

### 2. Odstranění notifikací o neaktivitě ve stravě
- Odfiltrovat typ `nutrition_inactive` z notifikačního centra
- Zůstane pouze na dashboardu jako Smart Alert (pokud trenér chce)
- Edge function `check-nutrition-inactivity` zůstane funkční pro ty, kdo to chtějí

### 3. Akční navigace při kliknutí

| Typ notifikace | Aktuální chování | Nové chování |
|----------------|------------------|--------------|
| `nutrition_entry_added` | Profil klienta | **Nutriční deník** (`/nutrition/client/{clientId}`) |
| `feedback_received` | Dialog feedbacku (funguje) | Zůstává (už funguje správně) |
| `feedback_red_flag` | Dialog feedbacku | Zůstává |
| `client_profile_updated` | Profil klienta | **Profil s tab=profile** (`/clients/{id}?tab=profile`) |
| `pr_achieved` / `pr_created` | Kliknutí nefunguje | Profil klienta s tab trainings |

### 4. Vylepšení zpráv notifikací
- **Feedback**: Jednotná zpráva "{Jméno} vyplnil(a) zpětnou vazbu" s tlačítkem na otevření
- **Profil**: Zpráva "{Jméno} upravil(a): {seznam polí}" s odkazem na profil
- **Strava**: "{Jméno} dnes zapisuje stravu" s odkazem na deník

### 5. Vylepšení notifikací při vytváření (backend)
Přidat `entity_type` a `entity_id` do notifikací pro správnou navigaci:
- Feedback: `entity_type: 'training'`, `entity_id: training_session_id`
- Profil: `entity_type: 'client'`, `entity_id: client_id`
- Strava: již správně nastaveno

---

## Technické úpravy

### Soubor 1: `src/components/notifications/NotificationCenter.tsx`

**Změny:**
1. Upravit pořadí renderování kategorií: Nutrition → Forms → Training (místo Training → Nutrition → Forms)
2. Ve výchozím stavu sbalit sekci "Tréninky"
3. Rozšířit `handleNotificationClick` o navigaci pro:
   - `nutrition_entry_added` → `/nutrition/client/{clientId}`
   - `client_profile_updated` → `/clients/{clientId}?tab=profile`

### Soubor 2: `src/hooks/useAggregatedNotifications.ts`

**Změny:**
1. Přidat `nutrition_inactive` do seznamu filtrovaných typů (vedle `incomplete_training`)
2. Případně upravit kategorizaci `pr_*` typů do samostatné "low-priority" skupiny

### Soubor 3: `supabase/functions/submit-feedback/index.ts`

**Změny:**
1. Přidat `entity_type: 'training'` a `entity_id: request.training_session_id` do insertu notifikace
2. Tím se zajistí správná navigace při kliknutí na notifikaci

### Soubor 4: `src/hooks/useClientPortalProfile.ts`

**Změny:**
1. Přidat `entity_type: 'client'` a `entity_id: clientAccount.client_id` do insertu notifikace
2. Zajistí navigaci na profil klienta

### Soubor 5: `src/components/notifications/InlineNotificationSettings.tsx`

**Změny:**
1. Přidat toggle pro skrytí "Tréninky a cvičení" (PRka, milestony)
2. Uložit preference do `notification_preferences.trainingNotifications`

---

## Výsledné chování

### Po implementaci:
1. **Otevření notifikačního centra** → Uvidíš nejdřív Výživu, pak Formuláře, pak až dole Tréninky
2. **Kliknutí na "Klient zapisuje stravu"** → Otevře se nutriční deník toho klienta
3. **Kliknutí na "Klient vyplnil zpětnou vazbu"** → Otevře se dialog s feedbackem
4. **Kliknutí na "Klient aktualizoval profil"** → Otevře se profil klienta s detaily změn
5. **Žádné notifikace o neaktivitě** → Ty zůstanou jen na dashboardu jako Smart Alerts

### Možnost vypnutí v nastavení:
- Toggle "Zobrazovat PR a milestony" (výchozí: vypnuto)
- Toggle "Upozornění na neaktivitu ve stravě" (výchozí: vypnuto v notifikacích)

---

## Rizika a mitigace

| Riziko | Mitigace |
|--------|----------|
| Starší notifikace bez `entity_id` nebudou správně navigovat | Fallback na `/clients/{client_id}` |
| Agregované notifikace (3+) nemají jasnou akci | Při rozkliknutí agregace uvidíš jednotlivé položky s akcemi |

## Časový odhad
- Backend změny (edge function): 10 minut
- Frontend změny (NotificationCenter + hooks): 30 minut
- Testování: 15 minut
