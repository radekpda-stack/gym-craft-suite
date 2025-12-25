# UI Guidelines - Pravidla pro konzistentní a responzivní UI

## Základní principy

### 1. Zákaz horizontálního přetečení
- Nikde nesmí vznikat horizontální scroll celé stránky kvůli jednomu prvku
- Každý container musí mít jasně řízené chování overflow

### 2. Text v komponentách
- Pro texty v kartách, headeru, listech, řádcích, button textu a badge použij:
  - `truncate` - pro oříznutí textu s ellipsis
  - `min-w-0` - pro flex items aby mohly správně shrink
  - `break-words` - pro dlouhé texty které se mají zalamovat
  - `break-all` - pouze pro tokeny/UUID/nezalomitelné řetězce

### 3. Utility třídy (definovány v index.css)
```css
.text-truncate       /* single line truncate */
.text-truncate-2     /* 2 lines max */
.text-truncate-3     /* 3 lines max */
.text-safe           /* break-word pro dlouhé texty */
.text-break-all      /* break-all pro UUID/tokeny */
.overflow-safe       /* overflow-hidden + min-w-0 */
.flex-truncate       /* min-w-0 + truncate pro flex items */
.scroll-x-mobile     /* horizontal scroll jen na mobilu */
.card-content-safe   /* container pro bezpečný obsah */
```

---

## Komponenty

### Dialog/Modal
- Má `max-h-[85vh]` a `overflow-y-auto`
- Padding: `p-4 sm:p-6`
- Šířka: `w-[calc(100%-1.5rem)] sm:w-[calc(100%-2rem)]`
- Title má `pr-8` pro prostor pro close button a `break-words`

### Sheet (Side panel)
- Má `max-h-[85vh]` (top/bottom) nebo full height (left/right)
- Šířka: `w-[85vw] max-w-md`
- Obsahuje `overflow-y-auto`

### Table
- Container má `overflow-x-auto overflow-y-hidden`
- Na mobilu: `-mx-4 px-4` pro edge-to-edge scroll
- TableCell má `max-w-[200px] truncate`
- Minimum table width: `min-w-[600px]` (pak se scrolluje)

### Tabs
- TabsList má `overflow-x-auto scrollbar-hide`
- TabsTrigger má `shrink-0` aby se nezmenšovaly

### Badge
- Má `max-w-full overflow-hidden`
- Responzivní: `px-2 sm:px-2.5` a `text-[10px] sm:text-xs`

### Card
- Obsahuje `overflow-hidden`
- CardTitle má `break-words`

### Button
- Má `whitespace-nowrap` - text se nezalamuje
- Pro text který se může měnit použij `truncate` na vnitřním spanu

---

## Mobile-first přístup

### Breakpointy
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px

### Spacing
```css
padding: p-3 sm:p-4 md:p-6
gap: gap-2 sm:gap-3 md:gap-4
text: text-sm sm:text-base
```

### Bezpečné oblasti
- Bottom nav: `safe-area-bottom` nebo `pb-20 md:pb-0`
- Touch targets: min `44px × 44px` (`.touch-target`)

---

## Checklist před deploym

1. [ ] Otestovat na iPhone SE (320px šířka)
2. [ ] Otestovat landscape režim na mobilu
3. [ ] Zkontrolovat dlouhé texty (150+ znaků)
4. [ ] Zkontrolovat dlouhá slova bez mezer (UUID, URL)
5. [ ] Zkontrolovat prázdné stavy
6. [ ] Zkontrolovat loading stavy
7. [ ] Zkontrolovat error messages

---

## Časté chyby a jejich řešení

### Problém: Text přetéká z containeru
```tsx
// ❌ Špatně
<div className="flex">
  <span>{longText}</span>
</div>

// ✅ Správně
<div className="flex min-w-0">
  <span className="truncate">{longText}</span>
</div>
```

### Problém: Flex item se nezkracuje
```tsx
// ❌ Špatně
<div className="flex-1">{text}</div>

// ✅ Správně
<div className="flex-1 min-w-0 truncate">{text}</div>
```

### Problém: Grid buňky přetékají
```tsx
// ❌ Špatně
<div className="grid grid-cols-3">
  <div>{longContent}</div>
</div>

// ✅ Správně
<div className="grid grid-cols-3">
  <div className="overflow-hidden truncate">{longContent}</div>
</div>
```

### Problém: Table rozbíjí layout
```tsx
// ✅ Správně - table v scrollovacím containeru
<div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
  <table className="min-w-[600px] sm:min-w-0">
    ...
  </table>
</div>
```
