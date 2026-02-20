
# Samoobslužný reset přihlašovacích údajů pro klienty

## Aktuální stav

Klientský portál má v sekci **Nastavení > Účet** pouze formulář na změnu hesla. Email je zobrazen jako disabled pole bez možnosti úpravy. Dialog `CredentialsReminderDialog` (popup po přihlášení) umí měnit email i heslo, ale zmizí po 5 přihlášeních.

## Co se změní

Záložka **Účet** v klientském nastavení bude rozšířena o kompletní sekci "Přihlašovací údaje", kde si klient může kdykoliv:
- Zobrazit svůj aktuální login (email / login identifier)
- Změnit email
- Změnit heslo
- Vidět, kdy naposledy proběhla změna údajů

### Konkrétní úpravy

**1. Rozšíření formuláře v `ClientPortalSettings.tsx` (záložka Účet)**

Stávající karta "Změna hesla" bude nahrazena kartou **"Přihlašovací údaje"**, která bude obsahovat:
- Aktuální email (editovatelný)
- Nové heslo + potvrzení hesla (volitelné)
- Informaci o posledním resetu ("Údaje naposledy změněny: ...")
- Jedno tlačítko "Uložit změny"

Formulář bude volat existující edge funkci `update-client-own-credentials` (stejně jako `CredentialsReminderDialog`), takže logika na backendu zůstane beze změny.

**2. Rozšíření kontextu o `clientAccount` data**

Z `ClientPortalContext` se využije `clientAccount.credentials_changed_at` a `clientAccount.login_identifier` pro zobrazení aktuálních údajů.

### Soubory ke změně

| Soubor | Změna |
|---|---|
| `src/pages/client-portal/ClientPortalSettings.tsx` | Nahrazení karty "Změna hesla" rozšířenou kartou "Přihlašovací údaje" s editací emailu i hesla, voláním edge funkce `update-client-own-credentials`, zobrazením data poslední změny |

### Bezpečnost

- Klient musí být přihlášen (JWT token v requestu)
- Edge funkce `update-client-own-credentials` ověřuje JWT, kontroluje unikátnost emailu a loguje audit event
- Heslo musí mít min. 8 znaků
- Po úspěšné změně se odešle notifikace trenérovi
