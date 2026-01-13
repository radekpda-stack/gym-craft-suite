import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useClientPortal } from '@/contexts/ClientPortalContext';
import { useClientPaceTrend } from '@/hooks/useClientPaceTrend';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingDown, TrendingUp, Minus, Trophy, Waves, Wind, Footprints, ChevronRight, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type CardioCategory = 'rower' | 'skierg' | 'treadmill';

const CATEGORY_CONFIG: Record<CardioCategory, {
  label: string;
  icon: React.ReactNode;
  color: string;
}> = {
  rower: {
    label: 'Veslo',
    icon: <Waves className="h-4 w-4" />,
    color: 'hsl(var(--chart-1))',
  },
  skierg: {
    label: 'SkiErg',
    icon: <Wind className="h-4 w-4" />,
    color: 'hsl(var(--chart-2))',
  },
  treadmill: {
    label: 'Běh',
    icon: <Footprints className="h-4 w-4" />,
    color: 'hsl(var(--chart-3))',
  },
};

function formatPaceDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function calculateImprovement(data: { paceNormalized: number; date: string }[]): number | null {
  if (data.length < 2) return null;
  
  const sorted = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  const firstThird = sorted.slice(0, Math.ceil(sorted.length / 3));
  const lastThird = sorted.slice(-Math.ceil(sorted.length / 3));
  
  const avgFirst = firstThird.reduce((sum, p) => sum + p.paceNormalized, 0) / firstThird.length;
  const avgLast = lastThird.reduce((sum, p) => sum + p.paceNormalized, 0) / lastThird.length;
  
  // Positive = improvement (pace decreased)
  return ((avgFirst - avgLast) / avgFirst) * 100;
}

export function PaceTrendWidget() {
  const { clientId } = useClientPortal();
  const { data: paceTrend, isLoading } = useClientPaceTrend(clientId ?? undefined);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <Card className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!paceTrend) return null;

  // Find the category with the most data
  const categories: CardioCategory[] = ['rower', 'skierg', 'treadmill'];
  const primaryCategory = categories.reduce((best, cat) => {
    if (paceTrend[cat].length > paceTrend[best].length) return cat;
    return best;
  }, 'rower' as CardioCategory);

  const data = paceTrend[primaryCategory];
  if (data.length === 0) return null;

  const config = CATEGORY_CONFIG[primaryCategory];
  const bestPace = paceTrend.bestPaces[primaryCategory];
  const trend = paceTrend.trends[primaryCategory];
  const improvement = calculateImprovement(data);

  const chartData = [...data].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const getTrendIcon = () => {
    switch (trend) {
      case 'improving':
        return <TrendingDown className="h-4 w-4 text-success" />;
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-warning" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-accent" />;
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Card 
        className="overflow-hidden cursor-pointer hover:shadow-md transition-all group border-border/50 hover:border-primary/30"
        onClick={() => navigate('/client-portal/progress')}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-md bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Vývoj tempa</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {config.icon}
                  <span>{config.label}</span>
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>

          <div className="flex items-end justify-between">
            <div className="flex-1">
              {/* Best pace with trophy */}
              {bestPace && (
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-warning" />
                  <span className="text-lg font-bold text-foreground">
                    {formatPaceDisplay(bestPace.paceNormalized)}
                  </span>
                  <span className="text-xs text-muted-foreground">nejlepší</span>
                </div>
              )}

              {/* Improvement indicator */}
              {improvement !== null && Math.abs(improvement) > 1 && (
                <div className="flex items-center gap-1">
                  {getTrendIcon()}
                  <span className={`text-xs font-medium ${
                    improvement > 0 ? 'text-success' : 'text-warning'
                  }`}>
                    {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}% {improvement > 0 ? 'rychlejší' : 'pomalejší'}
                  </span>
                </div>
              )}
            </div>

            {/* Mini sparkline */}
            <div className="w-24 h-12">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="miniGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="paceNormalized"
                    stroke={config.color}
                    strokeWidth={1.5}
                    fill="url(#miniGradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
