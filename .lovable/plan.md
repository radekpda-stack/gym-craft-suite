
# Navrhované vylepšení modulu Prodej a Sklad

## Kategorie A: Sklad -- Praktické vylepšení

### 1. Hromadné operace se zbožím
Aktuálně lze editovat produkty pouze jednotlivě. Navrhujeme:
- Checkbox u každé položky v seznamu skladu
- Hromadné akce: archivovat/aktivovat, změnit kategorii, smazat
- Hromadná změna ceny (procentuální navýšení/snížení)

### 2. Historie naskladnění a pohybů
Aktuálně neexistuje přehled, kdy bylo co naskladněno a kolik. Navrhujeme:
- Nová záložka nebo sekce "Pohyby skladu" (stock_movements tabulka)
- Každé naskladnění (ruční i z faktury) zapíše záznam: produkt, množství, nákupní cena, datum, zdroj (ruční/faktura)
- Timeline zobrazení: "+20 ks Energy gel (faktura #123)" / "-3 ks Energy gel (prodej)"
- Filtrování dle produktu a období

### 3. Inventura (stocktaking)
- Dialog pro zadání skutečného stavu zásob
- Porovnání s evidovaným stavem a zobrazení rozdílů
- Možnost hromadně opravit stav + záznam do historie pohybů

### 4. Export skladu do CSV/Excel
- Tlačítko pro export aktuálního stavu skladu (název, množství, nákupní cena, prodejní cena, marže)
- Užitečné pro účetnictví a inventury

---

## Kategorie B: Pokladna -- Vylepšení UX

### 5. Čtečka čárových kódů / QR kódu
- Podpora skenování EAN kódu produktu přes kameru telefonu
- Spárování s polem `sku_code` u produktu
- Rychlé přidání do košíku skenem

### 6. Rychlý prodej na klik (Quick Sale mode)
- Zjednodušený režim pokladny: klikni na produkt = rovnou prodej (bez košíku)
- Vhodné pro prodej jedné položky (např. nápoj u recepce)
- Přepínač "Rychlý režim" v nastavení pokladny

### 7. Paragon / potvrzení o nákupu
- Po dokončení prodeje možnost zobrazit/tisknout zjednodušený paragon
- Obsahuje: datum, položky, ceny, celkem, platební metodu
- Možnost sdílení přes odkaz nebo jako PDF

---

## Kategorie C: Analytika a predikce

### 8. Automatické objednávky / nákupní seznam
- Na základě Stock Velocity predikce automaticky generovat "Nákupní seznam"
- Zobrazí produkty, které dojdou do X dní, s doporučeným množstvím k objednání
- Možnost exportu seznamu nebo odeslání dodavateli emailem

### 9. Sezónní trendy a predikce poptávky
- Graf porovnávající prodeje stejného měsíce loni vs. letos
- Upozornění na blížící se sezónní pík (např. proteinové tyčinky v lednu)

---

## Doporučený postup implementace

Navrhuji začít s těmi, které přinesou největší praktický dopad:

| Priorita | Vylepšení | Složitost | Dopad |
|---|---|---|---|
| 1 | Historie pohybů skladu (#2) | Střední | Vysoký -- audit a přehled |
| 2 | Inventura (#3) | Střední | Vysoký -- přesnost skladu |
| 3 | Export skladu (#4) | Nízká | Střední -- účetnictví |
| 4 | Hromadné operace (#1) | Střední | Střední -- efektivita |
| 5 | Nákupní seznam (#8) | Nízká | Střední -- prevence výpadků |
| 6 | Paragon (#7) | Nízká | Nízký -- profesionalita |
| 7 | Čtečka kódů (#5) | Vysoká | Nízký -- specifický use case |
| 8 | Quick Sale (#6) | Nízká | Nízký -- pohodlí |
| 9 | Sezónní trendy (#9) | Vysoká | Nízký -- dlouhodobé |

Které z těchto vylepšení vás zajímají? Můžeme začít s jedním nebo více najednou.
