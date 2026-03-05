

# QA Audit — JustMove Asistent

## Kritické problémy (Breaking functionality)

### 1. Navigace na `/auth` místo `/login` — mrtvé přesměrování
**Problém:** Aplikace má route `/login` (UnifiedLogin), ale `/auth` je jen redirect na `/login`. Přesto 5 míst v kódu naviguje přímo na `/auth`:
- `ProtectedRoute.tsx` → `<Navigate to="/auth">`
- `WaitingForApproval.tsx` → `<Navigate to="/auth">`
- `DemoPage.tsx` → `<Navigate to="/auth">`
- `Sidebar.tsx` → `navigate('/auth')` po odhlášení
- `MobileMenu.tsx` → `navigate('/auth')` po odhlášení

**Dopad:** Zbytečný redirect hop (`/auth` → `/login`). Funguje díky redirect route, ale přidává latenci a je matoucí pro debugging.

**Fix:** Nahradit všechny `"/auth"` za `"/login"` v těchto 5 souborech.

### 2. Kliknutí na "Analytika" v Klientech → 404
**Problém:** `Clients.tsx` řádek 313 naviguje na `/clients/analytics`, ale v `App.tsx` je tento route přesměrován na `/statistics?tab=clients`. Redirect existuje, takže to technicky funguje, ale je to zbytečný hop.

**Fix:** Změnit `navigate('/clients/analytics')` na `navigate('/statistics?tab=clients')`.

## Vysoký dopad (High-impact improvements)

### 3. Dashboard nemá link na `/` v mobile bottom nav
**Problém:** `MobileNav.tsx` obsahuje pouze 4 položky: Oznámení, Rozvrh, Klienti, Prodeje + Více. Chybí přímý přístup k Dashboardu — uživatel musí kliknout Více → Dashboard.

**Dopad:** Dashboard je nejpoužívanější stránka, ale na mobilu vyžaduje 2 tapy místo 1.

**Fix:** Přidat Dashboard jako první položku v `mainNavItems` nebo nahradit Oznámení (přesunout do overflow).

### 4. Sidebar defaultně collapsed — skryté labels
**Problém:** `Sidebar.tsx` řádek 129: `useState(true)` — sidebar je defaultně zavřený. Nový uživatel vidí jen ikony bez textů, neví co která ikona znamená.

**Dopad:** Confusing onboarding, zvlášť pro ne-tech uživatele.

**Fix:** Default `false` (expanded) nebo persist stav do localStorage.

### 5. Chybí loading/disabled stav na "Přidat kredit" tlačítku
**Problém:** V `Clients.tsx` handler `handleAddCredit` nemá disabled stav na tlačítku během mutace (`createTransaction.isPending`). Uživatel může kliknout vícekrát.

**Fix:** Přidat `disabled={createTransaction.isPending}` a spinner.

### 6. Password reset redirect URL nesedí
**Problém:** `useAuth.ts` → `resetPasswordForEmail` nastavuje `redirectTo: '/auth?type=recovery'`, ale login page je `/login`. `UnifiedLogin` pak hledá `searchParams.get('type') === 'recovery'`. Redirect z `/auth` na `/login` ztratí query parametry.

**Dopad:** Password reset flow je potenciálně broken — uživatel se po kliknutí na email link nedostane na "Nové heslo" formulář.

**Fix:** Změnit redirectTo na `${window.location.origin}/login?type=recovery`.

## Nice-to-have vylepšení

### 7. Duplicitní toast při trainer login
**Problém:** `handleSignIn` v `UnifiedLogin.tsx` zobrazí success toast a pak `navigate('/')`. Ale `useAuth` hook má `onAuthStateChange` listener, který změní `isAuthenticated`, což triggeruje useEffect na řádku 82-86 s dalším `navigate`. Dva navigace = potenciální race condition.

**Fix:** Odstranit ruční `navigate('/')` z `handleSignIn` — nechat to na useEffect.

### 8. Konzistentní padding na stránkách
**Problém:** Některé stránky (Sales, PerformanceHub) mají `pb-32` pro mobile bottom nav, jiné ne (Index má `pb-36 lg:pb-0` v Layout). Padding by měl být konzistentně v Layout, ne na jednotlivých stránkách.

### 9. Mobile swipe na SchedulePage může kolidovat se scroll
**Problém:** `drag="x"` na week grid může zachytit vertikální scroll gesty na mobilu kvůli `touch-pan-y`.

### 10. Missing `key` prop concern
V `App.tsx` řádky 141-162 — mapping přes `['/zona', '/client']` pro portal routes je funkční, ale vytváří duplicitní route trees.

## Prioritizovaný seznam

| # | Priorita | Problém | Effort |
|---|----------|---------|--------|
| 6 | Kritický | Password reset redirect broken | 5 min |
| 1 | Vysoký | `/auth` → `/login` všude | 10 min |
| 2 | Nízký | Clients analytika redirect hop | 2 min |
| 3 | Vysoký | Dashboard chybí v mobile nav | 5 min |
| 4 | Střední | Sidebar default collapsed | 2 min |
| 5 | Střední | Credit button double-click | 2 min |
| 7 | Nízký | Duplicitní navigate po login | 5 min |
| 8 | Nízký | Padding inkonsistence | 15 min |

## Doporučený postup

Opravit položky 6, 1, 3, 4, 5 v jednom průchodu — celkem ~25 min práce, pokrývá všechny kritické a high-impact problémy.

