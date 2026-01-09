/**
 * FeedbackTimelineChart - Shows feedback metrics over time with tag filtering
 * Part of section B) in the implementation plan
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeedbackWithTags, FeedbackWithTags } from '@/hooks/useFeedbackWithTags';
import { useTags, Tag } from '@/hooks/useTags';

interface FeedbackTimelineChartProps {
  clientId: string;
  height?: number;
}

type MetricKey = 'body_feel' | 'pain' | 'energy_rating' | 'difficulty' | 'session_fit' | 'fun';

const METRIC_CONFIG: Record<MetricKey, { label: string; color: string; inverted?: boolean }> = {
  body_feel: { label: 'Pocit v těle', color: '#22c55e' },
  pain: { label: 'Bolest', color: '#ef4444', inverted: true },
  energy_rating: { label: 'Energie', color: '#3b82f6' },
  difficulty: { label: 'Obtížnost', color: '#f97316', inverted: true },
  session_fit: { label: 'Jak sedl', color: '#8b5cf6' },
  fun: { label: 'Zábava', color: '#ec4899' },
};

export function FeedbackTimelineChart({ clientId, height = 250 }: FeedbackTimelineChartProps) {
  const { data: feedbacks = [], isLoading } = useFeedbackWithTags(clientId, { limit: 50 });
  const { data: allTags = [] } = useTags();
  
  const [selectedMetrics, setSelectedMetrics] = useState<MetricKey[]>(['body_feel', 'pain']);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  
  // Get unique tags from feedbacks
  const availableTags = useMemo(() => {
    const tagMap = new Map<string, Tag>();
    feedbacks.forEach(f => {
      f.tags.forEach(tag => {
        if (!tagMap.has(tag.id)) {
          tagMap.set(tag.id, tag);
        }
      });
    });
    return Array.from(tagMap.values());
  }, [feedbacks]);
  
  // Filter feedbacks by selected tags
  const filteredFeedbacks = useMemo(() => {
    if (selectedTagIds.length === 0) return feedbacks;
    return feedbacks.filter(f => 
      selectedTagIds.some(tagId => f.tags.some(t => t.id === tagId))
    );
  }, [feedbacks, selectedTagIds]);
  
  // Prepare chart data
  const chartData = useMemo(() => {
    return filteredFeedbacks
      .slice()
      .reverse()
      .map(f => ({
        date: format(new Date(f.training_date), 'd.M.', { locale: cs }),
        fullDate: format(new Date(f.training_date), 'd. MMMM yyyy', { locale: cs }),
        body_feel: f.body_feel,
        pain: f.pain,
        energy_rating: f.energy_rating,
        difficulty: f.difficulty,
        session_fit: f.session_fit,
        fun: f.fun,
        status: f.status,
        tags: f.tags.map(t => t.name).join(', '),
      }));
  }, [filteredFeedbacks]);
  
  const toggleMetric = (metric: MetricKey) => {
    if (selectedMetrics.includes(metric)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(m => m !== metric));
      }
    } else {
      if (selectedMetrics.length < 2) {
        setSelectedMetrics([...selectedMetrics, metric]);
      } else {
        setSelectedMetrics([selectedMetrics[1], metric]);
      }
    }
  };
  
  const toggleTag = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend feedbacku
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (feedbacks.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trend feedbacku
          </div>
          <span className="text-sm font-normal text-muted-foreground">
            {filteredFeedbacks.length} záznamů
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Metric selector */}
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(METRIC_CONFIG) as MetricKey[]).map(key => {
            const config = METRIC_CONFIG[key];
            const isSelected = selectedMetrics.includes(key);
            return (
              <Button
                key={key}
                variant={isSelected ? 'default' : 'outline'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => toggleMetric(key)}
                style={isSelected ? { backgroundColor: config.color } : undefined}
              >
                {config.label}
              </Button>
            );
          })}
        </div>
        
        {/* Tag filter */}
        {availableTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {availableTags.slice(0, 8).map(tag => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <Badge
                  key={tag.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className="cursor-pointer text-xs"
                  style={isSelected ? { 
                    backgroundColor: tag.color,
                    borderColor: tag.color 
                  } : { 
                    borderColor: tag.color,
                    color: tag.color 
                  }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.name}
                  {isSelected && <X className="h-3 w-3 ml-1" />}
                </Badge>
              );
            })}
            {selectedTagIds.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setSelectedTagIds([])}
              >
                Zrušit filtr
              </Button>
            )}
          </div>
        )}
        
        {/* Chart */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                domain={[1, 10]} 
                ticks={[1, 5, 10]}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelFormatter={(label, payload) => {
                  if (payload && payload[0]) {
                    return payload[0].payload.fullDate;
                  }
                  return label;
                }}
                formatter={(value: number, name: string) => {
                  const key = name as MetricKey;
                  const config = METRIC_CONFIG[key];
                  return [value ?? '—', config?.label || name];
                }}
              />
              <ReferenceLine y={5} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" opacity={0.5} />
              {selectedMetrics.map(metric => (
                <Line
                  key={metric}
                  type="monotone"
                  dataKey={metric}
                  stroke={METRIC_CONFIG[metric].color}
                  strokeWidth={2}
                  dot={{ r: 3, fill: METRIC_CONFIG[metric].color }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
