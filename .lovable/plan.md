

# Vylepšení veřejné vizitky trenéra

## Co chybí / co vylepšit

Po revizi aktuální implementace identifikuji tyto nedostatky:

### 1. Chybějící údaje z profilu
- **Certifikace** (`certifications`) — profil je má, ale vizitka je nezobrazuje
- **Roky zkušeností** (`experience_years`) — data se načítají z edge funkce, ale nezobrazují se
- **Sociální sítě** (`social_links`) — profil je má, ale vizitka je ignoruje

### 2. Chybějící QR kód pro snadné sdílení
- Balíček `qrcode.react` je nainstalovaný, ale vizitka ho nepoužívá
- Přidat malý QR kód v patičce nebo hero sekci pro offline sdílení (např. vytisknout, ukázat na mobilu)

### 3. Edge funkce neposílá všechna data
- `certifications`, `social_links` a `experience_years` se buď nenačítají, nebo neposílají v odpovědi
- `experience_years` se načítá ale nepoužívá v UI

### 4. Vizuální vylepšení
- Přidat ikony k career stats (Celkem tréninků, Celkem klientů, Hodin)
- Přidat gradient border/glow efekt na hero avatar
- Přidat certifikace jako badge pills vedle specializací
- Přidat "kontakt" sekci se sociálními odkazy (Instagram, web apod.)

### 5. Meta tagy pro sdílení
- Stránka nemá `<title>` ani Open Graph meta tagy — při sdílení na sociálních sítích nebude mít preview

---

## Plán implementace

### A. Edge funkce — rozšířit data
Přidat do `select` a response: `certifications`, `social_links`. Pole `experience_years` už se načítá.

### B. TrainerStatsShowcase.tsx — rozšířit UI
1. **Hero sekce**: zobrazit `experienceYears` ("X let zkušeností"), certifikace jako badge pills, sociální odkazy jako ikony
2. **QR kód**: malý QR kód v patičce s odkazem na vizitku (použít `qrcode.react`)
3. **Career stats**: přidat ikony (Users, Clock, Calendar) do karet
4. **Meta tagy**: nastavit `document.title` v `useEffect`

### C. Rozsah změn
| Soubor | Změna |
|--------|-------|
| `supabase/functions/public-trainer-stats/index.ts` | Přidat `certifications`, `social_links` do select a response |
| `src/components/public-stats/TrainerStatsShowcase.tsx` | Rozšířit hero o certifikace, roky zkušeností, sociální sítě, QR kód, ikony u career stats, meta tagy |
| `src/pages/PublicTrainerStats.tsx` | Předat slug do showcase pro QR generování |

