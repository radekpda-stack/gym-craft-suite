import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TestBenchmark } from "@/types/testExtensions";

export function useTestBenchmarks(testDefinitionId?: string) {
  return useQuery({
    queryKey: ['test-benchmarks', testDefinitionId],
    queryFn: async () => {
      let query = supabase
        .from('test_benchmarks')
        .select('*')
        .order('age_min', { ascending: true });
      
      if (testDefinitionId) {
        query = query.eq('test_definition_id', testDefinitionId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as TestBenchmark[];
    },
    enabled: !!testDefinitionId
  });
}

export function getPercentileRating(
  value: number,
  benchmark: TestBenchmark,
  isBetterLower: boolean
): { percentile: number; rating: 'excellent' | 'good' | 'average' | 'below_average' | 'poor' } {
  const p5 = benchmark.percentile_5 ?? 0;
  const p25 = benchmark.percentile_25 ?? 0;
  const p50 = benchmark.percentile_50 ?? 0;
  const p75 = benchmark.percentile_75 ?? 0;
  const p95 = benchmark.percentile_95 ?? 0;
  
  if (isBetterLower) {
    // Lower is better (e.g., time)
    if (value <= p5) return { percentile: 95, rating: 'excellent' };
    if (value <= p25) return { percentile: 75, rating: 'good' };
    if (value <= p50) return { percentile: 50, rating: 'average' };
    if (value <= p75) return { percentile: 25, rating: 'below_average' };
    return { percentile: 5, rating: 'poor' };
  } else {
    // Higher is better (e.g., weight, reps)
    if (value >= p95) return { percentile: 95, rating: 'excellent' };
    if (value >= p75) return { percentile: 75, rating: 'good' };
    if (value >= p50) return { percentile: 50, rating: 'average' };
    if (value >= p25) return { percentile: 25, rating: 'below_average' };
    return { percentile: 5, rating: 'poor' };
  }
}

export function findApplicableBenchmark(
  benchmarks: TestBenchmark[],
  age: number,
  gender: 'male' | 'female'
): TestBenchmark | null {
  // First try to find gender-specific benchmark
  const genderMatch = benchmarks.find(b => 
    b.gender === gender &&
    (b.age_min === null || age >= b.age_min) &&
    (b.age_max === null || age <= b.age_max)
  );
  if (genderMatch) return genderMatch;
  
  // Fall back to 'any' gender
  const anyMatch = benchmarks.find(b => 
    b.gender === 'any' &&
    (b.age_min === null || age >= b.age_min) &&
    (b.age_max === null || age <= b.age_max)
  );
  
  return anyMatch || null;
}
