
# Oprava klikani na notifikace v Notifikacnim centru

## Identifikovany problem

Analyzou kodu jsem zjistil dva hlavni duvody, proc kliknuti na notifikace nefunguje:

### 1. Slozity system detekce kliku (hlavni pricina)
Komponenta `UnifiedNotificationItem` pouziva vlastni detekci kliku pres `onPointerDown`/`onPointerUp` s velmi prisnymi prahovymi hodnotami:
- Pohyb prstu musi byt mensi nez 10px v obou osach
- Cas stisku musi byt kratsi nez 300ms

Na dotykovych zarizeni i pri beznem "tapnuti" prst casto ujede o vice nez 10px, coz zpusobi, ze klik NENI rozpoznan a nic se nestane.

### 2. Konflikt udalosti u agregovanych notifikaci
Kdyz uzivatel klikne na podpolozku agregovane notifikace (napr. konkretni zaznam stravy), soucasne se spusti i `onPointerUp` na rodicovskem prvku, ktery zbytecne prepina rozbaleni/sbaleni skupiny.

### 3. Nespolehlivy flush po zavreni sheetu
`flushPendingAction` se vola v `handleSheetOpenChange`, ale Radix Dialog (na kterem je Sheet postaven) nemusi vzdy zavolat `onOpenChange` pri programatickem zavreni pres `setSheetOpen(false)`.

---

## Reseni

### A. Nahrazeni pointer-based detekce standardnim onClick

Odstranit slozitou logiku s `onPointerDown`/`onPointerUp`/`touchStartRef`/`didDragRef` a nahradit ji standardnim React `onClick` handlerem na hlavnim prvku notifikace. Framer Motion drag system jiz spravne blokuje `onClick` pri tazeni, takze swipe a klik se nebudou krizit.

### B. Oprava konfliktu u agregovanych podpolozek

Na sub-item buttony pridat `onPointerDown` s `e.stopPropagation()` aby se zabranilo registraci pointer eventu na rodicovskem prvku.

### C. Pridani useEffect safety netu pro flushPendingAction

Pridat `useEffect` v `NotificationCenter`, ktery sleduje `sheetOpen` a pri zmene na `false` zavola `flushPendingAction`. Toto zarucuje, ze akce se provede i kdyz Radix `onOpenChange` nefiruje.

---

## Technicke zmeny

### Soubor 1: `src/components/notifications/UnifiedNotificationItem.tsx`
- Odstranit `touchStartRef`, `didDragRef`, `handlePointerDown`, `handlePointerUp`
- Pridat standardni `onClick` handler na hlavni `motion.div`
- Upravit `handleDragEnd` aby nastavil flag blokujici nasledny onClick
- Sub-item buttony: pridat `onPointerDown={(e) => e.stopPropagation()}`
- Odstranit duplicitni `onTouchEnd` handler na sub-item buttonech (onClick staci)

### Soubor 2: `src/components/notifications/NotificationCenter.tsx`
- Pridat `useEffect` sledujici `sheetOpen` s volanim `flushPendingAction` pri zavreni
- Zachovat stavajici logiku v `handleSheetOpenChange` jako primarni cestu

---

## Dopad

- Kliknuti na notifikaci bude fungovat spolehive na mobilu i desktopu
- Otevre se spravny detail dialog (strava, feedback, trenink atd.)
- Swipe gesta zustanou funkcni na desktopu
- Zadne zmeny v UI vzhledu - pouze oprava spolehlive interakce
