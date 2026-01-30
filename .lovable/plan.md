
Cíl: Notifikační centrum musí být 100% klikatelné na iPadu i desktopu a klik vždy otevře správný detail (inspektor dialog / konkrétní stránku). Zároveň nesmí přetékat mimo obrazovku iPadu.

## 1) Audit příčiny (co je teď objektivně špatně)
### 1.1 Dialogy se otevírají “pod” notifikačním sheetem
- `SheetContent` v `NotificationCenter.tsx` má explicitně `z-[80]`.
- Globální `DialogContent` má `z-50` (viz `src/components/ui/dialog.tsx`).
- I když v handleru voláme `setSheetOpen(false)`, Sheet se zavírá animací (`duration-300`) a ještě chvíli fyzicky existuje na obrazovce. Pokud v tom okamžiku nastavíme `dialogOpen(true)`, dialog se sice otevře, ale je schovaný pod SheetContent → uživatel má pocit “nic se nestalo”.

Tohle přesně odpovídá hlášení “kliknu a nic”.

### 1.2 Klikání na iPadu může “sežrat” swipe/drag logika
- `UnifiedNotificationItem` používá `framer-motion` `drag="x"`.
- Na dotykových zařízeních často dochází k drobnému pohybu prstu i při tapnutí → komponenta to vyhodnotí jako drag a klik se neprovede (nebo je velmi nespolehlivý).
- V kódu je ochrana `if (isDragging) return;` – to může na iPadu způsobit, že tap nic neudělá.

### 1.3 Přetékání / špatná výška na iPadu
- `SheetContent` je `h-full` z variant, ale má zároveň `overflow-y-auto`.
- Uvnitř je ještě `ScrollArea className="flex-1"`, ale bez explicitní výšky a bez ošetření `max-h`/`dvh`.
- Na iPadu (a ještě víc v landscape) je velmi snadné “přetéci” pod spodní hranu (a navíc safe-area), protože hlavička + search zabere výšku a zbytek nemá striktně definované chování.

## 2) Návrh řešení (robustní, důsledné, jednotné)
### 2.1 Změna architektury kliknutí: “close-then-open” (jeden zdroj pravdy)
Implementace v `NotificationCenter.tsx`:
- Zavedu koncept “pending action”:
  - Klik na notifikaci neotevře dialog hned.
  - Místo toho uloží, co se má stát (např. `{ type: 'openNutrition', notification }`), zavře Sheet (`setSheetOpen(false)`).
  - Jakmile Sheet opravdu dojede do zavřeného stavu, teprve potom vykonáme pending akci (otevřeme dialog / navigaci).

Technicky:
- `handleSheetOpenChange(open)` už existuje. Větší spolehlivost:
  - při `open === false` spustit `flushPendingAction()` v `requestAnimationFrame()` nebo krátkém `setTimeout(0/50ms)`.
- Výhoda: dialog se nikdy nebude otevírat “pod” sheetem.

### 2.2 Z-index jako druhá pojistka (aby nic nešlo “pod” nic)
- U detail dialogů používaných z NotificationCenter (NutritionEntryDetailDialog, WorkoutLogDetailDialog, ProfileUpdateDetailDialog, BirthdayDetailDialog, AnniversaryDetailDialog, FeedbackDetailDialog) nastavím vyšší z-index pro jejich overlay i content (např. `z-[120]`).
- To lze udělat:
  1) buď přes `className` prop na DialogContent v těchto dialozích (preferované – scoped jen na notifikační inspektory),
  2) nebo (méně vhodné) globálně v `src/components/ui/dialog.tsx`.

Cíl: i kdyby se někde Sheet ještě “dopohyboval”, dialog bude vizuálně navrchu.

### 2.3 Vypnutí / úprava swipe gest na dotykových zařízeních (iPad) pro 100% klik
- Na iPadu je prioritou “tap otevře detail”.
- Upravím `UnifiedNotificationItem.tsx`:
  - Buď detekce touch zařízení a `enableSwipe={false}` pro dotyk (nejrychlejší a nejspolehlivější).
  - Nebo přesnější tap/drag rozlišení:
    - použít `onPointerDown` uložit start X/Y
    - na `onPointerUp` pokud delta < např. 6px, brát jako click (i kdyby framer-motion považoval gesto za drag)
    - případně použít `onTap` z framer-motion.
- Doporučení pro “čistší, rychlý a 100% spolehlivý” workflow: na touch zařízeních swipe vypnout, a akce “Přečteno / Smazat” dát jako explicitní tlačítka (už tam jsou). Swipe je hezký, ale rizikový.

### 2.4 Sjednocení chování: každý typ notifikace musí otevřít konkrétní “okno události”
Teď je nekonzistence:
- “Nutrition” single notifikace naviguje na `/nutrition/client/:id`, zatímco aggregated item otvírá dialog.
Změním tak, aby:
- klik na nutrition notifikaci vždy otevřel `NutritionEntryDetailDialog` (inspektor dne).
- klik na workout notifikaci vždy otevřel `WorkoutLogDetailDialog`.
- klik na feedback otevřel `FeedbackDetailDialog` (a pokud není dohledatelné, fallback na `/trainings/:id` nebo `/clients/:id?tab=history`).
- diagnostiky: buď dialog (pokud existuje), nebo jednoznačný fallback na profil klienta, ale opět přes pending action (close-then-navigate).

Výsledek: uživatel nikdy neuvidí “nic”.

### 2.5 iPad overflow fix: pevná výška + správné scrollování + safe-area
V `NotificationCenter.tsx` upravím layout:
- `SheetContent` dostane:
  - `h-[100dvh] max-h-[100dvh] overflow-hidden` (ScrollArea bude jediný scroll)
  - `pb-safe` / `safe-area-bottom` (už existuje ve variantách pro bottom, ale tady jsme right sheet; přidáme padding bottom)
- `ScrollArea` dostane explicitní výšku přes flex:
  - header + search + settings jsou `shrink-0`
  - content bude `flex-1 min-h-0` (kritické pro správný flex scroll na iOS)
- Tím se notif nikdy “nevyteče” mimo obrazovku a bude korektně scrollovat.

## 3) Konkrétní soubory a změny
1) `src/components/notifications/NotificationCenter.tsx`
- Přidat “pendingAction” state + `flushPendingAction` mechaniku.
- Upravit všechny click handlery (single i aggregated), aby:
  - jen nastavily pendingAction
  - zavřely sheet
  - nic dalšího nedělaly okamžitě
- Změnit nutrition click z “navigate” na “open NutritionEntryDetailDialog”.
- Opravit layout pro iPad: `SheetContent` + `ScrollArea` (min-h-0, overflow-hidden, 100dvh).

2) `src/components/notifications/UnifiedNotificationItem.tsx`
- Ošetřit dotykové zařízení:
  - buď vypnout swipe na touch (preferované)
  - nebo přepsat click logiku na pointer/tap-friendly implementaci.
- Ponechat swipe funkci pro desktop myš (kde je spolehlivá).

3) Notifikační inspektor dialogy (podle potřeby)
- `src/components/notifications/NutritionEntryDetailDialog.tsx`
- `src/components/notifications/WorkoutLogDetailDialog.tsx`
- `src/components/feedback/FeedbackDetailDialog.tsx` (pokud používá stejné Dialog primitives)
- případně další detail dialogy
Změna: přidat vyšší `z-index` přes className na Dialog overlay/content (jen pro tyto dialogy).

## 4) Testovací scénáře (musí projít)
### Funkční kliky
- iPad: tap na “Honza Kimzo cvičil” → otevře WorkoutLogDetailDialog se jménem klienta a detaily.
- iPad: tap na “Bubáková Petra dnes zapisuje stravu” → otevře NutritionEntryDetailDialog s denními záznamy.
- Tap na feedback notifikaci → otevře FeedbackDetailDialog, případně fallback navigace.
- Tap na aggregated notification → rozbalí, tap na sub-item → otevře odpovídající detail.

### Z-index / overlay
- Při otevření detail dialogu nesmí být nic “pod sheetem” a uživatel musí vždy vidět dialog.
- Zavření dialogu nevrací rozbitý stav sheetu.

### Layout
- Notifikace na iPadu nepřetékají mimo obrazovku.
- List je scrollovatelný, header zůstává nahoře, settings dole fungují.

## 5) Minimální otázky (jen pokud narazíme na rozhodnutí)
- Chceš na iPadu zachovat swipe gesta (přečteno/smazat), nebo je prioritou 100% klik (doporučuji swipe vypnout na touch)?
- U “Strava” notifikací: preferuješ vždy “inspektor dialog dne” (rychlé ověření) nebo přímý přechod do celé stránky výživy klienta? (v plánu počítám s dialogem, protože chceš “otevřít to okno události”.)

## 6) Kritéria hotovo
- “Kliknu na notifikaci → vždy se otevře konkrétní okno události (dialog / stránka)”.
- Žádné “nic se nestalo”.
- Žádné přetékání na iPadu.
- Jednotné chování pro single i aggregated notifikace.
