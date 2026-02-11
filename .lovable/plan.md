

# Chytrejsi karta Prodeje - navrh zmen a uprav

## Analyza soucasneho stavu

Modul Prodeje je funkcne solidni - ma pokladnu, historii, sklad a statistiky. Ale chybi mu "inteligence" - nenapovida trenérovi, co prodat, neupozornuje na prilezitosti a nezjednodusuje rutinni operace.

### Identifikovane problemy:

1. **Hero header zabira misto ale nerika nic uzitecneho** - mesicni trzby a pocet prodeju jsou staticke cisla bez kontextu ("je to dobre nebo spatne?")
2. **Pokladna vyzaduje prilis mnoho kroku** - vybrat klienta, scrollovat produkty, pridat do kosiku, vybrat platbu, dokoncit
3. **Zadne chytre navrhy** - aplikace nevi, ze klient XY kupuje vzdy protein po treninku, nebo ze je patek a prodeje jsou typicky vyssi
4. **RecentSales a FavoriteProducts jsou oddelene** - zabíraji kazdý vlastni kartu, ale mohly by byt kompaktnejsi
5. **Statistiky nemaji akcni doporuceni** - ukazuji grafy, ale nereknou "zvys cenu X" nebo "objednej Y"
6. **Sklad nema predikci** - nerekne kdy dojdou zasoby na zaklade prodejniho tempa

---

## Navrhovane zmeny

### 1. Smart Sales Hero s kontextovymi KPI

Nahradit staticke badges dynamickymi, kontextovymi informacemi:

```
┌──────────────────────────────────────────┐
│  Prodej                                  │
│                                          │
│  Dnes: 1 250 Kc (+15% vs vcera)         │
│  ┌────────┬────────┬──────────┐          │
│  │ 3 prod.│ 2 low  │ Top: Pro.│          │
│  └────────┴────────┴──────────┘          │
│                                          │
│  💡 Petra Novakova ma trenink za 30 min  │
│     - obvykle kupuje protein (85%)       │
└──────────────────────────────────────────┘
```

**Zmeny:**
- Pridat dnesni trzby s porovnanim vs. vcera (ne jen mesicni)
- Zobrazit "smart tip" - napriklad pripravit produkt pro dalsiho klienta
- Novy hook `useSalesSmartTips` ktery kombinuje data z rozvrhu, historie nakupu a skladu

### 2. Chytra napoveda v pokladne - "Doporucene pro klienta"

Po vyber klienta zobrazit mini-sekci "Tento klient obvykle kupuje":

```
┌──────────────────────────────────────┐
│ 👤 Jan Novak                         │
│ Kredit: 4 200 Kc                     │
│                                      │
│ Obvykle kupuje:                      │
│ ┌──────────┬──────────┬──────────┐   │
│ │ Protein  │ Tyčinka  │ BCAA     │   │
│ │ 12× za   │ 8× za   │ 5× za   │   │
│ │ 3 měs.   │ 3 měs.  │ 3 měs.  │   │
│ └──────────┴──────────┴──────────┘   │
└──────────────────────────────────────┘
```

**Zmeny:**
- Novy hook `useClientPurchaseHistory(clientId)` - analyzuje sales_order_items pro klienta
- Zobrazit top 3 nejcasteji kupovane produkty s jednim kliknutim pridani do kosiku
- Integrace do SalesRegister pod klientskou kartu

### 3. Spojena sekce "Rychly pristup" (Recent + Favorites)

Misto dvou oddelených karet spojit do jedne kompaktni sekce s horizontalnim scrollem:

```
┌─────────────────────────────────────────┐
│ ⚡ Rychly pristup                       │
│                                         │
│ Posledni:  [Protein 65Kc] [Tycinka 35] │
│ Top prod.: [BCAA 89Kc] [Gainer 120Kc]  │
└─────────────────────────────────────────┘
```

**Zmeny:**
- Spojit RecentSales a FavoriteProducts do `QuickAccessBar`
- Horizontalni scroll na mobilu
- Kompaktnejsi - pill-style tlacitka misto plnych karet

### 4. Smart Insights ve statistikach

Pridat akcni doporuceni do SalesInsights:

- "Protein XY ma marzi jen 12% - zvaz zvyseni ceny nebo zmenu dodavatele"
- "BCAA se proda za ~8 dni pri aktualnim tempu. Objednej do petku."
- "V patek prodavate 2x vice nez v pondeli - zvaz akci na pondeli"
- "Klient Jan Novak utratil 3x vice nez prumer - nabidni vernostni slevu"

**Zmeny:**
- Rozsirit `SalesInsights.tsx` o dalsi typy insights (stock prediction, pricing, customer value)
- Pridat "stock velocity" vypocet - kolik dnu zasoby vydrzi
- Pridat detekci "best day of week" pro cilene akce

### 5. Predikce zasob ve Skladu

Pridat do StockManagement sloupec/badge "Vydrzi ~X dní" na zaklade prodejniho tempa:

```
┌──────────────────────────────────────────────┐
│ Protein WPC 80     15 ks    Vydrzi ~12 dni   │
│ ████████░░░░░░░░░  ⚠️ Objednej do 5 dni     │
│                                              │
│ BCAA Amino         32 ks    Vydrzi ~45 dni   │
│ █████████████░░░░  ✅ OK                     │
└──────────────────────────────────────────────┘
```

**Zmeny:**
- Novy hook `useStockVelocity` - pocita prumerny denni prodej za poslednich 30 dni
- Pridat "daysRemaining" badge do produktovych karet ve skladu
- Barevne kodovani: cervena (< 7 dni), zluta (7-14), zelena (14+)

### 6. Mobilni sticky kosik na Pokladne

Na mobilu je kosik pod produkty (nutnost scrollovat dolu). Pridat sticky mini-bar:

```
┌─────────────────────────────────────┐
│ 🛒 2 polozky • 165 Kc  [ZAPLATIT]  │
└─────────────────────────────────────┘
```

**Zmeny:**
- Na mobilu (lg breakpoint dolu) pridat fixed bottom bar kdyz je kosik neprazdny
- Klik na bar scrollne ke kosiku nebo otevre sheet
- Na desktopu beze zmeny (kosik je sticky v pravem sloupci)

---

## Technicke zmeny

### Nove soubory:

| Soubor | Popis |
|--------|-------|
| `src/hooks/useSalesSmartTips.ts` | Kombinuje data z rozvrhu + historie nakupu + sklad pro chytre tipy |
| `src/hooks/useClientPurchaseHistory.ts` | Analyzuje nejcastejsi nakupy klienta |
| `src/hooks/useStockVelocity.ts` | Pocita prodejni tempo a predikci zasob |
| `src/components/sales/QuickAccessBar.tsx` | Spojena kompaktni sekce pro rychly pristup |
| `src/components/sales/ClientPurchaseSuggestions.tsx` | "Obvykle kupuje" sekce |
| `src/components/sales/MobileCartBar.tsx` | Sticky kosik na mobilu |

### Upravene soubory:

| Soubor | Zmena |
|--------|-------|
| `src/pages/Sales.tsx` | Novy smart hero s kontextovymi KPI a tipem |
| `src/components/sales/SalesRegister.tsx` | Integrace ClientPurchaseSuggestions + QuickAccessBar + MobileCartBar |
| `src/components/sales/SalesInsights.tsx` | Dalsi typy insights (stock velocity, pricing, customer value, best day) |
| `src/components/sales/StockManagement.tsx` | Pridat "daysRemaining" badge do produktovych karet |

### Datove zdroje (bez DB zmen):

Vsechny nove hooky pouzivaji existujici tabulky:
- `sales_orders` + `sales_order_items` - historie nakupu klienta
- `products` - zasoby a ceny
- `training_sessions` - rozvrh (pro smart tipy)
- `credit_transactions` - fallback data

---

## Prioritizace

| Priorita | Zmena | Dopad |
|----------|-------|-------|
| 1 | ClientPurchaseSuggestions ("Obvykle kupuje") | Vysoky - zrychleni prodeju |
| 2 | QuickAccessBar (spojeni Recent + Favorites) | Stredni - cistejsi UI |
| 3 | MobileCartBar (sticky kosik) | Vysoky - mobilni UX |
| 4 | Smart Hero s tipem | Stredni - proaktivni informace |
| 5 | Stock Velocity predikce | Stredni - chytrejsi sklad |
| 6 | Rozsirene Insights | Nizsi - analyticke doporuceni |

---

## Ocekavany vysledek

- Trener po vybreni klienta OKAMZITE vidi co obvykle kupuje (1-click pridani)
- Na mobilu je kosik vzdy dostupny bez scrollovani
- Dashboard prodeje ukazuje kontextove informace ("dnes +15%", "priprav protein pro Petra")
- Sklad upozornuje kolik dni zasoby vydrzi, ne jen ze jsou nizke
- Statistiky doporucuji konkretni akce, ne jen ukazuji cisla

