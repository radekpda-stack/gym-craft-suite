
# Audit AI nutriční analýzy a návrhy vylepšení

## Shrnutí auditu

### Co funguje
| Oblast | Stav |
|--------|------|
| Edge funkce `ai-nutrition-enrichment` | ✅ Funguje správně - vrací kalorie a makra |
| Volání AI z hooků | ✅ Voláno při přidání jídla |
| PDF export s makry | ✅ Implementováno pro trenéra |
| Trenérská karta NutritionFoodCard | ✅ Zobrazuje kalorie a makra |

### Kritické problémy

| Problém | Dopad | Priorita |
|---------|-------|----------|
| **Záznamy nemají nutriční data** | AI se volá, ale data nejsou uložena do DB | KRITICKÁ |
| **Klient nevidí makronutrienty** | EnhancedFoodCard nemá props pro nutrienty | VYSOKÁ |
| **Chybí denní souhrn pro klienta** | Klient nevidí celkový příjem za den | VYSOKÁ |
| **Chybí grafy a statistiky** | Žádná vizualizace trendů pro klienta | STŘEDNÍ |
| **Realtime refresh po AI obohacení** | Data se neobnoví po AI analýze | STŘEDNÍ |

---

## Technická příčina problému s AI enrichmentem

Po testování edge funkce:

1. **Edge funkce funguje správně** - při přímém volání vrací status 200 s nutričními daty
2. **Problem: Template lookup selhává** - funkce hledá šablonu přes `ILIKE` ale používá lowercase:

```typescript
// V edge funkci (řádek 172-178):
const normalizedDesc = description.toLowerCase().trim();
const { data: existingTemplate } = await supabase
  .from('nutrition_meal_templates')
  .select('id')
  .eq('client_id', clientId)
  .ilike('description', normalizedDesc)  // ILIKE s lowercase
  .maybeSingle();
```

**Problém**: `ilike('description', normalizedDesc)` hledá přesný match, ne pattern. Mělo by být:
```typescript
.ilike('description', `%${normalizedDesc}%`)
```

NEBO lépe - šablona se vytváří v `autoSaveMealTemplate` a má přesně stejný popis, takže by měla být nalezena. Podívám se do databáze šablon...

---

## Návrh změn

### Fáze 1: Oprava AI enrichmentu (KRITICKÁ)

**1. Opravit edge funkci pro update entry:**
```typescript
// Problém: Template lookup selhává
// Řešení: Použít ilike s wildcards a prioritně aktualizovat entry
if (entryId) {
  // 1. Update entry FIRST (toto je vždy úspěšné)
  await supabase
    .from('nutrition_food_entries')
    .update({ calories, protein_g, carbs_g, fat_g, ai_enriched: true })
    .eq('id', entryId);
}
```

**2. Přidat realtime refresh po AI obohacení:**
```typescript
// Po úspěšném AI volání invalidovat cache s delay
setTimeout(() => {
  queryClient.invalidateQueries({ queryKey: ['client-nutrition-by-date'] });
}, 3000);
```

---

### Fáze 2: UI pro klienta - zobrazení nutrientů

**1. Rozšířit EnhancedFoodCard o nutriční data:**

```text
┌──────────────────────────────────────────────────────────────┐
│ 08:30  🌅 Snídaně                                    [...]   │
│                                                              │
│ Ovesná kaše s ovocem                                        │
│ 📏 Střední porce • 😊 Akorát                               │
│                                                              │
│ ✨ ~420 kcal • 12g B • 65g S • 8g T                        │
│    ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ NOVĚ PŘIDÁNO            │
└──────────────────────────────────────────────────────────────┘
```

**Technicky:**
- Přidat do interface: `calories`, `protein_g`, `carbs_g`, `fat_g`, `ai_enriched`
- Zobrazit pod popisem s AI ikonou (✨)

**2. Nová komponenta: ClientDayNutritionSummary**

Pro klientský portál zobrazující denní souhrn:

```text
┌──────────────────────────────────────────────────────────────┐
│ 📊 DNEŠNÍ PŘÍJEM                                            │
│                                                              │
│ 🔥 ~1,450 kcal                    Odhad z 4 z 5 jídel      │
│                                                              │
│ ┌─────────────┬─────────────┬─────────────┐                │
│ │   Bílkoviny │  Sacharidy  │    Tuky     │                │
│ │     95g     │    165g     │     52g     │                │
│ │  ███████░░  │  █████████░ │  ██████░░░  │                │
│ │    63%      │     82%     │     72%     │                │
│ └─────────────┴─────────────┴─────────────┘                │
└──────────────────────────────────────────────────────────────┘
```

**Features:**
- Celkové kalorie s rozsahem (~1400-1500)
- Makra v gramech + vizuální progress bars
- Pokrytí (kolik jídel má AI data z celkového počtu)
- Tip: "4 z 5 jídel má odhad"

---

### Fáze 3: Statistiky a grafy (pro klienta)

**1. Týdenní přehled kalorií:**

```text
┌──────────────────────────────────────────────────────────────┐
│ TENTO TÝDEN                                                  │
│                                                              │
│ Kcal/den                                                    │
│  2000 ┤                                                      │
│  1500 ┤     ██       ██      ██      ██                     │
│  1000 ┤ ██  ██   ██  ██  ██  ██      ██                     │
│   500 ┤ ██  ██   ██  ██  ██  ██                             │
│     0 └──Po──Út──St──Čt──Pá──So──Ne                        │
│                                                              │
│ Ø 1,520 kcal/den                                            │
└──────────────────────────────────────────────────────────────┘
```

**2. Makro rozložení (pie chart):**

```text
┌────────────────────────────┐
│     MAKRA TENTO TÝDEN     │
│                            │
│      ████████             │
│    ██        ██           │
│   █   Bílk.   █           │
│   █    25%    █   🟢 Bílk.: 380g (25%)
│   █           █   🟡 Sach.: 720g (48%)
│    ██  Sach. ██   🔴 Tuky: 280g (27%)
│      ████████             │
└────────────────────────────┘
```

---

### Fáze 4: Vylepšení zadávání jídel

**1. Zobrazit nutrienty při výběru z oblíbených:**

```text
ČASTO PŘIDÁVÁM:
┌────────────────────────────────────────────────────────────┐
│ Ovesná kaše s ovocem                                      │
│ ~420 kcal • 12g B • 65g S • 8g T     ✨                  │
│ Včera v 08:15                                             │
├────────────────────────────────────────────────────────────┤
│ Kuřecí prsa s rýží                                        │
│ ~520 kcal • 45g B • 55g S • 12g T    ✨                  │
│ Včera v 12:30                                             │
└────────────────────────────────────────────────────────────┘
```

**2. Po přidání jídla - feedback s odhadem:**

```text
┌──────────────────────────────────────────────────────────────┐
│ ✓ Jídlo přidáno!                                            │
│                                                              │
│ "Těstoviny s omáčkou"                                       │
│                                                              │
│ ⏳ AI počítá odhad nutrientů...                            │
│                                                              │
│ Tip: Za chvíli uvidíte ~kalorie a makra                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Soubory k vytvoření/úpravě

| Soubor | Akce | Popis |
|--------|------|-------|
| `supabase/functions/ai-nutrition-enrichment/index.ts` | UPRAVIT | Opravit template lookup, přidat logging |
| `src/components/client-portal/nutrition/EnhancedFoodCard.tsx` | UPRAVIT | Přidat props pro kalorie a makra |
| `src/components/client-portal/nutrition/ClientDayNutritionSummary.tsx` | VYTVOŘIT | Denní souhrn pro klienta |
| `src/components/client-portal/nutrition/WeeklyNutritionChart.tsx` | VYTVOŘIT | Týdenní graf kalorií |
| `src/pages/client-portal/ClientPortalNutrition.tsx` | UPRAVIT | Integrovat denní souhrn a statistiky |
| `src/pages/client-portal/ClientPortalNutritionTab.tsx` | UPRAVIT | Integrovat denní souhrn |
| `src/components/client-portal/nutrition/FrequentItemsSection.tsx` | UPRAVIT | Zobrazit nutrienty u oblíbených |
| `src/hooks/useClientPortalNutrition.ts` | UPRAVIT | Přidat refresh po AI enrichmentu |

---

## Prioritizace

### Musí být (MVP)
1. ✅ Opravit AI enrichment - záznamy musí mít nutriční data
2. ✅ Klient vidí kalorie a makra u jednotlivých jídel
3. ✅ Klient vidí denní souhrn (celkový příjem)

### Mělo by být
4. Týdenní graf kalorií
5. Makro rozložení za týden
6. Nutrienty v oblíbených položkách

### Bonus
7. Nastavení cílových hodnot (kcal/den cíl)
8. Porovnání s cílem (progress ring)
9. Push notifikace o AI výsledku

---

## Očekávaný výsledek

| Metrika | Před | Po |
|---------|------|-----|
| Záznamy s AI daty | 0% | 100% |
| Klient vidí kalorie | ❌ | ✅ |
| Klient vidí denní souhrn | ❌ | ✅ |
| Trenér vidí makra | ✅ | ✅ |
| Statistiky/grafy | ❌ | ✅ |

---

## Shrnutí workflow po implementaci

1. **Klient zadá jídlo** → uloží se ihned
2. **AI běží na pozadí** (3-5 sekund) → doplní kalorie a makra
3. **Data se obnoví** → klient vidí nutrienty u jídla
4. **Denní souhrn** se automaticky přepočítá
5. **Trenér vidí** stejná data + může přidat komentář
6. **PDF export** obsahuje nutriční analýzu
