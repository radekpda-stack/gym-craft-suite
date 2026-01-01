# App Audit Pack - Technical Audit Report

> **Verze:** 1.0  
> **Datum:** 2026-01-01  
> **Typ:** Standard (docs + diagnostics + events/errors)

---

## 📊 Executive Summary

Aplikace je robustní fitness trainer management systém postavený na React + Supabase. Audit identifikoval několik oblastí pro zlepšení stability, výkonu a integrity dat.

### Kritické nálezy
| Priorita | Oblast | Popis |
|----------|--------|-------|
| 🔴 HIGH | Data Integrity | Chybí idempotence pro badge/XP operace |
| 🔴 HIGH | Data Integrity | Chybí unique constraints na kritických tabulkách |
| 🟡 MEDIUM | Performance | Chybí indexy pro analytické dotazy |
| 🟡 MEDIUM | Performance | Chybí paginace pro velké seznamy |
| 🟢 LOW | Security | Extension v public schématu (flagováno linterem) |

---

## 1️⃣ Data Integrity Audit

### 1.1 Idempotence Issues

#### Problem: Badge Duplikace
```
Lokace: src/hooks/useClientGamification.ts
Riziko: Dvojité udělení odznaku při retry/network failure
```

**Současný stav:**
- `client_badges` tabulka nemá UNIQUE constraint na `(client_id, badge_id)`
- Insert operace může vytvořit duplikáty

**Řešení (Migration):**
```sql
-- Přidat unique constraint pro badge idempotence
ALTER TABLE public.client_badges 
ADD CONSTRAINT uq_client_badge UNIQUE (client_id, badge_id);
```

#### Problem: XP Duplikace
```
Lokace: src/hooks/useClientGamification.ts - useConfirmWorkout
Riziko: Dvojité přidání XP za stejný den
```

**Současný stav:**
- Existuje constraint na `performed_date` ale pouze partial
- Error handling spoléhá na `23505` error code

**Řešení:** ✅ Již částečně implementováno - constraint existuje

#### Problem: Challenge Submission Duplikace
```
Lokace: src/hooks/useChallenges.ts
Riziko: Vícenásobné odeslání výsledku výzvy
```

**Řešení (Migration):**
```sql
-- Přidat unique constraint (pokud allow_multiple_attempts=false)
CREATE UNIQUE INDEX uq_challenge_single_submission 
ON public.challenge_submissions (challenge_id, client_id)
WHERE status != 'rejected';

-- Nebo s idempotence key
ALTER TABLE public.challenge_submissions 
ADD COLUMN idempotency_key UUID DEFAULT gen_random_uuid();
ALTER TABLE public.challenge_submissions 
ADD CONSTRAINT uq_submission_idempotency UNIQUE (idempotency_key);
```

### 1.2 Credit Transaction Atomicity

#### Problem: Non-atomic Credit Operations
```
Lokace: src/hooks/useCreditOperations.ts
Riziko: Partial failure při "odečti kredit + ulož trénink + přidej body"
```

**Současný stav:**
- ✅ `rpc_apply_credit_delta` RPC funkce existuje a je atomická
- ⚠️ Multi-step operace (training completion) nejsou v transakci

**Řešení (Database Function):**
```sql
CREATE OR REPLACE FUNCTION rpc_complete_training_atomic(
  p_training_id UUID,
  p_client_id UUID,
  p_credit_delta INTEGER,
  p_xp_amount INTEGER DEFAULT 10
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- 1. Update training status
  UPDATE training_sessions 
  SET status = 'completed', updated_at = now()
  WHERE id = p_training_id;
  
  -- 2. Apply credit delta (calls existing RPC internally)
  PERFORM rpc_apply_credit_delta(p_client_id, p_credit_delta, 'Training completion');
  
  -- 3. Record XP (with idempotence check)
  INSERT INTO client_confirmed_workouts (
    client_id, performed_at, performed_date, workout_type, confirmed_by, xp, training_session_id
  ) VALUES (
    p_client_id, now(), CURRENT_DATE, 'personal', 'coach', p_xp_amount, p_training_id
  ) ON CONFLICT (client_id, training_session_id) DO NOTHING;
  
  v_result := jsonb_build_object(
    'success', true,
    'training_id', p_training_id,
    'credit_applied', p_credit_delta,
    'xp_awarded', p_xp_amount
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 1.3 Unique Constraints Summary

| Tabulka | Navrhovaný Constraint | Status |
|---------|----------------------|--------|
| `client_badges` | `UNIQUE(client_id, badge_id)` | ❌ Chybí |
| `challenge_submissions` | `UNIQUE(challenge_id, client_id)` conditional | ❌ Chybí |
| `credit_transactions` | `UNIQUE(training_session_id)` pro typ 'training' | ⚠️ Partial |
| `client_confirmed_workouts` | `UNIQUE(client_id, performed_date)` pro client-confirmed | ✅ Existuje |

---

## 2️⃣ Performance Audit

### 2.1 Identifikované Pomalé Dotazy

#### Query 1: Dashboard Aggregations
```typescript
// Lokace: src/hooks/dashboard/useDashboardTrends.ts
// Problém: Multiple parallel queries bez indexů
supabase.from('credit_transactions')
  .select('amount, type')
  .in('type', ['payment', 'manual'])
  .gte('created_at', monthStart)
```

**Doporučené indexy:**
```sql
-- Index pro finanční dotazy podle typu a data
CREATE INDEX idx_credit_transactions_type_date 
ON credit_transactions (type, created_at DESC);

-- Partial index pro platby
CREATE INDEX idx_credit_transactions_payments 
ON credit_transactions (created_at DESC, amount) 
WHERE type IN ('payment', 'manual');
```

#### Query 2: Training Session Queries
```typescript
// Lokace: src/hooks/useTrainingSessions.ts
// Problém: Full table scan při filtrování podle data
.eq('status', 'completed')
.gte('date', startDate)
.lte('date', endDate)
```

**Doporučené indexy:**
```sql
-- Kompozitní index pro status + datum
CREATE INDEX idx_training_sessions_status_date 
ON training_sessions (status, date DESC);

-- Index pro client queries
CREATE INDEX idx_training_sessions_client_date 
ON training_sessions (client_id, date DESC);
```

#### Query 3: Feature Usage Analytics
```typescript
// Lokace: src/hooks/useFeatureStats.ts
// Problém: Agregace přes velkou tabulku
.select('feature_name, feature_category')
.gte('created_at', startDate)
```

**Doporučené indexy:**
```sql
-- Index pro analytiku
CREATE INDEX idx_feature_usage_analytics 
ON feature_usage (created_at DESC, feature_category, feature_name);

-- Partial index pro posledních 90 dní (nejčastější dotaz)
CREATE INDEX idx_feature_usage_recent 
ON feature_usage (created_at DESC) 
WHERE created_at > (CURRENT_DATE - INTERVAL '90 days');
```

### 2.2 Index Recommendations Summary

```sql
-- =============================================
-- PERFORMANCE INDEXES - Priority Order
-- =============================================

-- P1: Critical - Dashboard & Finance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_transactions_type_date 
ON credit_transactions (type, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_status_date 
ON training_sessions (status, date DESC);

-- P2: High - Client queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_training_sessions_client_date 
ON training_sessions (client_id, date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_archived_favorite 
ON clients (is_archived, is_favorite, name);

-- P3: Medium - Analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_usage_analytics 
ON feature_usage (created_at DESC, feature_category);

-- P4: Gamification
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_badges_client 
ON client_badges (client_id, earned_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_challenge_submissions_ranking 
ON challenge_submissions (challenge_id, score_primary ASC, submitted_at ASC);
```

### 2.3 Pagination Recommendations

| Oblast | Současný stav | Doporučení |
|--------|---------------|------------|
| Clients list | ❌ Bez limitu | Cursor-based, 50/page |
| Training sessions | ⚠️ Date-range only | Cursor-based, 20/page |
| Credit transactions | ❌ Bez limitu | Offset, 50/page |
| Feature usage | ⚠️ Aggregated | Pre-aggregated views |
| Challenge submissions | ✅ Challenge-scoped | OK |

**Implementační vzor:**
```typescript
// Cursor-based pagination hook
function usePaginatedClients(pageSize = 50) {
  const [cursor, setCursor] = useState<string | null>(null);
  
  return useInfiniteQuery({
    queryKey: ['clients-paginated'],
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from('clients')
        .select('*')
        .order('name')
        .limit(pageSize);
      
      if (pageParam) {
        query = query.gt('name', pageParam);
      }
      
      const { data } = await query;
      return {
        data,
        nextCursor: data?.[data.length - 1]?.name || null
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}
```

---

## 3️⃣ Error Tracking & Diagnostics

### 3.1 Současný Error Handling

| Komponenta | Error Tracking | Recovery |
|------------|---------------|----------|
| API mutations | ✅ Toast + console | ⚠️ Partial |
| Page navigation | ✅ Analytics | ✅ Error boundary |
| Auth flows | ✅ Full tracking | ✅ Redirect |
| Credit operations | ✅ Full tracking | ✅ Rollback |
| File uploads | ⚠️ Basic | ❌ No retry |

### 3.2 Navrhovaný Error Event Schema

```typescript
interface ErrorEvent {
  error_id: string;
  timestamp: string;
  category: 'api' | 'validation' | 'auth' | 'network' | 'unknown';
  severity: 'critical' | 'error' | 'warning';
  message: string;
  stack_trace?: string; // Anonymizovaný
  user_context: {
    route: string;
    action: string;
    // NO PII - žádné user_id, email, tokens
  };
  recovery_attempted: boolean;
  recovery_successful?: boolean;
}
```

### 3.3 Diagnostics Dashboard Requirements

1. **Real-time error rate** - graf posledních 24h
2. **Top 10 error types** - agregovaný seznam
3. **Error by category** - pie chart
4. **Recovery success rate** - metriky

---

## 4️⃣ Feature Flags System

### 4.1 Navrhovaná Architektura

```typescript
// src/lib/featureFlags.ts
export interface FeatureFlags {
  // Modules
  challenges_enabled: boolean;
  badges_enabled: boolean;
  leaderboard_enabled: boolean;
  nutrition_campaigns_enabled: boolean;
  ai_features_enabled: boolean;
  
  // Experimental
  new_calendar_view: boolean;
  advanced_analytics: boolean;
  
  // Rollout percentage (0-100)
  rollout_percentage?: number;
}

export const DEFAULT_FLAGS: FeatureFlags = {
  challenges_enabled: true,
  badges_enabled: true,
  leaderboard_enabled: true,
  nutrition_campaigns_enabled: true,
  ai_features_enabled: true,
  new_calendar_view: false,
  advanced_analytics: false,
};
```

### 4.2 Database Storage

```sql
-- Feature flags tabulka
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  flag_key TEXT NOT NULL,
  flag_value BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, flag_key)
);

-- RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own flags" ON feature_flags
  FOR ALL USING (auth.uid() = user_id);
```

### 4.3 React Hook

```typescript
// src/hooks/useFeatureFlag.ts
export function useFeatureFlag(flagKey: keyof FeatureFlags): boolean {
  const { user } = useAuth();
  
  const { data } = useQuery({
    queryKey: ['feature-flag', flagKey, user?.id],
    queryFn: async () => {
      if (!user) return DEFAULT_FLAGS[flagKey];
      
      const { data } = await supabase
        .from('feature_flags')
        .select('flag_value')
        .eq('user_id', user.id)
        .eq('flag_key', flagKey)
        .maybeSingle();
      
      return data?.flag_value ?? DEFAULT_FLAGS[flagKey];
    },
    staleTime: 1000 * 60 * 5,
  });
  
  return data ?? DEFAULT_FLAGS[flagKey];
}
```

---

## 5️⃣ E2E Test Scenarios

### 5.1 Critical User Journey: Training Flow

```gherkin
Feature: Complete Training Journey
  
  Scenario: Login → Record Training → Deduct Credit → Feedback → Badge → Leaderboard
    
    # Step 1: Authentication
    Given user navigates to "/login"
    When user enters valid credentials
    Then user is redirected to dashboard
    And session is created in user_sessions table
    
    # Step 2: Create/Complete Training
    Given user navigates to calendar
    When user creates new training for client "Test Client"
    And user completes the training
    Then training_sessions.status = 'completed'
    And feature_usage event is logged
    
    # Step 3: Credit Deduction
    Then credit_transactions record is created with type='training'
    And client.credit_balance is updated (atomic via RPC)
    And NO duplicate transactions exist
    
    # Step 4: Feedback Request
    When feedback is enabled for client
    Then feedback_requests record is created
    And client can access feedback URL
    
    # Step 5: Badge Award
    Given client has completed 10 trainings (milestone)
    When badge evaluation runs
    Then client_badges record is created (idempotent)
    And badge is NOT duplicated on retry
    
    # Step 6: Leaderboard Update
    Given client has leaderboard_visible = true
    When leaderboard is fetched
    Then client appears with correct XP and rank
    
    # Step 7: Analytics Graph
    When trainer views statistics
    Then correct aggregated data is displayed
    And query uses indexed columns
```

### 5.2 Test Checklist

| Test ID | Scenario | Validace | Status |
|---------|----------|----------|--------|
| E2E-001 | Login flow | Session created, redirect | 🔲 TODO |
| E2E-002 | Training CRUD | Create, update, complete, cancel | 🔲 TODO |
| E2E-003 | Credit atomicity | Balance consistent after operations | 🔲 TODO |
| E2E-004 | Badge idempotence | No duplicates on retry | 🔲 TODO |
| E2E-005 | Challenge submission | Single submission per client | 🔲 TODO |
| E2E-006 | Leaderboard accuracy | Correct ranking and XP | 🔲 TODO |
| E2E-007 | Offline recovery | Data synced after reconnect | 🔲 TODO |
| E2E-008 | Concurrent access | No race conditions | 🔲 TODO |

### 5.3 Playwright Test Template

```typescript
// tests/e2e/training-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Training Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email"]', process.env.TEST_EMAIL!);
    await page.fill('[data-testid="password"]', process.env.TEST_PASSWORD!);
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/');
  });

  test('complete training updates credit atomically', async ({ page }) => {
    // Navigate to calendar
    await page.click('[data-testid="nav-calendar"]');
    
    // Create training
    await page.click('[data-testid="quick-add-training"]');
    await page.selectOption('[data-testid="client-select"]', 'test-client-id');
    await page.click('[data-testid="save-training"]');
    
    // Get initial balance
    const initialBalance = await page.locator('[data-testid="client-balance"]').textContent();
    
    // Complete training
    await page.click('[data-testid="complete-training"]');
    await page.waitForResponse(res => res.url().includes('rpc/rpc_apply_credit_delta'));
    
    // Verify balance updated
    const newBalance = await page.locator('[data-testid="client-balance"]').textContent();
    expect(parseInt(newBalance!)).toBeLessThan(parseInt(initialBalance!));
    
    // Verify no duplicate transactions (refresh and check)
    await page.reload();
    const transactionCount = await page.locator('[data-testid="transaction-row"]').count();
    expect(transactionCount).toBe(1);
  });

  test('badge award is idempotent', async ({ page }) => {
    // Trigger badge evaluation multiple times
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        // Simulate badge check
        window.dispatchEvent(new CustomEvent('check-badges'));
      });
    }
    
    // Verify only one badge of each type
    await page.goto('/clients/test-client-id?tab=badges');
    const badges = await page.locator('[data-testid="badge-item"]').all();
    const badgeIds = await Promise.all(badges.map(b => b.getAttribute('data-badge-id')));
    const uniqueIds = [...new Set(badgeIds)];
    
    expect(badgeIds.length).toBe(uniqueIds.length);
  });
});
```

---

## 6️⃣ Migration Plan

### Phase 1: Data Integrity (Week 1)

| Step | SQL/Code | Riziko | Rollback |
|------|----------|--------|----------|
| 1.1 | Add UNIQUE constraint `client_badges` | LOW | DROP CONSTRAINT |
| 1.2 | Add partial UNIQUE `challenge_submissions` | LOW | DROP INDEX |
| 1.3 | Create `rpc_complete_training_atomic` | LOW | DROP FUNCTION |
| 1.4 | Add idempotency_key column | LOW | DROP COLUMN |

### Phase 2: Performance (Week 2)

| Step | SQL | Riziko | Rollback |
|------|-----|--------|----------|
| 2.1 | Create performance indexes | LOW | DROP INDEX |
| 2.2 | Add pagination to hooks | MEDIUM | Revert code |
| 2.3 | Create materialized views for analytics | LOW | DROP VIEW |

### Phase 3: Feature Flags (Week 3)

| Step | Action | Riziko | Rollback |
|------|--------|--------|----------|
| 3.1 | Create feature_flags table | LOW | DROP TABLE |
| 3.2 | Implement useFeatureFlag hook | LOW | Revert code |
| 3.3 | Wrap modules in flag checks | MEDIUM | Revert code |

---

## 7️⃣ Security Considerations

### Anonymizace Logů

```typescript
// src/lib/analytics/sanitize.ts
export function sanitizePayload(payload: Record<string, any>): Record<string, any> {
  const sensitiveKeys = ['password', 'token', 'secret', 'email', 'phone', 'credit_card'];
  const piiKeys = ['name', 'address', 'birth_date', 'health_restrictions'];
  
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => {
      if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
        return [key, '[REDACTED]'];
      }
      if (piiKeys.some(k => key.toLowerCase().includes(k))) {
        return [key, '[PII]'];
      }
      return [key, value];
    })
  );
}
```

### Linter Issues (from Supabase)

1. **Extension in Public** - přesunout rozšíření do vlastního schématu
2. **Leaked Password Protection** - povolit v Auth nastavení

---

## 📋 Action Items Summary

### Immediate (P0)
- [ ] Přidat UNIQUE constraint na `client_badges`
- [ ] Vytvořit atomickou RPC pro training completion
- [ ] Implementovat sanitizaci logů

### Short-term (P1)
- [ ] Přidat performance indexy
- [ ] Implementovat feature flags systém
- [ ] Přidat pagination na clients list

### Medium-term (P2)
- [ ] Nastavit E2E testy s Playwright
- [ ] Vytvořit diagnostics dashboard
- [ ] Materialized views pro analytics

---

*Tento dokument je živý a bude aktualizován s implementací změn.*
