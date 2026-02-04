

# Oprava UI problémů na stránce Prodej (Sales) - Mobile

## Identifikované problémy ze screenshotu

### 1. Záložky (Tabs) - Text "Pokladna" je oříznutý na levé straně

**Příčina:**
- `TabsTrigger` v `Sales.tsx` používá `hidden xs:inline` pro text labelu
- Na zařízeních menších než 375px text není zobrazen vůbec, ale ikona s containerem zabírá místo
- Container má `p-1.5` padding uvnitř ikony, což s `flex-1` způsobuje nerovnoměrné rozdělení

**Řešení:**
- Změnit z `hidden xs:inline` na `hidden sm:inline` pro konzistenci s ostatními breakpointy
- Přidat `overflow-hidden` na TabsList pro případ přetečení
- Přidat `text-xs sm:text-sm` pro responsivní velikost textu

### 2. Produktové karty na spodní části obrazovky jsou částečně viditelné

**Příčina:**
- Stránka Sales.tsx má `pb-24` pro mobilní padding (řádek 40)
- Ale MobileNav je umístěn na `bottom-6` s výškou cca 80px
- ProductCard grid se zobrazuje pod FavoriteProducts a RecentSales sekcemi

**Řešení:**
- Zvýšit bottom padding na `pb-28` nebo `pb-32` pro zajištění dostatečného prostoru
- Alternativně: Zkontrolovat, zda Layout.tsx má správný `pb-36` (má)

### 3. Ikonová kontejnery v tabech zabírají příliš mnoho místa

**Příčina:**
- Každý tab má `div` wrapper pro ikonu s `p-1.5 rounded-lg`
- Na malých obrazovkách to vytváří zbytečné vizuální šumy

**Řešení:**
- Zjednodušit strukturu tabů na mobilech - pouze ikona bez extra wrapperu
- Nebo snížit padding na `p-1` pro mobil

---

## Soubory k úpravě

| Soubor | Změna |
|--------|-------|
| `src/pages/Sales.tsx` | Opravit tabs overflow, zvýšit pb, zjednodušit tab strukturu |
| `src/components/sales/FavoriteProducts.tsx` | Přidat `min-w-0` a `overflow-hidden` na grid items |

---

## Technické změny

### 1. Sales.tsx - Oprava TabsList

**Aktuální stav (řádky 80-106):**
```tsx
<TabsList className="w-full h-auto p-1.5 card-floating rounded-2xl mb-4 sm:mb-6 backdrop-blur-md">
  {TABS.map((tab) => {
    // ...
    <TabsTrigger className="relative flex-1 gap-2 py-3 px-3 sm:px-4 rounded-xl ...">
      <div className="p-1.5 rounded-lg ...">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <span className="hidden xs:inline text-sm font-medium">{tab.label}</span>
    </TabsTrigger>
  })}
</TabsList>
```

**Navrhovaná změna:**
```tsx
<TabsList className="w-full h-auto p-1.5 card-floating rounded-2xl mb-4 sm:mb-6 backdrop-blur-md overflow-hidden">
  {TABS.map((tab) => {
    // ...
    <TabsTrigger className="relative flex-1 gap-1.5 sm:gap-2 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl min-w-0 ...">
      <div className="p-1 sm:p-1.5 rounded-lg shrink-0 ...">
        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
      </div>
      <span className="hidden sm:inline text-xs sm:text-sm font-medium truncate">{tab.label}</span>
    </TabsTrigger>
  })}
</TabsList>
```

**Klíčové změny:**
- `overflow-hidden` na TabsList
- `min-w-0` na TabsTrigger pro korektní flexbox chování
- `shrink-0` na icon wrapper
- Změna breakpointu z `xs:inline` na `sm:inline` (640px)
- Přidání `truncate` pro případ dlouhého textu
- Snížení gap a padding pro mobil: `gap-1.5 sm:gap-2`, `py-2.5 sm:py-3`, `px-2 sm:px-4`
- Menší padding na icon wrapper: `p-1 sm:p-1.5`

### 2. Sales.tsx - Zvýšení bottom padding

**Aktuální stav (řádek 40):**
```tsx
<div className="space-y-4 sm:space-y-6 animate-fade-in pb-24 sm:pb-6">
```

**Navrhovaná změna:**
```tsx
<div className="space-y-4 sm:space-y-6 animate-fade-in pb-32 sm:pb-6">
```

Změna `pb-24` na `pb-32` zajistí více prostoru pro bottom navigation (8rem = 128px).

### 3. FavoriteProducts.tsx - Přidání overflow ochrany

**Aktuální stav (řádek 39):**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
```

**Navrhovaná změna:**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 overflow-hidden">
```

A na product button (řádek 44-52):
```tsx
<button
  className={cn(
    "relative flex flex-col items-start gap-1 p-3 rounded-xl text-left transition-all duration-200 min-w-0 overflow-hidden",
    // ...
  )}
>
```

---

## Vizuální výsledek

Po implementaci:
- Záložky na mobilu zobrazí pouze ikony (pod 640px), nad 640px ikony + text
- Žádné oříznuté texty nebo přetékající elementy
- Produktové karty budou mít dostatečný prostor od bottom navigation
- Grid produktů nebude přetékat z containeru

---

## Kontrolní seznam

- [ ] TabsList má `overflow-hidden`
- [ ] TabsTrigger má `min-w-0` pro flex-shrink
- [ ] Icon wrapper má `shrink-0`
- [ ] Text label má `truncate` a responsivní breakpoint `sm:inline`
- [ ] Stránka má dostatečný `pb-32` pro bottom nav
- [ ] Grid produktů má `overflow-hidden`
- [ ] Product buttons mají `min-w-0 overflow-hidden`

