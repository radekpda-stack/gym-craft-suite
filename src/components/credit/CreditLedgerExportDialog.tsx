import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, subDays, subMonths } from "date-fns";
import { cs } from "date-fns/locale";
import { FileText, Download, Calendar, Settings2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  downloadCreditLedgerPdf,
  CreditLedgerData,
  LedgerEntry,
  LedgerEntryCategory,
} from "@/lib/creditLedgerPdf";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getCurrentThemeId } from "@/lib/pdfTheme";
import { usePdfSettings } from "@/hooks/usePdfSettings";

interface CreditLedgerExportDialogProps {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  trigger?: React.ReactNode;
  isGroupBudget?: boolean;
  /** Alias for isGroupBudget */
  isSharedBudget?: boolean;
  budgetGroupId?: string;
  groupName?: string;
}

// Map transaction types to ledger categories
function mapTypeToCategory(type: string): LedgerEntryCategory {
  switch (type) {
    case 'payment':
      return 'TOPUP';
    case 'training':
      return 'TRAINING';
    case 'product':
      return 'PRODUCT';
    case 'manual':
      return 'ADJUSTMENT';
    case 'transfer':
      return 'TRANSFER';
    case 'canceled_training':
      return 'CANCELLATION';
    default:
      return 'ADJUSTMENT';
  }
}

export function CreditLedgerExportDialog({
  clientId,
  clientName,
  clientEmail,
  trigger,
  isGroupBudget,
  isSharedBudget,
  budgetGroupId,
  groupName,
}: CreditLedgerExportDialogProps) {
  // Use either isGroupBudget or isSharedBudget
  const isGroup = isGroupBudget || isSharedBudget;
  const [open, setOpen] = useState(false);
  const [customStart, setCustomStart] = useState<Date>(subMonths(new Date(), 1));
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [includeNotes, setIncludeNotes] = useState(false);
  const [includeRunningBalance, setIncludeRunningBalance] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Get PDF settings
  const { data: pdfSettings } = usePdfSettings();

  // Fetch company settings
  const { data: companySettings } = useQuery({
    queryKey: ["companySettings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "company_profile")
        .single();
      return data?.value as {
        name?: string;
        id?: string;
        address?: string;
        email?: string;
        phone?: string;
        web?: string;
        logoUrl?: string;
      } | null;
    },
    enabled: open,
  });

  const periodStart = useMemo(() => startOfDay(customStart), [customStart]);
  const periodEnd = useMemo(() => endOfDay(customEnd), [customEnd]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Get client IDs for the query
      let clientIds: string[] = [clientId];
      let clientNamesMap: Record<string, string> = { [clientId]: clientName };
      
      if (budgetGroupId) {
        const { data: members } = await supabase
          .from("client_budget_members")
          .select("client_id, clients(name)")
          .eq("group_id", budgetGroupId);
        
        if (members?.length) {
          clientIds = members.map(m => m.client_id);
          members.forEach(m => {
            clientNamesMap[m.client_id] = (m.clients as any)?.name || 'Neznámý';
          });
        }
      }

      // Fetch all transactions for the period
      let query = supabase
        .from("credit_transactions")
        .select("id, client_id, amount, type, description, created_at, payment_method")
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString())
        .order("created_at", { ascending: true });

      if (budgetGroupId) {
        query = query.or(`client_id.in.(${clientIds.join(',')}),group_id.eq.${budgetGroupId}`);
      } else {
        query = query.eq("client_id", clientId);
      }

      const { data: transactions, error } = await query;
      
      if (error) throw error;

      // Calculate opening balance - sum of all transactions before period start
      let openingBalanceQuery = supabase
        .from("credit_transactions")
        .select("amount")
        .lt("created_at", periodStart.toISOString());

      if (budgetGroupId) {
        openingBalanceQuery = openingBalanceQuery.or(`client_id.in.(${clientIds.join(',')}),group_id.eq.${budgetGroupId}`);
      } else {
        openingBalanceQuery = openingBalanceQuery.eq("client_id", clientId);
      }

      const { data: priorTransactions } = await openingBalanceQuery;
      
      const openingBalance = (priorTransactions || []).reduce(
        (sum, t) => sum + (t.amount || 0), 
        0
      );

      // Build ledger entries
      const entries: LedgerEntry[] = (transactions || []).map(tx => ({
        id: tx.id,
        occurredAt: new Date(tx.created_at),
        category: mapTypeToCategory(tx.type),
        description: tx.description || getDefaultDescription(tx.type),
        consumerName: budgetGroupId ? clientNamesMap[tx.client_id] : undefined,
        amountCzk: tx.amount,
        note: undefined, // Notes not stored in current schema
      }));

      // Calculate closing balance
      const closingBalance = openingBalance + entries.reduce((sum, e) => sum + e.amountCzk, 0);

      // Prepare data
      const ledgerData: CreditLedgerData = {
        entityName: budgetGroupId ? (groupName || clientName) : clientName,
        entityEmail: clientEmail,
        entityType: budgetGroupId ? 'group' : 'client',
        periodStart,
        periodEnd,
        entries,
        openingBalance,
        closingBalance,
        companyName: companySettings?.name,
        companyId: companySettings?.id,
        companyAddress: companySettings?.address,
        companyEmail: companySettings?.email,
        companyPhone: companySettings?.phone,
        companyWeb: companySettings?.web,
        companyLogoUrl: companySettings?.logoUrl,
      };

      // Generate and download PDF
      const currentTheme = getCurrentThemeId();
      const documentNumber = await downloadCreditLedgerPdf(ledgerData, { 
        includeNotes,
        includeRunningBalance,
        themeId: currentTheme,
        pdfSettings: pdfSettings,
      });

      toast.success(`PDF výpis ${documentNumber} byl vygenerován`);
      setOpen(false);
    } catch (error) {
      console.error("Error generating credit ledger PDF:", error);
      toast.error("Chyba při generování výpisu");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Export PDF: Výpis kreditu
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Výpis kreditu (CZK)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Period selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Období
            </Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !customStart && "text-muted-foreground"
                    )}
                  >
                    {format(customStart, "d. M. yyyy", { locale: cs })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={customStart}
                    onSelect={(date) => date && setCustomStart(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <span className="self-center text-muted-foreground">–</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "flex-1 justify-start text-left font-normal",
                      !customEnd && "text-muted-foreground"
                    )}
                  >
                    {format(customEnd, "d. M. yyyy", { locale: cs })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarPicker
                    mode="single"
                    selected={customEnd}
                    onSelect={(date) => date && setCustomEnd(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Možnosti
            </Label>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="includeRunningBalance" className="font-normal cursor-pointer">
                  Zahrnout zůstatek po položce
                </Label>
                <Switch
                  id="includeRunningBalance"
                  checked={includeRunningBalance}
                  onCheckedChange={setIncludeRunningBalance}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="includeNotes" className="font-normal cursor-pointer">
                  Zahrnout poznámky
                </Label>
                <Switch
                  id="includeNotes"
                  checked={includeNotes}
                  onCheckedChange={setIncludeNotes}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-secondary/50 rounded-lg p-3 text-sm space-y-1">
            <p className="font-medium">
              {budgetGroupId ? (groupName || clientName) : clientName}
              {budgetGroupId && <span className="text-muted-foreground ml-1">(skupina)</span>}
            </p>
            {clientEmail && (
              <p className="text-muted-foreground">{clientEmail}</p>
            )}
            <p className="text-muted-foreground">
              Období: {format(periodStart, "d. M. yyyy", { locale: cs })} – {format(periodEnd, "d. M. yyyy", { locale: cs })}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Zrušit
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
            <Download className="h-4 w-4" />
            {isGenerating ? "Generuji..." : "Stáhnout PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper to get default description for transaction types
function getDefaultDescription(type: string): string {
  switch (type) {
    case 'payment': return 'Dobití kreditu';
    case 'training': return 'Osobní trénink';
    case 'product': return 'Produkt';
    case 'manual': return 'Ruční úprava';
    case 'transfer': return 'Převod';
    case 'canceled_training': return 'Zrušený trénink';
    default: return 'Transakce';
  }
}
