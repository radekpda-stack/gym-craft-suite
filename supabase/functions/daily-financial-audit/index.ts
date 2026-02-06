import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuditResult {
  entity_type: string;
  entity_id: string;
  entity_name: string;
  stored_balance: number;
  ledger_balance: number;
  discrepancy: number;
  needs_fix: boolean;
}

interface FixResult {
  success: boolean;
  entity_type: string;
  entity_id: string;
  old_balance: number;
  ledger_balance: number;
  new_balance: number;
  adjustment: number;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log("=== Daily Financial Audit Started ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Run audit to find all discrepancies
    console.log("Step 1: Running balance audit...");
    const { data: auditResults, error: auditError } = await supabase.rpc(
      "rpc_audit_all_balances"
    );

    if (auditError) {
      console.error("Audit error:", auditError);
      throw new Error(`Audit failed: ${auditError.message}`);
    }

    const discrepancies = (auditResults as AuditResult[]) || [];
    const itemsToFix = discrepancies.filter((d) => d.needs_fix);

    console.log(`Total entities audited: ${discrepancies.length}`);
    console.log(`Discrepancies found: ${itemsToFix.length}`);

    if (itemsToFix.length === 0) {
      console.log("✅ No discrepancies found. All balances are correct.");
      
      // Store successful audit result
      await supabase.from("app_settings").upsert(
        {
          key: "last_financial_audit",
          value: {
            timestamp: new Date().toISOString(),
            audited: discrepancies.length,
            discrepancies_found: 0,
            fixed: 0,
            errors: 0,
            duration_ms: Date.now() - startTime,
            status: "clean",
          },
          description: "Last automatic financial audit result",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" }
      );
      
      return new Response(
        JSON.stringify({
          success: true,
          message: "No discrepancies found",
          audited: discrepancies.length,
          fixed: 0,
          duration_ms: Date.now() - startTime,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Log discrepancies before fixing
    console.log("\n=== Discrepancies to fix ===");
    for (const item of itemsToFix) {
      console.log(
        `  ${item.entity_type}: ${item.entity_name} (${item.entity_id})`
      );
      console.log(
        `    Stored: ${item.stored_balance}, Ledger: ${item.ledger_balance}, Diff: ${item.discrepancy}`
      );
    }

    // Step 3: Automatically fix each discrepancy
    console.log("\nStep 2: Fixing discrepancies...");
    const fixResults: FixResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const item of itemsToFix) {
      try {
        const { data: fixResult, error: fixError } = await supabase.rpc(
          "rpc_fix_balance_discrepancy",
          {
            p_entity_type: item.entity_type,
            p_entity_id: item.entity_id,
          }
        );

        if (fixError) {
          console.error(
            `❌ Failed to fix ${item.entity_name}:`,
            fixError.message
          );
          fixResults.push({
            success: false,
            entity_type: item.entity_type,
            entity_id: item.entity_id,
            old_balance: item.stored_balance,
            ledger_balance: item.ledger_balance,
            new_balance: item.stored_balance,
            adjustment: 0,
            error: fixError.message,
          });
          errorCount++;
        } else {
          const result = fixResult as FixResult;
          console.log(
            `✅ Fixed ${item.entity_name}: ${result.old_balance} → ${result.new_balance} (${result.adjustment > 0 ? "+" : ""}${result.adjustment})`
          );
          fixResults.push(result);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Exception fixing ${item.entity_name}:`, err);
        fixResults.push({
          success: false,
          entity_type: item.entity_type,
          entity_id: item.entity_id,
          old_balance: item.stored_balance,
          ledger_balance: item.ledger_balance,
          new_balance: item.stored_balance,
          adjustment: 0,
          error: err instanceof Error ? err.message : "Unknown error",
        });
        errorCount++;
      }
    }

    // Step 4: Log summary
    const duration = Date.now() - startTime;
    console.log("\n=== Audit Complete ===");
    console.log(`Duration: ${duration}ms`);
    console.log(`Entities audited: ${discrepancies.length}`);
    console.log(`Discrepancies found: ${itemsToFix.length}`);
    console.log(`Successfully fixed: ${successCount}`);
    console.log(`Errors: ${errorCount}`);

    // Step 5: Store audit result in app_settings for dashboard visibility
    const auditSummary = {
      timestamp: new Date().toISOString(),
      audited: discrepancies.length,
      discrepancies_found: itemsToFix.length,
      fixed: successCount,
      errors: errorCount,
      duration_ms: duration,
      status: errorCount > 0 ? "partial" : "fixed",
      details: fixResults.slice(0, 20), // Keep last 20 for logs
    };

    await supabase.from("app_settings").upsert(
      {
        key: "last_financial_audit",
        value: auditSummary,
        description: "Last automatic financial audit result",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: `Fixed ${successCount} discrepancies`,
        audited: discrepancies.length,
        discrepancies_found: itemsToFix.length,
        fixed: successCount,
        errors: errorCount,
        duration_ms: duration,
        details: fixResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("=== Audit Failed ===", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        duration_ms: Date.now() - startTime,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
