

# Celkem utraceno na kartě klienta

## Současný stav

Data **už existují** — hook `useClientLTV` počítá `totalRevenue` (tréninky + produkty). Hodnota se zobrazuje v `ClientSummaryStrip` jako "Celková hodnota" a v `ClientQuickCards` jako LTV tooltip.

Problém: hodnota je schovaná mezi dalšími kartami a není na první pohled vidět.

## Plán

Přidat "Celkem utraceno" přímo do `ClientCreditHeroCard` — to je dominantní karta kreditu v sekci 3, kterou trenér vidí okamžitě. Přidám kompaktní řádek pod stávající kreditový zůstatek:

```
┌─────────────────────────────────────┐
│  💰 Kredit: 4 500 Kč     [+ Dobít] │
│  ─────────────────────────────────  │
│  Celkem utraceno: 87 400 Kč        │  ← NOVÉ
│  (142 tréninků • 14 měsíců)        │  ← NOVÉ
└─────────────────────────────────────┘
```

### Soubory k úpravě

1. **`src/components/clients/ClientCreditHeroCard.tsx`** — přidat `clientId` prop, zavolat `useClientLTV(clientId)`, zobrazit kompaktní řádek s `totalRevenue`, počtem tréninků a měsíci aktivity pod kreditovým zůstatkem.

2. **`src/pages/ClientDetail.tsx`** — předat `clientId={client.id}` do `ClientCreditHeroCard`.

3. **`src/components/clients/ClientSummaryStrip.tsx`** — odstranit kartu "Celková hodnota" (LTV), protože se přesune do hero karty. Ponechat "Tento měsíc" a "Průměr/měsíc" — strip přejde na `grid-cols-2`.

### Očekávaný dopad
- Trenér okamžitě vidí kolik klient utratil — na nejviditelnějším místě karty
- Žádné nové DB queries — `useClientLTV` se jen přesune z jedné komponenty do druhé
- Čistší layout — méně duplicitních informací

