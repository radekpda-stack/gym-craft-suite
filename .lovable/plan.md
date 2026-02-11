

# Vylepšení pro lepší práci s klienty a sběr dat

Po důkladné analýze aplikace navrhuji 5 konkrétních vylepšení, která zlepší sběr dat a pomohou s progresem klientů.

---

## 1. Tréninkový deník trenéra - poznámky k tréninku

**Problem:** Tabulka `training_sessions` má sloupec `session_notes`, ale v UI chybí snadný způsob, jak při dokončení tréninku rychle zapsat poznámky (co fungovalo, co ne, na co se zaměřit příště).

**Řešení:** Při dokončení tréninku (CompletionDialog) přidat textové pole "Poznámky k tréninku" a pole "Zaměření příštího tréninku". Tyto poznámky se pak zobrazí:
- Na kartě klienta v historii tréninků
- Při plánování dalšího tréninku jako připomínka

**Přínos:** Trenér má kontext z minulého tréninku vždy po ruce, nemusí si pamatovat.

---

## 2. Quick Check-in před tréninkem

**Problém:** Readiness score (`useClientReadiness`) se počítá z feedbacku PO tréninku. Ale trenér potřebuje vědět, jak se klient cítí PŘED tréninkem, aby mohl upravit plán.

**Řešení:** Nová mini-karta "Jak se dnes cítíš?" zobrazená v rozvrhu/agendě před tréninkem. Trenér ťukne na klienta a rychle zaznamená:
- Energetická úroveň (1-5 smajlíky)
- Bolest/omezení (volitelné - výběr oblasti)
- Kvalita spánku minulou noc (1-5)

Data se uloží do nové tabulky `pre_session_checkins` a propojí s readiness score.

**Přínos:** Trenér upraví intenzitu tréninku v reálném čase na základě aktuálního stavu klienta.

---

## 3. Automatické sledování progresních cílů

**Problém:** Klienti mají `training_goals` (pole cílů), ale nikde se nesleduje progress směrem k těmto cílům. Cíle jsou jen statický text.

**Řešení:** Rozšířit systém cílů o měřitelné milníky:
- Ke každému cíli přiřadit metriku (např. "zhubnutí" → váha, "síla" → 1RM bench)
- Automaticky sledovat změny z existujících dat (měření, exercise entries)
- Na kartě klienta zobrazit progress bar k cíli

Nová tabulka `client_goals` s polemi: `client_id`, `goal_text`, `metric_type`, `start_value`, `target_value`, `current_value`, `deadline`, `status`.

**Přínos:** Klient i trenér vidí měřitelný pokrok, ne jen subjektivní pocit.

---

## 4. Tréninkové šablony na míru s auto-doporučením

**Problém:** Periodizace (`useClientPeriodization`) detekuje fázi tréninku, ale nepropojuje se s plánováním. Trenér musí sám rozhodovat, jaký trénink dát.

**Řešení:** Na základě aktuální fáze periodizace + readiness + historie navrhnout "doporučený typ tréninku":
- Fáze akumulace + vysoká readiness → "Silový trénink – vysoký objem"
- Fáze deload + nízká readiness → "Mobilita + regenerace"
- Stagnace na cviku X (z analytiky) → "Změnit cvik X za alternativu Y"

Doporučení se zobrazí jako karta v rozvrhu při plánování tréninku a na dashboardu u dnešních tréninků.

**Přínos:** Data-driven rozhodování místo intuice. Trenér dostane podklad, ne příkaz.

---

## 5. Klientský Progress Report (měsíční PDF/karta)

**Problém:** Data o klientovi existují rozptýlená v různých sekcích (cviky, měření, feedback, strava). Chybí konsolidovaný přehled pro klienta "takhle jsi se posunul za měsíc".

**Řešení:** Automaticky generovaný měsíční report pro každého klienta obsahující:
- Počet tréninků a docházka vs minulý měsíc
- Nové PR a zlepšení ve cvicích (top 3)
- Změny v měření (váha, obvody) pokud existují
- Průměrné RPE a trend pocitů z feedbacků
- Splněné/nesplněné cíle

Report jako karta na kartě klienta + export PDF + volitelné sdílení přes klientský portál.

**Přínos:** Klient vidí svůj pokrok, což zvyšuje motivaci a retenci. Trenér má nástroj pro konzultace.

---

## Prioritizace

| Priorita | Vylepšení | Náročnost | Přínos |
|----------|-----------|-----------|--------|
| 1 | Quick Check-in před tréninkem | Střední (nová tabulka + UI) | Okamžitě lepší tréninky |
| 2 | Tréninkový deník - poznámky | Nízká (sloupec už existuje) | Kontinuita mezi tréninky |
| 3 | Měřitelné cíle klientů | Střední (nová tabulka + UI) | Motivace a retence |
| 4 | Auto-doporučení tréninku | Vysoká (propojení více systémů) | Chytřejší plánování |
| 5 | Měsíční Progress Report | Střední (agregace dat + PDF) | Profesionální prezentace |

---

## Doporučení

Navrhuji začít s **prioritami 1 a 2** (Quick Check-in + Poznámky k tréninku), protože:
- Okamžitě zlepší kvalitu každého tréninku
- Sbírají nová data, která se využijí v dalších vylepšeních
- Nízká až střední náročnost implementace

Chcete implementovat všech 5 vylepšení postupně, nebo se zaměřit na konkrétní z nich?

