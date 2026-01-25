
# Zjednodušení feedbackových statistik pro trenéry

## Identifikovaný problém

Na screenshotu vidím kartu "Koučovací profil" s těmito daty:
- **Nejčastější limit**: "—" (žádná data)
- **Průměr enjoyment**: "—" (žádná data)  
- **Feedbacků celkem**: "2"

A nad tím jsou karty "Bolest 1.0/10" a "Session Fit 8.0/10" s mini-grafy.

**Problém z pohledu trenéra:**
1. Čísla jako "1.0/10" nebo "8.0/10" bez kontextu neříkají, jestli je to dobré nebo špatné
2. "Session Fit" - anglický termín, nejasné co znamená
3. "sRPE" - odborná zkratka, kterou běžný trenér nezná
4. Mini-grafy jsou hezké, ale bez interpretace nepomáhají
5. "Koučovací profil" zobrazuje pouze prázdná data ("—") s číslem 2 feedbacků
6. Chybí jasný závěr: "Co mám jako trenér udělat?"

---

## Návrh řešení: Přeměnit čísla na srozumitelné statusy

### Filozofie změny

Inspirace z již fungující komponenty `ClientHealthSnapshot`, která používá:
- Jednoslovné statusy: "stabilní", "pozor", "ok"
- Emoji/ikony místo čísel
- Barevné kódování (zelená = ok, oranžová = pozor, červená = problém)
- Žádné analytické termíny

### Nový design "Koučovací profil"

**Současný stav:**
```
Nejčastější limit    Průměr enjoyment    Feedbacků celkem
—                    —                    2
```

**Nový design - srozumitelný pro trenéra:**
```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Jak na klienta                                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Trénink mu sedí?     🟢 Výborně                             │
│                      (8/10 průměrně)                        │
│                                                              │
│ Bolest po tréninku?  ✔️ Minimální                           │
│                      (1/10 průměrně)                        │
│                                                              │
│ Co ho brzdí?         —                                      │
│                      (málo dat)                             │
│                                                              │
│ Baví ho to?          —                                      │
│                      (málo dat)                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Nové labely pro metriky

| Současný název | Nový název | Vysvětlení |
|----------------|-----------|------------|
| sRPE | Jak těžké to bylo | Subjektivní náročnost |
| Session Fit | Jak mu to sedí | Shoda tréninku s očekáváním |
| Připravenost | Jak připravený byl | Stav před tréninkem |
| Bolest | Bolest po tréninku | Intenzita bolesti |

### Interpretace hodnot do slov

**Pro Session Fit / "Jak mu to sedí":**
- 8-10: "🟢 Výborně" 
- 6-7.9: "🟡 Dobře"
- 4-5.9: "🟠 Tak tak"
- 1-3.9: "🔴 Špatně"

**Pro Bolest:**
- 1-2: "✔️ Minimální"
- 3-4: "🟡 Mírná"
- 5-6: "🟠 Pozor"
- 7+: "🔴 Vysoká"

**Pro Připravenost:**
- 8-10: "🟢 Skvělá"
- 6-7.9: "🟡 Dobrá"
- 4-5.9: "🟠 Nízká"
- 1-3.9: "🔴 Špatná"

### Nová sekce: "Co dělat příště"

Místo surových dat zobrazit **akční doporučení**:

```
┌─────────────────────────────────────────────────────────────┐
│ 💡 Co dělat příště                                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ✓ Pokračuj stejným stylem - trénink mu sedí                 │
│                                                              │
│   nebo                                                       │
│                                                              │
│ ⚠️ Uber intenzitu - příliš náročné pro jeho aktuální stav   │
│ ⚠️ Vynechat rameno - opakovaná bolest                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

Toto již existuje v `coachSuggestions.ts` - stačí to zobrazit prominentněji.

---

## Technické kroky implementace

### Krok 1: Vytvořit helper pro interpretaci hodnot
```
- Nová funkce v feedbackCalculations.ts: interpretMetricValue()
- Mapování číselných hodnot na statusy: 'excellent' | 'good' | 'fair' | 'poor'
- Pro každý status: emoji, label, className
```

### Krok 2: Vytvořit novou komponentu `SimplifiedCoachingProfile`
```
- Nahradí současnou sekci "Koučovací profil" v ClientFeedbackRecovery
- Layout inspirovaný ClientHealthSnapshot
- Jednoslovné statusy místo čísel
- Číselná hodnota jako subtle subtitle (volitelně)
```

### Krok 3: Zjednodušit názvy metrik
```
- sRPE → Náročnost
- Session Fit → Jak mu to sedí  
- Připravenost → Připravenost (ponechat)
- Bolest → Bolest (ponechat)
```

### Krok 4: Přidat sekci "Co dělat příště"
```
- Využít existující getCoachSuggestions() z coachSuggestions.ts
- Zobrazit 1-2 nejdůležitější doporučení
- Pokud žádná: "✓ Pokračuj stejným stylem"
```

### Krok 5: Skrýt mini-grafy za toggle
```
- Výchozí stav: jednoduché statusy
- Tlačítko "📊 Detaily" pro zobrazení grafů
- Grafy jsou optional, ne hlavní obsah
```

### Krok 6: Vylepšit prázdný stav
```
- Místo "—" zobrazit "Málo dat"
- Přidat CTA: "Pošli feedback odkaz pro více dat"
```

---

## Výsledek změn

| Aspekt | Před | Po |
|--------|------|-----|
| Hlavní obsah | Čísla (8.0/10) | Statusy ("Výborně") |
| Terminologie | sRPE, Session Fit | Náročnost, Jak mu to sedí |
| Akční výstup | Žádný | "Co dělat příště" sekce |
| Grafy | Vždy viditelné | Skryté za "Detaily" |
| Prázdná data | "—" | "Málo dat + CTA" |
| Cílová skupina | Analytik | Běžný trenér |

---

## Vizuální návrh finální karty

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Jak na klienta                    [📊 Detaily]           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Jak mu to sedí?      🟢 Výborně                             │
│ Bolest               ✔️ Minimální                           │
│ Náročnost            🟡 Střední                             │
│ Připravenost         🟢 Dobrá                               │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│ 💡 Tip: Pokračuj stejným stylem                             │
│    Trénink mu sedí a bolest je minimální.                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Soubory k úpravě

1. **`src/lib/feedbackCalculations.ts`**
   - Přidat `interpretMetricValue()` funkci
   - Přidat mapování hodnot na statusy

2. **`src/components/clients/ClientFeedbackRecovery.tsx`**
   - Přejmenovat metriky na české názvy
   - Vytvořit novou sekci `SimplifiedCoachingProfile`
   - Skrýt grafy za toggle
   - Přidat "Co dělat příště" sekci

3. **`src/components/feedback/SimplifiedCoachingProfile.tsx`** (nový soubor)
   - Nová komponenta inspirovaná `ClientHealthSnapshot`
   - Jednoduchý, srozumitelný layout

---

## Prioritizace

**Kritická (hlavní problém):**
1. Přejmenovat metriky na srozumitelné české názvy
2. Přidat interpretaci hodnot (číslo → status)
3. Přidat sekci "Co dělat příště"

**Střední priorita:**
4. Skrýt grafy za toggle
5. Vylepšit prázdný stav s CTA

**Nižší priorita:**
6. Animace a micro-interakce
7. Tooltips pro pokročilé uživatele
