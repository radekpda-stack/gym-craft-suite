import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useDemoMode } from '@/contexts/DemoContext';
import { startOfMonth, endOfMonth, subMonths, subYears, format } from 'date-fns';
import { cs } from 'date-fns/locale';

export type WaterfallCompareType = 'month' | 'year' | 'custom';

export interface WaterfallSegment {
  name: string;
  value: number;
  type: 'start' | 'increase' | 'decrease' | 'total';
  cumulative: number;
  tooltip: string;
}

export interface RevenueWaterfallData {
  segments: WaterfallSegment[];
  currentPeriodLabel: string;
  comparePeriodLabel: string;
  currentTotal: number;
  compareTotal: number;
  netChange: number;
  netChangePercent: number;
  breakdown: {
    trainingChange: number;
    productChange: number;
    cancellationChange: number;
    newClientsRevenue: number;
    lostClientsRevenue: number;
  };
}

// Demo data
const generateDemoWaterfallData = (compareType: WaterfallCompareType): RevenueWaterfallData => {
  const compareTotal = compareType === 'year' ? 45000 : 52000;
  const currentTotal = 58000;
  const netChange = currentTotal - compareTotal;

  const segments: WaterfallSegment[] = [
    { 
      name: compareType === 'year' ? 'Led 2025' : 'Minulý měsíc', 
      value: compareTotal, 
      type: 'start', 
      cumulative: compareTotal,
      tooltip: `Výchozí obrat: ${compareTotal.toLocaleString('cs-CZ')} Kč`
    },
    { 
      name: 'Noví klienti', 
      value: 8500, 
      type: 'increase', 
      cumulative: compareTotal + 8500,
      tooltip: '3 noví klienti přinesli 8 500 Kč'
    },
    { 
      name: 'Více tréninků', 
      value: 4200, 
      type: 'increase', 
      cumulative: compareTotal + 8500 + 4200,
      tooltip: 'Stávající klienti měli více tréninků'
    },
    { 
      name: 'Produkty', 
      value: 1800, 
      type: 'increase', 
      cumulative: compareTotal + 8500 + 4200 + 1800,
      tooltip: 'Navýšení prodeje produktů'
    },
    { 
      name: 'Odešlí klienti', 
      value: -5500, 
      type: 'decrease', 
      cumulative: compareTotal + 8500 + 4200 + 1800 - 5500,
      tooltip: '2 klienti ukončili spolupráci'
    },
    { 
      name: 'Zrušené lekce', 
      value: -3000, 
      type: 'decrease', 
      cumulative: currentTotal,
      tooltip: 'Ztráta z pozdě zrušených lekcí'
    },
    { 
      name: 'Tento měsíc', 
      value: currentTotal, 
      type: 'total', 
      cumulative: currentTotal,
      tooltip: `Celkový obrat: ${currentTotal.toLocaleString('cs-CZ')} Kč`
    },
  ];

  return {
    segments,
    currentPeriodLabel: 'Led 2026',
    comparePeriodLabel: compareType === 'year' ? 'Led 2025' : 'Pro 2025',
    currentTotal,
    compareTotal,
    netChange,
    netChangePercent: Math.round((netChange / compareTotal) * 100),
    breakdown: {
      trainingChange: 4200,
      productChange: 1800,
      cancellationChange: 0,
      newClientsRevenue: 8500,
      lostClientsRevenue: -5500,
    },
  };
};

export function useRevenueWaterfall(
  compareType: WaterfallCompareType = 'month',
  customCompareDate?: Date
) {
  const { isDemo } = useDemoMode();

  return useQuery({
    queryKey: ['revenue-waterfall', compareType, customCompareDate?.toISOString(), isDemo],
    staleTime: 1000 * 60 * 10,
    queryFn: async (): Promise<RevenueWaterfallData> => {
      if (isDemo) {
        return generateDemoWaterfallData(compareType);
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const now = new Date();
      const currentStart = startOfMonth(now);
      const currentEnd = endOfMonth(now);

      // Determine comparison period
      let compareStart: Date;
      let compareEnd: Date;
      
      switch (compareType) {
        case 'year':
          compareStart = startOfMonth(subYears(now, 1));
          compareEnd = endOfMonth(subYears(now, 1));
          break;
        case 'custom':
          compareStart = customCompareDate ? startOfMonth(customCompareDate) : startOfMonth(subMonths(now, 1));
          compareEnd = customCompareDate ? endOfMonth(customCompareDate) : endOfMonth(subMonths(now, 1));
          break;
        case 'month':
        default:
          compareStart = startOfMonth(subMonths(now, 1));
          compareEnd = endOfMonth(subMonths(now, 1));
      }

      // Fetch credit_transactions for both periods - this is the SINGLE SOURCE OF TRUTH
      const [currentTxResult, compareTxResult] = await Promise.all([
        // Current period credit transactions
        supabase
          .from('credit_transactions')
          .select('client_id, amount, type')
          .eq('user_id', user.id)
          .in('type', ['training', 'product', 'canceled_training'])
          .gte('created_at', currentStart.toISOString())
          .lte('created_at', currentEnd.toISOString()),
        
        // Compare period credit transactions
        supabase
          .from('credit_transactions')
          .select('client_id, amount, type')
          .eq('user_id', user.id)
          .in('type', ['training', 'product', 'canceled_training'])
          .gte('created_at', compareStart.toISOString())
          .lte('created_at', compareEnd.toISOString()),
      ]);

      const currentTx = currentTxResult.data || [];
      const compareTx = compareTxResult.data || [];

      // Calculate totals by type
      const calcTotals = (transactions: typeof currentTx) => {
        let training = 0;
        let product = 0;
        let cancellation = 0;
        
        transactions.forEach(t => {
          const absAmount = Math.abs(t.amount || 0);
          if (t.type === 'training') training += absAmount;
          else if (t.type === 'product') product += absAmount;
          else if (t.type === 'canceled_training') cancellation += absAmount;
        });
        
        return { training, product, cancellation, total: training + product + cancellation };
      };

      const currentTotals = calcTotals(currentTx);
      const compareTotals = calcTotals(compareTx);

      // Analyze client changes using training transactions
      const currentTrainingTx = currentTx.filter(t => t.type === 'training');
      const compareTrainingTx = compareTx.filter(t => t.type === 'training');
      
      const currentClientIds = new Set(currentTrainingTx.map(t => t.client_id).filter(Boolean));
      const compareClientIds = new Set(compareTrainingTx.map(t => t.client_id).filter(Boolean));
      
      const newClientIds = [...currentClientIds].filter(id => !compareClientIds.has(id));
      const lostClientIds = [...compareClientIds].filter(id => !currentClientIds.has(id));
      const retainedClientIds = [...currentClientIds].filter(id => compareClientIds.has(id));

      // Calculate revenue changes
      const newClientsRevenue = currentTrainingTx
        .filter(t => t.client_id && newClientIds.includes(t.client_id))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      const lostClientsRevenue = -compareTrainingTx
        .filter(t => t.client_id && lostClientIds.includes(t.client_id))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      // Training change from retained clients
      const retainedCurrentRevenue = currentTrainingTx
        .filter(t => t.client_id && retainedClientIds.includes(t.client_id))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      const retainedCompareRevenue = compareTrainingTx
        .filter(t => t.client_id && retainedClientIds.includes(t.client_id))
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);
      const trainingChange = retainedCurrentRevenue - retainedCompareRevenue;

      const productChange = currentTotals.product - compareTotals.product;
      const cancellationChange = currentTotals.cancellation - compareTotals.cancellation;
      const netChange = currentTotals.total - compareTotals.total;

      // Build waterfall segments
      let cumulative = compareTotals.total;
      const segments: WaterfallSegment[] = [
        { 
          name: format(compareStart, 'LLL yy', { locale: cs }), 
          value: compareTotals.total, 
          type: 'start', 
          cumulative: compareTotals.total,
          tooltip: `Výchozí obrat: ${compareTotals.total.toLocaleString('cs-CZ')} Kč`
        },
      ];

      if (newClientsRevenue > 0) {
        cumulative += newClientsRevenue;
        segments.push({ 
          name: 'Noví klienti', 
          value: newClientsRevenue, 
          type: 'increase', 
          cumulative,
          tooltip: `${newClientIds.length} nových klientů přineslo ${newClientsRevenue.toLocaleString('cs-CZ')} Kč`
        });
      }

      if (trainingChange > 0) {
        cumulative += trainingChange;
        segments.push({ 
          name: 'Více tréninků', 
          value: trainingChange, 
          type: 'increase', 
          cumulative,
          tooltip: `Stávající klienti měli více tréninků: +${trainingChange.toLocaleString('cs-CZ')} Kč`
        });
      }

      if (productChange > 0) {
        cumulative += productChange;
        segments.push({ 
          name: 'Produkty ↑', 
          value: productChange, 
          type: 'increase', 
          cumulative,
          tooltip: `Nárůst prodeje produktů: +${productChange.toLocaleString('cs-CZ')} Kč`
        });
      }

      if (cancellationChange > 0) {
        cumulative += cancellationChange;
        segments.push({ 
          name: 'Storno ↑', 
          value: cancellationChange, 
          type: 'increase', 
          cumulative,
          tooltip: `Více storno poplatků: +${cancellationChange.toLocaleString('cs-CZ')} Kč`
        });
      }

      if (lostClientsRevenue < 0) {
        cumulative += lostClientsRevenue;
        segments.push({ 
          name: 'Odešlí klienti', 
          value: lostClientsRevenue, 
          type: 'decrease', 
          cumulative,
          tooltip: `${lostClientIds.length} klientů ukončilo spolupráci: ${lostClientsRevenue.toLocaleString('cs-CZ')} Kč`
        });
      }

      if (trainingChange < 0) {
        cumulative += trainingChange;
        segments.push({ 
          name: 'Méně tréninků', 
          value: trainingChange, 
          type: 'decrease', 
          cumulative,
          tooltip: `Pokles u stávajících klientů: ${trainingChange.toLocaleString('cs-CZ')} Kč`
        });
      }

      if (productChange < 0) {
        cumulative += productChange;
        segments.push({ 
          name: 'Produkty ↓', 
          value: productChange, 
          type: 'decrease', 
          cumulative,
          tooltip: `Pokles prodeje produktů: ${productChange.toLocaleString('cs-CZ')} Kč`
        });
      }

      if (cancellationChange < 0) {
        cumulative += cancellationChange;
        segments.push({ 
          name: 'Storno ↓', 
          value: cancellationChange, 
          type: 'decrease', 
          cumulative,
          tooltip: `Méně storno poplatků: ${cancellationChange.toLocaleString('cs-CZ')} Kč`
        });
      }

      segments.push({ 
        name: format(currentStart, 'LLL yy', { locale: cs }), 
        value: currentTotals.total, 
        type: 'total', 
        cumulative: currentTotals.total,
        tooltip: `Celkový obrat: ${currentTotals.total.toLocaleString('cs-CZ')} Kč`
      });

      return {
        segments,
        currentPeriodLabel: format(currentStart, 'LLLL yyyy', { locale: cs }),
        comparePeriodLabel: format(compareStart, 'LLLL yyyy', { locale: cs }),
        currentTotal: currentTotals.total,
        compareTotal: compareTotals.total,
        netChange,
        netChangePercent: compareTotals.total > 0 ? Math.round((netChange / compareTotals.total) * 100) : 0,
        breakdown: {
          trainingChange,
          productChange,
          cancellationChange,
          newClientsRevenue,
          lostClientsRevenue,
        },
      };
    },
  });
}
