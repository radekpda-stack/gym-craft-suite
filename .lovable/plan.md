
# Návrhy vylepšení aplikace JustMove Asistent

Po důkladné analýze kódu navrhuji následující vylepšení rozdělená do kategorií podle priority a složitosti.

---

## 1. UX/Flow vylepšení (Quick wins)

### 1.1 Rychlejší dokončení tréninku z rozvrhu
**Aktuální stav**: Po kliknutí na trénink v rozvrhu je nutné otevřít kartu tréninku a pak teprve kliknout "Dokončit".

**Návrh**: Přidat swipe gesture na kartě tréninku v rozvrhu:
- Swipe doleva = Rychlé dokončení (otevře CompletTrainingDialog)
- Swipe doprava = Zrušit/Přesunout

**Soubory**: `AgendaItem.tsx`

---

### 1.2 Bulk akce pro neuhrazené tréninky
**Aktuální stav**: V novém `UnpaidTrainingsDialog` lze uhradit jednotlivě.

**Návrh**: Přidat tlačítko "Uhradit vše" pro hromadnou úhradu všech neuhrazených tréninků najednou.

**Soubory**: `UnpaidTrainingsDialog.tsx`

---

### 1.3 Klávesové zkratky pro power-users
**Aktuální stav**: Aplikace má `Cmd+K` pro vyhledávání cviků.

**Návrh**: Rozšířit na globální příkazovou paletu:
- `Cmd+K` = Hledej klienta/cvik/trénink
- `Cmd+N` = Nový trénink
- `Cmd+Shift+N` = Nový klient
- `Cmd+D` = Dashboard

**Soubory**: Nová komponenta `GlobalCommandPalette.tsx`

---

## 2. Dashboard vylepšení

### 2.1 Personalizované ranní briefing
**Aktuální stav**: Dashboard zobrazuje statické karty.

**Návrh**: Ráno (6-10h) zobrazit speciální "Dnešní briefing" kartu:
- Kolik tréninků je dnes
- Očekávaný příjem
- Klienti s nízkým kreditem, kteří dnes trénují
- Připomínky a follow-upy

**Soubory**: Nová komponenta `MorningBriefingCard.tsx`

---

### 2.2 Widget pro rychlé poznámky
**Aktuální stav**: Poznámky jsou na samostatné stránce `/notes`.

**Návrh**: Přidat na dashboard rychlý vstup pro poznámku (jako "Quick note" input) - napíšete, odešlete, hotovo. Bez nutnosti navigovat jinam.

**Soubory**: Rozšíření `Index.tsx` + nová komponenta `QuickNoteWidget.tsx`

---

## 3. Klientský portál

### 3.1 Streak/série tréninků
**Aktuální stav**: Portál zobrazuje počet tréninků, ale nesleduje kontinuitu.

**Návrh**: Přidat "Streak" mechaniku:
- "5 týdnů v řadě bez vynechaného tréninku!"
- Vizuální flame/fire ikona
- Notifikace při hrozbě přerušení série

**Soubory**: Nová komponenta `ClientPortalStreak.tsx`, nový hook `useClientStreak.ts`

---

### 3.2 Cíle a progress tracking
**Aktuální stav**: Portál ukazuje statistiky, ale nemá jasné cíle.

**Návrh**: Umožnit trenérovi nastavit měsíční cíle pro klienta:
- "4 tréninky týdně"
- "Zhubnout 2 kg"
- "Bench press 100 kg"

Portál pak zobrazuje progress bar směrem k cíli.

**Soubory**: Nový hook `useClientGoals.ts`, komponenta `GoalProgressCard.tsx`

---

## 4. Finance a reporting

### 4.1 Export měsíčního přehledu
**Aktuální stav**: Statistiky jsou dostupné v aplikaci, ale nelze je exportovat.

**Návrh**: Přidat tlačítko "Exportovat měsíc" na stránce Statistiky:
- PDF report s přehledem tréninků, příjmů, klientů
- Možnost poslat emailem nebo stáhnout

**Soubory**: Rozšíření `Statistics.tsx`, nová utilita `generateMonthlyReport.ts`

---

### 4.2 Predikce příjmu
**Aktuální stav**: `CashflowForecastCard` existuje, ale mohlo by být chytřejší.

**Návrh**: Vylepšit predikci o:
- Opakující se tréninky v kalendáři
- Historický trend (pokud klient chodí pravidelně, předpokládat pokračování)
- Zobrazit "optimistický" vs "konzervativní" scénář

**Soubory**: Rozšíření `useCashflowForecast.ts`

---

## 5. Kalendář a rozvrh

### 5.1 Drag & Drop přesun tréninku
**Aktuální stav**: Pro přesun tréninku je nutné otevřít detail a upravit datum.

**Návrh**: V týdenním pohledu umožnit drag & drop přesun karty tréninku mezi dny.

**Soubory**: Rozšíření `SchedulePage.tsx` s využitím již nainstalovaného `@dnd-kit`

---

### 5.2 Šablony rozvrhu
**Aktuální stav**: Trenér musí vytvářet tréninky manuálně.

**Návrh**: Přidat "Týdenní šablonu":
- Definovat vzor (Pondělí 9:00 Klient A, Středa 14:00 Klient B...)
- Jedním kliknutím aplikovat šablonu na další týden

**Soubory**: Nový hook `useScheduleTemplates.ts`, komponenta `ScheduleTemplateDialog.tsx`

---

## 6. Tréninkový režim

### 6.1 Offline sync indikátor
**Aktuální stav**: Tréninkový režim má prefetch, ale není jasné, co je offline dostupné.

**Návrh**: Přidat vizuální indikátor:
- Zelená tečka = Data jsou offline ready
- Oranžová = Částečně načteno
- Šedá = Online only

**Soubory**: Rozšíření `TrainingModeLayout.tsx`

---

### 6.2 Rychlý zápis setu
**Aktuální stav**: Zápis probíhá přes formulář.

**Návrh**: Přidat "Quick input" režim:
- Numerická klávesnice pro váhu
- Swipe pro počet opakování
- Jeden tap = uložit a další set

**Soubory**: Nová komponenta `QuickSetInput.tsx`

---

## 7. Technické optimalizace

### 7.1 Virtualizace dlouhých seznamů
**Aktuální stav**: Seznam klientů renderuje všechny najednou.

**Návrh**: Pro seznamy delší než 50 položek použít virtualizaci (`@tanstack/react-virtual`).

**Soubory**: `Clients.tsx`, `ExerciseListView.tsx`

---

### 7.2 Prefetch nejčastějších stránek
**Aktuální stav**: Data se načítají až po navigaci.

**Návrh**: Na dashboardu prefetchovat data pro:
- Rozvrh (dnešní + zítřejší tréninky)
- Nejčastější klienti (top 5)

**Soubory**: Rozšíření `Index.tsx` s `queryClient.prefetchQuery`

---

## Prioritizace implementace

| Priorita | Funkce | Složitost | Dopad |
|----------|--------|-----------|-------|
| 1 | Bulk uhrazení tréninků | Nízká | Vysoký |
| 2 | Ranní briefing | Střední | Vysoký |
| 3 | Streak v portálu | Střední | Střední |
| 4 | Klávesové zkratky | Střední | Střední |
| 5 | Drag & Drop rozvrh | Vysoká | Vysoký |
| 6 | Export měsíčního reportu | Střední | Střední |
| 7 | Quick set input | Vysoká | Vysoký |

---

## Doporučený další krok

Začít s **Bulk uhrazením tréninků** - je to rychlá úprava existujícího `UnpaidTrainingsDialog.tsx`, která výrazně zrychlí denní workflow.
