

# Plán: Přehlednější karta tréninku (Cockpit)

## Identifikované problémy

1. **Chybí poznámky u naplánovaných tréninků** — `notes` pole se zobrazuje pouze u dokončených tréninků v `TrainingCloseSection`. U scheduled/in_progress tréninků trenér nemá kam psát poznámky pro příští trénink.

2. **PreSessionCheckinCard je vždy otevřený** — velká karta s emoji a pain areas zabírá hodně místa. Po vyplnění se sbalí, ale před vyplněním je plně rozbalená a tlačí důležitější obsah (cviky) dolů.

3. **Příliš mnoho sekcí pod sebou** — pořadí sekcí je: Hero → PreviousTraining → Tags/Klasifikace → Cviky → Příprava → Účastníci → PRs → Rychlý prodej → CheckIn → Focus reminder. Trenér musí scrollovat přes 8+ karet, než se dostane ke cvikům, což je hlavní pracovní plocha.

## Navrhované změny

### 1. Přidat inline poznámky pro scheduled/in_progress tréninky
- V `TrainingDetailView.tsx` přidat `InlineTextarea` pod sekci Cviky (nebo nad Přípavu) s auto-save
- Pole `notes` se bude ukládat přes existující `onFieldUpdate('notes', value)`
- Viditelné vždy (ne za Switch jako u completed)

### 2. PreSessionCheckinCard — defaultně sbalený (Collapsible)
- Obalit `PreSessionCheckinCard` v `TrainingDetail.tsx` do `Collapsible`
- Defaultně zavřený, zobrazuje jen kompaktní řádek "Jak se cítí [jméno]? ▼"
- Pokud už je vyplněný, zobrazit kompaktní shrnutí (už existuje — `saved` stav)
- Tím se uvolní prostor pro cviky

### 3. Přeuspořádat sekce — cviky výš
Aktuální pořadí v `TrainingDetailView.tsx`:
```
Hero → PreviousTraining → Tags → Cviky → Příprava → Účastníci → PRs → Prodej
```
Nové pořadí:
```
Hero → Tags → Cviky → Poznámky (NOVÉ) → PreviousTraining → Příprava → Účastníci → PRs → Prodej
```
Cviky se posunou hned za tagy (o 1 pozici výš). PreviousTraining se přesune pod cviky — trenér se na něj podívá jednou na začátku a pak pracuje s cviky.

### 4. Kompaktnější PreviousTrainingSummary
- Přidat `Collapsible` wrapper — defaultně zobrazit jen header + quick stats (typ, RPE, body parts)
- Cviky a poznámky schovat do rozbalitelné části
- Ušetří ~50% výšky karty

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `TrainingDetailView.tsx` | Přeuspořádat sekce (cviky výš, previous training níž); přidat InlineTextarea pro poznámky u scheduled/in_progress |
| `TrainingDetail.tsx` (page) | Obalit PreSessionCheckinCard do Collapsible |
| `PreviousTrainingSummary.tsx` | Přidat Collapsible — cviky a poznámky defaultně sbalené |

Žádné DB změny — čistě UI refactor.

