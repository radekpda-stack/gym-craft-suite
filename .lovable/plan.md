
# Audit UI - Nalezené problémy a doporučené opravy

## Shrnutí auditu

Provedl jsem důkladnou analýzu UI komponent a stylů v aplikaci. Obecně je aplikace velmi dobře navržena s konzistentním designovým systémem a korektní implementací overflow handling. Nicméně jsem identifikoval několik oblastí ke zlepšení.

---

## 1. Chybějící definice CSS třídy `hero-card`

**Problém:**
Třída `hero-card` je používána v 3 komponentách (`ClientCard.tsx`, `TodayTimelineCard.tsx`, `HeroAttentionCard.tsx`), ale nemá definici v `index.css`. Vyhledávání v CSS souborech nevrátilo žádné výsledky.

**Důsledek:**
Komponenty používající `hero-card` nemají žádné specifické styly - závisí pouze na dalších třídách jako `p-4`, `rounded-2xl` atd.

**Řešení:**
Přidat definici do `index.css`:

```css
.hero-card {
  @apply glass rounded-2xl border border-border/50;
  box-shadow: var(--shadow-md);
}

.hero-card:hover {
  border-color: hsl(var(--primary) / 0.2);
}
```

---

## 2. Nekonzistentní použití CSS tříd pro karty

**Problém:**
Aplikace používá několik různých přístupů pro karty:
- `glass rounded-2xl` (62 souborů)
- `liquid-glass rounded-2xl` (5 souborů)
- `hero-card` (3 soubory)
- `jm-card` (CSS definice)
- `Card` komponenta s variantami

**Důsledek:**
Nekonzistentní vzhled karet napříč aplikací.

**Řešení:**
Doporučuji sjednotit na tyto varianty:
1. `Card` komponenta pro standardní karty
2. `glass rounded-2xl` pro prémiové floating karty
3. Odstranit duplicitní `liquid-glass` (je aliasem pro `glass`)

---

## 3. Tooltip a Popover - potenciální z-index konflikt

**Problém:**
`TooltipContent` má `z-50`, ale `MobileNav` a některé modály mají také `z-50`. Toto může způsobit překrývání.

**Aktuální stav:**
- `TooltipContent`: z-50
- `MobileNav`: z-50
- `DialogContent`: z-50
- `SheetContent`: z-50

**Řešení:**
Upravit z-index hierarchii v komponentách:

| Komponenta | Doporučený z-index |
|------------|-------------------|
| Tooltip | z-[60] |
| Popover | z-[55] |
| Dialog/Sheet | z-50 |
| MobileNav | z-50 |
| Sidebar | z-40 |

---

## 4. CommandItem - chybějící hover stav viditelnost

**Problém:**
V `command.tsx` má `CommandItem` hover stav definovaný pouze pomocí `data-[selected='true']:bg-accent`, což může být málo viditelné v některých tématech.

**Řešení:**
Přidat explicitní hover stav:

```tsx
// Změna v command.tsx řádek 107-109
className={cn(
  "relative flex cursor-default select-none items-center rounded-lg px-2 py-1.5 text-sm outline-none transition-colors hover:bg-secondary data-[disabled=true]:pointer-events-none data-[selected='true']:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
  className,
)}
```

---

## 5. Progress komponenta - chybějící border-radius konzistence

**Problém:**
`Progress` komponenta používá `rounded-full`, zatímco ostatní komponenty používají `rounded-xl` nebo `rounded-2xl`.

**Řešení:**
Ponechat `rounded-full` pro progress bary (je to správné pro lineární progress), ale přidat možnost varianty:

```tsx
// Přidat variant prop pokud potřeba
```

---

## 6. Badge - truncate pro dlouhé texty

**Problém:**
`Badge` má `whitespace-nowrap` a `max-w-full overflow-hidden`, ale chybí `truncate` pro text uvnitř.

**Aktuální stav:**
```tsx
"inline-flex items-center rounded-full border px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 whitespace-nowrap max-w-full overflow-hidden"
```

**Řešení:**
Text se sice neořízne díky `whitespace-nowrap`, ale přetéká. Přidat `truncate`:

```tsx
"inline-flex items-center rounded-full border px-2 sm:px-2.5 py-0.5 text-[10px] sm:text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 max-w-full truncate"
```

Odstranit `whitespace-nowrap` a přidat `truncate` zajistí, že dlouhé texty budou správně oříznuty.

---

## 7. TabsTrigger - chybí min-w-0 pro flex-shrink

**Problém:**
`TabsTrigger` má `shrink-0`, což brání zmenšování, ale v některých případech to může způsobit přetečení.

**Aktuální stav:**
```tsx
"inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium ... shrink-0 min-w-0"
```

**Řešení:**
Stav je správný - `min-w-0` je přítomno. Žádná změna není potřeba.

---

## 8. Button - přidání min-w-0 pro flex kontexty

**Problém:**
`Button` komponenta nemá `min-w-0`, což může způsobit přetečení v některých flex layoutech.

**Řešení:**
Přidat `min-w-0` do základních stylů:

```tsx
// button.tsx řádek 8
"inline-flex items-center justify-center gap-2 whitespace-nowrap rounded text-sm font-semibold ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 select-none min-w-0"
```

---

## 9. Sheet title - chybí truncate pro dlouhé názvy

**Problém:**
`SheetTitle` nemá truncate nebo break-words pro dlouhé titulky.

**Řešení:**
Přidat `break-words pr-8` (prostor pro close button):

```tsx
// sheet.tsx řádek 88
className={cn("text-lg font-semibold text-foreground break-words pr-8", className)}
```

---

## 10. AlertDialogTitle - chybí pr-X pro close button prostor

**Problém:**
`AlertDialogTitle` nemá padding-right pro případné close buttony.

**Řešení:**
AlertDialog nemá close button jako Dialog, takže toto není problém.

---

## Soubory k úpravě

| Soubor | Změna | Priorita |
|--------|-------|----------|
| `src/index.css` | Přidat definici `.hero-card` | Vysoká |
| `src/components/ui/badge.tsx` | Nahradit `whitespace-nowrap` za `truncate` | Střední |
| `src/components/ui/button.tsx` | Přidat `min-w-0` | Střední |
| `src/components/ui/command.tsx` | Přidat `hover:bg-secondary` do CommandItem | Nízká |
| `src/components/ui/tooltip.tsx` | Změnit z-index na z-[60] | Střední |
| `src/components/ui/popover.tsx` | Změnit z-index na z-[55] | Střední |
| `src/components/ui/sheet.tsx` | Přidat `break-words pr-8` do SheetTitle | Nízká |

---

## Implementační plán

### Fáze 1: Kritické opravy (doporučeno okamžitě)

1. **Přidat `.hero-card` do CSS** - třída je používána ale nedefinována
2. **Opravit z-index hierarchii** - zamezí překrývání tooltipů

### Fáze 2: Prevence overflow (střední priorita)

3. **Badge truncate** - dlouhé texty v badges
4. **Button min-w-0** - flexbox kontexty

### Fáze 3: Vylepšení UX (nízká priorita)

5. **CommandItem hover** - lepší vizuální feedback
6. **SheetTitle break-words** - dlouhé nadpisy

---

## Pozitivní zjištění

Aplikace má velmi dobře implementovaný overflow handling:
- `DialogContent` má `max-h-[85vh] overflow-y-auto overflow-x-hidden`
- `SheetContent` má `overflow-y-auto overflow-x-hidden max-h-[85vh]`
- `Table` má wrapper s `overflow-x-auto`
- `TabsList` má `overflow-x-auto scrollbar-hide`
- UI_GUIDELINES.md je dobře strukturován a dodržován
