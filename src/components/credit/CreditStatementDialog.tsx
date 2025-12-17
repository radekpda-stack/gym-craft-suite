import { useState, useMemo } from "react";
import { format, startOfDay, endOfDay, subDays } from "date-fns";
import { cs } from "date-fns/locale";
import { FileText, Download, Calendar, Globe } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  downloadCreditStatementPdf,
  CreditStatementItem,
  CreditStatementData,
} from "@/lib/creditStatementPdf";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreditStatementDialogProps {
  clientId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  trigger?: React.ReactNode;
  isSharedBudget?: boolean;
  budgetGroupId?: string;
}

export function CreditStatementDialog({
  clientId,
  clientName,
  clientEmail,
  clientPhone,
  trigger,
  isSharedBudget,
  budgetGroupId,
}: CreditStatementDialogProps) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<"cs" | "en">("cs");
  const [periodType, setPeriodType] = useState<"lastTopup" | "custom">(
    "lastTopup"
  );
  const [customStart, setCustomStart] = useState<Date>(subDays(new Date(), 30));
  const [customEnd, setCustomEnd] = useState<Date>(new Date());
  const [includeCanceled, setIncludeCanceled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch last credit topup date
  const { data: lastTopup } = useQuery({
    queryKey: ["lastCreditTopup", clientId, budgetGroupId],
    queryFn: async () => {
      const query = supabase
        .from("credit_transactions")
        .select("created_at")
        .eq("type", "topup")
        .order("created_at", { ascending: false })
        .limit(1);

      if (budgetGroupId) {
        query.eq("group_id", budgetGroupId);
      } else {
        query.eq("client_id", clientId);
      }

      const { data } = await query;
      return data?.[0]?.created_at
        ? new Date(data[0].created_at)
        : subDays(new Date(), 30);
    },
    enabled: open,
  });

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
        contact?: string;
      } | null;
    },
    enabled: open,
  });

  const periodStart = useMemo(() => {
    if (periodType === "custom") return startOfDay(customStart);
    return lastTopup ? startOfDay(lastTopup) : startOfDay(subDays(new Date(), 30));
  }, [periodType, customStart, lastTopup]);

  const periodEnd = useMemo(() => {
    if (periodType === "custom") return endOfDay(customEnd);
    return endOfDay(new Date());
  }, [periodType, customEnd]);

  const handleGenerate = async () => {
    setIsGenerating(true);

    try {
      // Fetch training sessions paid from credit
      const trainingsQuery = supabase
        .from("training_sessions")
        .select("id, date, final_price, status, is_late_cancellation, notes, clients(name)")
        .gte("date", periodStart.toISOString())
        .lte("date", periodEnd.toISOString())
        .in("payment_status", ["paid_credit"]);

      if (budgetGroupId) {
        // Get all clients in the budget group
        const { data: members } = await supabase
          .from("client_budget_members")
          .select("client_id")
          .eq("group_id", budgetGroupId);
        
        if (members?.length) {
          trainingsQuery.in("client_id", members.map(m => m.client_id));
        }
      } else {
        trainingsQuery.eq("client_id", clientId);
      }

      if (!includeCanceled) {
        trainingsQuery.neq("status", "canceled");
      }

      const { data: trainings } = await trainingsQuery;

      // Fetch product transactions
      const productsQuery = supabase
        .from("credit_transactions")
        .select("created_at, amount, description, products(name)")
        .eq("type", "product_sale")
        .gte("created_at", periodStart.toISOString())
        .lte("created_at", periodEnd.toISOString());

      if (budgetGroupId) {
        productsQuery.eq("group_id", budgetGroupId);
      } else {
        productsQuery.eq("client_id", clientId);
      }

      const { data: products } = await productsQuery;

      // Build items list
      const items: CreditStatementItem[] = [];

      // Add trainings
      trainings?.forEach((training) => {
        if (training.final_price && training.final_price > 0) {
          const isLateCancellation = training.is_late_cancellation && training.status === "canceled";
          items.push({
            date: new Date(training.date),
            type: isLateCancellation ? "late_cancellation" : "training",
            description: isLateCancellation
              ? language === "cs"
                ? "Pozdní zrušení tréninku"
                : "Late training cancellation"
              : language === "cs"
                ? "Osobní trénink"
                : "Personal training",
            quantity: 1,
            unitPrice: training.final_price,
            totalPrice: training.final_price,
            note: training.notes || undefined,
          });
        }
      });

      // Add products
      products?.forEach((product) => {
        if (product.amount && product.amount < 0) {
          const productName = (product.products as any)?.name || product.description || (language === "cs" ? "Zboží" : "Product");
          items.push({
            date: new Date(product.created_at),
            type: "product",
            description: productName,
            quantity: 1,
            unitPrice: Math.abs(product.amount),
            totalPrice: Math.abs(product.amount),
          });
        }
      });

      // Prepare data
      const statementData: CreditStatementData = {
        clientName,
        clientEmail,
        clientPhone,
        periodStart,
        periodEnd,
        items,
        companyName: companySettings?.name,
        companyId: companySettings?.id,
        companyAddress: companySettings?.address,
        companyContact: companySettings?.contact,
      };

      // Generate and download PDF
      downloadCreditStatementPdf(statementData, { language });

      toast.success(
        language === "cs"
          ? "PDF výpis byl vygenerován"
          : "PDF statement generated"
      );
      setOpen(false);
    } catch (error) {
      console.error("Error generating credit statement:", error);
      toast.error(
        language === "cs"
          ? "Chyba při generování výpisu"
          : "Error generating statement"
      );
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
            {language === "cs" ? "Vygenerovat výpis" : "Generate statement"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {language === "cs" ? "Výpis čerpání kreditu" : "Credit Usage Statement"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Language toggle */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              {language === "cs" ? "Jazyk" : "Language"}
            </Label>
            <div className="flex items-center gap-2 bg-secondary rounded-lg p-1">
              <Button
                variant={language === "cs" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3"
                onClick={() => setLanguage("cs")}
              >
                CZ
              </Button>
              <Button
                variant={language === "en" ? "default" : "ghost"}
                size="sm"
                className="h-7 px-3"
                onClick={() => setLanguage("en")}
              >
                EN
              </Button>
            </div>
          </div>

          {/* Period selection */}
          <div className="space-y-3">
            <Label>{language === "cs" ? "Období" : "Period"}</Label>
            <RadioGroup
              value={periodType}
              onValueChange={(v) => setPeriodType(v as "lastTopup" | "custom")}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lastTopup" id="lastTopup" />
                <Label htmlFor="lastTopup" className="font-normal cursor-pointer">
                  {language === "cs"
                    ? "Od posledního dobití kreditu"
                    : "Since last credit top-up"}
                  {lastTopup && (
                    <span className="text-muted-foreground ml-1">
                      ({format(lastTopup, "d. M. yyyy", { locale: cs })})
                    </span>
                  )}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  {language === "cs" ? "Vlastní období" : "Custom period"}
                </Label>
              </div>
            </RadioGroup>

            {periodType === "custom" && (
              <div className="flex gap-2 mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !customStart && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
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
                      <Calendar className="mr-2 h-4 w-4" />
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
            )}
          </div>

          {/* Options */}
          <div className="space-y-3">
            <Label>{language === "cs" ? "Možnosti" : "Options"}</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="includeCanceled" className="font-normal cursor-pointer">
                {language === "cs"
                  ? "Zahrnout zrušené tréninky"
                  : "Include canceled trainings"}
              </Label>
              <Switch
                id="includeCanceled"
                checked={includeCanceled}
                onCheckedChange={setIncludeCanceled}
              />
            </div>
          </div>

          {/* Client info preview */}
          <div className="bg-secondary/50 rounded-lg p-3 text-sm">
            <p className="font-medium">{clientName}</p>
            {(clientEmail || clientPhone) && (
              <p className="text-muted-foreground">
                {[clientEmail, clientPhone].filter(Boolean).join(" • ")}
              </p>
            )}
            <p className="text-muted-foreground mt-1">
              {language === "cs" ? "Období" : "Period"}:{" "}
              {format(periodStart, "d. M. yyyy", { locale: cs })} –{" "}
              {format(periodEnd, "d. M. yyyy", { locale: cs })}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {language === "cs" ? "Zrušit" : "Cancel"}
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2">
            <Download className="h-4 w-4" />
            {isGenerating
              ? language === "cs"
                ? "Generuji..."
                : "Generating..."
              : language === "cs"
                ? "Stáhnout PDF"
                : "Download PDF"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
