import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTestBenchmarks, findApplicableBenchmark, getPercentileRating } from '@/hooks/useTestBenchmarks';
import type { TestDefinition } from '@/types/tests';
import { formatDuration } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TestBenchmarkCardProps {
  definition: TestDefinition;
  currentValue: number | null;
  clientAge?: number;
  clientGender?: 'male' | 'female';
}

const ratingConfig = {
  excellent: { label: 'Výborný', color: 'bg-green-500', textColor: 'text-green-600' },
  good: { label: 'Dobrý', color: 'bg-blue-500', textColor: 'text-blue-600' },
  average: { label: 'Průměrný', color: 'bg-yellow-500', textColor: 'text-yellow-600' },
  below_average: { label: 'Podprůměrný', color: 'bg-orange-500', textColor: 'text-orange-600' },
  poor: { label: 'Slabý', color: 'bg-red-500', textColor: 'text-red-600' },
};

export function TestBenchmarkCard({ definition, currentValue, clientAge = 30, clientGender = 'male' }: TestBenchmarkCardProps) {
  const { data: benchmarks, isLoading } = useTestBenchmarks(definition.id);
  
  const isBetterLower = definition.primary_metric_better === 'lower_is_better';
  const isTimeMetric = definition.primary_metric_key.includes('time') || definition.primary_metric_key === 'time_s';
  
  const formatValue = (value: number | null) => {
    if (value === null) return '-';
    if (isTimeMetric) return formatDuration(value);
    if (definition.primary_metric_key.includes('pct')) return `${value.toFixed(1)}%`;
    return value.toFixed(2);
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2" />
            <div className="h-8 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!benchmarks || benchmarks.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="text-center text-muted-foreground text-sm">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>Normy nejsou k dispozici</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const benchmark = findApplicableBenchmark(benchmarks, clientAge, clientGender);
  
  if (!benchmark) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4">
          <div className="text-center text-muted-foreground text-sm">
            <p>Normy pro daný věk/pohlaví nejsou k dispozici</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const rating = currentValue !== null 
    ? getPercentileRating(currentValue, benchmark, isBetterLower)
    : null;
  
  const config = rating ? ratingConfig[rating.rating] : null;
  
  // Calculate position on the percentile scale
  const getPositionPercent = () => {
    if (currentValue === null || !benchmark) return 50;
    
    const p5 = benchmark.percentile_5 ?? 0;
    const p95 = benchmark.percentile_95 ?? 100;
    
    if (isBetterLower) {
      // Lower is better - invert the scale
      if (currentValue <= p5) return 95;
      if (currentValue >= p95) return 5;
      return 100 - ((currentValue - p5) / (p95 - p5)) * 100;
    } else {
      if (currentValue >= p95) return 95;
      if (currentValue <= p5) return 5;
      return ((currentValue - p5) / (p95 - p5)) * 100;
    }
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4" />
          Srovnání s normami
          {benchmark.source && (
            <Badge variant="outline" className="text-[10px]">{benchmark.source}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current rating */}
        {rating && config && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hodnocení:</span>
            <Badge className={cn(config.color, 'text-white')}>
              {config.label} ({rating.percentile}. percentil)
            </Badge>
          </div>
        )}
        
        {/* Visual percentile bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>95%</span>
          </div>
          <div className="relative h-6 bg-gradient-to-r from-red-200 via-yellow-200 to-green-200 rounded-lg">
            {/* Marker for current value */}
            {currentValue !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-primary rounded"
                style={{ left: `${getPositionPercent()}%`, transform: 'translateX(-50%)' }}
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded whitespace-nowrap">
                  {formatValue(currentValue)}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Percentile values */}
        <div className="grid grid-cols-5 gap-1 text-center text-xs">
          <div>
            <p className="font-medium">{formatValue(benchmark.percentile_5)}</p>
            <p className="text-muted-foreground">5%</p>
          </div>
          <div>
            <p className="font-medium">{formatValue(benchmark.percentile_25)}</p>
            <p className="text-muted-foreground">25%</p>
          </div>
          <div className="bg-muted/50 rounded py-1">
            <p className="font-medium">{formatValue(benchmark.percentile_50)}</p>
            <p className="text-muted-foreground">Medián</p>
          </div>
          <div>
            <p className="font-medium">{formatValue(benchmark.percentile_75)}</p>
            <p className="text-muted-foreground">75%</p>
          </div>
          <div>
            <p className="font-medium">{formatValue(benchmark.percentile_95)}</p>
            <p className="text-muted-foreground">95%</p>
          </div>
        </div>
        
        {/* Comparison with median */}
        {currentValue !== null && benchmark.percentile_50 !== null && (
          <div className="flex items-center gap-2 text-sm p-2 bg-muted/30 rounded">
            {isBetterLower ? (
              currentValue < benchmark.percentile_50 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">
                    O {formatValue(benchmark.percentile_50 - currentValue)} lepší než medián
                  </span>
                </>
              ) : currentValue > benchmark.percentile_50 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">
                    O {formatValue(currentValue - benchmark.percentile_50)} horší než medián
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4" />
                  <span>Na úrovni mediánu</span>
                </>
              )
            ) : (
              currentValue > benchmark.percentile_50 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-green-600">
                    O {formatValue(currentValue - benchmark.percentile_50)} lepší než medián
                  </span>
                </>
              ) : currentValue < benchmark.percentile_50 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                  <span className="text-red-600">
                    O {formatValue(benchmark.percentile_50 - currentValue)} horší než medián
                  </span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4" />
                  <span>Na úrovni mediánu</span>
                </>
              )
            )}
          </div>
        )}
        
        {/* Age/gender info */}
        <p className="text-xs text-muted-foreground text-center">
          Normy pro: {clientGender === 'male' ? 'muži' : 'ženy'}, věk {benchmark.age_min ?? '?'}-{benchmark.age_max ?? '?'} let
        </p>
      </CardContent>
    </Card>
  );
}
