

# Oprava: Chybějící tréninkové transakce v kartě kreditu

## Příčina problému

Nalezena chyba v zabezpečení přístupu k datům (RLS policy). Funkce `rpc_complete_training_session`, která vytváří transakce při dokončení tréninku, **nenastavuje `user_id`** u záznamů v tabulce `credit_transactions`. 

Pravidlo přístupu k datům ale vyžaduje `auth.uid() = user_id` — takže transakce s prázdným `user_id` jsou pro trenéra **neviditelné**.

**Rozsah problému:** 202 z 499 tréninkových transakcí v databázi má `user_id = NULL` a jsou neviditelné.

## Řešení (2 kroky)

### 1. Opravit RLS policy na `credit_transactions`
Nahradit stávající SELECT policy `"Users can view their own credit_transactions"` novou, která umožní trenérovi vidět i transakce bez `user_id`:

```sql
DROP POLICY "Users can view their own credit_transactions" ON credit_transactions;
CREATE POLICY "Users can view their own credit_transactions" 
  ON credit_transactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR user_id IS NULL);
```

### 2. Backfill — opravit existující záznamy
Nastavit `user_id` u všech existujících transakcí s `NULL` user_id na ID trenéra (jediný uživatel systému):

```sql
UPDATE credit_transactions 
SET user_id = '7f53e3c4-5ae8-421b-b59e-d6bf451b32b7'
WHERE user_id IS NULL;
```

### 3. Opravit `rpc_complete_training_session`
Přidat `user_id` = `p_trainer_id` do obou INSERT příkazů (pro skupinový i individuální kredit), aby se problém neopakoval.

## Žádné změny v kódu
Fronted kód je v pořádku — `useCreditTransactions` a `ClientCreditHeroCard` správně zobrazují data. Problém je čistě na úrovni databáze (RLS + chybějící sloupec v INSERT).

