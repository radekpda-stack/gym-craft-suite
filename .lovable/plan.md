

# Audit & Improvement Sprint — Findings & Plan

## CATEGORY 1: CREDIT & BILLING LOGIC (Critical)

### C1: DELETE training does NOT refund credit
**Current:** `useDeleteTrainingSession` (line 625) simply deletes the training row. If the training was completed and credit was deducted, deleting it does NOT create a compensating credit transaction. The credit_transaction row references the training_session_id via foreign key — if CASCADE is set, the transaction row also gets deleted (fixing balance via trigger), but if NOT, the transaction stays orphaned with a dangling reference.
**Fix:** Before deleting, check if training was completed+paid_credit. If so, create a compensating refund transaction, then delete. Show balance change in toast.

### C2: `QuickPaymentDialog` potential double-deduction
**Current:** `QuickPaymentDialog` calls `useUpdateTrainingSession` with `trainingPrices` when `paid_credit` is selected. The `useUpdateTrainingSession` mutation (line 490) only deducts credit when `oldTraining.status !== "completed" && input.status === "completed"`. Since QuickPaymentDialog doesn't change status to completed (only payment_status), this path is NOT triggered — so no double deduction occurs. **This is safe.**
However, it also doesn't create a credit transaction when changing from pending to paid_credit via this dialog. The payment_status gets updated but no credit is actually deducted.
**Fix:** QuickPaymentDialog should use `useChangePaymentMethod` (line 1104) instead of `useUpdateTrainingSession`, which correctly handles credit deduction/refund for payment method changes.

### C3: `useCompleteTrainingSession` is dead code
**Current:** This legacy hook (line 808) is exported from `trainings/index.ts` but never imported or used by any component. All completion paths use `useCompleteTrainingAtomic`. It always sets payment_method to 'credit' and always deducts credit — no option for other payment methods.
**Fix:** Remove `useCompleteTrainingSession` entirely. Remove from exports.

### C4: `useCompleteTrainingSession` reads cached balance instead of ledger
**Current:** Line 876-891 reads `credit_balance` from `clients` table and `shared_balance` from `client_budget_groups` — both are cached values. All other hooks correctly read from `vw_client_ledger_balances`/`vw_group_ledger_balances`.
**Fix:** Moot if we delete C3, but if kept, should use ledger views.

### C5: `usePayTraining` missing idempotency guard
**Current:** `usePayTraining` (useUnpaidTrainings.ts:76) doesn't check if a credit transaction already exists for this training before inserting. Rapid double-taps could create duplicate transactions.
**Fix:** Add check: query `credit_transactions` for existing `training_session_id` before inserting. Or use idempotency key.

### C6: `useChangePaymentMethod` calls `getClientGroupId` twice
**Current:** Lines 1150 and 1166 both call `getClientGroupId(clientId)` — redundant DB call.
**Fix:** Store result in variable and reuse.

---

## CATEGORY 2: UI SIMPLIFICATION

### U1: `QuickPaymentDialog` uses wrong hook
Already covered in C2. Should use `useChangePaymentMethod` for correctness.

### U2: Dead `useCompleteTrainingSession` export pollutes API surface
Covered in C3.

### U3: `EnhancedUnpaidList` shares global payment method state across all items
**Current:** A single `paymentMethod` state controls all unpaid training rows. Changing payment method for one item changes it for all.
**Fix:** Move payment method selection into per-item state or use a Map keyed by training ID.

### U4: `useSharedBudgetBalance.ts` barrel file is redundant
Already identified in previous phases but not deleted due to consumers. Should be cleaned up — redirect imports directly to `useCreditOperations`.

---

## CATEGORY 3: STABILITY & PERFORMANCE

### S1: `useCreditBalance` has `staleTime: 0` — aggressive refetching
**Current:** Every mount and focus triggers a full refetch. Combined with realtime subscription that also invalidates, this causes redundant DB calls.
**Fix:** Set staleTime to 5000ms (matching other critical hooks).

### S2: `useCompleteTrainingAtomic` fire-and-forget background tasks
**Current:** Background tasks (line 239) run without `await` and errors are only logged. If FIFO deduction fails, the trainer sees success but credit lots aren't consumed.
**Fix:** This is intentional (documented as best-effort), but add a delayed re-check or toast warning if background tasks fail.

### S3: `useChangePaymentMethod` redundant `getClientGroupId` calls
Covered in C6.

### S4: `useCompleteTrainingSession` reads `credit_balance` from cached column
Covered in C4 — remove with C3.

---

## Implementation Plan (by category, Credits first)

### Phase A: Credit & Billing Fixes
1. **Fix delete training credit refund (C1):** In `useDeleteTrainingSession`, before deletion check if training was completed with paid_credit. If so, create a compensating `+price` transaction with type `manual` and description "Vratka za smazaný trénink". Then delete.
2. **Fix QuickPaymentDialog (C2/U1):** Replace `useUpdateTrainingSession` with `useChangePaymentMethod` in `QuickPaymentDialog.tsx`. Pass proper params.
3. **Remove dead `useCompleteTrainingSession` (C3):** Delete function from `useTrainingSessions.ts` and remove from `trainings/index.ts` exports.
4. **Add idempotency to `usePayTraining` (C5):** Before inserting credit_transaction, check for existing transaction with same `training_session_id` and type `training`.
5. **Fix double getClientGroupId call (C6):** Store result and reuse in `useChangePaymentMethod`.

### Phase B: UI Simplification
1. **Per-item payment method in EnhancedUnpaidList (U3):** Replace single state with per-training-id Map.
2. **Delete `useSharedBudgetBalance.ts` barrel (U4):** Redirect all imports.

### Phase C: Stability & Performance
1. **Set staleTime: 5000 on useCreditBalance (S1).**
2. **Add warning toast for failed background tasks (S2).**

### Files to modify:
- `src/hooks/useTrainingSessions.ts` — fix delete refund (C1), remove dead code (C3)
- `src/hooks/trainings/index.ts` — remove dead export (C3)
- `src/components/calendar/QuickPaymentDialog.tsx` — use correct hook (C2)
- `src/hooks/useUnpaidTrainings.ts` — idempotency guard (C5)
- `src/hooks/useCreditBalance.ts` — staleTime fix (S1)
- `src/components/clients/EnhancedUnpaidList.tsx` — per-item payment (U3)
- `src/hooks/useCompleteTrainingAtomic.ts` — background task warning (S2)

### Files to delete:
- `src/hooks/useSharedBudgetBalance.ts` (after redirecting imports)

