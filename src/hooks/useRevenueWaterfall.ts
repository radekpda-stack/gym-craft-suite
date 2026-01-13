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
    newClientsRevenue: number;
    lostClientsRevenue: number;
    priceChange: number;
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
      newClientsRevenue: 8500,
      lostClientsRevenue: -5500,
      priceChange: 0,
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

      // Fetch data for both periods
      const [currentResult, compareResult, currentClientsResult, compareClientsResult] = await Promise.all([
        // Current period sessions
        supabase
          .from('training_sessions')
          .select('client_id, final_price, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', currentStart.toISOString())
          .lte('date', currentEnd.toISOString()),
        
        // Compare period sessions
        supabase
          .from('training_sessions')
          .select('client_id, final_price, status')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .gte('date', compareStart.toISOString())
          .lte('date', compareEnd.toISOString()),
        
        // Current period product sales
        supabase
          .from('credit_transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'product')
          .gte('created_at', currentStart.toISOString())
          .lte('created_at', currentEnd.toISOString()),
        
        // Compare period product sales
        supabase
          .from('credit_transactions')
          .select('amount')
          .eq('user_id', user.id)
          .eq('type', 'product')
          .gte('created_at', compareStart.toISOString())
          .lte('created_at', compareEnd.toISOString()),
      ]);

      const currentSessions = currentResult.data || [];
      const compareSessions = compareResult.data || [];
      const currentProducts = currentClientsResult.data || [];
      const compareProducts = compareClientsResult.data || [];

      // Calculate totals
      const currentTrainingRevenue = currentSessions.reduce((sum, s) => sum + (s.final_price || 0), 0);
      const compareTrainingRevenue = compareSessions.reduce((sum, s) => sum + (s.final_price || 0), 0);
      
      const currentProductRevenue = currentProducts.reduce((sum, p) => sum + Math.abs(p.amount || 0), 0);
      const compareProductRevenue = compareProducts.reduce((sum, p) => sum + Math.abs(p.amount || 0), 0);

      const currentTotal = currentTrainingRevenue + currentProductRevenue;
      const compareTotal = compareTrainingRevenue + compareProductRevenue;

      // Analyze client changes
      const currentClientIds = new Set(currentSessions.map(s => s.client_id));
      const compareClientIds = new Set(compareSessions.map(s => s.client_id));
      
      const newClientIds = [...currentClientIds].filter(id => !compareClientIds.has(id));
      const lostClientIds = [...compareClientIds].filter(id => !currentClientIds.has(id));
      const retainedClientIds = [...currentClientIds].filter(id => compareClientIds.has(id));

      // Calculate revenue changes
      const newClientsRevenue = currentSessions
        .filter(s => newClientIds.includes(s.client_id))
        .reduce((sum, s) => sum + (s.final_price || 0), 0);

      const lostClientsRevenue = -compareSessions
        .filter(s => lostClientIds.includes(s.client_id))
        .reduce((sum, s) => sum + (s.final_price || 0), 0);

      // Training change from retained clients
      const retainedCurrentRevenue = currentSessions
        .filter(s => retainedClientIds.includes(s.client_id))
        .reduce((sum, s) => sum + (s.final_price || 0), 0);
      const retainedCompareRevenue = compareSessions
        .filter(s => retainedClientIds.includes(s.client_id))
        .reduce((sum, s) => sum + (s.final_price || 0), 0);
      const trainingChange = retainedCurrentRevenue - retainedCompareRevenue;

      const productChange = currentProductRevenue - compareProductRevenue;
      const netChange = currentTotal - compareTotal;

      // Build waterfall segments
      let cumulative = compareTotal;
      const segments: WaterfallSegment[] = [
        { 
          name: format(compareStart, 'LLL yy', { locale: cs }), 
          value: compareTotal, 
          type: 'start', 
          cumulative: compareTotal,
          tooltip: `Výchozí obrat: ${compareTotal.toLocaleString('cs-CZ')} Kč`
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

      segments.push({ 
        name: format(currentStart, 'LLL yy', { locale: cs }), 
        value: currentTotal, 
        type: 'total', 
        cumulative: currentTotal,
        tooltip: `Celkový obrat: ${currentTotal.toLocaleString('cs-CZ')} Kč`
      });

      return {
        segments,
        currentPeriodLabel: format(currentStart, 'LLLL yyyy', { locale: cs }),
        comparePeriodLabel: format(compareStart, 'LLLL yyyy', { locale: cs }),
        currentTotal,
        compareTotal,
        netChange,
        netChangePercent: compareTotal > 0 ? Math.round((netChange / compareTotal) * 100) : 0,
        breakdown: {
          trainingChange,
          productChange,
          newClientsRevenue,
          lostClientsRevenue,
          priceChange: 0,
        },
      };
    },
  });
}
