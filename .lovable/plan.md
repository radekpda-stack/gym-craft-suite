# Chybejici nebo nedodelane veci v aplikaci

## Nalezene problemy

### 1. Poznamky (`/notes`) -- stranka neni dostupna z navigace (KRITICKE)

Stranka Poznamky existuje a ma plnou funkcionalitu (vytvareni, editace, pin, filtry, hledani), ale **neni v zadne navigaci** -- ani v bocnim panelu (desktop), ani v mobilnim menu. Uzivatel se na ni dostane jen pokud zna URL `/notes`.

**Oprava:** Pridat odkaz na `/notes` do sekce "Data & Vykonnost" v `Sidebar.tsx` a `MobileMenu.tsx`.

---

### 2. Stranka Treninky (`Trainings.tsx`) -- 488 radku mrtveho kodu (STREDNI)

Existuje plnohodnotna stranka `src/pages/Trainings.tsx` se seznamem trenunku, filtry, skupinami dle dnu, rychlym dokoncenim atd. Ale **nema zadnou routu v `App.tsx**` a neni nikde importovana. Funkcionalita je castecne pokryta strankou Rozvrh (`SchedulePage`), ale ta nema seznam-view s filtry a vyhledavanim.

**Moznosti:**

- A) Smazat jako mrtvy kod (pokud Rozvrh postacuje)
- B) Pridat routu a nav odkaz (pokud chcete mit i list-view trenunku vedle kalendare)

**Doporuceni:** Pridat jako alternativni pohled -- nektere operace (hledani starych trenunku, filtrovani dle stavu "ceka na platbu") jsou v rozvrhu obtizne.

---

### 3. Mobilni menu chybi Naklady a Statistiky (STREDNI)

V desktop sidebaru je sekce Finance se 3 polozkam (Prodeje, Naklady, Statistiky), ale v mobilnim menu (`MobileMenu.tsx`) je ve Finance **pouze Prodeje**. Na mobilu se tedy uzivatel k nakladum a statistikam nedostane.

**Oprava:** Doplnit `{ to: '/expenses', label: 'Naklady' }` a `{ to: '/statistics', label: 'Statistiky' }` do mobilniho menu.

---

### 4. Vyzvy (`Challenges.tsx`) -- stranka bez routy (NIZKE)

Existuje 440-radkova stranka pro spravu vyzev, ale nema routu v `App.tsx` pro trenera. Vyzvy jsou dostupne jen v klientskem portalu. Trener nema moznost vyzvat spravovat primo z hlavni navigace.

**Oprava:** Pridat routu `/challenges` a nav odkaz v sekci "Data & Vykonnost" (pokud modul `challenges` je zapnuty).

---

## Souhrn oprav


| #   | Problem                            | Soubory                              | Typ                   |
| --- | ---------------------------------- | ------------------------------------ | --------------------- |
| 1   | Poznamky chybi v navigaci          | Sidebar.tsx, MobileMenu.tsx          | Nav fix               |
| 2   | Treninky stranka bez routy         | App.tsx, Sidebar.tsx, MobileMenu.tsx | Obnoveni nebo smazani |
| 3   | Mobilni menu chybi Finance polozky | MobileMenu.tsx                       | Nav fix               |
| 4   | Vyzvy bez trenerske routy          | App.tsx, Sidebar.tsx, MobileMenu.tsx | Nav fix               |


Body 1 a 3 jsou jednoznacne opravy. Body 2 a 4 vyzaduji rozhodnuti -- preferujete pridat odkaz nebo smazat mrtvy kod? Smazat mrtvy kód 