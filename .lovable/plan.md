
## Rozšíření detailu prodeje o náklady a zisk

### Co bude přidáno

V modálním okně detailu objednávky (`SalesOrderDetailModal.tsx`) přibude nová sekce **„Ziskovost"**, která zobrazí pro každou položku i celkový prodej:
- Nákupní cenu (náklad) na položku
- Tržbu (příjem) za položku
- Hrubý zisk na položku = tržba − náklad
- Marži v % pro každou položku
- Souhrnné KPI karty dole: celkový náklad, celková tržba, hrubý zisk, marže v %

### Jak to funguje technicky

**Problém:** `sales_order_items` tabulka neukládá `purchase_price` v době prodeje – pouze `unit_price` (prodejní cena). Nákupní cena se musí dohledat přes `product_id` → `products.purchase_price`.

**Řešení:** Rozšířit dotaz v `SalesOrderDetailModal.tsx` o JOIN na `products` přes `product_id`, aby se pro každou položku načetla aktuální `purchase_price`. Tato hodnota je pro manažerský přehled dostatečná.

> **Poznámka:** Pro `service` (služba/ručník apod.) a `credit_topup` bude `purchase_price` brána jako 0 nebo hodnota z produktu – marže bude 100%, pokud není nákupní cena zadána.

### Změny souborů

**1. `src/components/sales/SalesOrderDetailModal.tsx`** – hlavní změna
- Rozšířit interface `OrderItem` o `product_id` a `purchase_price` (z JOIN)
- Upravit Supabase dotaz: přidat `product_id` do select a JOIN přes `sales_order_items(product_id, products(purchase_price))`
- Přidat výpočetní logiku:
  - `itemCost = (purchase_price ?? 0) * quantity`
  - `itemRevenue = line_total_after_discount ?? line_total`
  - `itemProfit = itemRevenue - itemCost`
  - `itemMargin = itemRevenue > 0 ? (itemProfit / itemRevenue) * 100 : 0`
- Přidat do každé položky malý řádek s nákladem, ziskem a marží (pod stávající cenou)
- Přidat souhrnnou sekci **„Ziskovost prodeje"** pod separátorem se 4 KPI kartami:

```text
┌─────────────┬─────────────┬─────────────┬─────────────┐
│  Náklady    │   Tržba     │ Hrubý zisk  │   Marže     │
│  1 200 Kč   │  1 900 Kč   │   700 Kč    │   36,8 %    │
└─────────────┴─────────────┴─────────────┴─────────────┘
```

- Barevné kódování: zisk kladný = zelená, záporný = červená

### Vizuální hierarchie detailu po změně

```text
[ Dialog: Detail objednávky ]
  ├── Záhlaví: klient, datum, platební metoda, tlačítko Upravit
  ├── Separator
  ├── Položky (každá položka rozšířena):
  │     Název produktu        [cena × ks]
  │     Náklad: X Kč  →  Zisk: Y Kč (Z%)
  ├── Separator
  ├── Rekapitulace (stávající: produkty, služby, slevy, celkem)
  ├── Separator
  ├── 🆕 Ziskovost prodeje (4 KPI mini-karty)
  │     Náklady / Tržba / Hrubý zisk / Marže
  └── Poznámka (pokud existuje)
```

### Důležité detaily

- Položky bez `purchase_price` (null) se zobrazí s nákupní cenou 0 a marží 100% – to odpovídá realitě (čistý servisní výnos)
- KPI karty pro zisk/marži budou barevně reagovat (zelená = zisk, červená = ztráta)
- Bez databázových změn – veškerá data jsou dostupná přes existující JOIN

### Rozsah změny

Pouze **1 soubor**: `src/components/sales/SalesOrderDetailModal.tsx`
