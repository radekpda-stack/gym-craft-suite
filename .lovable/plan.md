
# Audit klientského portálu -- Chyby a vylepšení

## Nalezené chyby

### 1. KRITICKÁ: `training_participants.payment_amount` neexistuje
Databázové logy ukazují opakovanou chybu: *"column training_participants.payment_amount does not exist"*. Chyba je v souboru `src/hooks/usePrefetchTrainingDetail.ts` (řádek 81), kde se dotazuje na sloupec `payment_amount`, který v tabulce neexistuje. Tato chyba se opakuje při každém otevření detailu tréninku.

**Oprava:** Odstranit `payment_amount` z SELECT dotazu v prefetch hooku.

---

## Návrhy vylepšení pro komfort klientů

### 2. Chybí "Pull-to-refresh" / tlačítko pro obnovení dat
Na žádné stránce portálu není možnost ručně obnovit data. Klient musí celou stránku refreshovat v prohlížeči, pokud chce vidět aktuální stav (např. po tom, co trenér něco změnil).

**Řešení:** Přidat na klíčové stránky (Přehled, Deník, Pokrok) tlačítko pro refresh nebo implementovat pull-to-refresh gesto na mobilu.

### 3. Chybí zobrazení trenérova jména a kontaktu
Klient nikde na portálu nevidí jméno svého trenéra ani kontaktní údaje. Pokud potřebuje kontaktovat trenéra mimo chat, nemá jak.

**Řešení:** Do záhlaví nebo profilu přidat kartu "Můj trenér" se jménem a volitelně kontaktem.

### 4. Stránka Pokrok je příliš dlouhá a nestrukturovaná
Stránka `ClientPortalProgress` zobrazuje vše najednou (PRs, asymetrie, benchmarky, grafy váhy, tuku, cviků, kardia) bez kategorizace. Na mobilu je to velmi dlouhý scroll.

**Řešení:** Rozdělit do záložek nebo sbalitelných sekcí (Síla / Tělo / Kardio), aby klient rychle našel, co ho zajímá.

### 5. Chat nemá notifikaci o nových zprávách
Chat funguje, ale klient nemá žádné upozornění na novou zprávu od trenéra kromě obecného notifikačního centra. Na mobilním bottom baru u ikony Chatu chybí badge s počtem nepřečtených zpráv.

**Řešení:** Přidat badge s počtem nepřečtených zpráv na ikonu Chatu v navigaci.

### 6. Nutriční deník -- chybí denní souhrn makroživin
Klient vidí jednotlivé záznamy jídel, ale chybí jednoduchý přehledový panel s celkovými kaloriemi a makry za den (pokud je AI enrichment k dispozici).

**Řešení:** Na vrch stránky Nutričního deníku přidat kompaktní kartu s denním shrnutím: kalorie, bílkoviny, sacharidy, tuky.

### 7. Docházka -- chybí vizualizace (kalendářní heatmapa)
Stránka Docházka zobrazuje seznam tréninků, ale chybí vizuální přehled (heatmapa nebo kalendář), který by klientovi ukázal vzorce docházky.

**Řešení:** Přidat kompaktní kalendářní heatmapu (styl GitHub contributions) ukazující intenzitu tréninků po dnech.

### 8. Domácí tréninky -- chybí přímý odkaz z dashboardu
Sekce "Domácí tréninky" (homework) je schovaná a není dostupná přes hlavní navigaci ani z dashboardu. Klient ji těžko najde.

**Řešení:** Pokud má klient čekající domácí tréninky, zobrazit je jako kartu na dashboardu a přidat odkaz do navigace.

---

## Prioritizace

| Priorita | Položka | Typ | Náročnost |
|----------|---------|-----|-----------|
| 1 | payment_amount chyba | Bug fix | Nízká |
| 2 | Badge nepřečtených zpráv v navigaci | Vylepšení | Nízká |
| 3 | Karta "Můj trenér" | Vylepšení | Nízká |
| 4 | Domácí tréninky na dashboardu | Vylepšení | Nízká |
| 5 | Denní souhrn makroživin v nutričním deníku | Vylepšení | Střední |
| 6 | Kalendářní heatmapa docházky | Vylepšení | Střední |
| 7 | Strukturované záložky v Pokroku | Vylepšení | Střední |
| 8 | Pull-to-refresh / tlačítko obnovení | Vylepšení | Nízká |

---

## Technický plán implementace

### Krok 1: Oprava payment_amount (bug)
Soubor: `src/hooks/usePrefetchTrainingDetail.ts`
- Odstranit `payment_amount` ze SELECT dotazu na řádku 81

### Krok 2: Badge nepřečtených zpráv
Soubor: `src/components/client-portal/ClientPortalLayout.tsx`
- Vytvořit hook `useUnreadChatCount` (dotaz na `chat_messages` kde `is_read = false` a `sender_type = 'trainer'`)
- Na mobilní i desktopové navigaci přidat číselný badge na ikonu Chatu

### Krok 3: Karta "Můj trenér"
Soubor: nový `src/components/client-portal/dashboard/MyTrainerCard.tsx`
- Načíst jméno trenéra z `clientAccount.trainer_id` -> tabulka profilu
- Zobrazit na dashboardu pod Quick Actions s možností přejít na chat

### Krok 4: Domácí tréninky na dashboardu
Soubor: nový `src/components/client-portal/dashboard/PendingHomeworkWidget.tsx`
- Použít existující `useClientAssignedWorkouts` hook
- Zobrazit počet čekajících úkolů s odkazem na `/zona/homework`
- Přidat do `ClientPortalOverview.tsx`

### Krok 5-8: Další vylepšení
Implementace denního souhrnu, heatmapy, strukturovaných záložek a refresh tlačítka podle prioritizace.

---

Doporučuji začít s kroky 1-4 (nízká náročnost, vysoký dopad na komfort klientů).
