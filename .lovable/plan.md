
## Lifetime Stats na Dashboardu

Již existuje hook `useLifetimeStats` s kompletními daty (tréninky, finance, produkty, klienti). Stačí vytvořit novou komponentu a vložit ji na dashboard.

### Nová komponenta: `DashboardLifetimeStats.tsx`
Kompaktní karta s horizontálně scrollovatelným gridem klíčových metrik:

- **Odtrénováno celkem** – počet completed tréninků
- **Celkem hodin** – celkové odtrénované hodiny
- **Přijaté finance** – celkový příjem (platby + manuální)
- **Prodáno produktů** – počet prodaných položek (např. vody, doplňky)
- **Tržby z produktů** – celkový obrat z prodejů
- **Klientů celkem** – kolik klientů kdy měl
- **Průměrná hodinovka** – průměrná sazba za hodinu
- **Storno poplatky** – celkem vybrané storno poplatky

Vizuálně: kompaktní „pill" karty s ikonou, číslem a popiskem. Horizontální scroll na mobilu, grid na desktopu.

### Umístění na dashboardu
Vložit mezi WeekOverviewCard a DashboardInsights jako novou sekci "Celkový přehled".

### Soubory
- **Nový:** `src/components/dashboard/DashboardLifetimeStats.tsx`
- **Edit:** `src/pages/Index.tsx` – import + vložení komponenty
