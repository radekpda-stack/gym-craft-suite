
# Plán: Zjednodušení klientského centra

## Identifikované problémy

### 1. Kalendář na dashboardu
- Zabírá příliš mnoho místa
- Má navigaci měsíců (kterou klient sotva používá)
- Má legendu která je zbytečná pro běžný přehled

### 2. Deník stravy - **3× duplicitní přidávání!**
Klient má tři způsoby jak přidat jídlo:
1. Velké tlačítko "Přidat stravu" nahoře
2. 4× velká tlačítka (Snídaně/Oběd/Večeře/Svačina) v kartě
3. Tlačítko "Přidat jiný záznam" dole

Plus další prvky:
- Quick stats (3 karty)
- Quick water/coffee tlačítka
- Nedávná jídla
- WeekStrip

**Výsledek**: 7+ sekcí na jedné obrazovce = matoucí

---

## Navrhované změny

### A) Zmenšení kalendáře na dashboardu

**Soubor:** `src/components/client-portal/calendar/TrainingCalendar.tsx`

Změny:
1. Odstranit navigaci měsíců (jen aktuální měsíc)
2. Menší buňky dnů (text-[10px] místo text-[11px])
3. Odstranit legendu úplně (není potřeba pro přehled)
4. Kompaktnější padding

```text
PŘED:
┌─────────────────────────────────┐
│ 📅 Kalendář          🏋️ 5     │
│ ← led 2025 →                    │
├─────────────────────────────────┤
│ Po Út St Čt Pá So Ne            │
│  1  2  3  4  5  6  7            │
│  8  9 10 11 12 13 14            │
│ 15 16 17 18 19 20 21            │
│ ...                             │
├─────────────────────────────────┤
│ [■ 1×] [■■ 2+]  ← legenda       │
└─────────────────────────────────┘

PO:
┌─────────────────────────────────┐
│ 📅 Aktivita tento měsíc   🏋️ 5 │
├─────────────────────────────────┤
│ Po Út St Čt Pá So Ne            │
│  1  2  3  4  5  6  7            │
│  8  9 10 11 12 13 14            │
│ 15 16 17 18 19 20 21            │
│ ...                             │
└─────────────────────────────────┘
```

### B) Zjednodušení deníku stravy

**Soubor:** `src/pages/client-portal/ClientPortalNutritionTab.tsx`

Kompletní redesign na jednoduchý flow:

```text
PŘED (7 sekcí):
┌─────────────────────────────────┐
│ [Po] [Út] [St] [Čt] [Pá] [So] [Ne] │  ← WeekStrip
├─────────────────────────────────┤
│ [+ Přidat stravu           ]    │  ← Velké tlačítko #1
├─────────────────────────────────┤
│ [3 Jídel] [600ml vody] [2 kávy] │  ← Quick stats
├─────────────────────────────────┤
│ ┌────────────────────────────┐  │
│ │ [🌅 Snídaně] [☀️ Oběd]    │  │  ← Tlačítka #2
│ │ [🌙 Večeře] [🍎 Svačina]  │  │
│ │──────────────────────────│  │
│ │ [💧+300ml] [☕+1 Káva]    │  │  ← Quick add
│ │──────────────────────────│  │
│ │ ⏰ Nedávná jídla          │  │  ← History
│ │ [Ovesná kaše] [Kuře]     │  │
│ │──────────────────────────│  │
│ │ [+ Přidat jiný záznam]   │  │  ← Tlačítko #3
│ └────────────────────────────┘  │
├─────────────────────────────────┤
│ Dnešní záznamy                  │  ← Entries list
└─────────────────────────────────┘

PO (4 sekce - čisté a jednoduché):
┌─────────────────────────────────┐
│ [Po] [Út] [St] [Čt] [Pá] [So] [Ne] │  ← WeekStrip
├─────────────────────────────────┤
│ [+ Přidat jídlo/nápoj      ]    │  ← JEDNO tlačítko
├─────────────────────────────────┤
│ Quick Add: [💧+300ml] [☕+1]    │  ← Inline quick actions
├─────────────────────────────────┤
│ Záznamy (3 jídla, 600ml, 2☕)   │  ← Entries + stats v headeru
│ [Snídaně - Ovesná kaše...]      │
│ [Voda 300ml]                    │
│ [Káva espresso]                 │
└─────────────────────────────────┘
```

**Změny:**
1. **Odstranit duplicitní tlačítka** - jedno "Přidat jídlo/nápoj" stačí
2. **Odstranit Quick Meal grid** (Snídaně/Oběd/Večeře/Svačina) - typ jídla se vybere ve formuláři
3. **Zjednodušit Quick Stats** - přesunout do headeru záznamu
4. **Ponechat Quick Water/Coffee** - inline menší tlačítka
5. **Odstranit Nedávná jídla** - zbytečné (autocomplete je ve formuláři)
6. **Odstranit "Přidat jiný záznam"** - duplicita

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/components/client-portal/calendar/TrainingCalendar.tsx` | Zmenšit: bez navigace měsíců, bez legendy |
| `src/pages/client-portal/ClientPortalNutritionTab.tsx` | Zjednodušit: odstranit duplicity, sloučit sekce |

---

## Vizuální výsledek

### Dashboard - menší kalendář
Ušetří ~40px výšky, čistější vzhled bez zbytečných prvků.

### Deník stravy - před/po

**PŘED:** 7 sekcí, 3 způsoby přidání jídla
**PO:** 4 sekce, 1 jasný způsob přidání

Klient okamžitě vidí:
1. Který den má vybraný (WeekStrip)
2. Jak přidat (jedno velké tlačítko)
3. Co už zapsal (seznam záznamů se statistikou v headeru)

---

## Výhody

1. **Méně rozhodování** - jeden jasný způsob přidání místo tří
2. **Rychlejší orientace** - méně sekcí = rychlejší skenování
3. **Čistší design** - méně vizuálního šumu
4. **Stejná funkcionalita** - nic se neodebírá, jen se konsoliduje
