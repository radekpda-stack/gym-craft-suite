
# Revize sekce Strava (Nutriční deník) - Audit a návrh vylepšení

## Aktuální stav systému

Nutriční modul obsahuje 3 hlavní pohledy:
- **NutritionPage** (`/nutrition`) - Dashboard přehled všech klientů
- **NutritionClientDetail** (`/nutrition/client/:id`) - Detail nutričního deníku klienta (7/10 dní)
- **NutritionCampaignDetail** (`/nutrition/campaigns/:id`) - Legacy kampaňový pohled

**Aktuální data v databázi:**
- 12 nutričních session (11 aktivních, 1 dokončená)
- 10 klientů s nutrition logem
- 20 jídel, 10 nápojů, 9 káv

---

## Nalezené problémy

### 1. Duplicitní pohledy na data klienta

| Komponenta | Přístup | Problém |
|------------|---------|---------|
| `NutritionClientDetail` | `/nutrition/client/:id` | Zobrazuje 7/10 dní |
| `NutritionCampaignDetail` | `/nutrition/campaigns/:id` | Zobrazuje kampaň s analýzou |
| `ClientNutritionTab` | V kartě klienta | Vytváří 7denní logy s vlastním detailem |
| `NutritionLogDetail` | V `ClientNutritionTab` | Další detail view |

**Problém**: 4 různé pohledy zobrazují podobná data s různým UI a funkcionalitou. Trenér neví, který pohled použít.

### 2. Nekonzistentní terminologie

- "Kampaň" vs "Session" vs "Log" vs "Deník" - používáno zaměnitelně
- `NutritionCampaignDetail` používá "kampaň", ale DB tabulka je `nutrition_log_sessions`
- UI na některých místech říká "7denní log", jinde "Deník návyků"

### 3. Chybějící agregované metriky na hlavním přehledu

`NutritionPage` zobrazuje:
- Aktivně zapisuje (počet klientů)
- Záznamů tento týden
- Dnes zapsáno
- Průměr/klient

**Chybí důležité metriky:**
- Průměrná kvalita stravy (good/normal/poor distribuce)
- Dny bez záznamu (varování)
- Trend vs minulý týden
- Klienti s pozdním kofeinem (využití CaffeineWindowWidget dat)

### 4. NutritionCampaignDetail obsahuje hodnotící prvky

Komponenta obsahuje "insights" s hodnotícími texty jako "Kvalitní vedení záznamů" (zelená), "Velmi slabé vedení" (červená), což porušuje filozofii `analytics-philosophy-comparative-non-evaluative`.

### 5. Nepoužité nastavení

`NutritionSettingsTab` umožňuje konfigurovat:
- Kategorie jídel, nápojů, kávy
- Úvodní/závěrečné zprávy

**Problém**: Tyto hodnoty se nikde nepoužívají - formulář pro klienty používá hardcoded konstanty z `constants.ts`.

### 6. Chybí hromadné akce

Na `NutritionPage` chybí:
- Hromadné ukončení neaktivních sessions
- Export dat více klientů
- Filtrování podle stavu (prázdné logy, aktivní, dokončené)

### 7. Klientský formulář vs trenérský pohled

Trenér vidí pouze výsledky, ale nemá možnost:
- Přidat záznam za klienta přímo
- Upravit čas konzumace
- Označit záznam jako "kontrolováno"

---

## Navrhované změny

### Fáze 1: Konsolidace pohledů

**Zachovat pouze 2 pohledy:**
1. `NutritionPage` - přehled všech klientů
2. `NutritionClientDetail` - detail jednoho klienta (sloučit s funkcemi z NutritionCampaignDetail)

**Akce:**
- Odebrat route `/nutrition/campaigns/:id` (legacy)
- Přesunout analýzu z `NutritionCampaignDetail` do `NutritionClientDetail`
- Sjednotit `ClientNutritionTab` aby používal stejný detail jako hlavní modul

### Fáze 2: Sjednocení terminologie

Používat konzistentně:
- **"Deník"** místo "kampaň", "log", "session"
- **"Záznam"** místo "entry"
- **"Období"** místo "7denní log"

Upravit názvy v UI:
- "Vytvořit nový log" → "Zahájit deník"
- "Session" badge → "Aktivní období"

### Fáze 3: Rozšíření přehledu (NutritionPage)

Přidat nové metriky do dashboard:
```text
[Existující]
- Aktivně zapisuje
- Záznamů tento týden
- Dnes zapsáno
- Průměr/klient

[Nové - pod existující]
- Kvalita stravy (koláč: good/normal/poor %)
- Klienti s varováním (pozdní kofein, prázdné dny)
```

Přidat filtry:
- "Vyžaduje pozornost" (prázdné dny > 2, pozdní kofein)
- "Aktivní" / "Dokončeno" / "Vše"

### Fáze 4: Odstranění hodnotících prvků

V `NutritionCampaignDetail` (resp. sloučeném detailu):
- Odstranit barevné hodnocení (zelená/červená)
- Odstranit texty jako "Kvalitní vedení", "Slabé vedení"
- Nahradit neutrálními fakty: "Záznamy: 6/7 dní", "Kofein po 18:00: 2× za týden"

### Fáze 5: Propojení nastavení s formulářem

Upravit `FoodLogForm` a `constants.ts`:
- Načítat kategorie z `app_settings.nutrition_settings`
- Fallback na výchozí hodnoty pokud není nastaveno
- Zobrazovat vlastní texty (intro/thank you) na veřejném formuláři

### Fáze 6: Přidání trenérských akcí

Do `NutritionClientDetail` přidat:
- Tlačítko "Přidat záznam za klienta" (otevře FoodLogForm s flag `addedByTrainer`)
- Možnost označit den jako "Zkontrolováno" (nový sloupec v day_notes)
- Hromadný export do PDF s vybranými dny

---

## Technické kroky implementace

### Krok 1: Sloučení pohledů
```text
- Přesunout logiku insights z NutritionCampaignDetail do NutritionClientDetail
- Odstranit hodnotící prvky, ponechat pouze fakta
- Smazat route /nutrition/campaigns/:id z App.tsx
- Upravit ClientNutritionTab aby odkazoval na /nutrition/client/:id
```

### Krok 2: Rozšíření NutritionPage
```text
- Přidat useQuery pro agregované metriky kvality
- Přidat filter dropdown (Vše/Aktivní/Varování)
- Přidat kartu "Vyžaduje pozornost" se seznamem klientů
```

### Krok 3: Propojení nastavení
```text
- Upravit constants.ts aby exportoval funkci getCategories(settings)
- V FoodLogForm načítat app_settings a používat custom kategorie
- V PublicNutritionLog zobrazovat custom intro/thank you texty
```

### Krok 4: Trenérské akce
```text
- Přidat tlačítko "+ Záznam" do NutritionClientDetail header
- Vytvořit TrainerAddEntryDialog s FoodLogForm
- Přidat checkbox "Zkontrolováno" k day notes
- Rozšířit PDF export o výběr období
```

---

## Výsledek po úpravách

| Oblast | Před | Po |
|--------|------|-----|
| Počet pohledů | 4 | 2 |
| Terminologie | Nekonzistentní | "Deník", "Záznam", "Období" |
| Dashboard metriky | 4 základní | 6 + filtry |
| Hodnotící prvky | Ano (zelená/červená) | Ne (pouze fakta) |
| Nastavení kategorií | Nepoužíváno | Propojeno s formulářem |
| Trenérské akce | Pouze prohlížení | Přidávání, kontrola, export |

---

## Prioritizace

**Vysoká priorita (okamžitě):**
1. Odstranění hodnotících prvků (porušuje design filozofii)
2. Sjednocení terminologie v UI

**Střední priorita:**
3. Konsolidace pohledů (sloučení do 2)
4. Rozšíření NutritionPage o metriky a filtry

**Nižší priorita:**
5. Propojení nastavení s formulářem
6. Trenérské akce (přidávání za klienta)
