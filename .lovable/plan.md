
# Revize sekce Klientský portál - Audit UI a návrh vylepšení

## Aktuální stav

Sekce obsahuje 4 záložky: **Přehled**, **Klienti**, **Deníky**, **Nastavení**

### Přehled záložek

| Záložka | Komponenty | Obsah |
|---------|------------|-------|
| **Přehled** | `PortalUsageStats` + `ClientPortalQuickSearch` + `PortalRecentActivity` | 4 KPI karty, vyhledávání, posledních 20 aktivit |
| **Klienti** | `ClientAccessList` | Tabulka/karty klientů s přístupem, hromadné akce |
| **Deníky** | `ClientWorkoutLogsOverview` | Tréninkové záznamy od klientů s komentáři |
| **Nastavení** | `PortalVisibilitySettings` + `ClientPortalSettingsPage` | Globální a per-klient nastavení |

---

## Nalezené problémy

### 1. Duplikace funkcí mezi Přehledem a Klienty

| Funkce | Přehled | Klienti |
|--------|---------|---------|
| Vyhledávání klientů | ✅ `ClientPortalQuickSearch` | ✅ `ClientAccessList` s filtrem |
| Tlačítko "Přidat klienta" | ✅ | ✅ |
| Zobrazení statusu | ✅ Badge | ✅ Badge + tabulka |
| Detail klienta | ✅ Sheet | ✅ Sheet |

**Problém**: Uživatel má dvě místa pro stejnou akci (vyhledání a správu klienta).

### 2. Neefektivní využití prostoru v záložce Přehled

Aktuální layout:
```text
[--- 4 KPI karty (2x2 na mobilu, 4x1 na desktopu) ---]
[--- Vyhledávání klientů (celá šířka) ---]
[--- Poslední aktivita (celá šířka, 350px výška) ---]
```

**Problém**: Vyhledávání zabírá celou šířku, ale často je prázdné. Aktivita také zabírá celou šířku, přestože by mohla být vedle vyhledávání.

### 3. KPI karty bez kontextu porovnání

Aktuální metriky:
- Celkem klientů (absolutní číslo)
- Aktivní dnes (absolutní číslo)
- Aktivní tento týden (absolutní číslo)
- Ø návštěv / klient (průměr)

**Chybí**:
- Trend vs minulý týden/měsíc
- % aktivních vs celkem (poměr)
- Klienti bez přihlášení 7+ dní (varování)

### 4. Záložka Deníky - chybí filtry a řazení

`ClientWorkoutLogsOverview` zobrazuje všechny záznamy bez možnosti:
- Filtrovat pouze nezkontrolované
- Seřadit podle data/klienta
- Zobrazit pouze tréninky s PR

### 5. Nastavení rozděleno na dvě karty

- `PortalVisibilitySettings` - globální nastavení (max-w-2xl)
- `ClientPortalSettingsPage` - per-klient nastavení

**Problém**: Není jasné, co ovlivňuje co. Uživatel neví, zda globální nastavení přepisuje per-klient nastavení.

### 6. Quick copy link bar nahoře

```text
[--- URL odkaz + Kopírovat + QR kód ---]
```

**Problém**: Zabírá místo a je viditelný i když uživatel nehledá odkaz. Mohl by být součástí headeru nebo v dropdown menu.

---

## Navrhované změny

### Fáze 1: Zjednodušení záložky Přehled

**Nový layout**:
```text
[--- 4 KPI karty s trendy (2x2 na mobilu) ---]
[--- 2 sloupce na desktopu ---]
[Vyhledávání + rychlé akce] | [Poslední aktivita]
```

**Změny v KPI**:
- Přidat trend šipky (+/- vs minulý týden)
- "Aktivní tento týden" → zobrazit jako % z celkem
- Přidat 5. KPI: "Vyžaduje pozornost" (nepřihlášeni 7+ dní)

### Fáze 2: Sloučení quick copy linku do headeru

Místo:
```text
[--- Odkaz + Kopírovat + QR ---]
[Nadpis + PortalPreviewButton]
```

Nový design:
```text
[Nadpis] [Kopírovat odkaz ▾] [Náhled portálu]
         └─ Dropdown s URL, tlačítkem a QR kódem
```

### Fáze 3: Přidání filtrů do Deníků

Přidat nad seznam deníků:
```text
[Vše] [Ke kontrole (3)] [S PR] [Tento týden]
```

A řazení:
```text
[Řadit: Nejnovější ▾]
```

### Fáze 4: Sjednocení Nastavení

Nahradit dvě oddělené sekce jednou kartou s tabbed interface:
```text
[Globální nastavení] | [Nastavení pro klienta]
```

S vysvětlením: "Globální nastavení platí pro všechny klienty. Individuální nastavení přepisuje globální."

### Fáze 5: Přidání "Action Required" sekce

Na záložku Přehled přidat kartu s okamžitými úkoly:
- Nezkontrolované tréninky (badge s počtem)
- Klienti bez přihlášení 7+ dní
- Nově zaregistrovaní klienti (čekají na aktivaci)

---

## Technické kroky implementace

### Krok 1: Úprava ClientPortalAdmin.tsx - header redesign
```text
- Přesunout quick copy link do dropdown v headeru
- Vytvořit PortalLinkDropdown komponentu
- Odstranit horní pruh s URL
```

### Krok 2: Rozšíření PortalUsageStats.tsx
```text
- Přidat trend vs minulý týden do každé metriky
- Přidat 5. KPI "Vyžaduje pozornost" 
- Změnit layout na 5 karet (3+2 na mobilu)
```

### Krok 3: Úprava layoutu záložky Přehled
```text
- Změnit vertikální stack na 2-column grid
- ClientPortalQuickSearch vlevo
- PortalRecentActivity vpravo
- Přidat ActionRequired kartu nad grid
```

### Krok 4: Přidání filtrů do ClientWorkoutLogsOverview
```text
- Přidat filter chips (Vše/Ke kontrole/S PR)
- Přidat sort dropdown
- Počítat badge pro "Ke kontrole"
```

### Krok 5: Refaktor záložky Nastavení
```text
- Vytvořit PortalSettingsTabs komponentu
- Sloučit PortalVisibilitySettings a ClientPortalSettingsPage
- Přidat vysvětlující text o prioritě nastavení
```

---

## Výsledek po úpravách

| Oblast | Před | Po |
|--------|------|-----|
| Header | URL bar + nadpis | Kompaktní header s dropdown |
| Přehled layout | Vertikální stack | 2-column + action required |
| KPI metriky | 4 bez kontextu | 5 s trendy |
| Deníky | Bez filtrů | Filtry + řazení |
| Nastavení | 2 oddělené sekce | Tabbed interface |

---

## Vizuální návrh nového layoutu

```text
┌─────────────────────────────────────────────────────────────┐
│ Klientský portál ⓘ          [Odkaz ▾] [Náhled portálu]      │
│ Spravujte přístup klientů...                                 │
├─────────────────────────────────────────────────────────────┤
│ [Přehled] [Klienti] [Deníky] [Nastavení]                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐               │
│  │ 12   │ │ 3    │ │ 25%  │ │ 2.4  │ │ ⚠ 2  │               │
│  │Klient│ │Dnes  │ │Aktivn│ │Ø/kli│ │Pozor │               │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘               │
│                                                              │
│  ┌─ Vyžaduje pozornost ─────────────────────────────────┐   │
│  │ 3 tréninky ke kontrole • 2 klienti nepřihlášeni 7d   │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌─ Vyhledat klienta ───────┐  ┌─ Poslední aktivita ────┐   │
│  │ [🔍 Zadejte jméno...]    │  │ Jan Novák - Přihlášení │   │
│  │ [+ Přidat]               │  │ Petra K. - Váha 82kg   │   │
│  │                          │  │ ...                    │   │
│  └──────────────────────────┘  └─────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Prioritizace

**Vysoká priorita:**
1. Přesun quick copy link do dropdown (zbytečně zabírá místo)
2. Rozšíření KPI o trendy (kontext porovnání)
3. Přidání filtrů do Deníků (rychlejší workflow)

**Střední priorita:**
4. 2-column layout v Přehledu
5. Action Required sekce

**Nižší priorita:**
6. Refaktor Nastavení do tabs
