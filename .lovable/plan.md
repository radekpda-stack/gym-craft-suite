

# Audit karty tréninku — návrh úprav

## Současný stav

Detail tréninku (`TrainingDetail.tsx`, 627 řádků) je rozložen do těchto sekcí:

```text
┌─ Breadcrumbs ─────────────────────────┐
│ HeroHeader (avatar, jméno, čas, stav) │
│ [Edit mode form — pokud aktivní]      │
│ PreviousTrainingSummary               │
│ CompactTagGridSelector (Klasifikace)  │
│ WorkoutExerciseManager (cviky)        │
│ TrainingPrepSection (sbalená)         │
│ TrainingParticipantsManager           │
│ ParticipantsPRsSection                │
│ TrainingQuickSale                     │
│ PreSessionCheckinCard                 │
│ "Zaměření z minula" banner            │
│ QuickActionsSection (4 tlačítka)      │
│ ──── fixní spodní lišta ────          │
│ TrainingStatusBar (Tagy/RPE/Cena)     │
└───────────────────────────────────────┘
```

## Nalezené problémy

### 1. Duplicitní "Dokončit" CTA
`QuickActionsSection` obsahuje velké "DOKONČIT TRÉNINK" tlačítko **a zároveň** fixní `TrainingStatusBar` dole má vlastní "Dokončit trénink". Trenér vidí dvě tlačítka pro stejnou akci — matoucí a zabírá místo.

**Návrh:** Odstranit `QuickActionsSection` jako samostatnou sekci. Přesunout sekundární akce (Zrušit strhnout / Zrušit bez kreditu / Přesunout) do dropdown menu v `TrainingStatusBar` nebo do `HeroHeader` menu. Primární CTA zůstane jen ve fixním baru dole.

### 2. Příliš mnoho sekcí pod sebou — kognitivní přetížení
Pro naplánovaný trénink je na stránce **9+ vizuálních bloků**. Trenér v posilovně potřebuje rychle vidět: kdo, kdy, co minule, tagy, cviky — zbytek je noise.

**Návrh:** Sloučit `PreSessionCheckinCard` + "Zaměření z minula" banner do `PreviousTrainingSummary` (jedna karta = vše z minula). Odstranit `ParticipantsPRsSection` jako separátní blok — PR data zobrazit inline v `WorkoutExerciseManager` u každého cviku.

### 3. `TrainingPrepSection` je ve výchozím stavu sbalená
Sekce s upozorněními na bolest a omezení klienta je sbalená — trenér ji snadno přehlédne. Pokud obsahuje health alert, měla by být **automaticky rozbalená**.

**Návrh:** `TrainingPrepSection` otevřít automaticky pokud `hasAlerts === true` (zdravotní omezení nebo bolest).

### 4. Status badge zabírá celý řádek zbytečně
V `HeroHeader` je status badge ("Naplánováno") na vlastním řádku, full-width, s `py-2.5`. Pro jednoduché slovo je to moc prostoru.

**Návrh:** Přesunout status badge inline vedle jména klienta (jako pill/chip), ušetří vertikální prostor.

### 5. `TrainingStatusBar` — tlačítko "Zahájit" se nikdy nezobrazí
Prop `onStart` se nikdy nepředává z `TrainingDetail.tsx`, takže "Zahájit" tlačítko v baru neexistuje. Buď přidat logiku pro "scheduled → in_progress" přechod, nebo odstranit mrtvý kód.

**Návrh:** Přidat `onStart` handler — kliknutí změní status na `in_progress` (vizuální indikátor pro trenéra že lekce běží).

### 6. `TrainingQuickSale` — zbytečná sekce pro 80% tréninků
Většina tréninků nemá prodej produktu. Sekce zabírá místo i když je prázdná.

**Návrh:** Zobrazit jen jako kompaktní "+Produkt" tlačítko v baru nebo v menu, ne jako separátní sekci.

### 7. Edit mode form — plnohodnotný formulář pro drobnou změnu
Kliknutí na "Upravit" v menu otevře inline formulář se 3 selecty. Většinou trenér mění jen čas nebo trvání. Formulář zabere celou šířku a posune obsah dolů.

**Návrh:** Použít Sheet (bottom sheet) místo inline formuláře — nezasahuje do hlavního obsahu stránky.

---

## Plán implementace

### Fáze 1: Zjednodušení akcí (nejvyšší dopad)
1. **Sloučit akce do StatusBar** — přidat Cancel/Reschedule do dropdown v `TrainingStatusBar`, přidat `onStart` handler pro "Zahájit". Odstranit `QuickActionsSection` z `TrainingDetail.tsx`.
2. **Status badge inline** — přesunout status z full-width řádku do řádku vedle jména v `TrainingHeroHeader`.

### Fáze 2: Redukce sekcí
3. **Auto-open PrepSection** — pokud `hasAlerts`, nastavit `isOpen: true` jako výchozí.
4. **Sloučit "Zaměření z minula" do PreviousTrainingSummary** — přidat `nextSessionFocus` prop, zobrazit jako highlight řádek uvnitř karty minulého tréninku.
5. **QuickSale jako tlačítko** — místo separátní sekce zobrazit kompaktní "Přidat produkt" tlačítko v exercise manageru nebo hero headeru.

### Fáze 3: Edit mode
6. **Sheet místo inline formu** — přesunout edit formulář do bottom Sheet, otevíratelný z menu.

### Soubory k úpravě
- `src/components/trainings/TrainingStatusBar.tsx` — přidat Cancel/Reschedule dropdown, onStart
- `src/components/trainings/TrainingHeroHeader.tsx` — inline status badge
- `src/components/trainings/TrainingPrepSection.tsx` — auto-open při alerts
- `src/components/trainings/PreviousTrainingSummary.tsx` — přidat next_session_focus
- `src/components/trainings/TrainingDetailView.tsx` — Sheet pro edit, odstranit QuickSale sekci
- `src/pages/TrainingDetail.tsx` — odstranit QuickActionsSection, propojit nové handlery

### Očekávaný dopad
- Méně scrollování — z 9+ bloků na 5-6
- Jasná vizuální hierarchie — jedna CTA dole, žádná duplikace
- Zdravotní upozornění nelze přehlédnout
- Trenér se dostane k cvikům rychleji

